"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const runCommand = (cmd, projectDir) => {
    try {
        console.log(`Running: ${cmd}`);
        (0, child_process_1.execSync)(cmd, { cwd: projectDir });
    }
    catch (error) {
        console.error(`Error executing command: ${cmd}`, error);
        throw new Error(`Build failed: ${error}`);
    }
};
exports.default = runCommand;
