import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

const YT_DLP_PATH = process.env.YT_DLP_PATH || 'yt-dlp';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

export const extractVideoInfo = async (url: string) => {
  try {
    const { stdout } = await execPromise(`${YT_DLP_PATH} --dump-json --no-playlist "${url}"`);
    return JSON.parse(stdout);
  } catch (error: any) {
    throw new Error(`Failed to extract video info: ${error.message}`);
  }
};

export const downloadVideo = async (url: string, format: 'video' | 'audio', quality: string) => {
  const outputDir = path.join(__dirname, '../../downloads');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');
  
  let formatOptions = '';
  if (format === 'video') {
    if (quality === '4k') {
      formatOptions = '-f "bestvideo[height<=2160]+bestaudio/best[height<=2160]"';
    } else if (quality === '1080p') {
      formatOptions = '-f "bestvideo[height<=1080]+bestaudio/best[height<=1080]"';
    } else if (quality === '720p') {
      formatOptions = '-f "bestvideo[height<=720]+bestaudio/best[height<=720]"';
    } else {
      formatOptions = '-f bestvideo+bestaudio';
    }
  } else {
    formatOptions = '-f bestaudio --extract-audio --audio-format mp3 --audio-quality 0';
  }

  try {
    const { stdout } = await execPromise(
      `${YT_DLP_PATH} ${formatOptions} -o "${outputTemplate}" "${url}"`,
      { maxBuffer: 1024 * 1024 * 100 }
    );
    return stdout;
  } catch (error: any) {
    throw new Error(`Download failed: ${error.message}`);
  }
};

export const convertToMp3 = async (inputPath: string, outputPath: string) => {
  try {
    await execPromise(`${FFMPEG_PATH} -i "${inputPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}"`);
    return outputPath;
  } catch (error: any) {
    throw new Error(`MP3 conversion failed: ${error.message}`);
  }
};

export const cleanupFile = async (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to cleanup file ${filePath}:`, error);
  }
};
