const { test } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns/promises');
const { validatePublicUrl, validateTaskId } = require('../dist/validation');

test('URL validation rejects local destinations, credentials, protocols and private DNS', async () => {
  const original = dns.lookup;
  try {
    dns.lookup = async () => [{ address: '10.1.2.3', family: 4 }];
    for (const value of ['file:///etc/passwd', 'http://127.0.0.1', 'http://localhost', 'https://user:pass@example.com', 'https://example.com:8080', 'https://example.com']) {
      await assert.rejects(validatePublicUrl(value), { status: 400 });
    }
    dns.lookup = async () => [{ address: '93.184.216.34', family: 4 }];
    assert.equal(await validatePublicUrl('https://example.com/watch?v=1'), 'https://example.com/watch?v=1');
  } finally { dns.lookup = original; }
});

test('task identifiers reject traversal and malformed UUIDs', () => {
  for (const id of ['../file', 'not-a-uuid', '']) assert.throws(() => validateTaskId(id));
  assert.doesNotThrow(() => validateTaskId('95f5d1d2-2f10-4cd4-b7f4-512275540ed2'));
});
