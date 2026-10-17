import React, { useState } from 'react';
import { downloadService } from '../services/api';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('1080p');
  const [metadata, setMetadata] = useState<{ title: string; duration: number; thumbnail?: string } | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchPreview = async () => {
    if (!url) return;
    try {
      setLoading(true);
      const data = await downloadService.getPreview(url);
      setMetadata(data);
      setStatus('');
    } catch (error: any) {
      setStatus('Erro ao carregar pré-visualização. Verifique a URL.');
      console.error('Failed to fetch preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url) return;
    try {
      setLoading(true);
      const response = await downloadService.startDownload({
        url,
        format,
        quality: (format === 'video' ? quality : 'mp3') as '4k' | '1080p' | '720p' | 'mp3',
      });
      setStatus('Iniciando download...');
      checkStatus(response.taskId);
    } catch (error: any) {
      setStatus('Erro ao iniciar download.');
      console.error('Download failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (id: string) => {
    try {
      const data = await downloadService.getStatus(id);
      setStatus(data.message || data.status);

      if (data.status === 'ready') {
        setTimeout(() => {
          downloadService.downloadFile(id);
          setStatus('Download concluído!');
        }, 1000);
      } else if (data.status !== 'pending' && data.status !== 'downloading' && data.status !== 'converting') {
        setStatus(data.status);
      } else {
        setTimeout(() => checkStatus(id), 2000);
      }
    } catch (error: any) {
      console.error('Failed to check status:', error);
      setTimeout(() => checkStatus(id), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Video Downloader</h1>
          <p className="text-gray-400 text-sm sm:text-base">Baixe vídeos e músicas do YouTube e outras plataformas</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl">
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium mb-2">URL do vídeo</label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Cole a URL do vídeo aqui..."
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
                onKeyPress={(e) => e.key === 'Enter' && fetchPreview()}
              />
              <button
                onClick={fetchPreview}
                disabled={!url || loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                Carregar
              </button>
            </div>
          </div>

          {metadata && (
            <div className="mb-6 bg-gray-700 rounded-lg p-4 flex gap-4 flex-col sm:flex-row">
              {metadata.thumbnail && (
                <img
                  src={metadata.thumbnail}
                  alt="Thumbnail"
                  className="w-24 h-16 object-cover rounded flex-shrink-0"
                />
              )}
              <div>
                <h3 className="font-medium text-lg mb-1">{metadata.title}</h3>
                <p className="text-gray-400 text-sm">
                  Duração: {Math.floor(metadata.duration / 60)}:{String(metadata.duration % 60).padStart(2, '0')}
                </p>
              </div>
            </div>
          )}

          {metadata && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Formato</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as 'video' | 'audio')}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
                  >
                    <option value="video">Vídeo</option>
                    <option value="audio">Áudio (MP3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Qualidade</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    disabled={format === 'audio'}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    <option value="4k">4K</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={!url || loading}
                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Baixar
              </button>

              {status && (
                <div className={`text-center p-3 rounded-lg ${
                  status.includes('concluído') ? 'bg-green-900' :
                  status.includes('Erro') ? 'bg-red-900' : 'bg-gray-700'
                }`}>
                  {status}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Formatos suportados: Vídeo (4K/1080p/720p), Áudio (MP3)</p>
          <p className="mt-2 text-xs opacity-75">
            *O processamento é feito via Cloudflare Workers
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
