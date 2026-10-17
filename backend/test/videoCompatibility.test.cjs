const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compatibilityPlan } = require('../dist/services/videoCompatibility');
test('AV1 and Opus require H.264 and AAC conversion', () => {
  assert.deepEqual(
    compatibilityPlan([
      { codec_type: 'video', codec_name: 'av1', pix_fmt: 'yuv420p' },
      { codec_type: 'audio', codec_name: 'opus' },
    ]),
    { copyVideo: false, copyAudio: false, hasAudio: true },
  );
});
test('compatible H.264 and AAC are copied without quality loss', () => {
  assert.deepEqual(
    compatibilityPlan([
      { codec_type: 'video', codec_name: 'h264', pix_fmt: 'yuv420p' },
      { codec_type: 'audio', codec_name: 'aac' },
    ]),
    { copyVideo: true, copyAudio: true, hasAudio: true },
  );
});
test('10-bit H.264 must become 8-bit 4:2:0; silent videos remain supported', () => {
  assert.deepEqual(
    compatibilityPlan([
      { codec_type: 'video', codec_name: 'h264', pix_fmt: 'yuv420p10le' },
    ]),
    { copyVideo: false, copyAudio: true, hasAudio: false },
  );
  assert.throws(() =>
    compatibilityPlan([{ codec_type: 'audio', codec_name: 'aac' }]),
  );
});
