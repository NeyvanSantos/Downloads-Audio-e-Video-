const { test } = require('node:test');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
let calls = [];
cp.execFile = (command, args, options, callback) => {
  calls.push({ command, args, options });
  if (args.includes('--dump-single-json')) return callback(null, '{"title":"sample"}', '');
  const output = args[args.indexOf('-o') + 1].replace('%(title).150B.%(ext)s', 'sample.mp3');
  fs.writeFile(output, 'sample').then(() => callback(null, output + '\n', ''), callback);
};
cp.execFile[require('node:util').promisify.custom] = (...args) => new Promise((resolve, reject) => {
  cp.execFile(...args, (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr }));
});
const processor = require('../dist/services/mediaProcessor');

test('untrusted URL remains one argument and never reaches a shell', async () => {
  const url = 'https://example.com/video?x=" & echo unsafe';
  const info = await processor.extractVideoInfo(url);
  assert.equal(info.title, 'sample');
  assert.deepEqual(calls[0].args.slice(-2), ['--', url]);
  assert.equal(calls[0].options.shell, undefined);
});

test('audio is converted once and concurrent tasks own different directories', async () => {
  calls = [];
  const [first, second] = await Promise.all([
    processor.downloadVideo('https://example.com/a', 'audio', 'mp3', 'test-task-one'),
    processor.downloadVideo('https://example.com/b', 'audio', 'mp3', 'test-task-two'),
  ]);
  try {
    assert.notEqual(path.dirname(first), path.dirname(second));
    assert.equal(calls.length, 2);
    assert(calls.every(call => call.args.filter(value => value === '--extract-audio').length === 1));
    assert.equal(await fs.readFile(first, 'utf8'), 'sample');
  } finally { await processor.cleanupFile(first); await processor.cleanupFile(second); }
});

test('cleanup refuses files outside the download directory', async () => {
  await assert.rejects(processor.cleanupFile(path.resolve('package.json')), /inválido/);
});

test('configured YouTube cookie file is passed as one argument only to YouTube', async () => {
  const os = require('node:os');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'downloader-session-test-'));
  const cookieFile = path.join(directory, 'session with spaces.cookies.txt');
  const previous = process.env.YT_DLP_COOKIES_FILE;
  try {
    await fs.writeFile(cookieFile, '# Netscape HTTP Cookie File\n');
    process.env.YT_DLP_COOKIES_FILE = cookieFile;
    calls = [];
    await processor.extractVideoInfo('https://www.youtube.com/watch?v=EQiQ2SaJ-Ls');
    assert.equal(calls[0].args[calls[0].args.indexOf('--cookies') + 1], cookieFile);
    await processor.extractVideoInfo('https://example.com/video');
    assert(!calls[1].args.includes('--cookies'));
  } finally {
    if (previous === undefined) delete process.env.YT_DLP_COOKIES_FILE;
    else process.env.YT_DLP_COOKIES_FILE = previous;
    await fs.unlink(cookieFile);
    await fs.rmdir(directory);
  }
});
