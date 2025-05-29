import { createReadStream, unlinkSync, existsSync, readFileSync } from "fs";
import path from "path";
import ytdlp from "yt-dlp-exec";
import OpenAI from "openai";
import dotenv from "dotenv";
import { ForbiddenException } from "gonest";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const COOKIES_PATH = path.resolve(process.env.YOUTUBE_COOKIES_PATH || "");

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface VideoInfo {
  title?: string;
  description?: string;
  [key: string]: any;
}

class PlanCreationService {
  async transcribe(videoUrl: string) {
    console.log("VIDEO URL:", videoUrl);
    console.log("COOKIES PATH:", COOKIES_PATH);
    console.log("Cookies file exists:", existsSync(COOKIES_PATH));

    if (existsSync(COOKIES_PATH)) {
      console.log("Cookies file content:", readFileSync(COOKIES_PATH, "utf-8"));
    }

    const filePath = path.join("/tmp", `audio-${Date.now()}.mp3`);

    const ytdlpOptions: any = {
      noWarnings: true,
      preferFreeFormats: true,
      noCheckCertificates: true,
      referer: videoUrl,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      cookies: COOKIES_PATH,
      addHeader: [
        "referer:youtube.com",
        "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ],
      verbose: true,
    };

    try {
      // Step 1: Get video metadata
      const videoInfo = await this.getVideoInfoWithRetry(
        videoUrl,
        ytdlpOptions
      );
      console.log("VIDEO INFO:", videoInfo);

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

      // Step 3: Transcribe audio using OpenAI Whisper
      const transcript = await openai.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: "whisper-1",
        language: "en",
      });

      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }

      console.log("All the things perfectly working")

      return {
        text: transcript.text,
      };
    } catch (error: any) {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
      console.error("Transcription error:", error.message || error);
      console.error(
        "Error details:",
        error.stderr || error.stdout || "No additional details"
      );
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
        console.warn(`Retrying video info (${retries} left): ${error.message}`);
        console.warn(
          `Error details: ${error.stderr || error.stdout || "No details"}`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.getVideoInfoWithRetry(url, options, retries - 1);
      }
      throw new Error(
        `Failed to fetch video info after retries: ${error.message}\n${error.stderr || ""}`
      );
    }
  }
}

export default PlanCreationService;
