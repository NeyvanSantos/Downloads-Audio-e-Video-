import 'dotenv/config';
import pool from '../database/connection';
import { DownloadRequest, DownloadStatus, VideoMetadata } from '../types';
import { cacheMetadata, getCachedMetadata } from './cache';
import { extractVideoInfo, downloadVideo, cleanupTask } from './mediaProcessor';
import { randomUUID } from 'crypto';
import path from 'path';
import { describeMediaError } from './mediaErrors';
import { youtubeVideoId, getYouTubePreview } from './youtubePreview';

const maxDownloads = 2;
let activeDownloads = 0;

export const getVideoMetadata = async (url: string): Promise<VideoMetadata> => {
  const cached = await getCachedMetadata(url);
  if (cached) return cached;
  const videoId = youtubeVideoId(url);
  if (videoId) {
    const metadata = await getYouTubePreview(videoId);
    await cacheMetadata(url, metadata);
    return metadata;
  }
  const info = await extractVideoInfo(url);
  const heights = new Set<number>(
    (info.formats || []).map((entry: { height?: number }) => entry.height || 0),
  );
  const metadata: VideoMetadata = {
    title: info.title,
    duration: info.duration || 0,
    thumbnail: info.thumbnail,
    available_qualities: [720, 1080, 2160]
      .filter((height) => [...heights].some((value) => value >= height))
      .map((height) => (height === 2160 ? '4k' : `${height}p`)),
  };
  await cacheMetadata(url, metadata);
  return metadata;
};

const processDownload = async (
  taskId: string,
  data: DownloadRequest,
  quality: string,
) => {
  try {
    await pool.query('UPDATE downloads SET status = $1 WHERE id = $2', [
      'downloading',
      taskId,
    ]);
    const filePath = await downloadVideo(
      data.url,
      data.format,
      quality,
      taskId,
    );
    await pool.query(
      "UPDATE downloads SET file_path = $1, file_name = $2, status = $3, expires_at = NOW() + INTERVAL '1 hour' WHERE id = $4",
      [filePath, path.basename(filePath), 'ready', taskId],
    );
  } catch (error) {
    const failure = describeMediaError(error);
    console.error('Download failed:', taskId, failure.code);
    await cleanupTask(taskId).catch(console.error);
    await pool.query(
      'UPDATE downloads SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', failure.message, taskId],
    );
  } finally {
    activeDownloads--;
  }
};

export const createDownload = async (
  data: DownloadRequest,
  ipAddress: string,
) => {
  if (activeDownloads >= maxDownloads)
    throw Object.assign(
      new Error('Servidor ocupado. Tente novamente em instantes.'),
      { status: 429 },
    );
  activeDownloads++;
  const taskId = randomUUID();
  const quality = data.format === 'audio' ? 'mp3' : data.quality || '1080p';
  try {
    await pool.query(
      `INSERT INTO downloads (id, url_original, type, quality, status, ip_address, expires_at) VALUES ($1, $2, $3, $4, 'pending', $5, NOW() + INTERVAL '1 hour')`,
      [taskId, data.url, data.format, quality, ipAddress],
    );
  } catch (error) {
    activeDownloads--;
    throw error;
  }
  void processDownload(taskId, data, quality).catch((error) =>
    console.error('Failed to persist task failure:', error),
  );
  return { taskId, message: 'Download iniciado' };
};

export const getDownloadStatus = async (
  taskId: string,
): Promise<DownloadStatus | null> => {
  const result = await pool.query(
    'SELECT status, error_message FROM downloads WHERE id = $1 AND expires_at > NOW()',
    [taskId],
  );
  if (!result.rows.length) return null;
  const status = result.rows[0].status;
  return {
    status,
    message:
      status === 'failed'
        ? result.rows[0].error_message ||
          'O processamento falhou. Tente novamente.'
        : status === 'ready'
          ? 'Arquivo pronto'
          : undefined,
  };
};

export const getDownloadLink = async (
  taskId: string,
): Promise<{ file_path: string; file_name: string } | null> => {
  const result = await pool.query(
    'SELECT file_path, file_name FROM downloads WHERE id = $1 AND status = $2 AND expires_at > NOW()',
    [taskId, 'ready'],
  );
  return result.rows[0] || null;
};

export const cleanupExpiredDownloads = async () => {
  const result = await pool.query(
    "SELECT id, file_path FROM downloads WHERE expires_at < NOW() AND status NOT IN ('pending', 'downloading', 'converting')",
  );
  for (const row of result.rows) {
    await cleanupTask(row.id);
    await pool.query('DELETE FROM downloads WHERE id = $1', [row.id]);
  }
};
