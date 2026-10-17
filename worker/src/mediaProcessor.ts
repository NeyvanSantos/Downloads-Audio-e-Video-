import { readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execPromise = promisify(exec);

const DOWNLOADS_DIR = join(__dirname, '../../downloads');

if (!existsSync(DOWNLOADS_DIR)) {
  mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

export const extractVideoInfo = async (url: string) => {
  try {
    const result = await execPromise(`yt-dlp --dump-json --no-playlist "${url}"`);
    return JSON.parse(result.stdout);
  } catch (error: any) {
    throw new Error(`Failed to extract video info: ${error.message}`);
  }
};

export const downloadVideo = async (url: string, format: 'video' | 'audio', quality: string) => {
  const outputTemplate = join(DOWNLOADS_DIR, '%(title)s.%(ext)s');
  
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
    const result = await execPromise(
      `yt-dlp ${formatOptions} -o "${outputTemplate}" "${url}"`,
      { maxBuffer: 1024 * 1024 * 100 }
    );
    return result.stdout;
  } catch (error: any) {
    throw new Error(`Download failed: ${error.message}`);
  }
};

export const convertToMp3 = async (inputPath: string, outputPath: string) => {
  try {
    await execPromise(`ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}"`);
    return outputPath;
  } catch (error: any) {
    throw new Error(`MP3 conversion failed: ${error.message}`);
  }
};

export const cleanupFile = (filePath: string) => {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to cleanup file ${filePath}:`, error);
  }
};
