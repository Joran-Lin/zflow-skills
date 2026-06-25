#!/usr/bin/env node

/**
 * zflow-skills — Environment Pre-flight Check
 *
 * Cross-platform (Windows/macOS/Linux) validation and auto-install script.
 * Run once before starting the pipeline to ensure all dependencies, API keys,
 * and tools are configured. Auto-installs what it can; prompts for what it can't.
 *
 * Usage:
 *   node scripts/check-env.mjs           # check + auto-install
 *   node scripts/check-env.mjs --check   # check only, no install
 *   node scripts/check-env.mjs --fix     # check + auto-install (default)
 */

import { execSync, spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { createInterface } from "readline";
import { homedir, platform } from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const IS_WIN = platform() === "win32";
const IS_MAC = platform() === "darwin";
const IS_LINUX = platform() === "linux";

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes("--check");
const INTERACTIVE = args.includes("--interactive") || args.includes("-i");
const FIX_MODE = !CHECK_ONLY;

// ─── Logging ────────────────────────────────────────────────────────

const results = { pass: [], fail: [], warn: [], fix: [] };

function ok(msg) {
  console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
  results.pass.push(msg);
}

function fail(msg) {
  console.log(`  \x1b[31m✘\x1b[0m ${msg}`);
  results.fail.push(msg);
}

function warn(msg) {
  console.log(`  \x1b[33m⚠\x1b[0m ${msg}`);
  results.warn.push(msg);
}

function fixed(msg) {
  console.log(`  \x1b[36m↻\x1b[0m ${msg}`);
  results.fix.push(msg);
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  console.log("─".repeat(50));
}

// ─── Helpers ─────────────────────────────────────────────────────────

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function cmdExists(cmd) {
  const checkCmd = IS_WIN ? `where ${cmd}` : `which ${cmd}`;
  return run(checkCmd) !== null;
}

function versionNum(verStr) {
  if (!verStr) return { major: 0, minor: 0 };
  const m = verStr.match(/(\d+)\.(\d+)/);
  return m ? { major: +m[1], minor: +m[2] } : { major: 0, minor: 0 };
}

// ─── 1. Operating System ────────────────────────────────────────────

function checkOS() {
  section("1. Operating System");
  const p = platform();
  const label = { win32: "Windows", darwin: "macOS", linux: "Linux" }[p] || p;
  if (["win32", "darwin", "linux"].includes(p)) {
    ok(`${label} — supported`);
  } else {
    warn(`${label} — not officially tested, may work`);
  }
}

// ─── 2. Node.js ─────────────────────────────────────────────────────

function checkNode() {
  section("2. Node.js");

  // 用 process.version 代替 execSync("node --version")，避免子进程 PATH 不一致
  const ver = process.version; // e.g. v22.5.0
  const { major, minor } = versionNum(ver);

  if (major >= 22) {
    ok(`Node.js ${ver} — meets >= 22 requirement (hyperframes CLI)`);
  } else if (major >= 18) {
    warn(`Node.js ${ver} — works for most skills but hyperframes CLI requires >= 22`);
    if (FIX_MODE) installNode();
  } else {
    fail(`Node.js ${ver} — too old, need >= 18 (>= 22 for hyperframes CLI)`);
    if (FIX_MODE) installNode();
  }
}

function installNode() {
  console.log("\n  \x1b[36m→ Installing Node.js 22 LTS...\x1b[0m");

  if (IS_WIN && cmdExists("winget")) {
    run("winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements");
    fixed("Node.js installed via winget");
    return;
  }

  if (IS_MAC && cmdExists("brew")) {
    run("brew install node@22");
    fixed("Node.js installed via Homebrew");
    return;
  }

  if (IS_LINUX && cmdExists("apt-get")) {
    console.log("  Running: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs");
    run("curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -");
    run("sudo apt-get install -y nodejs");
    fixed("Node.js installed via NodeSource");
    return;
  }

  // Fallback: nvm
  if (cmdExists("nvm") || cmdExists("fnm") || cmdExists("volta")) {
    const mgr = cmdExists("nvm") ? "nvm" : cmdExists("fnm") ? "fnm" : "volta";
    if (mgr === "nvm") run("nvm install 22 && nvm use 22");
    if (mgr === "fnm") run("fnm install 22 && fnm use 22");
    if (mgr === "volta") run("volta install node@22");
    fixed(`Node.js installed via ${mgr}`);
    return;
  }

  fail("Could not auto-install Node.js. Install manually: https://nodejs.org (LTS 22.x)");
}

// ─── 3. FFmpeg ──────────────────────────────────────────────────────

function checkFFmpeg() {
  section("3. FFmpeg");

  if (!cmdExists("ffmpeg")) {
    fail("ffmpeg not found on PATH");
    if (FIX_MODE) installFFmpeg();
    return;
  }

  const ver = run("ffmpeg -version")?.split("\n")[0];
  ok(`ffmpeg — ${ver}`);

  if (!cmdExists("ffprobe")) {
    fail("ffprobe not found (should come with ffmpeg)");
  } else {
    ok("ffprobe — available");
  }
}

function installFFmpeg() {
  console.log("\n  \x1b[36m→ Installing FFmpeg...\x1b[0m");

  if (IS_WIN && cmdExists("winget")) {
    run("winget install Gyan.FFmpeg --accept-package-agreements --accept-source-agreements");
    fixed("FFmpeg installed via winget");
    return;
  }

  if (IS_MAC && cmdExists("brew")) {
    run("brew install ffmpeg");
    fixed("FFmpeg installed via Homebrew");
    return;
  }

  if (IS_LINUX && cmdExists("apt-get")) {
    run("sudo apt-get update && sudo apt-get install -y ffmpeg");
    fixed("FFmpeg installed via apt");
    return;
  }

  fail("Could not auto-install FFmpeg. Install manually: https://ffmpeg.org/download.html");
}

// ─── 4. Chrome/Chromium ────────────────────────────────────────────

/**
 * Find Playwright-bundled Chromium executable.
 * Playwright stores browsers in:
 *   macOS: ~/Library/Caches/ms-playwright/
 *   Linux: ~/.cache/ms-playwright/
 *   Windows: %LOCALAPPDATA%\ms-playwright\
 */
function findPlaywrightChromium() {
  const cacheDir = IS_WIN
    ? join(homedir(), "AppData", "Local", "ms-playwright")
    : IS_MAC
    ? join(homedir(), "Library", "Caches", "ms-playwright")
    : join(homedir(), ".cache", "ms-playwright");

  if (!existsSync(cacheDir)) return null;

  // Playwright dir pattern: chromium-XXXX
  const entries = readdirSync(cacheDir, { withFileTypes: true });
  const chromiumDirs = entries
    .filter(e => e.isDirectory() && e.name.startsWith("chromium-"))
    .sort()
    .reverse(); // newest first

  for (const dir of chromiumDirs) {
    const base = join(cacheDir, dir.name, "chrome-" + (IS_MAC ? "mac" : IS_WIN ? "win" : "linux"));
    const candidates = IS_MAC
      ? [join(base, "Chromium.app", "Contents", "MacOS", "Chromium")]
      : IS_WIN
      ? [join(base, "chrome.exe"), join(base, "Chromium", "chrome.exe")]
      : [join(base, "chrome"), join(base, "Chromium", "chrome")];

    for (const c of candidates) {
      if (existsSync(c)) return c;
    }

    // Fallback: scan one level deeper (Playwright structure varies by version)
    if (existsSync(base)) {
      try {
        const subs = readdirSync(base, { withFileTypes: true });
        for (const s of subs) {
          if (s.isDirectory()) {
            const appPath = join(base, s.name, "Contents", "MacOS", "Chromium");
            if (existsSync(appPath)) return appPath;
            const exePath = join(base, s.name, "chrome");
            if (existsSync(exePath)) return exePath;
            const exePathWin = join(base, s.name, "chrome.exe");
            if (existsSync(exePathWin)) return exePathWin;
          }
        }
      } catch { /* ignore */ }
    }
  }

  return null;
}

function checkChrome() {
  section("4. Chrome / Chromium");

  const paths = [];
  if (IS_WIN) {
    paths.push(
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
    );
  } else if (IS_MAC) {
    paths.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  } else {
    paths.push("/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium");
  }

  // CHROME_PATH env takes highest priority
  if (process.env.CHROME_PATH) {
    paths.unshift(process.env.CHROME_PATH);
  }

  for (const p of paths) {
    if (existsSync(p)) {
      ok(`Chrome found at ${p}`);
      return;
    }
  }

  // Try command
  if (cmdExists("google-chrome") || cmdExists("chrome") || cmdExists("chromium-browser") || cmdExists("chromium")) {
    ok("Chrome found on PATH");
    return;
  }

  // Try Playwright-bundled Chromium
  const pwChromium = findPlaywrightChromium();
  if (pwChromium) {
    ok(`Chromium found via Playwright at ${pwChromium}`);
    // Auto-set CHROME_PATH so downstream tools (hyperframes, puppeteer) can find it
    if (!process.env.CHROME_PATH) {
      process.env.CHROME_PATH = pwChromium;
      fixed(`Set CHROME_PATH=${pwChromium}`);
    }
    return;
  }

  fail("Chrome/Chromium not found — required for hyperframes render & check");
  if (FIX_MODE) installChrome();
}

function installChrome() {
  console.log("\n  \x1b[36m→ Installing Chromium...\x1b[0m");

  // Preferred: Playwright Chromium (lightweight, no full browser install)
  console.log("  \x1b[36m→ Trying Playwright Chromium (lightweight)...\x1b[0m");
  const pwResult = run("npx playwright install chromium");
  if (pwResult !== null) {
    const pwChromium = findPlaywrightChromium();
    if (pwChromium) {
      process.env.CHROME_PATH = pwChromium;
      fixed(`Chromium installed via Playwright → ${pwChromium}`);

      // Persist CHROME_PATH hint to .env
      const envPath = join(ROOT, ".env");
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf-8");
        if (!content.includes("CHROME_PATH")) {
          appendFileSync(envPath, `\nCHROME_PATH=${pwChromium}\n`, "utf-8");
          fixed("CHROME_PATH written to .env");
        }
      }
      return;
    }
    fixed("Playwright Chromium installed");
    return;
  }

  // Fallback: system package manager (full Chrome)
  if (IS_WIN && cmdExists("winget")) {
    run("winget install Google.Chrome --accept-package-agreements --accept-source-agreements");
    fixed("Chrome installed via winget");
    return;
  }

  if (IS_MAC && cmdExists("brew")) {
    run("brew install --cask google-chrome");
    fixed("Chrome installed via Homebrew");
    return;
  }

  if (IS_LINUX && cmdExists("apt-get")) {
    run("sudo apt-get install -y google-chrome-stable || sudo apt-get install -y chromium-browser");
    fixed("Chrome installed via apt");
    return;
  }

  fail("Could not auto-install Chrome. Try: npx playwright install chromium");
  fail("Or download manually from https://www.google.com/chrome/");
}

// ─── 5. API Keys ────────────────────────────────────────────────────

const KEY_DEFS = [
  { name: "ZHIPU_API_KEY",  url: "https://open.bigmodel.cn",      desc: "智谱 AI 图片生成 + GLM-TTS 必需" },
  { name: "MINIMAX_API_KEY", url: "https://platform.minimaxi.com/user-center/basic-information/interface-key", desc: "MiniMax TTS（可选，使用 minimax 引擎时必需）" },
  { name: "PEXELS_API_KEY", url: "https://www.pexels.com/api/",   desc: "素材视频收集必需" },
  { name: "PIXABAY_API_KEY", url: "https://pixabay.com/api/docs/", desc: "素材视频收集必需" },
];

function checkAPIKeys() {
  section("5. API Keys (接口密钥)");

  // Load .env
  const envPath = join(ROOT, ".env");
  const envExamplePath = join(ROOT, ".env.example");

  if (!existsSync(envPath)) {
    if (existsSync(envExamplePath)) {
      const example = readFileSync(envExamplePath, "utf-8");
      writeFileSync(envPath, example, "utf-8");
      fixed("已从 .env.example 创建 .env 文件");
    } else {
      writeFileSync(envPath, "# zflow-skills API Keys\n", "utf-8");
      fixed("已创建空的 .env 文件");
    }
  } else {
    ok(".env 文件已存在");
  }

  // Parse .env
  const envContent = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";
  const envVars = {};
  for (const line of envContent.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
    if (m) envVars[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }

  // Check each key
  const missing = [];
  for (const def of KEY_DEFS) {
    const val = envVars[def.name] || process.env[def.name];
    if (!val || val.includes("your_") || val === "") {
      warn(`${def.name} 未设置 — ${def.desc}`);
      console.log(`    获取地址: ${def.url}`);
      missing.push(def);
    } else {
      ok(`${def.name} — 已配置 (${val.substring(0, 6)}...)`);
    }
  }

  // Interactive mode: prompt for missing keys
  if (missing.length > 0 && INTERACTIVE) {
    promptForKeys(missing, envPath);
  } else if (missing.length > 0) {
    console.log("\n  \x1b[36m💡 提示: 运行以下命令可交互式输入密钥:\x1b[0m");
    console.log("    \x1b[36mnode scripts/check-env.mjs --interactive\x1b[0m");
    console.log("    \x1b[36m或在 /start 中直接告诉我你的 API Key，我会帮你写入 .env\x1b[0m");
  }
}

async function promptForKeys(missing, envPath) {
  console.log("\n  \x1b[1m\x1b[36m── 交互式密钥配置 ──\x1b[0m");
  console.log("  以下密钥未设置，按 Enter 跳过（可稍后编辑 .env 文件）\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(res => rl.question(q, res));

  let anyAdded = false;
  for (const def of missing) {
    const val = await ask(`  ${def.name} (${def.desc}): `);
    if (val.trim()) {
      // Append to .env
      appendFileSync(envPath, `\n${def.name}=${val.trim()}`, "utf-8");
      fixed(`${def.name} 已写入 .env`);
      anyAdded = true;
    } else {
      console.log(`  ⏭ 跳过 ${def.name}，可稍后手动编辑 .env`);
    }
  }

  rl.close();

  if (anyAdded) {
    fixed("密钥已保存到 .env 文件");
  }
}

// ─── 6. Global npm Packages ───────────────────────────────────────

function checkGlobalNpm() {
  section("6. Global npm Packages");

  // hyperframes CLI
  if (cmdExists("hyperframes")) {
    const ver = run("hyperframes --version");
    ok(`hyperframes CLI — v${ver}`);
  } else {
    fail("hyperframes CLI not found on PATH");
    if (FIX_MODE) {
      console.log("  \x1b[36m→ Installing hyperframes globally...\x1b[0m");
      const result = run("npm install -g hyperframes");
      if (result !== null) {
        fixed("hyperframes CLI installed globally");
      } else {
        fail("npm install -g hyperframes failed — try manually: npm install -g hyperframes");
      }
    }
  }

  // puppeteer-core (needed by check)
  const globalNodeModules = IS_WIN
    ? join(homedir(), "AppData", "Roaming", "npm", "node_modules")
    : join("/usr", "local", "lib", "node_modules");
  const ppPkgs = [
    join(globalNodeModules, "puppeteer-core", "package.json"),
    join(globalNodeModules, "puppeteer", "package.json"),
  ];
  // Also check local node_modules
  const localPpPkgs = [
    join(ROOT, "node_modules", "puppeteer-core", "package.json"),
    join(ROOT, "node_modules", "puppeteer", "package.json"),
  ];

  if (ppPkgs.some(existsSync) || localPpPkgs.some(existsSync)) {
    ok("puppeteer-core — installed");
  } else {
    warn("puppeteer-core not found — needed for check");
    if (FIX_MODE) {
      console.log("  \x1b[36m→ Installing puppeteer-core globally...\x1b[0m");
      const result = run("npm install -g puppeteer-core");
      if (result !== null) {
        fixed("puppeteer-core installed globally");
      } else {
        fail("npm install -g puppeteer-core failed — try manually");
      }
    }
  }

  // Root npm install (for ws, etc.)
  const rootPkg = join(ROOT, "package.json");
  const rootModules = join(ROOT, "node_modules");
  if (existsSync(rootPkg) && !existsSync(rootModules)) {
    warn("Root node_modules not found");
    if (FIX_MODE) {
      run(`cd "${ROOT}" && npm install`);
      fixed("Root npm dependencies installed");
    }
  } else if (existsSync(rootModules)) {
    ok("Root node_modules — installed");
  }
}

// ─── 7. Project Structure ──────────────────────────────────────────

function checkProjectStructure() {
  section("7. Project Structure");

  const required = [
    { path: "skills/hyperframes/SKILL.md", label: "hyperframes skill" },
    { path: "skills/content-plan/SKILL.md", label: "content-plan skill" },
    { path: "skills/video-brief/SKILL.md", label: "video-brief skill" },
    { path: "skills/tts/SKILL.md", label: "tts skill" },
    { path: "skills/material/SKILL.md", label: "material skill" },
    { path: "skills/image-gen/SKILL.md", label: "image-gen skill" },
    { path: "skills/check/SKILL.md", label: "check skill" },
    { path: "skills/gsap/SKILL.md", label: "gsap skill" },
    { path: "CLAUDE.md", label: "CLAUDE.md (project instructions)" },
  ];

  for (const { path, label } of required) {
    if (existsSync(join(ROOT, path))) {
      ok(`${label}`);
    } else {
      warn(`${label} not found at ${path}`);
    }
  }

  // output directory
  const outputDir = join(ROOT, "output");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    fixed("output/ directory created");
  } else {
    ok("output/ directory");
  }
}

function checkSmokeTest() {
  section("8. Smoke Test");

  // Can we run hyperframes CLI?
  if (cmdExists("hyperframes")) {
    const result = run("hyperframes --version");
    if (result) {
      ok(`hyperframes CLI — v${result}`);
    } else {
      fail("hyperframes CLI — failed to run");
    }
  } else {
    warn("hyperframes CLI not found on PATH — run /start with --fix to install");
  }

  // Can we import ws module? (only the "edge" TTS engine uses WebSocket)
  try {
    const wsPath = join(ROOT, "node_modules", "ws");
    if (existsSync(wsPath)) {
      ok("ws module — available (for edge TTS)");
    } else {
      warn("ws module not found — edge TTS needs it");
      if (FIX_MODE) {
        run(`cd "${ROOT}" && npm install ws`);
        fixed("ws module installed");
      }
    }
  } catch {
    warn("ws module check failed");
  }
}

// ─── Main ───────────────────────────────────────────────────────────

console.log("\n\x1b[1m╔══════════════════════════════════════════════╗\x1b[0m");
console.log("\x1b[1m║      zflow-skills — Environment Check      ║\x1b[0m");
console.log("\x1b[1m╚══════════════════════════════════════════════╝\x1b[0m");

if (FIX_MODE) {
  console.log("Mode: \x1b[36mcheck + auto-install\x1b[0m");
  if (INTERACTIVE) console.log("       \x1b[36m+ interactive key input\x1b[0m");
} else {
  console.log("Mode: \x1b[33mcheck only\x1b[0m (use --fix or run without --check to auto-install)");
}

(async () => {
  checkOS();
  checkNode();
  checkFFmpeg();
  checkChrome();
  await checkAPIKeys();
  checkGlobalNpm();
  checkProjectStructure();
  checkSmokeTest();

// ─── Summary ────────────────────────────────────────────────────────

  console.log("\n\x1b[1m════════════════════════════════════════════════");
  console.log("Summary");
  console.log("════════════════════════════════════════════════\x1b[0m");
  console.log(`  \x1b[32m✔ Passed:\x1b[0m  ${results.pass.length}`);
  console.log(`  \x1b[33m⚠ Warnings:\x1b[0m ${results.warn.length}`);
  console.log(`  \x1b[36m↻ Fixed:\x1b[0m   ${results.fix.length}`);
  console.log(`  \x1b[31m✘ Failed:\x1b[0m  ${results.fail.length}`);

  if (results.fail.length > 0) {
    console.log("\n\x1b[31mFailed checks:\x1b[0m");
    results.fail.forEach((m) => console.log(`  • ${m}`));
  }

  if (results.warn.length > 0) {
    console.log("\n\x1b[33mWarnings (pipeline may work with limited features):\x1b[0m");
    results.warn.forEach((m) => console.log(`  • ${m}`));
  }

  if (results.fix.length > 0) {
    console.log("\n\x1b[36mAuto-fixed:\x1b[0m");
    results.fix.forEach((m) => console.log(`  • ${m}`));
  }

  const allGood = results.fail.length === 0 && results.warn.length === 0;
  if (allGood) {
    console.log("\n\x1b[32m\x1b[1mAll checks passed! Ready to run the pipeline.\x1b[0m\n");
    process.exit(0);
  } else if (results.fail.length === 0) {
    console.log("\n\x1b[33mCore checks passed. Some optional features may be unavailable.\x1b[0m\n");
    process.exit(0);
  } else {
    console.log("\n\x1b[31m\x1b[1mSome checks failed. Fix the issues above before running the pipeline.\x1b[0m\n");
    process.exit(1);
  }
})();
