#!/usr/bin/env node

import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const VERSION = '1.0.0';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1_048_576;
const DEFAULT_MAX_REDIRECTS = 5;
const MAX_TIMEOUT_MS = 30_000;
const MAX_BODY_BYTES = 5_242_880;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const LOCAL_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home', '.lan'];

export class AuditError extends Error {
  constructor(message, code = 'EAUDIT') {
    super(message);
    this.name = 'AuditError';
    this.code = code;
  }
}

function inIpv4Range(parts, first, secondMin = 0, secondMax = 255) {
  return parts[0] === first && parts[1] >= secondMin && parts[1] <= secondMax;
}

function ipv4Parts(address) {
  if (!net.isIPv4(address)) return null;
  return address.split('.').map(Number);
}

function ipv6ToBigInt(address) {
  let source = address.toLowerCase();
  if (source.includes('%')) return null;

  const ipv4Match = source.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (ipv4Match) {
    const parts = ipv4Parts(ipv4Match[1]);
    if (!parts) return null;
    const high = ((parts[0] << 8) | parts[1]).toString(16);
    const low = ((parts[2] << 8) | parts[3]).toString(16);
    source = `${source.slice(0, ipv4Match.index)}${high}:${low}`;
  }

  const halves = source.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = halves.length === 2
    ? [...left, ...Array(missing).fill('0'), ...right]
    : left;
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return null;
  }

  return groups.reduce((value, group) => (value << 16n) + BigInt(`0x${group}`), 0n);
}

function ipv6InCidr(value, base, prefix) {
  const shift = BigInt(128 - prefix);
  return (value >> shift) === (base >> shift);
}

const IPV6_RANGES_TO_BLOCK = [
  ['::', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8]
].map(([address, prefix]) => [ipv6ToBigInt(address), prefix]);

export function isPublicAddress(address) {
  const parts = ipv4Parts(address);
  if (parts) {
    if (
      inIpv4Range(parts, 0) ||
      inIpv4Range(parts, 10) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      inIpv4Range(parts, 127) ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) ||
      (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) ||
      (parts[0] === 192 && parts[1] === 88 && parts[2] === 99) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
      (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) ||
      (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) ||
      parts[0] >= 224
    ) {
      return false;
    }
    return true;
  }

  if (!net.isIPv6(address)) return false;
  const value = ipv6ToBigInt(address);
  if (value === null || value === 0n || value === 1n) return false;

  const mappedPrefix = 0xffffn;
  if ((value >> 32n) === mappedPrefix) {
    const mapped = Number(value & 0xffffffffn);
    const mappedAddress = [
      (mapped >>> 24) & 255,
      (mapped >>> 16) & 255,
      (mapped >>> 8) & 255,
      mapped & 255
    ].join('.');
    return isPublicAddress(mappedAddress);
  }

  return !IPV6_RANGES_TO_BLOCK.some(([base, prefix]) => ipv6InCidr(value, base, prefix));
}

function cleanHostname(hostname) {
  const withoutBrackets = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
  return withoutBrackets.replace(/\.$/, '').toLowerCase();
}

export function parseTargetUrl(input) {
  let target;
  try {
    target = new URL(input);
  } catch {
    throw new AuditError('Target must be a valid absolute URL.', 'EURL');
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new AuditError('Only http:// and https:// URLs are supported.', 'EPROTOCOL');
  }
  if (target.username || target.password) {
    throw new AuditError('URLs containing credentials are not allowed.', 'ECREDENTIALS');
  }
  if (!target.hostname) {
    throw new AuditError('The URL must include a hostname.', 'EHOST');
  }

  const expectedPort = target.protocol === 'https:' ? '443' : '80';
  if (target.port && target.port !== expectedPort) {
    throw new AuditError(
      `Only the standard ${expectedPort} port is allowed for ${target.protocol}`,
      'EPORT'
    );
  }

  const hostname = cleanHostname(target.hostname);
  if (
    hostname === 'localhost' ||
    LOCAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new AuditError('Local and private hostnames are not allowed.', 'EPRIVATE');
  }
  if (net.isIP(hostname) && !isPublicAddress(hostname)) {
    throw new AuditError('Local, private, reserved, and documentation IPs are not allowed.', 'EPRIVATE');
  }

  target.hash = '';
  return target;
}

function timeoutPromise(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new AuditError(message, 'ETIMEOUT')), timeoutMs);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function resolvePublicHost(hostname, options = {}) {
  const lookup = options.lookup ?? dns.lookup.bind(dns);
  const clean = cleanHostname(hostname);

  if (net.isIP(clean)) {
    if (!isPublicAddress(clean)) {
      throw new AuditError('Target resolves to a non-public IP address.', 'EPRIVATE');
    }
    return [{ address: clean, family: net.isIPv4(clean) ? 4 : 6 }];
  }

  let records;
  try {
    records = await lookup(clean, { all: true, verbatim: true });
  } catch (error) {
    throw new AuditError(`DNS lookup failed for ${clean}: ${error.message}`, 'EDNS');
  }
  if (!Array.isArray(records) || records.length === 0) {
    throw new AuditError(`DNS lookup returned no addresses for ${clean}.`, 'EDNS');
  }

  const normalized = records.map((record) => ({
    address: record.address,
    family: Number(record.family)
  }));
  const unsafe = normalized.find((record) => !isPublicAddress(record.address));
  if (unsafe) {
    throw new AuditError(
      `Refusing ${clean}: DNS returned a non-public address (${unsafe.address}).`,
      'EPRIVATE'
    );
  }
  return normalized;
}

function pinnedLookup(records) {
  let cursor = 0;
  return (_hostname, options, callback) => {
    const lookupOptions = typeof options === 'number' ? { family: options } : (options ?? {});
    const family = Number(lookupOptions.family ?? 0);
    const candidates = family === 4 || family === 6
      ? records.filter((record) => record.family === family)
      : records;

    if (candidates.length === 0) {
      const error = new Error(`No validated DNS address for IPv${family}.`);
      error.code = 'ENOTFOUND';
      callback(error);
      return;
    }

    if (lookupOptions.all) {
      callback(null, candidates.map((record) => ({ ...record })));
      return;
    }

    const selected = candidates[cursor % candidates.length];
    cursor += 1;
    callback(null, selected.address, selected.family);
  };
}

function roundMs(value) {
  return Math.round(value * 10) / 10;
}

function elapsedMs(started) {
  return Number(process.hrtime.bigint() - started) / 1_000_000;
}

export async function requestPage(target, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const resolveHost = options.resolveHost ?? resolvePublicHost;
  const started = process.hrtime.bigint();

  const dnsStarted = process.hrtime.bigint();
  const records = await timeoutPromise(
    resolveHost(target.hostname),
    timeoutMs,
    `Timed out resolving ${target.hostname}.`
  );
  const dnsMs = elapsedMs(dnsStarted);
  const remainingMs = Math.max(1, timeoutMs - elapsedMs(started));

  return new Promise((resolve, reject) => {
    const client = target.protocol === 'https:' ? https : http;
    let settled = false;
    let responseStarted;
    let response;
    let bytesRead = 0;
    let truncated = false;
    const chunks = [];

    const finish = () => {
      if (settled || !responseStarted) return;
      settled = true;
      clearTimeout(deadline);
      const totalMs = elapsedMs(started);
      resolve({
        url: target.href,
        statusCode: response.statusCode ?? 0,
        statusMessage: response.statusMessage ?? '',
        headers: response.headers,
        body: Buffer.concat(chunks),
        bytesRead,
        truncated,
        resolvedAddresses: records.map((record) => record.address),
        timings: {
          dnsMs: roundMs(dnsMs),
          firstByteMs: roundMs(Number(responseStarted - started) / 1_000_000),
          downloadMs: roundMs(Number(process.hrtime.bigint() - responseStarted) / 1_000_000),
          totalMs: roundMs(totalMs)
        }
      });
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (error instanceof AuditError) {
        reject(error);
      } else {
        reject(new AuditError(`Request failed for ${target.href}: ${error.message}`, error.code ?? 'EREQUEST'));
      }
    };

    const request = client.request(target, {
      method: 'GET',
      agent: false,
      lookup: pinnedLookup(records),
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        'Accept-Encoding': 'identity',
        'Accept-Language': 'en',
        Connection: 'close',
        'User-Agent': `site-preflight/${VERSION} (read-only website audit)`
      }
    }, (incoming) => {
      response = incoming;
      responseStarted = process.hrtime.bigint();

      incoming.on('data', (chunk) => {
        if (settled) return;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        const remaining = maxBytes - bytesRead;
        if (buffer.length <= remaining) {
          chunks.push(buffer);
          bytesRead += buffer.length;
          return;
        }
        if (remaining > 0) {
          chunks.push(buffer.subarray(0, remaining));
          bytesRead += remaining;
        }
        truncated = true;
        finish();
        incoming.destroy();
      });
      incoming.on('end', finish);
      incoming.on('aborted', () => {
        if (truncated) finish();
        else fail(new AuditError('The server aborted the response.', 'EABORTED'));
      });
      incoming.on('error', (error) => {
        if (truncated) finish();
        else fail(error);
      });
    });

    request.on('error', fail);
    request.setTimeout(remainingMs, () => {
      request.destroy(new AuditError(`Request timed out after ${timeoutMs} ms.`, 'ETIMEOUT'));
    });
    const deadline = setTimeout(() => {
      request.destroy(new AuditError(`Request timed out after ${timeoutMs} ms.`, 'ETIMEOUT'));
    }, remainingMs);
    deadline.unref?.();
    request.end();
  });
}

function decodeEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
  };
  return String(value ?? '').replace(
    /&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi,
    (match, entity) => {
      if (entity[0] === '#') {
        const hex = entity[1]?.toLowerCase() === 'x';
        const number = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        if (!Number.isFinite(number) || number < 0 || number > 0x10ffff) return match;
        try {
          return String.fromCodePoint(number);
        } catch {
          return match;
        }
      }
      return named[entity.toLowerCase()] ?? match;
    }
  );
}

function normalizeText(value) {
  return decodeEntities(String(value ?? '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAttributes(tag) {
  const source = tag
    .replace(/^<\s*[a-z][\w:-]*/i, '')
    .replace(/\/?\s*>$/, '');
  const attributes = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const name = match[1].toLowerCase();
    attributes[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function firstTagAttributes(html, tagName) {
  const match = new RegExp(`<${tagName}\\b[^>]*>`, 'i').exec(html);
  return match ? parseAttributes(match[0]) : {};
}

function collectTagAttributes(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  const found = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    found.push({
      attributes: parseAttributes(match[0]),
      index: match.index,
      raw: match[0]
    });
  }
  return found;
}

export function analyzeHtml(source) {
  const html = String(source ?? '').replace(/<!--[\s\S]*?-->/g, '');
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  const title = normalizeText(titleMatch?.[1] ?? '');
  const htmlAttributes = firstTagAttributes(html, 'html');
  const metas = collectTagAttributes(html, 'meta');
  const links = collectTagAttributes(html, 'link');

  const descriptionMeta = metas.find(({ attributes }) =>
    String(attributes.name ?? '').toLowerCase() === 'description'
  );
  const viewportMeta = metas.find(({ attributes }) =>
    String(attributes.name ?? '').toLowerCase() === 'viewport'
  );
  const canonicalLink = links.find(({ attributes }) =>
    String(attributes.rel ?? '').toLowerCase().split(/\s+/).includes('canonical')
  );

  const h1Count = (html.match(/<h1\b[^>]*>/gi) ?? []).length;
  const formCount = (html.match(/<form\b[^>]*>/gi) ?? []).length;
  const labels = [];
  const labelPattern = /<label\b[^>]*>[\s\S]*?<\/label\s*>/gi;
  let labelMatch;
  while ((labelMatch = labelPattern.exec(html)) !== null) {
    labels.push({
      start: labelMatch.index,
      end: labelPattern.lastIndex,
      attributes: parseAttributes(labelMatch[0].match(/^<label\b[^>]*>/i)?.[0] ?? '<label>')
    });
  }
  const labelFor = new Set(
    labels
      .map(({ attributes }) => attributes.for)
      .filter(Boolean)
  );

  const controls = [];
  const controlPattern = /<(input|select|textarea)\b[^>]*>/gi;
  let controlMatch;
  while ((controlMatch = controlPattern.exec(html)) !== null) {
    const tagName = controlMatch[1].toLowerCase();
    const attributes = parseAttributes(controlMatch[0]);
    const type = String(attributes.type ?? 'text').toLowerCase();
    if (
      tagName === 'input' &&
      ['hidden', 'submit', 'reset', 'button', 'image'].includes(type)
    ) {
      continue;
    }
    const wrapped = labels.some(({ start, end }) =>
      controlMatch.index >= start && controlMatch.index < end
    );
    const labeled = Boolean(
      wrapped ||
      (attributes.id && labelFor.has(attributes.id)) ||
      attributes['aria-label'] ||
      attributes['aria-labelledby'] ||
      attributes.title
    );
    controls.push({
      tag: tagName,
      type: tagName === 'input' ? type : null,
      labeled
    });
  }

  const images = collectTagAttributes(html, 'img');
  const imageMissingAlt = images.filter(({ attributes }) =>
    !Object.prototype.hasOwnProperty.call(attributes, 'alt')
  ).length;
  const imageEmptyAlt = images.filter(({ attributes }) =>
    Object.prototype.hasOwnProperty.call(attributes, 'alt') && attributes.alt.trim() === ''
  ).length;
  const labeledControls = controls.filter(({ labeled }) => labeled).length;

  return {
    title,
    titleLength: title.length,
    description: normalizeText(descriptionMeta?.attributes.content ?? ''),
    descriptionLength: normalizeText(descriptionMeta?.attributes.content ?? '').length,
    canonical: canonicalLink?.attributes.href?.trim() ?? '',
    viewport: viewportMeta?.attributes.content?.trim() ?? '',
    lang: htmlAttributes.lang?.trim() ?? '',
    h1Count,
    forms: {
      count: formCount,
      controls: controls.length,
      labeledControls,
      unlabeledControls: controls.length - labeledControls,
      labelCoverage: controls.length === 0
        ? 1
        : Math.round((labeledControls / controls.length) * 1000) / 1000
    },
    images: {
      count: images.length,
      withAlt: images.length - imageMissingAlt,
      missingAlt: imageMissingAlt,
      emptyAlt: imageEmptyAlt
    }
  };
}

function headerValue(headers, name) {
  const value = headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value.join(', ') : String(value ?? '');
}

export function analyzeSecurityHeaders(headers, isHttps = true) {
  const csp = headerValue(headers, 'content-security-policy');
  const hsts = headerValue(headers, 'strict-transport-security');
  const xContentType = headerValue(headers, 'x-content-type-options');
  const xFrame = headerValue(headers, 'x-frame-options');
  const referrerPolicy = headerValue(headers, 'referrer-policy');
  const permissionsPolicy = headerValue(headers, 'permissions-policy');

  return {
    hsts: {
      applicable: isHttps,
      present: Boolean(hsts),
      value: hsts
    },
    contentSecurityPolicy: {
      present: Boolean(csp),
      value: csp
    },
    contentTypeOptions: {
      present: xContentType.toLowerCase().split(/\s*,\s*/).includes('nosniff'),
      value: xContentType
    },
    frameProtection: {
      present: Boolean(xFrame) || /(?:^|;)\s*frame-ancestors\b/i.test(csp),
      value: xFrame || (/frame-ancestors/i.test(csp) ? 'CSP frame-ancestors' : '')
    },
    referrerPolicy: {
      present: Boolean(referrerPolicy),
      value: referrerPolicy
    },
    permissionsPolicy: {
      present: Boolean(permissionsPolicy),
      value: permissionsPolicy
    }
  };
}

function check(id, label, status, detail) {
  return { id, label, status, detail };
}

export function buildChecks(result) {
  const { finalUrl, initialUrl, response, page, security, redirects } = result;
  const initialHttps = initialUrl.startsWith('https:');
  const finalHttps = finalUrl.startsWith('https:');
  const checks = [];

  checks.push(check(
    'https',
    'HTTPS',
    finalHttps ? (initialHttps ? 'pass' : 'warn') : 'fail',
    finalHttps
      ? (initialHttps ? 'Initial and final URLs use HTTPS.' : 'HTTP redirects to HTTPS; prefer linking directly to HTTPS.')
      : 'The final URL does not use HTTPS.'
  ));
  checks.push(check(
    'status',
    'HTTP status',
    response.statusCode >= 200 && response.statusCode < 300
      ? 'pass'
      : response.statusCode >= 400
        ? 'fail'
        : 'warn',
    `${response.statusCode}${response.statusMessage ? ` ${response.statusMessage}` : ''}`
  ));
  checks.push(check(
    'redirects',
    'Redirect chain',
    redirects.length <= 2 ? 'pass' : 'warn',
    redirects.length === 0
      ? 'No redirects.'
      : `${redirects.length} redirect${redirects.length === 1 ? '' : 's'}.`
  ));
  checks.push(check(
    'response-time',
    'Response time',
    response.timings.totalMs < 2_000 ? 'pass' : 'warn',
    `${response.timings.totalMs} ms total; ${response.timings.firstByteMs} ms to first byte.`
  ));
  checks.push(check(
    'body-limit',
    'Response body limit',
    response.truncated ? 'warn' : 'pass',
    response.truncated
      ? `Body was truncated safely at ${response.bytesRead} bytes.`
      : `${response.bytesRead} bytes read.`
  ));
  checks.push(check(
    'content-type',
    'HTML content type',
    /(?:text\/html|application\/xhtml\+xml)/i.test(response.contentType) ? 'pass' : 'warn',
    response.contentType || 'No Content-Type header.'
  ));
  checks.push(check(
    'title',
    'Page title',
    page.title
      ? (page.titleLength >= 10 && page.titleLength <= 70 ? 'pass' : 'warn')
      : 'warn',
    page.title
      ? `${page.titleLength} characters: ${page.title}`
      : 'No title element found.'
  ));
  checks.push(check(
    'description',
    'Meta description',
    page.description
      ? (page.descriptionLength >= 50 && page.descriptionLength <= 170 ? 'pass' : 'warn')
      : 'warn',
    page.description
      ? `${page.descriptionLength} characters.`
      : 'No meta description found.'
  ));
  checks.push(check(
    'canonical',
    'Canonical URL',
    page.canonical ? 'pass' : 'warn',
    page.canonical || 'No canonical link found.'
  ));
  checks.push(check(
    'viewport',
    'Viewport',
    page.viewport ? 'pass' : 'warn',
    page.viewport || 'No viewport meta tag found.'
  ));
  checks.push(check(
    'language',
    'Document language',
    page.lang ? 'pass' : 'warn',
    page.lang || 'No lang attribute found on the html element.'
  ));
  checks.push(check(
    'h1',
    'H1 headings',
    page.h1Count === 1 ? 'pass' : 'warn',
    `${page.h1Count} H1 heading${page.h1Count === 1 ? '' : 's'} found.`
  ));
  checks.push(check(
    'form-labels',
    'Form labels',
    page.forms.unlabeledControls === 0 ? 'pass' : 'warn',
    page.forms.controls === 0
      ? 'No labelable form controls found.'
      : `${page.forms.labeledControls}/${page.forms.controls} labelable controls have a label heuristic.`
  ));
  checks.push(check(
    'image-alt',
    'Image alt attributes',
    page.images.missingAlt === 0 ? 'pass' : 'warn',
    page.images.count === 0
      ? 'No images found.'
      : `${page.images.missingAlt}/${page.images.count} images lack an alt attribute; ${page.images.emptyAlt} use empty alt.`
  ));

  const securityChecks = [
    ['hsts', 'HSTS', security.hsts, !security.hsts.applicable],
    ['csp', 'Content Security Policy', security.contentSecurityPolicy, false],
    ['nosniff', 'X-Content-Type-Options', security.contentTypeOptions, false],
    ['frame-protection', 'Frame protection', security.frameProtection, false],
    ['referrer-policy', 'Referrer Policy', security.referrerPolicy, false],
    ['permissions-policy', 'Permissions Policy', security.permissionsPolicy, false]
  ];
  for (const [id, label, item, notApplicable] of securityChecks) {
    checks.push(check(
      id,
      label,
      notApplicable ? 'info' : (item.present ? 'pass' : 'warn'),
      notApplicable
        ? 'Not applicable to an HTTP final URL.'
        : (item.present ? item.value : 'Header not found.')
    ));
  }

  return checks;
}

function decodeBody(body, contentType) {
  if (/charset\s*=\s*(?:iso-8859-1|latin-?1|windows-1252)/i.test(contentType)) {
    return body.toString('latin1');
  }
  return body.toString('utf8');
}

export async function auditUrl(input, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const performRequest = options.requestPage ?? requestPage;
  const initial = parseTargetUrl(input);
  let current = initial;
  const redirects = [];
  const visited = new Set([current.href]);
  let response;

  while (true) {
    response = await performRequest(current, { timeoutMs, maxBytes });
    const location = headerValue(response.headers, 'location');
    if (!REDIRECT_STATUSES.has(response.statusCode) || !location) break;
    if (redirects.length >= maxRedirects) {
      throw new AuditError(`Redirect limit of ${maxRedirects} exceeded.`, 'EREDIRECTS');
    }

    let next;
    try {
      next = parseTargetUrl(new URL(location, current).href);
    } catch (error) {
      if (error instanceof AuditError) throw error;
      throw new AuditError(`Invalid redirect location: ${location}`, 'EREDIRECT');
    }
    if (visited.has(next.href)) {
      throw new AuditError(`Redirect loop detected at ${next.href}`, 'EREDIRECT_LOOP');
    }
    redirects.push({
      from: current.href,
      statusCode: response.statusCode,
      to: next.href
    });
    visited.add(next.href);
    current = next;
  }

  const contentType = headerValue(response.headers, 'content-type');
  const page = analyzeHtml(decodeBody(response.body, contentType));
  const security = analyzeSecurityHeaders(response.headers, current.protocol === 'https:');
  const result = {
    ok: true,
    auditedAt: new Date().toISOString(),
    initialUrl: initial.href,
    finalUrl: current.href,
    redirects,
    response: {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      contentType,
      bytesRead: response.bytesRead,
      truncated: response.truncated,
      resolvedAddresses: response.resolvedAddresses,
      timings: response.timings
    },
    page,
    security
  };
  result.checks = buildChecks(result);
  result.summary = result.checks.reduce(
    (summary, item) => {
      summary[item.status] += 1;
      return summary;
    },
    { pass: 0, warn: 0, fail: 0, info: 0 }
  );
  return result;
}

function symbolFor(status, color) {
  const symbols = {
    pass: color ? '\u001b[32mPASS\u001b[0m' : 'PASS',
    warn: color ? '\u001b[33mWARN\u001b[0m' : 'WARN',
    fail: color ? '\u001b[31mFAIL\u001b[0m' : 'FAIL',
    info: color ? '\u001b[36mINFO\u001b[0m' : 'INFO'
  };
  return symbols[status];
}

export function renderHuman(result, options = {}) {
  const color = options.color ?? process.stdout.isTTY;
  const lines = [
    'Site Preflight Audit',
    `Target: ${result.initialUrl}`,
    `Final:  ${result.finalUrl}`,
    `Status: ${result.response.statusCode}${result.response.statusMessage ? ` ${result.response.statusMessage}` : ''}`,
    `Timing: ${result.response.timings.totalMs} ms total (${result.response.timings.dnsMs} ms DNS, ${result.response.timings.firstByteMs} ms first byte)`,
    `Body:   ${result.response.bytesRead} bytes${result.response.truncated ? ' (truncated at safety limit)' : ''}`,
    `Summary: ${result.summary.pass} passed, ${result.summary.warn} warnings, ${result.summary.fail} failed, ${result.summary.info} informational`,
    ''
  ];

  if (result.redirects.length > 0) {
    lines.push('Redirects:');
    for (const redirect of result.redirects) {
      lines.push(`  ${redirect.statusCode} ${redirect.from} -> ${redirect.to}`);
    }
    lines.push('');
  }

  lines.push('Checks:');
  const labelWidth = Math.max(...result.checks.map(({ label }) => label.length));
  for (const item of result.checks) {
    lines.push(`  ${symbolFor(item.status, color)}  ${item.label.padEnd(labelWidth)}  ${item.detail}`);
  }
  return `${lines.join('\n')}\n`;
}

export function parseArgs(argv) {
  const options = {
    json: false,
    color: process.stdout.isTTY,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxBytes: DEFAULT_MAX_BYTES,
    maxRedirects: DEFAULT_MAX_REDIRECTS,
    help: false,
    version: false,
    url: null
  };

  const takeInteger = (index, flag, min, max) => {
    const raw = argv[index + 1];
    if (raw === undefined || !/^\d+$/.test(raw)) {
      throw new AuditError(`${flag} requires an integer.`, 'EARGS');
    }
    const value = Number(raw);
    if (value < min || value > max) {
      throw new AuditError(`${flag} must be between ${min} and ${max}.`, 'EARGS');
    }
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      options.json = true;
      options.color = false;
    } else if (argument === '--no-color') {
      options.color = false;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--version' || argument === '-v') {
      options.version = true;
    } else if (argument === '--timeout') {
      options.timeoutMs = takeInteger(index, '--timeout', 500, MAX_TIMEOUT_MS);
      index += 1;
    } else if (argument === '--max-bytes') {
      options.maxBytes = takeInteger(index, '--max-bytes', 1_024, MAX_BODY_BYTES);
      index += 1;
    } else if (argument === '--max-redirects') {
      options.maxRedirects = takeInteger(index, '--max-redirects', 0, 10);
      index += 1;
    } else if (argument.startsWith('-')) {
      throw new AuditError(`Unknown option: ${argument}`, 'EARGS');
    } else if (options.url) {
      throw new AuditError('Provide exactly one URL.', 'EARGS');
    } else {
      options.url = argument;
    }
  }
  return options;
}

export function usage() {
  return `site-preflight ${VERSION}

Usage:
  node site-preflight.mjs [options] https://example.com/

Options:
  --json                 Print machine-readable JSON
  --timeout MS           Total per-request timeout (500-${MAX_TIMEOUT_MS}; default ${DEFAULT_TIMEOUT_MS})
  --max-bytes BYTES      Maximum response bytes (${1024}-${MAX_BODY_BYTES}; default ${DEFAULT_MAX_BYTES})
  --max-redirects COUNT  Redirect limit (0-10; default ${DEFAULT_MAX_REDIRECTS})
  --no-color             Disable ANSI colors
  -h, --help             Show help
  -v, --version          Show version
`;
}

export async function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs(argv);
    if (parsed.help) {
      process.stdout.write(usage());
      return 0;
    }
    if (parsed.version) {
      process.stdout.write(`${VERSION}\n`);
      return 0;
    }
    if (!parsed.url) {
      throw new AuditError('A public http(s) URL is required.', 'EARGS');
    }

    const result = await auditUrl(parsed.url, parsed);
    process.stdout.write(
      parsed.json
        ? `${JSON.stringify(result, null, 2)}\n`
        : renderHuman(result, parsed)
    );
    return result.summary.fail > 0 ? 2 : 0;
  } catch (error) {
    const auditError = error instanceof AuditError
      ? error
      : new AuditError(error.message ?? String(error));
    const jsonRequested = parsed?.json || argv.includes('--json');
    if (jsonRequested) {
      process.stderr.write(`${JSON.stringify({
        ok: false,
        error: {
          code: auditError.code,
          message: auditError.message
        }
      }, null, 2)}\n`);
    } else {
      process.stderr.write(`Error [${auditError.code}]: ${auditError.message}\n`);
      if (auditError.code === 'EARGS') process.stderr.write('\nRun with --help for usage.\n');
    }
    return 1;
  }
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  process.exitCode = await main();
}
