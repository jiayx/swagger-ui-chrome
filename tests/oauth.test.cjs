const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/viewer/oauth2-redirect.js'), 'utf8');
function run({ query = '?state=expected&code=abc', hash = '', flow = 'authorizationCode', opener = true, throws = false } = {}) {
  const callbacks = [], errors = [], status = {};
  let closed = false;
  const pending = { state: 'expected', redirectUrl: 'callback', auth: { name: 'test', schema: { get: () => flow } },
    callback: value => { if (throws) throw new Error('closed'); callbacks.push(value); }, errCb: value => errors.push(value) };
  const context = { URLSearchParams, document: { readyState: 'complete', getElementById: () => status },
    window: { location: { hash, search: query }, opener: opener ? { swaggerUIRedirectOauth2: pending } : null,
      close: () => { closed = true; } } };
  vm.runInNewContext(source, context);
  return { callbacks, errors, status, pending, closed, context };
}

test('OAuth code and implicit flows decode parameters and consume state', () => {
  const code = run({ query: '?state=expected&code=a%2Bb%3Dc' });
  assert.equal(code.pending.auth.code, 'a+b=c');
  assert.equal(code.callbacks.length, 1); assert.equal(code.closed, true);
  assert.equal(code.pending.state, undefined);
  vm.runInNewContext(source, code.context);
  assert.equal(code.callbacks.length, 1);
  const token = run({ flow: 'implicit', hash: '#access_token=a%2Bb%3Dc&state=expected&token_type=bearer' });
  assert.equal(token.callbacks[0].token.access_token, 'a+b=c');
  assert.equal(token.callbacks[0].isValid, true);
});

test('OAuth rejects missing, mismatched or duplicate state and credentials', () => {
  for (const query of ['?code=abc', '?state=wrong&code=abc', '?state=expected&state=wrong&code=abc',
    '?state=expected&code=a&code=b', '?state=expected', '?state=expected&error=access_denied&code=abc']) {
    const r = run({ query });
    assert.equal(r.callbacks.length, 0, query);
    assert.equal(r.pending.auth.code, undefined);
    assert.equal(r.errors.length, 1);
    assert.ok(r.status.textContent);
    assert.equal(r.closed, false);
  }
});

test('standalone callback and unavailable opener callback show a safe error', () => {
  const standalone = run({ opener: false });
  assert.match(standalone.status.textContent, /No active authorization/);
  const unavailable = run({ throws: true });
  assert.match(unavailable.status.textContent, /Unable to complete/);
  assert.equal(unavailable.closed, false);
});
