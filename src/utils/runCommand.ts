import { execSync } from "child_process";

const runCommand = (cmd: string, projectDir: string): void => {
  try {
    console.log(`Running: ${cmd}`);
    execSync(cmd, { cwd: projectDir });
  } catch (error) {
    console.error(`Error executing command: ${cmd}`, error);
    throw new Error(`Build failed: ${error}`);
  }
};

export default runCommand;
