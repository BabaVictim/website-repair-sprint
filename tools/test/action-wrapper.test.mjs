import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCliArgs, runAction } from '../../action/index.mjs';

test('action maps JSON input to one CLI flag', () => {
  assert.deepEqual(
    buildCliArgs({
      INPUT_JSON: ' TrUe ',
      INPUT_URL: 'https://example.com/path?value=one'
    }),
    ['--json', 'https://example.com/path?value=one']
  );
  assert.deepEqual(
    buildCliArgs({
      INPUT_JSON: 'false',
      INPUT_URL: 'https://example.com/'
    }),
    ['https://example.com/']
  );
});

test('action keeps hostile-looking URL text in one unchanged argument', () => {
  const targets = [
    'https://example.com/a;b',
    'https://example.com/`whoami`',
    'https://example.com/$(whoami)',
    'https://example.com/a b',
    'https://example.com/"quoted"',
    "https://example.com/'quoted'",
    'https://example.com/line-one\nline-two'
  ];

  for (const target of targets) {
    assert.deepEqual(
      buildCliArgs({ INPUT_JSON: 'false', INPUT_URL: target }),
      [target]
    );
  }
});

test('action rejects invalid Boolean input without calling the audit', async () => {
  let called = false;
  let error = '';
  const code = await runAction(
    { INPUT_JSON: 'yes', INPUT_URL: 'https://example.com/' },
    async () => {
      called = true;
      return 0;
    },
    { write: (value) => { error += value; } }
  );

  assert.equal(code, 1);
  assert.equal(called, false);
  assert.match(error, /Input "json" must be "true" or "false"/);
});

test('action handles non-Error throws defensively', async () => {
  let error = '';
  const code = await runAction(
    { INPUT_JSON: 'false', INPUT_URL: 'https://example.com/' },
    async () => {
      throw null;
    },
    { write: (value) => { error += value; } }
  );

  assert.equal(code, 1);
  assert.match(error, /Error \[EARGS\]: null/);
});

test('action escapes workflow commands in unexpected errors', async () => {
  let error = '';
  const code = await runAction(
    { INPUT_JSON: 'false', INPUT_URL: 'https://example.com/' },
    async () => {
      throw new Error('unexpected\n::add-mask::REMOTE-CONTROLLED');
    },
    { write: (value) => { error += value; } }
  );

  assert.equal(code, 1);
  assert.doesNotMatch(error, /(?:^|\n)::add-mask::/);
  assert.match(error, /unexpected\\u000a::add-mask::REMOTE-CONTROLLED/);
});

test('action passes a missing URL to the existing CLI validation', async () => {
  let received;
  const code = await runAction(
    { INPUT_JSON: 'false' },
    async (argv) => {
      received = argv;
      return 1;
    }
  );

  assert.equal(code, 1);
  assert.deepEqual(received, ['']);
});

test('action preserves all CLI exit codes', async () => {
  for (const expected of [0, 1, 2]) {
    const code = await runAction(
      { INPUT_JSON: 'false', INPUT_URL: 'https://example.com/' },
      async () => expected
    );
    assert.equal(code, expected);
  }
});
