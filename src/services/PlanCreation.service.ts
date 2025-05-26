import { createReadStream, unlinkSync, existsSync } from "fs";
import path from "path";
import youtubedl from "youtube-dl-exec";
import OpenAI from "openai";
import dotenv from "dotenv";
import { ForbiddenException } from "gonest";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const YOUTUBE_COOKIES_PATH = process.env.YOUTUBE_COOKIES_PATH; // Add this to your .env


console.log("OPENAI API KEY", OPENAI_API_KEY);

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface VideoInfo {
  title?: string;
  description?: string;
  [key: string]: any;
}

class PlanCreationService {
  constructor() {}

  async transcribe(youtubeUrl: string) {
    console.log("YOUTUBE URL", youtubeUrl);
    console.log("YOUTUBE COOKIES PATH", YOUTUBE_COOKIES_PATH);


    const fileName = `audio-${Date.now()}.mp3`;
    const filePath = path.join("/tmp", fileName);
    
    try {
      // Common options for all youtube-dl requests
      const ytdlOptions = {
        noWarnings: true,
        preferFreeFormats: true,
        noCheckCertificates: true,
        referer: youtubeUrl,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        ...(YOUTUBE_COOKIES_PATH ? { cookies: YOUTUBE_COOKIES_PATH } : {}),
      };

      // Step 1: Get video metadata with retry logic
      const videoInfo = await this.getVideoInfoWithRetry(
        youtubeUrl,
        ytdlOptions
      );

      console.log("VIDEO INFO", videoInfo);

      const { title, description } = videoInfo;
      if (!title || !description) {
        throw new ForbiddenException("Invalid video metadata");
      }

      // Step 2: Download audio
      await youtubedl(youtubeUrl, {
        ...ytdlOptions,
        extractAudio: true,
        audioFormat: "mp3",
        output: filePath,
      });

      // Step 3: Transcribe with Whisper
      const audioStream = createReadStream(filePath);
      const transcript = await openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
        language: "en",
      });

      console.log("TRANSCRIPT", transcript);

      // Cleanup
      unlinkSync(filePath);

      // Step 4: Return result
      return {
        text: transcript.text,
      };
    } catch (error) {
      if (filePath && existsSync(filePath)) {
        unlinkSync(filePath);
      }
      console.error("Error in transcription:", error);
      throw error;
    }
  }

  private async getVideoInfoWithRetry(
    url: string,
    options: any,
    retries = 3
  ): Promise<VideoInfo> {
    try {
      return (await youtubedl(url, {
        ...options,
        dumpSingleJson: true,
      })) as VideoInfo;
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        return this.getVideoInfoWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }
}

export default PlanCreationService;
