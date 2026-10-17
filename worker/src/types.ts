export interface DownloadRequest {
  url: string;
  format: 'video' | 'audio';
  quality?: '4k' | '1080p' | '720p' | 'mp3';
}

export interface DownloadStatus {
  status: 'pending' | 'downloading' | 'converting' | 'ready' | 'failed';
  progress?: number;
  message?: string;
}

export interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail?: string;
  available_qualities: string[];
}

export interface DownloadRecord {
  id: string;
  url_original: string;
  url_extracted?: string;
  type: 'video' | 'audio';
  quality: string;
  status: string;
  file_path?: string;
  file_name?: string;
  created_at: string;
  expires_at: string;
}
