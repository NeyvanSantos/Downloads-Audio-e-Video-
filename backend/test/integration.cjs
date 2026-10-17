// Optional live integration: TEST_API_URL=http://localhost:3001/api node test/integration.cjs
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const base = process.env.TEST_API_URL || 'http://127.0.0.1:3001/api';
(async () => {
  assert.equal((await fetch(base + '/health')).status, 200);
  for (const url of ['file:///etc/passwd', 'http://127.0.0.1/private']) {
    assert.equal((await fetch(base + '/preview?url=' + encodeURIComponent(url))).status, 400);
  }
  assert.equal((await fetch(base + '/status/invalid')).status, 400);
  const source = 'https://www.w3schools.com/html/mov_bbb.mp4';
  const preview = await fetch(base + '/preview?url=' + encodeURIComponent(source));
  assert.equal(preview.status, 200, await preview.clone().text());
  console.log('Preview:', await preview.json());
  const jobs = await Promise.all(['video', 'audio'].map(async format => {
    const startTime = Date.now();
    const response = await fetch(base + '/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: source, format, quality: format === 'audio' ? 'mp3' : '720p' }) });
    assert.equal(response.status, 202, await response.clone().text());
    const job = await response.json();
    console.log('Accepted', format, Date.now() - startTime, 'ms');
    return { ...job, format };
  }));
  const busy = await fetch(base + '/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: source, format: 'audio', quality: 'mp3' }) });
  assert.equal(busy.status, 429);
  for (const job of jobs) {
    const deadline = Date.now() + 150000;
    let status;
    do {
      status = await (await fetch(base + '/status/' + job.taskId)).json();
      if (['ready', 'failed'].includes(status.status)) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    } while (Date.now() < deadline);
    assert.equal(status.status, 'ready', JSON.stringify(status));
    const response = await fetch(base + '/download/' + job.taskId);
    assert.equal(response.status, 200);
    const buffer = Buffer.from(await response.arrayBuffer());
    assert(buffer.length > 10000);
    assert(response.headers.get('content-disposition').includes(job.format === 'audio' ? '.mp3' : '.mp4'));
    const temp = path.join(os.tmpdir(), 'downloader-check-' + job.taskId + (job.format === 'audio' ? '.mp3' : '.mp4'));
    fs.writeFileSync(temp, buffer);
    try {
      const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', temp], { encoding: 'utf8' }));
      const codecs = probe.streams.map(stream => stream.codec_type + ':' + stream.codec_name);
      assert(codecs.some(codec => codec.startsWith('audio:')));
      if (job.format === 'audio') assert.deepEqual(codecs, ['audio:mp3']);
      else assert(codecs.some(codec => codec.startsWith('video:')));
      console.log('Verified', job.format, buffer.length, 'bytes', codecs.join(', '));
    } finally { fs.unlinkSync(temp); }
  }
  console.log('Live integration passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
