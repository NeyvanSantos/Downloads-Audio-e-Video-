import { VideoMetadata } from '../types';
import { MediaError } from './mediaErrors';

export const youtubeVideoId = (value: string): string | null => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const youtube = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
  ];
  let id: string | null = null;
  if (host === 'youtu.be' || host === 'www.youtu.be')
    id = url.pathname.split('/')[1];
  else if (youtube.includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(shorts|embed|live)\//.test(url.pathname))
      id = url.pathname.split('/')[2];
  }
  return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
};

export const getYouTubePreview = async (id: string): Promise<VideoMetadata> => {
  const endpoint = new URL('https://www.youtube.com/oembed');
  endpoint.searchParams.set('url', `https://www.youtube.com/watch?v=${id}`);
  endpoint.searchParams.set('format', 'json');
  let response: globalThis.Response;
  try {
    response = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });
  } catch {
    throw new MediaError(
      'SOURCE_TIMEOUT',
      504,
      'O YouTube demorou para responder. Tente novamente em instantes.',
    );
  }
  if (response.status === 429)
    throw new MediaError(
      'SOURCE_RATE_LIMITED',
      429,
      'O YouTube limitou as consultas desta conexão. Aguarde alguns minutos antes de tentar novamente.',
    );
  if ([400, 401, 403, 404].includes(response.status))
    throw new MediaError(
      'MEDIA_UNAVAILABLE',
      422,
      'Este vídeo não tem uma prévia pública disponível. Ele pode estar privado, removido ou ter restrições.',
    );
  if (!response.ok)
    throw new MediaError(
      'SOURCE_UNAVAILABLE',
      502,
      'O YouTube não respondeu à consulta. Tente novamente mais tarde.',
    );
  const info = (await response.json()) as {
    title?: unknown;
    thumbnail_url?: unknown;
  };
  if (typeof info.title !== 'string' || !info.title.trim())
    throw new MediaError(
      'INVALID_METADATA',
      502,
      'O YouTube retornou uma prévia incompleta. Tente novamente.',
    );
  return {
    title: info.title,
    duration: 0,
    thumbnail:
      typeof info.thumbnail_url === 'string' ? info.thumbnail_url : undefined,
    available_qualities: [],
  };
};
