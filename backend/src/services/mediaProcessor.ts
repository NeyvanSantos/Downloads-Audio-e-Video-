import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { describeMediaError } from './mediaErrors';
import { youtubeVideoId } from './youtubePreview';

const run = promisify(execFile);
export const downloadsDir = path.resolve(__dirname, '../../downloads');
const ytDlp = () => process.env.YT_DLP_PATH || 'yt-dlp';
const commonArgs = (url: string) => {
  const args = ['--ignore-config', '--no-playlist', '--js-runtimes', 'node'];
  const cookies = process.env.YT_DLP_COOKIES_FILE;
  if (cookies && youtubeVideoId(url)) {
    if (!existsSync(cookies))
      throw new Error('Configured YouTube session is missing');
    args.push('--cookies', cookies);
  }
  return args;
};

export const extractVideoInfo = async (url: string) => {
  try {
    const { stdout } = await run(
      ytDlp(),
      [...commonArgs(url), '--dump-single-json', '--skip-download', '--', url],
      {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    const info = JSON.parse(stdout);
    if (!info || typeof info.title !== 'string')
      throw new Error('Invalid metadata');
    return info;
  } catch (error) {
    throw describeMediaError(error);
  }
};

export const downloadVideo = async (
  url: string,
  format: 'video' | 'audio',
  quality: string,
  taskId: string,
) => {
  const directory = path.join(downloadsDir, taskId);
  await fs.mkdir(directory, { recursive: true });
  const args = [
    ...commonArgs(url),
    '--no-simulate',
    '-o',
    path.join(directory, '%(title).150B.%(ext)s'),
    '--print',
    'after_move:filepath',
  ];
  if (process.env.FFMPEG_PATH)
    args.push('--ffmpeg-location', process.env.FFMPEG_PATH);
  if (format === 'audio') {
    args.push(
      '-f',
      'bestaudio/best',
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
    );
  } else {
    const height = quality === '4k' ? 2160 : quality === '720p' ? 720 : 1080;
    args.push(
      '-f',
      `bestvideo[height<=${height}]+bestaudio/best[height<=?${height}]`,
      '--merge-output-format',
      'mp4',
    );
  }
  args.push('--', url);
  let stdout: string;
  try {
    ({ stdout } = await run(ytDlp(), args, {
      timeout: 30 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
    }));
  } catch (error) {
    throw describeMediaError(error);
  }
  const filePath = path.resolve(stdout.trim().split(/\r?\n/).pop() || '');
  if (!filePath.startsWith(directory + path.sep))
    throw new Error('Caminho de arquivo inválido.');
  await fs.access(filePath);
  return filePath;
};

export const cleanupFile = async (filePath: string) => {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(downloadsDir + path.sep))
    throw new Error('Caminho de limpeza inválido.');
  await fs.rm(resolved, { force: true });
  // Each task owns its directory; remove it only if empty.
  await fs.rmdir(path.dirname(resolved)).catch(() => {});
};

export const cleanupTask = async (taskId: string) => {
  if (!/^[a-f0-9-]{36}$/i.test(taskId))
    throw new Error('Identificador inválido.');
  const directory = path.join(downloadsDir, taskId);
  const files = await fs.readdir(directory).catch(() => []);
  for (const file of files) await cleanupFile(path.join(directory, file));
  await fs.rmdir(directory).catch(() => {});
};
