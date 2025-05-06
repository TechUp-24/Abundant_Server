import { createReadStream, unlinkSync, existsSync } from "fs";
import path from "path";
import youtubedl from "youtube-dl-exec";
import OpenAI from "openai";
import dotenv from "dotenv";
import { ForbiddenException } from "gonest";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

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

    const fileName = `audio-${Date.now()}.mp3`;
    const filePath = path.join("/tmp", fileName);

    try {
      // Step 1: Get video metadata
      const videoInfo = (await youtubedl(youtubeUrl, {
        dumpSingleJson: true,
        noWarnings: true,
        preferFreeFormats: true,
      })) as VideoInfo;

      console.log("VIDEO INFO", videoInfo);

      const { title, description } = videoInfo;
      if (!title || !description)
        throw new ForbiddenException("Invalid video metadata");

      // Step 2: Download audio
      await youtubedl(youtubeUrl, {
        extractAudio: true,
        audioFormat: "mp3",
        output: filePath,
        preferFreeFormats: true,
        noCheckCertificates: true,
        noWarnings: true,
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
      throw error;
    }
  }
}

export default PlanCreationService;
