import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { apiConfigured, downloadService, VideoMetadata } from '../services/api';
import downloadSchema from '../types/validation';

const errorMessage = (error: unknown) => axios.isAxiosError(error)
  ? error.response?.data?.error || error.message
  : error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('1080p');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const generation = useRef(0);
  const busy = useRef(false);

  useEffect(() => () => {
    generation.current++;
    clearTimeout(timer.current);
  }, []);

  const requestData = () => downloadSchema.parse({
    url: url.trim(), format, quality: format === 'audio' ? 'mp3' : quality,
  });

  const fetchPreview = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setMetadata(null);
    setStatus('');
    try {
      const data = await downloadService.getPreview(requestData().url);
      setMetadata(data);
    } catch (error) {
      setStatus(`Erro: ${errorMessage(error)}`);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const checkStatus = async (id: string, token: number) => {
    try {
      const data = await downloadService.getStatus(id);
      if (generation.current !== token) return;
      setStatus(data.message || data.status);
      if (data.status === 'ready') {
        await downloadService.downloadFile(id);
        setStatus('Arquivo pronto. Download solicitado ao navegador.');
      } else if (['pending', 'downloading', 'converting'].includes(data.status)) {
        timer.current = setTimeout(() => void checkStatus(id, token), 2000);
        return;
      } else {
        setStatus(`Erro: ${data.message || 'O processamento falhou.'}`);
      }
    } catch (error) {
      if (generation.current !== token) return;
      setStatus(`Erro ao acompanhar download: ${errorMessage(error)}`);
    }
    if (generation.current === token) {
      busy.current = false;
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    const token = ++generation.current;
    try {
      const response = await downloadService.startDownload(requestData());
      setStatus('Iniciando download...');
      void checkStatus(response.taskId, token);
    } catch (error) {
      setStatus(`Erro: ${errorMessage(error)}`);
      busy.current = false;
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-gray-900 to-gray-800 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Video Downloader</h1>
          <p className="text-gray-400">Baixe vídeos e músicas a partir de uma URL</p>
        </header>
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-2xl">
          {!apiConfigured && <p role="status" className="mb-6 p-4 rounded-lg bg-amber-900 text-amber-100">O site está disponível. A API de downloads ainda precisa ser configurada pelo administrador.</p>}
          <label htmlFor="video-url" className="block text-sm font-medium mb-2">URL do vídeo</label>
          <div className="flex gap-2 flex-col sm:flex-row mb-6">
            <input id="video-url" type="url" value={url} disabled={loading}
              onChange={(event) => { setUrl(event.target.value); setMetadata(null); setStatus(''); }}
              placeholder="Cole a URL do vídeo aqui..."
              className="flex-1 min-w-0 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg"
              onKeyDown={(event) => { if (event.key === 'Enter' && apiConfigured) void fetchPreview(); }} />
            <button onClick={() => void fetchPreview()} disabled={!url.trim() || loading || !apiConfigured}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">Carregar</button>
          </div>
          {metadata && <>
            <div className="mb-6 bg-gray-700 rounded-lg p-4 flex gap-4">
              {metadata.thumbnail && <img src={metadata.thumbnail} alt="Capa do vídeo" className="w-24 h-16 object-cover rounded" />}
              <div><h2 className="font-medium text-lg">{metadata.title}</h2>
                <p className="text-gray-400 text-sm">Duração: {Math.floor((metadata.duration || 0) / 60)}:{String(Math.floor((metadata.duration || 0) % 60)).padStart(2, '0')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label htmlFor="format" className="block mb-2">Formato</label>
                <select id="format" value={format} disabled={loading} onChange={(event) => setFormat(event.target.value as 'video' | 'audio')} className="w-full px-4 py-3 bg-gray-700 rounded-lg">
                  <option value="video">Vídeo</option><option value="audio">Áudio (MP3)</option>
                </select></div>
              <div><label htmlFor="quality" className="block mb-2">Qualidade</label>
                <select id="quality" value={quality} disabled={loading || format === 'audio'} onChange={(event) => setQuality(event.target.value)} className="w-full px-4 py-3 bg-gray-700 rounded-lg disabled:opacity-50">
                  <option value="4k">Até 4K</option><option value="1080p">Até 1080p</option><option value="720p">Até 720p</option>
                </select></div>
            </div>
            <button onClick={() => void handleDownload()} disabled={loading || !apiConfigured} className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg disabled:opacity-50">{loading ? 'Processando...' : 'Baixar'}</button>
          </>}
          {status && <p role="status" className={`mt-4 text-center p-3 rounded-lg ${status.startsWith('Erro') ? 'bg-red-900' : 'bg-gray-700'}`}>{status}</p>}
        </div>
        <p className="mt-8 text-center text-gray-400 text-sm">Vídeo até 4K e áudio MP3. A qualidade depende da fonte.</p>
      </div>
    </main>
  );
};

export default App;
