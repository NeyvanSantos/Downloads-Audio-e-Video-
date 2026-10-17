import { NextFunction, Request, Response, Router } from 'express';
import { createDownload, getDownloadStatus, getDownloadLink, getVideoMetadata } from '../services';
import { DownloadRequest } from '../types';
import { validatePublicUrl, validateTaskId } from '../validation';

const router = Router();
const wrap = (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void handler(req, res).catch(next); };

router.post('/download', wrap(async (req, res) => {
  const url = await validatePublicUrl(req.body?.url);
  const { format, quality } = req.body;
  if (!['video', 'audio'].includes(format) || (quality && !['4k', '1080p', '720p', 'mp3'].includes(quality)) || (format === 'video' && quality === 'mp3')) {
    return res.status(400).json({ error: 'Formato ou qualidade inválidos.' });
  }
  const result = await createDownload({ url, format, quality } as DownloadRequest, req.ip || 'unknown');
  return res.status(202).json(result);
}));
router.get('/status/:taskId', wrap(async (req, res) => {
  validateTaskId(req.params.taskId);
  const status = await getDownloadStatus(req.params.taskId);
  return status ? res.json(status) : res.status(404).json({ error: 'Download não encontrado ou expirado.' });
}));
router.get('/preview', wrap(async (req, res) => {
  const url = await validatePublicUrl(req.query.url);
  return res.json(await getVideoMetadata(url));
}));
router.get('/download/:taskId', wrap(async (req, res) => {
  validateTaskId(req.params.taskId);
  const download = await getDownloadLink(req.params.taskId);
  if (!download) return res.status(404).json({ error: 'Download indisponível ou expirado.' });
  res.download(download.file_path, download.file_name, error => {
    if (error && !res.headersSent) res.status(404).json({ error: 'Arquivo indisponível.' });
  });
}));
export default router;
