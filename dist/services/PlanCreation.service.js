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
const youtube_dl_exec_1 = __importDefault(require("youtube-dl-exec"));
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const gonest_1 = require("gonest");
dotenv_1.default.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("OPENAI API KEY", OPENAI_API_KEY);
const openai = new openai_1.default({ apiKey: OPENAI_API_KEY });
class PlanCreationService {
    constructor() { }
    transcribe(youtubeUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("YOUTUBE URL", youtubeUrl);
            const fileName = `audio-${Date.now()}.mp3`;
            const filePath = path_1.default.join("/tmp", fileName);
            try {
                // Step 1: Get video metadata
                const videoInfo = (yield (0, youtube_dl_exec_1.default)(youtubeUrl, {
                    dumpSingleJson: true,
                    noWarnings: true,
                    preferFreeFormats: true,
                }));
                console.log("VIDEO INFO", videoInfo);
                const { title, description } = videoInfo;
                if (!title || !description)
                    throw new gonest_1.ForbiddenException("Invalid video metadata");
                // Step 2: Download audio
                yield (0, youtube_dl_exec_1.default)(youtubeUrl, {
                    extractAudio: true,
                    audioFormat: "mp3",
                    output: filePath,
                    preferFreeFormats: true,
                    noCheckCertificates: true,
                    noWarnings: true,
                });
                // Step 3: Transcribe with Whisper
                const audioStream = (0, fs_1.createReadStream)(filePath);
                const transcript = yield openai.audio.transcriptions.create({
                    file: audioStream,
                    model: "whisper-1",
                    language: "en",
                });
                console.log("TRANSCRIPT", transcript);
                // Cleanup
                (0, fs_1.unlinkSync)(filePath);
                // Step 4: Return result
                return {
                    text: transcript.text,
                };
            }
            catch (error) {
                if (filePath && (0, fs_1.existsSync)(filePath)) {
                    (0, fs_1.unlinkSync)(filePath);
                }
                throw error;
            }
        });
    }
}
exports.default = PlanCreationService;
