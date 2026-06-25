import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { loadDotEnv } from "../../../scripts/utils.mjs";

/**
 * Resolves the absolute ffmpeg binary path.
 * On Windows, `execSync("ffmpeg ...", {shell:true})` runs under cmd.exe and can
 * fail to resolve a bare "ffmpeg" even when it's on PATH (esp. with non-ASCII
 * PATH segments). We pre-resolve it once via `where`/`which`.
 * @returns {string} an ffmpeg invocation (absolute path, quoted when needed)
 */
/** @type {string|null} */
let _ffmpegBin = null;

/**
 * Resolves the absolute ffmpeg binary path.
 * On Windows, `execSync("ffmpeg ...", {shell:true})` runs under cmd.exe and can
 * fail to resolve a bare "ffmpeg" even when it's on PATH (esp. with non-ASCII
 * PATH segments). We pre-resolve it once via `where`/`which`.
 * @returns {string} an ffmpeg invocation (absolute path, quoted when needed)
 */
export function ffmpegBin() {
  if (_ffmpegBin) return _ffmpegBin;
  try {
    const lookup = process.platform === "win32" ? "where ffmpeg" : "which ffmpeg";
    /** @type {any} */
    const opts = { shell: true, encoding: "utf-8" };
    const out = execSync(lookup, opts);
    const found = out.split(/\r?\n/)[0].trim();
    _ffmpegBin = found || "ffmpeg";
  } catch {
    _ffmpegBin = "ffmpeg";
  }
  return _ffmpegBin;
}

/**
 * Run an ffmpeg command, robust to PATH resolution on Windows.
 * Builds `ffmpeg <args>` using the resolved absolute binary.
 * @param {string} args - raw ffmpeg arguments (paths should already be quoted/posix)
 * @param {import("child_process").ExecSyncOptions} [opts] - passed through to execSync
 * @returns {Buffer | string}
 */
export function runFfmpeg(args, opts = {}) {
  const bin = ffmpegBin();
  const cmd = `${/[\s"]/.test(bin) ? `"${bin}"` : bin} ${args}`;
  return execSync(cmd, { shell: true, stdio: "pipe", ...opts });
}

/**
 * Reads an environment variable from process.env or .env files.
 * Loads the first .env found by walking up from cwd (cwd → ../.. ) via the
 * shared loadDotEnv helper (keeps a single .env parser across all skills).
 * @param {string} name - The env var name (e.g. "ZHIPU_API_KEY")
 * @param {object} [options]
 * @param {boolean} [options.required=true] - Throw if not found
 * @param {string} [options.desc] - Human description for the error message
 * @returns {string|null} The value, or null if not required and not found
 * @throws {Error} If required and not found in any location
 */
export function loadEnvVar(name, { required = true, desc } = {}) {
  loadDotEnv({ searchUp: true });

  if (process.env[name]) {
    return process.env[name];
  }

  if (!required) {
    return null;
  }

  const hint = desc ? ` (${desc})` : "";
  throw new Error(
    `${name} not found${hint}. Add it to a .env file in your project root or set it as an environment variable.`
  );
}

/**
 * Loads ZHIPU_API_KEY from environment files or process.env.
 * Thin wrapper around loadEnvVar for backward compatibility.
 * @returns {string} The API key
 * @throws {Error} If ZHIPU_API_KEY is not found
 */
export function loadApiKey() {
  return loadEnvVar("ZHIPU_API_KEY", { desc: "智谱 AI 图片生成 + GLM-TTS" });
}

/**
 * Writes JSON data to a file, creating parent directories if needed
 * @param {string} filePath - Path to the output file
 * @param {any} data - Data to write as JSON
 */
export function writeJson(filePath, data) {
  const dir = resolve(filePath, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

/**
 * Reads and parses JSON from a file
 * @param {string} filePath - Path to the JSON file
 * @returns {any} The parsed JSON data
 * @throws {Error} If the file cannot be read or parsed
 */
export function readJson(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to read JSON from ${filePath}: ${err.message}`);
  }
}

/**
 * Creates a promise-based delay
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simple CLI argument parser
 * Handles --key value, --flag (boolean true), and positional args
 * @param {string[]} argv - Process.argv array
 * @returns {Object} Parsed arguments with opts and _ array for positional args
 */
export function parseArgs(argv) {
  const args = argv.slice(2); // Skip node and script
  const opts = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const flag = arg.slice(2);

      // Check if next argument is another flag or positional
      if (i + 1 < args.length && args[i + 1].startsWith("--")) {
        // Boolean flag
        opts[flag] = true;
      } else if (i + 1 < args.length) {
        // Key-value pair
        opts[flag] = args[i + 1];
        i++; // Skip next arg
      } else {
        // Flag at end of args
        opts[flag] = true;
      }

          } else {
      // Positional argument
      positional.push(arg);
    }
  }

  return {
    opts,
    args: positional
  };
}