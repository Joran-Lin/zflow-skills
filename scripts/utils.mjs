// Shared utility helpers used by skill scripts.
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Minimal .env loader — parses KEY=VALUE lines into process.env.
 * Does not override keys already set on the real environment.
 * @param {{envPath?: string, searchUp?: boolean}} [opts]
 *   - envPath: explicit .env path (takes precedence)
 *   - searchUp: when true and no envPath given, also look in parent and
 *     grandparent dirs of cwd (lets scripts run from output/<project>/ find the repo-root .env)
 */
export function loadDotEnv(opts = {}) {
  const candidates = opts.envPath
    ? [resolve(opts.envPath)]
    : searchCandidates(opts.searchUp);
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    const text = readFileSync(envPath, "utf-8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      // strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
    return; // first existing .env wins
  }
}

function searchCandidates(searchUp) {
  const cwd = process.cwd();
  return searchUp
    ? [resolve(cwd, ".env"), resolve(cwd, "../.env"), resolve(cwd, "../../.env")]
    : [resolve(cwd, ".env")];
}

/**
 * Promise-based sleep.
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
