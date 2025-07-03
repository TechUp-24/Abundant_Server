import { createReadStream, writeFileSync, unlinkSync } from "fs";
import path from "path";
import ytdlp from "yt-dlp-exec";
import OpenAI from "openai";
import dotenv from "dotenv";
import axios from "axios";
import { ForbiddenException } from "gonest";
import fs from "fs";

// Load environment variables
dotenv.config();

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const TEMP_COOKIES_PATH = path.join("/tmp", "cookies.txt");
const FIREBASE_COOKIES_URL = process.env.FIREBASE_COOKIES_URL!;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface VideoInfo {
  title?: string;
  description?: string;
  [key: string]: any;
}

class PlanCreationService {
  async transcribe(videoUrl: string) {
    if (!FIREBASE_COOKIES_URL) {
      throw new ForbiddenException("Firebase cookie URL not configured");
    }

    // Step 1: Download cookies from Firebase
    const cookies = await this.downloadCookiesFromFirebase();

    // Step 2: Write to tmp file
    writeFileSync(TEMP_COOKIES_PATH, cookies);

    console.log("✅ Cookies downloaded and saved to:", TEMP_COOKIES_PATH);

    const filePath = path.join("/tmp", `audio-${Date.now()}.mp3`);

    const ytdlpOptions: any = {
      noWarnings: true,
      preferFreeFormats: true,
      noCheckCertificates: true,
      referer: videoUrl,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      cookies: TEMP_COOKIES_PATH,
      addHeader: [
        "referer:youtube.com",
        "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ],
      verbose: true,
    };

    try {
      // Step 3: Get video metadata
      const videoInfo = await this.getVideoInfoWithRetry(
        videoUrl,
        ytdlpOptions
      );

      const { title, description } = videoInfo;

      if (!title || !description) {
        throw new ForbiddenException("Invalid video metadata");
      }

      // Step 4: Download audio
      await ytdlp(videoUrl, {
        ...ytdlpOptions,
        extractAudio: true,
        audioFormat: "mp3",
        output: filePath,
      });

      // Step 5: Transcribe using Whisper
      const transcript = await openai.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: "whisper-1",
        language: "en",
      });

      // Step 6: Cleanup
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }

      console.log("🎉 All steps completed successfully!");

      return {
        text: transcript.text,
        title,
        description,
      };
    } catch (error: any) {
      console.error("🚨 Error during transcription:", error.message);
      console.error("Error details:", error.stderr || error.stdout || "None");

      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }

      throw error;
    }
  }

  private async downloadCookiesFromFirebase(): Promise<string> {
    console.log("🔄 Downloading cookies from Firebase...");

    try {
      const response = await axios.get(FIREBASE_COOKIES_URL, {
        responseType: "text",
      });

      console.log("✅ Successfully fetched cookies from Firebase");
      return response.data;
    } catch (error: any) {
      console.error("❌ Failed to fetch cookies from Firebase:", error.message);
      throw new ForbiddenException("Failed to fetch cookies from Firebase");
    }
  }

  private async getVideoInfoWithRetry(
    url: string,
    options: any,
    retries = 3
  ): Promise<VideoInfo> {
    while (retries > 0) {
      try {
        return (await ytdlp(url, {
          ...options,
          dumpSingleJson: true,
        })) as VideoInfo;
      } catch (error: any) {
        console.warn(
          `🔁 Retrying video info (${retries} left): ${error.message}`
        );
        console.warn("Error details:", error.stderr || error.stdout || "None");

        await new Promise((resolve) => setTimeout(resolve, 2000));
        retries--;
      }
    }

    throw new Error("Failed to fetch video info after retries");
  }
}

// Helper functions outside class for clarity
function existsSync(path: string): boolean {
  try {
    fs.statSync(path);
    return true;
  } catch {
    return false;
  }
}

export default PlanCreationService;
