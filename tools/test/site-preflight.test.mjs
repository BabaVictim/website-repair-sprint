import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AuditError,
  analyzeHtml,
  analyzeSecurityHeaders,
  auditUrl,
  isPublicAddress,
  parseArgs,
  parseTargetUrl,
  renderHuman,
  resolvePublicHost,
  sanitizeHumanText
} from '../site-preflight.mjs';

function fakeResponse(overrides = {}) {
  return {
    statusCode: 200,
    statusMessage: 'OK',
    headers: {
      'content-type': 'text/html; charset=utf-8'
    },
    body: Buffer.from('<html><head><title>Example Website Title</title></head><body><h1>Hello</h1></body></html>'),
    bytesRead: 94,
    truncated: false,
    resolvedAddresses: ['93.184.216.34'],
    timings: {
      dnsMs: 3,
      firstByteMs: 40,
      downloadMs: 5,
      totalMs: 45
    },
    ...overrides
  };
}

test('public address classification rejects local and special IPv4 ranges', () => {
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('1.1.1.1'), true);
  assert.equal(isPublicAddress('127.0.0.1'), false);
  assert.equal(isPublicAddress('10.2.3.4'), false);
  assert.equal(isPublicAddress('172.31.4.5'), false);
  assert.equal(isPublicAddress('192.168.1.1'), false);
  assert.equal(isPublicAddress('169.254.169.254'), false);
  assert.equal(isPublicAddress('100.64.0.1'), false);
  assert.equal(isPublicAddress('192.0.2.2'), false);
  assert.equal(isPublicAddress('198.51.100.4'), false);
  assert.equal(isPublicAddress('203.0.113.9'), false);
  assert.equal(isPublicAddress('224.0.0.1'), false);
});

test('public address classification handles IPv6 and IPv4-mapped IPv6', () => {
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
  assert.equal(isPublicAddress('::1'), false);
  assert.equal(isPublicAddress('fe80::1'), false);
  assert.equal(isPublicAddress('fc00::1'), false);
  assert.equal(isPublicAddress('2001:db8::1'), false);
  assert.equal(isPublicAddress('::ffff:127.0.0.1'), false);
  assert.equal(isPublicAddress('::ffff:8.8.8.8'), true);
});

test('URL validation accepts public HTTP(S) and rejects unsafe targets', () => {
  assert.equal(parseTargetUrl('https://example.com/path#fragment').href, 'https://example.com/path');
  assert.equal(parseTargetUrl('http://8.8.8.8/').href, 'http://8.8.8.8/');

  const rejected = [
    'ftp://example.com/',
    'http://localhost/',
    'http://service.internal/',
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://169.254.169.254/latest/meta-data/',
    'https://user:secret@example.com/',
    'https://example.com:8443/'
  ];
  for (const target of rejected) {
    assert.throws(() => parseTargetUrl(target), AuditError, target);
  }
});

test('DNS validation rejects a mixed public/private answer to prevent rebinding', async () => {
  await assert.rejects(
    resolvePublicHost('example.test', {
      lookup: async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 }
      ]
    }),
    (error) => error instanceof AuditError && error.code === 'EPRIVATE'
  );

  assert.deepEqual(
    await resolvePublicHost('example.test', {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }]
    }),
    [{ address: '93.184.216.34', family: 4 }]
  );
});

test('HTML analysis extracts metadata and accessibility heuristics', () => {
  const html = `
    <!doctype html>
    <html lang="en-GB">
      <head>
        <title> A useful &amp; descriptive title </title>
        <meta name="description" content="This is a useful description for a website landing page and its visitors.">
        <meta content="width=device-width, initial-scale=1" name="viewport">
        <link href="https://example.com/page" rel="alternate canonical">
      </head>
      <body>
        <h1>Primary heading</h1>
        <form>
          <label for="email">Email</label>
          <input id="email" type="email">
          <label>Name <input type="text"></label>
          <textarea aria-label="Message"></textarea>
          <input type="text">
          <input type="hidden">
          <button>Send</button>
        </form>
        <img src="logo.png" alt="Example">
        <img src="decoration.png" alt="">
        <img src="photo.png">
      </body>
    </html>
  `;
  const result = analyzeHtml(html);

  assert.equal(result.title, 'A useful & descriptive title');
  assert.equal(result.lang, 'en-GB');
  assert.equal(result.canonical, 'https://example.com/page');
  assert.equal(result.viewport, 'width=device-width, initial-scale=1');
  assert.equal(result.h1Count, 1);
  assert.deepEqual(result.forms, {
    count: 1,
    controls: 4,
    labeledControls: 3,
    unlabeledControls: 1,
    labelCoverage: 0.75
  });
  assert.deepEqual(result.images, {
    count: 3,
    withAlt: 2,
    missingAlt: 1,
    emptyAlt: 1
  });
});

test('security header analysis recognizes CSP frame-ancestors', () => {
  const result = analyzeSecurityHeaders({
    'strict-transport-security': 'max-age=31536000',
    'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin'
  });

  assert.equal(result.hsts.present, true);
  assert.equal(result.contentSecurityPolicy.present, true);
  assert.equal(result.contentTypeOptions.present, true);
  assert.equal(result.frameProtection.present, true);
  assert.equal(result.referrerPolicy.present, true);
  assert.equal(result.permissionsPolicy.present, false);
});

test('audit follows a bounded redirect and produces checks and summaries', async () => {
  const calls = [];
  const result = await auditUrl('http://example.com/', {
    requestPage: async (url) => {
      calls.push(url.href);
      if (url.protocol === 'http:') {
        return fakeResponse({
          statusCode: 301,
          statusMessage: 'Moved Permanently',
          headers: { location: 'https://example.com/home' },
          body: Buffer.alloc(0),
          bytesRead: 0
        });
      }
      const body = Buffer.from(`
        <html lang="en">
          <head>
            <title>A sufficiently descriptive page title</title>
            <meta name="description" content="A sufficiently detailed page description that is long enough for the basic preflight heuristic.">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="canonical" href="https://example.com/home">
          </head>
          <body><h1>Home</h1><img src="ok.png" alt="OK"></body>
        </html>
      `);
      return fakeResponse({
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'strict-transport-security': 'max-age=31536000',
          'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'strict-origin',
          'permissions-policy': 'camera=()'
        },
        body,
        bytesRead: body.length
      });
    }
  });

  assert.deepEqual(calls, ['http://example.com/', 'https://example.com/home']);
  assert.equal(result.finalUrl, 'https://example.com/home');
  assert.equal(result.redirects.length, 1);
  assert.equal(result.page.h1Count, 1);
  assert.equal(result.summary.fail, 0);
  assert.ok(result.checks.some((item) => item.id === 'https' && item.status === 'warn'));

  const human = renderHuman(result, { color: false });
  assert.match(human, /Site Preflight Audit/);
  assert.match(human, /301 http:\/\/example\.com\/ -> https:\/\/example\.com\/home/);
  assert.match(human, /PASS\s+HTTP status/);
});

test('human output escapes workflow commands and bounds remote-controlled text', async () => {
  const body = Buffer.from(`
    <html lang="en">
      <head>
        <title>${'A'.repeat(1_100)}</title>
        <link rel="canonical" href="https://safe.example/&#10;::add-mask::REMOTE-CONTROLLED">
      </head>
      <body><h1>Home</h1></body>
    </html>
  `);
  const result = await auditUrl('https://example.com/', {
    requestPage: async () => fakeResponse({
      body,
      bytesRead: body.length
    })
  });
  const human = renderHuman(result, { color: false });

  assert.doesNotMatch(human, /(?:^|\n)::add-mask::/);
  assert.match(human, /\\u000a::add-mask::REMOTE-CONTROLLED/);
  assert.match(human, /A{20}…/);
  assert.equal(sanitizeHumanText('\u001b[31mred\u2028line'), '\\u001b[31mred\\u2028line');
});

test('audit rejects redirect loops before another request', async () => {
  let calls = 0;
  await assert.rejects(
    auditUrl('https://example.com/a', {
      requestPage: async () => {
        calls += 1;
        return fakeResponse({
          statusCode: 302,
          statusMessage: 'Found',
          headers: { location: '/a' }
        });
      }
    }),
    (error) => error instanceof AuditError && error.code === 'EREDIRECT_LOOP'
  );
  assert.equal(calls, 1);
});

test('argument parsing validates resource bounds', () => {
  const parsed = parseArgs([
    '--json',
    '--timeout', '5000',
    '--max-bytes', '2048',
    '--max-redirects', '2',
    'https://example.com'
  ]);
  assert.equal(parsed.json, true);
  assert.equal(parsed.timeoutMs, 5000);
  assert.equal(parsed.maxBytes, 2048);
  assert.equal(parsed.maxRedirects, 2);
  assert.equal(parsed.url, 'https://example.com');

  assert.throws(() => parseArgs(['--timeout', '10', 'https://example.com']), AuditError);
  assert.throws(() => parseArgs(['--unknown', 'https://example.com']), AuditError);
  assert.throws(() => parseArgs(['https://a.example', 'https://b.example']), AuditError);
});
