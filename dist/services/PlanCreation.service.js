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
const axios_1 = __importDefault(require("axios"));
const gonest_1 = require("gonest");
const fs_2 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config();
// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEMP_COOKIES_PATH = path_1.default.join("/tmp", "cookies.txt");
const FIREBASE_COOKIES_URL = process.env.FIREBASE_COOKIES_URL;
const openai = new openai_1.default({ apiKey: OPENAI_API_KEY });
class PlanCreationService {
    transcribe(videoUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!FIREBASE_COOKIES_URL) {
                throw new gonest_1.ForbiddenException("Firebase cookie URL not configured");
            }
            // Step 1: Download cookies from Firebase
            const cookies = yield this.downloadCookiesFromFirebase();
            // Step 2: Write to tmp file
            (0, fs_1.writeFileSync)(TEMP_COOKIES_PATH, cookies);
            console.log("✅ Cookies downloaded and saved to:", TEMP_COOKIES_PATH);
            const filePath = path_1.default.join("/tmp", `audio-${Date.now()}.mp3`);
            const ytdlpOptions = {
                noWarnings: true,
                preferFreeFormats: true,
                noCheckCertificates: true,
                referer: videoUrl,
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                cookies: TEMP_COOKIES_PATH,
                addHeader: [
                    "referer:youtube.com",
                    "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                ],
                verbose: true,
            };
            try {
                // Step 3: Get video metadata
                const videoInfo = yield this.getVideoInfoWithRetry(videoUrl, ytdlpOptions);
                const { title, description } = videoInfo;
                if (!title || !description) {
                    throw new gonest_1.ForbiddenException("Invalid video metadata");
                }
                // Step 4: Download audio
                yield (0, yt_dlp_exec_1.default)(videoUrl, Object.assign(Object.assign({}, ytdlpOptions), { extractAudio: true, audioFormat: "mp3", output: filePath }));
                // Step 5: Transcribe using Whisper
                const transcript = yield openai.audio.transcriptions.create({
                    file: (0, fs_1.createReadStream)(filePath),
                    model: "whisper-1",
                    language: "en",
                });
                // Step 6: Cleanup
                if (existsSync(filePath)) {
                    (0, fs_1.unlinkSync)(filePath);
                }
                console.log("🎉 All steps completed successfully!");
                return {
                    text: transcript.text,
                    title,
                    description,
                };
            }
            catch (error) {
                console.error("🚨 Error during transcription:", error.message);
                console.error("Error details:", error.stderr || error.stdout || "None");
                if (existsSync(filePath)) {
                    (0, fs_1.unlinkSync)(filePath);
                }
                throw error;
            }
        });
    }
    downloadCookiesFromFirebase() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🔄 Downloading cookies from Firebase...");
            try {
                const response = yield axios_1.default.get(FIREBASE_COOKIES_URL, {
                    responseType: "text",
                });
                console.log("✅ Successfully fetched cookies from Firebase");
                return response.data;
            }
            catch (error) {
                console.error("❌ Failed to fetch cookies from Firebase:", error.message);
                throw new gonest_1.ForbiddenException("Failed to fetch cookies from Firebase");
            }
        });
    }
    getVideoInfoWithRetry(url_1, options_1) {
        return __awaiter(this, arguments, void 0, function* (url, options, retries = 3) {
            while (retries > 0) {
                try {
                    return (yield (0, yt_dlp_exec_1.default)(url, Object.assign(Object.assign({}, options), { dumpSingleJson: true })));
                }
                catch (error) {
                    console.warn(`🔁 Retrying video info (${retries} left): ${error.message}`);
                    console.warn("Error details:", error.stderr || error.stdout || "None");
                    yield new Promise((resolve) => setTimeout(resolve, 2000));
                    retries--;
                }
            }
            throw new Error("Failed to fetch video info after retries");
        });
    }
}
// Helper functions outside class for clarity
function existsSync(path) {
    try {
        fs_2.default.statSync(path);
        return true;
    }
    catch (_a) {
        return false;
    }
}
exports.default = PlanCreationService;
