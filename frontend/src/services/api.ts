import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : '');

export const apiConfigured = Boolean(API_BASE_URL);

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
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (!apiConfigured) throw new Error('A API de downloads ainda não foi configurada.');
  return config;
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
    if (!apiConfigured) throw new Error('A API de downloads ainda não foi configurada.');
    const a = document.createElement('a');
    a.href = `${API_BASE_URL}/download/${encodeURIComponent(taskId)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};
