import { Request, Response, Router } from 'express';
import { createDownload, getDownloadStatus, getDownloadLink, cleanupExpiredDownloads } from '../services';
import { DownloadRequest } from '../types';

const router = Router();

router.post('/download', async (req: Request, res: Response) => {
  try {
    const data: DownloadRequest = req.body;
    const ipAddress = req.ip || 'unknown';

    if (!data.url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await createDownload(data, ipAddress);
    res.status(200).json({ taskId: result.taskId, message: result.message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const status = await getDownloadStatus(taskId);

    if (!status) {
      return res.status(404).json({ error: 'Download not found' });
    }

    res.status(200).json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/preview', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const { getVideoMetadata } = await import('../services');
    const metadata = await getVideoMetadata(url as string);
    res.status(200).json(metadata);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const download = await getDownloadLink(taskId);

    if (!download) {
      return res.status(404).json({ error: 'Download not found or not ready' });
    }

    res.download(download.file_path, download.file_name);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
