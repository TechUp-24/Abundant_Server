import { BadRequestException, InternalServerErrorException } from "gonest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

class CookiesService {
  constructor() {}

  private readonly filePath = path.join(__dirname, "..", "..", "cookies.txt");

  // Static header lines to preserve
  private readonly headerLines = [
    "# Netscape HTTP Cookie File",
    "# http://curl.haxx.se/rfc/cookie_spec.html",
    "# This is a generated file!  Do not edit.",
    "", // Empty line after header
  ];

  async addCookies(cookies: string[]) {
    if (!Array.isArray(cookies) || cookies.length === 0) {
      throw new BadRequestException("No cookies provided");
    }

    const now = Math.floor(Date.now() / 1000);
    const validCookies = [];

    for (const line of cookies) {
      if (typeof line !== "string") continue;
      if (line.trim() === "") continue;
      if (line.startsWith("#")) continue; // Skip comments from input

      const parts = line.split("\t");

      // Netscape cookie spec requires at least 7 fields
      if (parts.length < 7) continue;

      // Validate expiry timestamp
      const expiry = parseInt(parts[4], 10);
      if (!isNaN(expiry) && expiry <= now) continue;

      validCookies.push(line);
    }

    if (validCookies.length === 0) {
      throw new BadRequestException("No valid cookies found in input");
    }

    try {
      // Combine header + valid cookies
      const dataToWrite =
        this.headerLines.join("\n") + "\n" + validCookies.join("\n") + "\n";

      // Overwrite the file
      fs.writeFileSync(this.filePath, dataToWrite);

      // Run build script before git commands
      await this.runBuildCommand();

      // Run git commands after successful write
      await this.runGitCommands();

      return {
        message: "Cookies replaced successfully, built and pushed to GitHub",
        count: validCookies.length,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to write, build or push cookies: ${err}`
      );
    }
  }

  private async runBuildCommand(): Promise<void> {
    const projectDir = path.join(__dirname, "..", ".."); // Root of project

    const runCommand = (cmd: string): void => {
      try {
        execSync(cmd, { cwd: projectDir });
      } catch (error) {
        console.error(`Error executing command: ${cmd}`, error);
        throw new Error(`Build failed: ${error}`);
      }
    };

    try {
      console.log("Running build command...");
      runCommand("npm run build");
    } catch (err) {
      throw new Error(`Build failed: ${err}`);
    }
  }

  private async runGitCommands(): Promise<void> {
    const gitDir = path.join(__dirname, "..", ".."); // Root of git repo

    const runCommand = (cmd: string): void => {
      try {
        execSync(cmd, { cwd: gitDir });
      } catch (error) {
        console.error(`Error executing command: ${cmd}`, error);
        throw new Error(`Git operation failed: ${error}`);
      }
    };

    try {
      runCommand("git add .");

      const now = new Date();
      const formattedTime = now.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Extract only date and time without seconds
      const [dateAndTime] = formattedTime.split(", ");
      const commitMessage = `updated cookies at [${dateAndTime}]`;

      runCommand(`git commit -m "${commitMessage}"`);
      runCommand("git push origin main");
    } catch (err) {
      throw new Error(`Git operation failed: ${err}`);
    }
  }
}

export default CookiesService;