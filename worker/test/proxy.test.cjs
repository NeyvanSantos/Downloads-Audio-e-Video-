const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { outputText } = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/worker.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const loadWorker = (upstreamFetch) => {
  const module = { exports: {} };
  new Function('module', 'exports', 'fetch', outputText)(module, module.exports, upstreamFetch);
  return module.exports.default;
};

test('proxy reports missing backend and handles CORS', async () => {
  const worker = loadWorker(() => { throw new Error('Unexpected fetch'); });
  const env = { CORS_ORIGIN: 'https://neyvansantos.github.io' };
  const response = await worker.fetch(new Request('https://proxy.example/api/health'), env);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('access-control-allow-origin'), env.CORS_ORIGIN);
  const preflight = await worker.fetch(new Request('https://proxy.example/download', { method: 'OPTIONS' }), env);
  assert.equal(preflight.status, 204);
});

test('proxy streams file bytes and forwards download headers', async () => {
  const worker = loadWorker(async (url, options) => {
    assert.equal(url, 'https://backend.example/api/download/95f5d1d2-2f10-4cd4-b7f4-512275540ed2');
    assert.equal(options.redirect, 'manual');
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg', 'Content-Disposition': 'attachment; filename="sample.mp3"' } });
  });
  const response = await worker.fetch(new Request('https://proxy.example/api/download/95f5d1d2-2f10-4cd4-b7f4-512275540ed2'), { BACKEND_URL: 'https://backend.example/api' });
  assert.equal(response.headers.get('content-type'), 'audio/mpeg');
  assert.equal(response.headers.get('content-disposition'), 'attachment; filename="sample.mp3"');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3]);
});

test('proxy restricts paths and handles upstream failures', async () => {
  const worker = loadWorker(async () => { throw new Error('Offline'); });
  const env = { BACKEND_URL: 'https://backend.example/api' };
  assert.equal((await worker.fetch(new Request('https://proxy.example/admin'), env)).status, 404);
  assert.equal((await worker.fetch(new Request('https://proxy.example/health'), env)).status, 502);
});
