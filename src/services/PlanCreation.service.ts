import { createReadStream, unlinkSync, existsSync } from "fs";
import path from "path";
import ytdlp from "yt-dlp-exec"; // ⬅️ NEW PACKAGE
import OpenAI from "openai";
import dotenv from "dotenv";
import { ForbiddenException } from "gonest";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const COOKIES_PATH = '../../cookies.txt'; // works for IG too

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface VideoInfo {
  title?: string;
  description?: string;
  [key: string]: any;
}

class PlanCreationService {
  constructor() {}

  async transcribe(videoUrl: string) {
    console.log("VIDEO URL", videoUrl);
    console.log("COOKIES PATH", COOKIES_PATH);

    console.log("Cookies file found?", existsSync(COOKIES_PATH));

    const fileName = `audio-${Date.now()}.mp3`;
    const filePath = path.join("/tmp", fileName);

    try {
      const ytdlpOptions: any = {
        noWarnings: true,
        preferFreeFormats: true,
        noCheckCertificates: true,
        referer: videoUrl,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      };

      if (COOKIES_PATH) {
        ytdlpOptions.cookies = COOKIES_PATH;
      }

      // Step 1: Get video metadata
      const videoInfo = await this.getVideoInfoWithRetry(
        videoUrl,
        ytdlpOptions
      );
      console.log("VIDEO INFO", videoInfo);

      const { title, description } = videoInfo;
      if (!title || !description) {
        throw new ForbiddenException("Invalid video metadata");
      }

      // Step 2: Download audio
      await ytdlp(videoUrl, {
        ...ytdlpOptions,
        extractAudio: true,
        audioFormat: "mp3",
        output: filePath,
      });

      // Step 3: Transcribe audio
      const audioStream = createReadStream(filePath);
      const transcript = await openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
        language: "en",
      });

      console.log("TRANSCRIPT", transcript);

      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }

      return {
        text: transcript.text,
      };
    } catch (error: any) {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
      console.error("Error in transcription:", error?.message || error);
      throw error;
    }
  }

  private async getVideoInfoWithRetry(
    url: string,
    options: any,
    retries = 3
  ): Promise<VideoInfo> {
    try {
      return (await ytdlp(url, {
        ...options,
        dumpSingleJson: true,
      })) as VideoInfo;
    } catch (error: any) {
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left):`, error.message);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.getVideoInfoWithRetry(url, options, retries - 1);
      }
      throw new Error(
        `Failed to fetch video info after retries: ${error.message}`
      );
    }
  }
}

export default PlanCreationService;
