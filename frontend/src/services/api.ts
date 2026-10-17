import axios from 'axios';

const API_BASE_URL = 'https://video-downloader.your-username.workers.dev';

export interface DownloadRequest {
  url: string;
  format: 'video' | 'audio';
  quality?: '4k' | '1080p' | '720p' | 'mp3';
}

export interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail?: string;
  available_qualities: string[];
}

export interface DownloadResponse {
  taskId: string;
  message: string;
}

export interface DownloadStatus {
  status: string;
  message?: string;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const downloadService = {
  getPreview: async (url: string): Promise<VideoMetadata> => {
    const response = await api.get('/preview', { params: { url } });
    return response.data;
  },

  startDownload: async (data: DownloadRequest): Promise<DownloadResponse> => {
    const response = await api.post('/download', data);
    return response.data;
  },

  getStatus: async (taskId: string): Promise<DownloadStatus> => {
    const response = await api.get(`/status/${taskId}`);
    return response.data;
  },

  downloadFile: async (taskId: string): Promise<void> => {
    const response = await api.get(`/download/${taskId}`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.headers['content-disposition'].split('filename=')[1] || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
