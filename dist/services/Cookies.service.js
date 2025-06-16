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
const gonest_1 = require("gonest");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
class CookiesService {
    constructor() {
        this.filePath = path_1.default.join(__dirname, "..", "..", "cookies.txt");
        // Static header lines to preserve
        this.headerLines = [
            "# Netscape HTTP Cookie File",
            "# http://curl.haxx.se/rfc/cookie_spec.html",
            "# This is a generated file!  Do not edit.",
            "", // Empty line after header
        ];
    }
    addCookies(cookies) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.isArray(cookies) || cookies.length === 0) {
                throw new gonest_1.BadRequestException("No cookies provided");
            }
            const now = Math.floor(Date.now() / 1000);
            const validCookies = [];
            for (const line of cookies) {
                if (typeof line !== "string")
                    continue;
                if (line.trim() === "")
                    continue;
                if (line.startsWith("#"))
                    continue; // Skip comments from input
                const parts = line.split("\t");
                // Netscape cookie spec requires at least 7 fields
                if (parts.length < 7)
                    continue;
                // Validate expiry timestamp
                const expiry = parseInt(parts[4], 10);
                if (!isNaN(expiry) && expiry <= now)
                    continue;
                validCookies.push(line);
            }
            if (validCookies.length === 0) {
                throw new gonest_1.BadRequestException("No valid cookies found in input");
            }
            try {
                // Combine header + valid cookies
                const dataToWrite = this.headerLines.join("\n") + "\n" + validCookies.join("\n") + "\n";
                // Overwrite the file
                fs_1.default.writeFileSync(this.filePath, dataToWrite);
                // Run build script before git commands
                yield this.runBuildCommand();
                // Run git commands after successful write
                yield this.runGitCommands();
                return {
                    message: "Cookies replaced successfully, built and pushed to GitHub",
                    count: validCookies.length,
                };
            }
            catch (err) {
                throw new gonest_1.InternalServerErrorException(`Failed to write, build or push cookies: ${err}`);
            }
        });
    }
    runBuildCommand() {
        return __awaiter(this, void 0, void 0, function* () {
            const projectDir = path_1.default.join(__dirname, "..", ".."); // Root of project
            const runCommand = (cmd) => {
                return new Promise((resolve, reject) => {
                    (0, child_process_1.exec)(cmd, { cwd: projectDir }, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Error executing command: ${cmd}`, error);
                            return reject(error);
                        }
                        if (stderr) {
                            console.warn(`stderr for ${cmd}:`, stderr);
                        }
                        console.log(`stdout for ${cmd}:`, stdout);
                        resolve();
                    });
                });
            };
            try {
                console.log("Running build command...");
                yield runCommand("npm run build");
            }
            catch (err) {
                throw new Error(`Build failed: ${err}`);
            }
        });
    }
    runGitCommands() {
        return __awaiter(this, void 0, void 0, function* () {
            const gitDir = path_1.default.join(__dirname, "..", ".."); // Root of git repo
            const runCommand = (cmd) => {
                return new Promise((resolve, reject) => {
                    (0, child_process_1.exec)(cmd, { cwd: gitDir }, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Error executing command: ${cmd}`, error);
                            return reject(error);
                        }
                        if (stderr) {
                            console.warn(`stderr for ${cmd}:`, stderr);
                        }
                        console.log(`stdout for ${cmd}:`, stdout);
                        resolve();
                    });
                });
            };
            const timestamp = new Date().toISOString();
            try {
                yield runCommand("git add .");
                yield runCommand(`git commit -m "updated cookies at [${timestamp}]"`);
                yield runCommand("git push origin main");
            }
            catch (err) {
                throw new Error(`Git operation failed: ${err}`);
            }
        });
    }
}
exports.default = CookiesService;
