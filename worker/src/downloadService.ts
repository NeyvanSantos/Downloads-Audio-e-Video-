import { extractVideoInfo, downloadVideo, convertToMp3, cleanupFile } from './mediaProcessor';
import { DownloadRequest } from './types';

const DOWNLOADS_DIR = './downloads';

// Simple in-memory storage (not persistent - for GitHub Pages serverless edge functions)
const downloadCache = new Map<string, { status: string; file?: string }>();

export const getVideoMetadata = async (url: string) => {
  try {
    const info = await extractVideoInfo(url);
    return {
      title: info.title,
      duration: info.duration || 0,
      thumbnail: info.thumbnail,
      available_qualities: ['720p', '1080p', '4k']
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch video metadata: ${error.message}`);
  }
};

export const createDownload = async (data: DownloadRequest, clientId: string) => {
  const taskId = `${clientId}_${Date.now()}`;
  const quality = data.format === 'audio' ? 'mp3' : (data.quality || '1080p');

  // Inicializa status
  downloadCache.set(taskId, { status: 'downloading' });

  try {
    // Download do vídeo
    await downloadVideo(data.url, data.format, quality);

    // Busca o arquivo mais recente
    const files = (await Deno.readDir(DOWNLOADS_DIR)).map(f => f.name);
    const latestFile = files.length > 0 ? files[files.length - 1] : null;

    if (latestFile) {
      const filePath = `${DOWNLOADS_DIR}/${latestFile}`;

      if (data.format === 'audio') {
        // Converte para MP3
        const mp3Path = filePath.replace(/\.[^/.]+$/, '.mp3');
        await convertToMp3(filePath, mp3Path);
        cleanupFile(filePath);
        downloadCache.set(taskId, { status: 'ready', file: mp3Path });
      } else {
        downloadCache.set(taskId, { status: 'ready', file: filePath });
      }
    }

    return { taskId, message: 'Download iniciado' };
  } catch (error: any) {
    downloadCache.set(taskId, { status: 'failed' });
    throw new Error(`Download failed: ${error.message}`);
  }
};

export const getDownloadStatus = async (taskId: string) => {
  const status = downloadCache.get(taskId);
  if (!status) return null;
  return { status: status.status };
};

export const getDownloadLink = async (taskId: string) => {
  const status = downloadCache.get(taskId);
  if (!status || status.status !== 'ready') return null;
  return { file_path: status.file, file_name: status.file?.split('/').pop() };
};

export const cleanupExpiredDownloads = async () => {
  // Limpa cache antigo (mais de 1 hora)
  const now = Date.now();
  for (const [taskId, data] of downloadCache.entries()) {
    const timestamp = parseInt(taskId.split('_')[1]);
    if (now - timestamp > 3600000) {
      if (data.file) cleanupFile(data.file);
      downloadCache.delete(taskId);
    }
  }
};
