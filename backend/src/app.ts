import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import routes from './routes';
import { cleanupExpiredDownloads } from './services';
import pool from './database/connection';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(origin => origin.trim()) }));
app.use(express.json({ limit: '8kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
const requests = new Map<string, { count: number; expires: number }>();
app.use('/api', (req, res, next) => {
  if (req.path !== '/preview' && !(req.path === '/download' && req.method === 'POST')) return next();
  const now = Date.now();
  for (const [key, value] of requests) if (value.expires <= now) requests.delete(key);
  const key = req.ip || 'unknown';
  const value = requests.get(key) || { count: 0, expires: now + 60000 };
  requests.set(key, value);
  if (++value.count > 20) return res.status(429).json({ error: 'Muitas solicitações. Aguarde um minuto.' });
  next();
}, routes);
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 500 ? 'Não foi possível processar a solicitação.' : error.message });
});

if (require.main === module) {
  void (async () => {
    await pool.query("UPDATE downloads SET status = 'failed' WHERE status IN ('pending', 'downloading', 'converting')");
    await cleanupExpiredDownloads();
    const timer = setInterval(() => { void cleanupExpiredDownloads().catch(console.error); }, 60000);
    timer.unref();
    app.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log('Backend ready'));
  })().catch(error => { console.error('Startup failed:', error); process.exitCode = 1; });
}
export default app;
