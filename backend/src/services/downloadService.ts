import pool from '../database/connection';
import { DownloadRequest, DownloadStatus, VideoMetadata, DownloadRecord } from '../types';
import { cacheMetadata, getCachedMetadata, invalidateCache } from './cache';
import { extractVideoInfo, downloadVideo, convertToMp3, cleanupFile } from './mediaProcessor';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Client } from 'redis';

const DOWNLOADED_FILES_DIR = path.join(__dirname, '../../downloads');

const getLatestFile = (directory: string): string | null => {
  const files = fs.readdirSync(directory).map(file => {
    const filePath = path.join(directory, file);
    return { file, mtime: fs.statSync(filePath).mtime };
  }).sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  
  return files.length > 0 ? files[0].file : null;
};

export const getVideoMetadata = async (url: string): Promise<VideoMetadata> => {
  const cached = await getCachedMetadata(url);
  if (cached) {
    return cached;
  }

  const info = await extractVideoInfo(url);
  const metadata: VideoMetadata = {
    title: info.title,
    duration: info.duration,
    thumbnail: info.thumbnail,
    available_qualities: ['720p', '1080p', '4k']
  };

  await cacheMetadata(url, metadata);
  return metadata;
};

export const createDownload = async (data: DownloadRequest, ipAddress: string): Promise<{ taskId: string; message: string }> => {
  const taskId = uuidv4();
  const quality = data.format === 'audio' ? 'mp3' : (data.quality || '1080p');

  const query = `
    INSERT INTO downloads (id, url_original, type, quality, status, ip_address, expires_at)
    VALUES ($1, $2, $3, $4, 'pending', $5, NOW() + INTERVAL '1 hour')
    RETURNING *
  `;
  
  const values = [taskId, data.url, data.format, quality, ipAddress];
  const result = await pool.query(query, values);

  try {
    const metadata = await getVideoMetadata(data.url);
    
    await pool.query(
      'UPDATE downloads SET url_extracted = $1, status = $2 WHERE id = $3',
      [data.url, 'downloading', taskId]
    );

    const outputDir = path.join(__dirname, '../../downloads');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await downloadVideo(data.url, data.format, quality);

    const latestFile = getLatestFile(outputDir);
    if (latestFile) {
      const filePath = path.join(outputDir, latestFile);
      await pool.query(
        'UPDATE downloads SET file_path = $1, file_name = $2, status = $3 WHERE id = $4',
        [filePath, latestFile, 'ready', taskId]
      );

      if (data.format === 'audio') {
        const mp3Path = filePath.replace(/\.[^/.]+$/, '.mp3');
        await convertToMp3(filePath, mp3Path);
        await cleanupFile(filePath);
        
        await pool.query(
          'UPDATE downloads SET file_path = $1, file_name = $2 WHERE id = $3',
          [mp3Path, path.basename(mp3Path), taskId]
        );
      }
    }

    await invalidateCache(data.url);

    return { taskId, message: 'Download iniciado com sucesso' };
  } catch (error: any) {
    await pool.query('UPDATE downloads SET status = $1 WHERE id = $2', ['failed', taskId]);
    throw new Error(`Download failed: ${error.message}`);
  }
};

export const getDownloadStatus = async (taskId: string): Promise<DownloadStatus | null> => {
  const result = await pool.query(
    'SELECT status, file_path, file_name, created_at FROM downloads WHERE id = $1',
    [taskId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    status: row.status as DownloadStatus['status'],
    message: row.status === 'ready' ? 'Download completo' : undefined
  };
};

export const getDownloadLink = async (taskId: string): Promise<{ file_path: string; file_name: string } | null> => {
  const result = await pool.query(
    'SELECT file_path, file_name FROM downloads WHERE id = $1 AND status = $2',
    [taskId, 'ready']
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    file_path: result.rows[0].file_path,
    file_name: result.rows[0].file_name
  };
};

export const cleanupExpiredDownloads = async () => {
  const result = await pool.query(
    'SELECT file_path FROM downloads WHERE expires_at < NOW() AND file_path IS NOT NULL'
  );

  for (const row of result.rows) {
    await cleanupFile(row.file_path);
  }

  await pool.query('DELETE FROM downloads WHERE expires_at < NOW()');
};
