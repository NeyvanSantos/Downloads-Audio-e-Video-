const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  youtubeVideoId,
  getYouTubePreview,
} = require('../dist/services/youtubePreview');
const { describeMediaError } = require('../dist/services/mediaErrors');

test('YouTube link recognition accepts video, short, embed and live URLs without trusting lookalike domains', () => {
  for (const link of [
    'https://www.youtube.com/watch?v=EQiQ2SaJ-Ls',
    'https://youtu.be/EQiQ2SaJ-Ls?t=1',
    'https://youtube.com/shorts/EQiQ2SaJ-Ls',
    'https://youtube.com/embed/EQiQ2SaJ-Ls',
    'https://youtube.com/live/EQiQ2SaJ-Ls',
  ])
    assert.equal(youtubeVideoId(link), 'EQiQ2SaJ-Ls');
  for (const link of [
    'https://youtube.com.attacker.example/watch?v=EQiQ2SaJ-Ls',
    'https://example.com/EQiQ2SaJ-Ls',
    'https://youtube.com/watch?v=invalid',
  ])
    assert.equal(youtubeVideoId(link), null);
});

test('public preview uses only YouTube oEmbed and does not promise unknown duration or formats', async () => {
  const original = global.fetch;
  try {
    global.fetch = async (url) => {
      assert.equal(url.origin, 'https://www.youtube.com');
      assert.equal(url.pathname, '/oembed');
      assert.equal(
        url.searchParams.get('url'),
        'https://www.youtube.com/watch?v=EQiQ2SaJ-Ls',
      );
      return Response.json({
        title: 'sample',
        thumbnail_url: 'https://i.ytimg.com/sample.jpg',
      });
    };
    const data = await getYouTubePreview('EQiQ2SaJ-Ls');
    assert.equal(data.title, 'sample');
    assert.equal(data.duration, 0);
    assert.deepEqual(data.available_qualities, []);
  } finally {
    global.fetch = original;
  }
});

test('public preview reports an unavailable video instead of returning an empty success', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => new Response('', { status: 404 });
    await assert.rejects(getYouTubePreview('EQiQ2SaJ-Ls'), {
      code: 'MEDIA_UNAVAILABLE',
      status: 422,
    });
  } finally {
    global.fetch = original;
  }
});

test('source failures become actionable messages without exposing stderr or local paths', () => {
  const rate = describeMediaError({
    stderr: 'HTTP Error 429: Too Many Requests, secret-path',
  });
  assert.equal(rate.status, 429);
  assert.equal(rate.code, 'SOURCE_RATE_LIMITED');
  assert(!rate.message.includes('secret-path'));
  const login = describeMediaError({
    stderr: 'Sign in to confirm you’re not a bot. secret-cookie',
  });
  assert.equal(login.status, 403);
  assert.equal(login.code, 'SOURCE_LOGIN_REQUIRED');
  assert(!login.message.includes('secret-cookie'));
  assert.equal(describeMediaError({ killed: true }).status, 504);
});
