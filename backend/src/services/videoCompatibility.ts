import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { describeMediaError } from './mediaErrors';

const run = promisify(execFile);
export interface MediaStream {
  codec_type?: string;
  codec_name?: string;
  pix_fmt?: string;
}
export const compatibilityPlan = (streams: MediaStream[]) => {
  const video = streams.find((stream) => stream.codec_type === 'video');
  if (!video) throw new Error('O arquivo não contém uma faixa de vídeo.');
  const audio = streams.find((stream) => stream.codec_type === 'audio');
  return {
    copyVideo: video.codec_name === 'h264' && video.pix_fmt === 'yuv420p',
    copyAudio: !audio || audio.codec_name === 'aac',
    hasAudio: Boolean(audio),
  };
};

export const prepareEditingVideo = async (
  inputPath: string,
): Promise<string> => {
  const outputPath = path.join(
    path.dirname(inputPath),
    `${path.parse(inputPath).name} - Premiere.mp4`,
  );
  const partialPath = outputPath + '.partial.mp4';
  try {
    const { stdout } = await run(
      process.env.FFPROBE_PATH || 'ffprobe',
      ['-v', 'error', '-show_streams', '-of', 'json', inputPath],
      { timeout: 30000, maxBuffer: 2 * 1024 * 1024 },
    );
    const plan = compatibilityPlan(JSON.parse(stdout).streams || []);
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-nostdin',
      '-y',
      '-i',
      inputPath,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-sn',
      '-dn',
      '-map_metadata',
      '-1',
    ];
    if (plan.copyVideo) args.push('-c:v', 'copy');
    else
      args.push(
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
        '-vf',
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-threads',
        '2',
      );
    if (plan.hasAudio) {
      if (plan.copyAudio) args.push('-c:a', 'copy');
      else args.push('-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
    }
    args.push('-tag:v', 'avc1', '-movflags', '+faststart', partialPath);
    await run(process.env.FFMPEG_PATH || 'ffmpeg', args, {
      timeout: 60 * 60 * 1000,
      maxBuffer: 2 * 1024 * 1024,
    });
    await fs.rename(partialPath, outputPath);
    return outputPath;
  } catch (error) {
    await fs.rm(partialPath, { force: true }).catch(() => {});
    throw describeMediaError(error);
  }
};
