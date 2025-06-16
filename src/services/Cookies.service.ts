import { BadRequestException, InternalServerErrorException } from "gonest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { runCommand } from "../utils";

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
      if (line.startsWith("#")) continue; // Skip comments

      const parts = line.split("\t");

      // Must have at least 7 tab-separated fields
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

      // Run server script after successful write
      await this.runServerCommand();

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
    try {
      console.log("Running build command...");
      runCommand("npm run build", projectDir);
    } catch (err) {
      throw new Error(`Build failed: ${err}`);
    }
  }

  private async runServerCommand(): Promise<void> {
    const projectDir = path.join(__dirname, "..", ".."); // Root of project
    try {
      console.log("Running build command...");
      runCommand("npm run dev", projectDir);
    } catch (err) {
      throw new Error(`Build failed: ${err}`);
    }
  }

  private async runGitCommands(): Promise<void> {
    const gitDir = path.join(__dirname, "..", ".."); // Project root

    const runCommand = (cmd: string): void => {
      console.log(`Executing: ${cmd}`);
      try {
        execSync(cmd, { cwd: gitDir, stdio: "inherit" });
      } catch (error) {
        console.error(`Error executing command: ${cmd}`, error);
        throw new Error(`Git operation failed: ${error}`);
      }
    };

    console.log("Current dir:", process.cwd());
    console.log("Git dir:", gitDir);

    if (!fs.existsSync(path.join(gitDir, ".git"))) {
      throw new Error("Git repository not found (.git folder missing)");
    }

    try {
      // Set Git user/email
      runCommand("git config --global user.email 'uhope1645@gmail.com'");
      runCommand("git config --global user.name 'asad-ali-developer'");

      // Optional: Update remote URL with token
      const token = process.env.GITHUB_TOKEN;
      console.log("GITHUB_TOKEN:", token);
      if (token) {
        const repoUrl = `https://github.com/TechUp-24/Abundant_Server.git`;
        const authRepoUrl = repoUrl.replace("https://", `https://${token}@`);

        runCommand(`git remote set-url origin ${authRepoUrl}`);
      }

      // Run Git operations
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
