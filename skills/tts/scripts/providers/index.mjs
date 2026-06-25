/**
 * TTS provider registry.
 *
 * Each provider exports:
 *   { name, label, defaultVoice, voices: [{id,label}], note?, concurrency, generateChunk(text, {voice,speed,outputPath}) }
 *
 * All providers output a normalized 24kHz mono mp3 so the rest of the
 * pipeline (ffmpeg concat + silence splices) works uniformly.
 */

import { edgeProvider } from "./edge.mjs";
import { zhipuProvider } from "./zhipu.mjs";
import { minimaxProvider } from "./minimax.mjs";

export const PROVIDERS = {
  edge: edgeProvider,
  zhipu: zhipuProvider,
  minimax: minimaxProvider,
};

export const DEFAULT_PROVIDER = "edge";

/**
 * Resolve a provider by name. Unknown names throw a helpful error listing
 * the valid options.
 * @param {string} [name]
 * @returns {object} the provider object
 */
export function getProvider(name = DEFAULT_PROVIDER) {
  const key = String(name || "").toLowerCase();
  const provider = PROVIDERS[key];
  if (!provider) {
    const valid = Object.keys(PROVIDERS).join(", ");
    throw new Error(`Unknown TTS provider "${name}". Valid options: ${valid}.`);
  }
  return provider;
}

/**
 * Human-readable summary of all providers and their voices (for CLI --help / docs).
 */
export function describeProviders() {
  return Object.values(PROVIDERS)
    .map((p) => {
      const voices = p.voices.map((v) => `      - ${v.id}: ${v.label}`).join("\n");
      const note = p.note ? `\n    说明: ${p.note}` : "";
      return `  ${p.name} — ${p.label}\n    音色:\n${voices}${note}`;
    })
    .join("\n");
}
