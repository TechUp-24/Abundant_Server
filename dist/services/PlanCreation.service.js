"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const yt_dlp_exec_1 = __importDefault(require("yt-dlp-exec"));
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const gonest_1 = require("gonest");
dotenv_1.default.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const COOKIES_PATH = path_1.default.resolve(process.env.YOUTUBE_COOKIES_PATH || "");
const openai = new openai_1.default({ apiKey: OPENAI_API_KEY });
class PlanCreationService {
    transcribe(videoUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("VIDEO URL:", videoUrl);
            console.log("COOKIES PATH:", COOKIES_PATH);
            console.log("Cookies file exists:", (0, fs_1.existsSync)(COOKIES_PATH));
            if ((0, fs_1.existsSync)(COOKIES_PATH)) {
                console.log("Cookies file content:", (0, fs_1.readFileSync)(COOKIES_PATH, "utf-8"));
            }
            const filePath = path_1.default.join("/tmp", `audio-${Date.now()}.mp3`);
            const ytdlpOptions = {
                noWarnings: true,
                preferFreeFormats: true,
                noCheckCertificates: true,
                referer: videoUrl,
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                cookies: COOKIES_PATH,
                addHeader: [
                    "referer:youtube.com",
                    "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                ],
                verbose: true,
            };
            try {
                // Step 1: Get video metadata
                const videoInfo = yield this.getVideoInfoWithRetry(videoUrl, ytdlpOptions);
                console.log("VIDEO INFO:", videoInfo);
                const { title, description } = videoInfo;
                if (!title || !description) {
                    throw new gonest_1.ForbiddenException("Invalid video metadata");
                }
                // Step 2: Download audio
                yield (0, yt_dlp_exec_1.default)(videoUrl, Object.assign(Object.assign({}, ytdlpOptions), { extractAudio: true, audioFormat: "mp3", output: filePath }));
                // Step 3: Transcribe audio using OpenAI Whisper
                const transcript = yield openai.audio.transcriptions.create({
                    file: (0, fs_1.createReadStream)(filePath),
                    model: "whisper-1",
                    language: "en",
                });
                if ((0, fs_1.existsSync)(filePath)) {
                    (0, fs_1.unlinkSync)(filePath);
                }
                return {
                    text: transcript.text,
                };
            }
            catch (error) {
                if ((0, fs_1.existsSync)(filePath)) {
                    (0, fs_1.unlinkSync)(filePath);
                }
                console.error("Transcription error:", error.message || error);
                console.error("Error details:", error.stderr || error.stdout || "No additional details");
                throw error;
            }
        });
    }
    getVideoInfoWithRetry(url_1, options_1) {
        return __awaiter(this, arguments, void 0, function* (url, options, retries = 3) {
            try {
                return (yield (0, yt_dlp_exec_1.default)(url, Object.assign(Object.assign({}, options), { dumpSingleJson: true })));
            }
            catch (error) {
                if (retries > 0) {
                    console.warn(`Retrying video info (${retries} left): ${error.message}`);
                    console.warn(`Error details: ${error.stderr || error.stdout || "No details"}`);
                    yield new Promise((resolve) => setTimeout(resolve, 2000));
                    return this.getVideoInfoWithRetry(url, options, retries - 1);
                }
                throw new Error(`Failed to fetch video info after retries: ${error.message}\n${error.stderr || ""}`);
            }
        });
    }
}
exports.default = PlanCreationService;
