/**
 * collect-materials.mjs — 从 Pexels/Pixabay 收集视觉素材
 *
 * 用法: node collect-materials.mjs --config <materials-config.json>
 *
 * 输入: materials-config.json（由 LLM 从 narration 文本生成）
 * 输出: materials.json（扁平素材池）+ materials/images/ + materials/videos/
 *
 * 依赖: Node.js 18+（原生 fetch）, ffprobe（ffmpeg 附带）
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync, renameSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { loadDotEnv, sleep } from '../../../scripts/utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── API Endpoints ─────────────────────────────────────

const PEXELS_IMG = 'https://api.pexels.com/v1/search';
const PEXELS_VID = 'https://api.pexels.com/videos/search';
const PIXABAY_IMG = 'https://pixabay.com/api/';
const PIXABAY_VID = 'https://pixabay.com/api/videos/';

// ── API Key ───────────────────────────────────────────

loadDotEnv({ envPath: join(__dirname, '../../../.env') });

const keys = {
  pexels: process.env.PEXELS_API_KEY || '',
  pixabay: process.env.PIXABAY_API_KEY || '',
};

// ── Video transcode config ────────────────────────────
// 下载后原地转码：去音轨 + 重编码到目标分辨率 + CRF 压缩，缩小体积。
// 文件名/路径/时长不变，preflight 与 hyperframes 引用零感知。
const VIDEO_TRANSCODE = {
  enabled: true,            // false → 只下载不转码（完全回退原行为）
  crf: 28,                  // 质量档：26 更清晰、30 更猛压
  preset: 'veryfast',
  dropAudio: true,          // 成片音轨来自 audio.mp3，源视频音轨丢弃
  fallbackShortEdge: 1280,  // 找不到 brief.json 时的目标长边
};

// ── Locate ffmpeg / ffprobe (cross-platform, PATH pollution resilient) ──
function findBin(name) {
  const lookup = process.platform === 'win32' ? `where ${name}` : `which ${name}`;
  try {
    const out = execSync(lookup, { encoding: 'utf-8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const first = out.split(/\r?\n/)[0];
    if (first && existsSync(first)) return first;
  } catch { /* not on PATH */ }
  try {
    const npmRoot = execSync('npm root -g', { encoding: 'utf-8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const cand = join(npmRoot, '..', name + (process.platform === 'win32' ? '.exe' : ''));
    if (existsSync(cand)) return cand;
  } catch { /* ignore */ }
  return null;
}

// 读取目标短边：min(brief.width, brief.height)，作为转码目标长边
function readTargetShortEdge(projectDir) {
  const briefPath = join(projectDir, 'brief.json');
  try {
    const brief = JSON.parse(readFileSync(briefPath, 'utf-8'));
    const w = parseInt(brief.width);
    const h = parseInt(brief.height);
    if (w > 0 && h > 0) return Math.min(w, h);
  } catch { /* brief 缺失或损坏，用 fallback */ }
  return VIDEO_TRANSCODE.fallbackShortEdge;
}

// ── Rate limiting ─────────────────────────────────────

let lastRequestTime = 0;
const MIN_INTERVAL = 350;

async function rateLimitedFetch(url, options = {}) {
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < MIN_INTERVAL) {
    await sleep(MIN_INTERVAL - elapsed);
  }
  lastRequestTime = Date.now();
  return fetch(url, options);
}

// ── Search: Pexels Images ─────────────────────────────

async function searchPexelsImages(query, orientation, perPage = 5) {
  if (!keys.pexels) return [];
  const params = new URLSearchParams({ query, orientation, per_page: perPage });
  try {
    const res = await rateLimitedFetch(`${PEXELS_IMG}?${params}`, {
      headers: { Authorization: keys.pexels },
    });
    if (!res.ok) { console.warn(`  Pexels image API ${res.status}`); return []; }
    const data = await res.json();
    return (data.photos || []).map(p => ({
      provider: 'pexels', type: 'image',
      id: `pexels-img-${p.id}`,
      url: p.src?.original || p.src?.large2x || p.src?.large,
      width: p.width, height: p.height,
      alt: p.alt || '',
    }));
  } catch (e) { console.warn(`  Pexels image search failed: ${e.message}`); return []; }
}

// ── Search: Pexels Videos ─────────────────────────────

async function searchPexelsVideos(query, orientation, perPage = 5) {
  if (!keys.pexels) return [];
  const params = new URLSearchParams({ query, orientation, per_page: perPage });
  try {
    const res = await rateLimitedFetch(`${PEXELS_VID}?${params}`, {
      headers: { Authorization: keys.pexels },
    });
    if (!res.ok) { console.warn(`  Pexels video API ${res.status}`); return []; }
    const data = await res.json();
    return (data.videos || []).map(v => {
      const sorted = [...(v.video_files || [])].sort((a, b) => (b.width || 0) - (a.width || 0));
      const best = sorted[0];
      const alt = v.description || v.user?.name ? `${v.user?.name || ''} — ${v.description || query}`.trim() : query;
      return {
        provider: 'pexels', type: 'video',
        id: `pexels-vid-${v.id}`,
        url: best?.link, width: best?.width, height: best?.height,
        duration: v.duration, alt,
      };
    }).filter(v => v.url);
  } catch (e) { console.warn(`  Pexels video search failed: ${e.message}`); return []; }
}

// ── Search: Pixabay Images ────────────────────────────

async function searchPixabayImages(query, orientation, style = 'realistic', minWidth = 800, perPage = 5) {
  if (!keys.pixabay) return [];
  const orient = orientation === 'portrait' ? 'vertical' : orientation === 'landscape' ? 'horizontal' : 'all';
  const imageType = style === 'illustration' ? 'illustration' : 'photo';
  const params = new URLSearchParams({
    key: keys.pixabay, q: query,
    image_type: imageType, orientation: orient,
    min_width: minWidth, per_page: perPage,
    safesearch: 'true', order: 'popular',
  });
  try {
    const res = await rateLimitedFetch(`${PIXABAY_IMG}?${params}`);
    if (!res.ok) { console.warn(`  Pixabay image API ${res.status}`); return []; }
    const data = await res.json();
    return (data.hits || []).map(h => {
      const isVector = h.type?.includes('vector');
      return {
        provider: 'pixabay',
        type: isVector ? 'vector' : 'image',
        id: `pixabay-${isVector ? 'vec' : 'img'}-${h.id}`,
        url: h.largeImageURL || h.webformatURL?.replace('_640', '_1280'),
        width: h.imageWidth, height: h.imageHeight,
        alt: h.tags || '',
      };
    });
  } catch (e) { console.warn(`  Pixabay image search failed: ${e.message}`); return []; }
}

// ── Search: Pixabay Videos ────────────────────────────

async function searchPixabayVideos(query, minWidth = 720, perPage = 5) {
  if (!keys.pixabay) return [];
  const params = new URLSearchParams({
    key: keys.pixabay, q: query,
    per_page: perPage, min_width: minWidth,
    safesearch: 'true', order: 'popular',
  });
  try {
    const res = await rateLimitedFetch(`${PIXABAY_VID}?${params}`);
    if (!res.ok) { console.warn(`  Pixabay video API ${res.status}`); return []; }
    const data = await res.json();
    return (data.hits || []).map(h => {
      const files = h.videos || {};
      const best = ['large', 'medium', 'small', 'tiny']
        .map(k => files[k])
        .find(f => f && f.url);
      return {
        provider: 'pixabay', type: 'video',
        id: `pixabay-vid-${h.id}`,
        url: best?.url, width: best?.width, height: best?.height,
        duration: h.duration,
        alt: h.tags || '',
      };
    }).filter(v => v.url);
  } catch (e) { console.warn(`  Pixabay video search failed: ${e.message}`); return []; }
}

// ── Download ──────────────────────────────────────────

async function downloadFile(url, savePath) {
  if (existsSync(savePath) && statSync(savePath).size > 0) {
    return savePath;
  }
  mkdirSync(dirname(savePath), { recursive: true });

  try {
    const res = await rateLimitedFetch(url, {
      headers: { 'User-Agent': 'ZhipuVideoPipeline/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentLength = parseInt(res.headers.get('content-length') || '0');
    if (contentLength > 200 * 1024 * 1024) {
      console.warn(`  File too large (${Math.round(contentLength / 1024 / 1024)}MB), skipping`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(savePath, buffer);

    if (statSync(savePath).size > 0) return savePath;
  } catch (e) {
    console.warn(`  Download failed: ${e.message}`);
    if (existsSync(savePath)) try { unlinkSync(savePath); } catch {}
  }
  return null;
}

// ── Video validation ──────────────────────────────────

function probeVideo(ffprobeBin, filePath) {
  if (!ffprobeBin) return null;
  try {
    const out = execSync(
      `"${ffprobeBin}" -v quiet -print_format json -show_streams "${filePath}"`,
      { timeout: 15000, encoding: 'utf-8', windowsHide: true },
    );
    const info = JSON.parse(out);
    const vs = info.streams?.find(s => s.codec_type === 'video');
    if (vs && parseFloat(vs.duration) > 0) {
      return {
        width: parseInt(vs.width) || 0,
        height: parseInt(vs.height) || 0,
        duration: parseFloat(vs.duration) || 0,
      };
    }
  } catch {}
  return null;
}

// ── Transcode: 去音轨 + 重编码到目标分辨率 + 压缩 ────
// 成功：rename 临时文件覆盖原文件，返回新 probe 信息；失败：删除临时文件，返回 { error }。
function transcodeVideo(srcPath, targetShort, ffmpegBin, ffprobeBin) {
  if (!VIDEO_TRANSCODE.enabled || !ffmpegBin) return null;
  const tmpPath = srcPath + '.transcoded.mp4';

  // 横版(iw>ih)锁宽=targetShort，竖版锁高=targetShort，对侧按比例(-2 偶数对齐)
  const scaleFilter = `scale='if(gt(iw\\,ih)\\,${targetShort}\\,-2)':'if(gt(iw\\,ih)\\,-2\\,${targetShort})'`;
  const args = [
    '-i', srcPath,
    ...(VIDEO_TRANSCODE.dropAudio ? ['-an'] : []),
    '-c:v', 'libx264', '-preset', VIDEO_TRANSCODE.preset,
    '-crf', String(VIDEO_TRANSCODE.crf),
    '-pix_fmt', 'yuv420p',
    '-vf', scaleFilter,
    '-movflags', '+faststart',
    '-y', tmpPath,
  ];

  try {
    execSync(`"${ffmpegBin}" ${args.map(a => `"${a}"`).join(' ')}`, {
      timeout: 180000, encoding: 'utf-8', windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (e) {
    if (existsSync(tmpPath)) try { unlinkSync(tmpPath); } catch {}
    return { error: e.message };
  }

  const probed = probeVideo(ffprobeBin, tmpPath);
  if (!probed || statSync(tmpPath).size === 0) {
    if (existsSync(tmpPath)) try { unlinkSync(tmpPath); } catch {}
    return { error: 'transcoded output invalid' };
  }

  // 覆盖原文件
  try {
    unlinkSync(srcPath);
    renameSync(tmpPath, srcPath);
  } catch (e) {
    if (existsSync(tmpPath)) try { unlinkSync(tmpPath); } catch {}
    return { error: `replace failed: ${e.message}` };
  }
  return { info: probed };
}

function verifyVideo(filePath, ffprobeBin) {
  const stat = statSync(filePath);
  if (stat.size < 50 * 1024) return false;

  if (ffprobeBin) return probeVideo(ffprobeBin, filePath) !== null;

  // 兜底：无 ffprobe 时用 ftyp 魔数粗判
  try {
    const buf = readFileSync(filePath);
    if (buf.length > 11 && buf.toString('ascii', 4, 8) === 'ftyp') return true;
    for (let offset = 0; offset < Math.min(buf.length, 100); offset += 4) {
      if (buf.toString('ascii', offset + 4, offset + 8) === 'ftyp') return true;
    }
  } catch {}
  return false;
}

// ── Main ──────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let configPath = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) configPath = resolve(args[++i]);
  }
  if (!configPath) {
    console.error('Usage: node collect-materials.mjs --config <materials-config.json>');
    process.exit(2);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const projectDir = resolve(config.projectDir);
  const orientation = config.orientation || 'portrait';
  const imagesDir = join(projectDir, 'materials', 'images');
  const videosDir = join(projectDir, 'materials', 'videos');
  const vectorsDir = join(projectDir, 'materials', 'vectors');

  mkdirSync(imagesDir, { recursive: true });
  mkdirSync(videosDir, { recursive: true });
  mkdirSync(vectorsDir, { recursive: true });

  // 转码所需：ffmpeg / ffprobe 路径 + 目标短边（取自 brief.json）
  const ffmpegBin = VIDEO_TRANSCODE.enabled ? findBin('ffmpeg') : null;
  const ffprobeBin = findBin('ffprobe');
  const targetShort = readTargetShortEdge(projectDir);
  if (VIDEO_TRANSCODE.enabled && !ffmpegBin) {
    console.warn(`⚠ 未找到 ffmpeg，视频转码将跳过（仅下载原文件）。`);
  } else if (VIDEO_TRANSCODE.enabled) {
    console.log(`  视频转码已启用：目标长边=${targetShort}, CRF=${VIDEO_TRANSCODE.crf}${VIDEO_TRANSCODE.dropAudio ? ', 去音轨' : ''}`);
  }

  const allMaterials = [];
  const seenIds = new Set();

  for (const req of config.queries) {
    const { searchTerms, types = ['image', 'video'] } = req;
    console.log(`\n=== ${searchTerms.join(' / ')} ===`);

    const queryImages = [];
    const queryVectors = [];
    const queryVideos = [];

    for (const term of searchTerms) {
      console.log(`  Searching: "${term}"`);

      if (types.includes('image')) {
        // Always search both photos and illustrations
        queryImages.push(...await searchPexelsImages(term, orientation));
        const pixabayPhotos = await searchPixabayImages(term, orientation, 'realistic');
        queryImages.push(...pixabayPhotos.filter(r => r.type === 'image'));
        const pixabayVectors = await searchPixabayImages(term, orientation, 'illustration');
        queryVectors.push(...pixabayVectors);
      }
      if (types.includes('video')) {
        queryVideos.push(...await searchPexelsVideos(term, orientation));
        queryVideos.push(...await searchPixabayVideos(term, orientation));
      }
    }

    // download vectors (max 1)
    for (const vec of queryVectors.slice(0, 1)) {
      if (seenIds.has(vec.id)) continue;
      seenIds.add(vec.id);
      const ext = (vec.url?.match(/\.(png|jpg|jpeg|webp)/i)?.[1]) || 'png';
      const filename = `${vec.id}.${ext}`;
      const saved = await downloadFile(vec.url, join(vectorsDir, filename));
      if (saved) {
        allMaterials.push({
          type: 'vector', source: vec.provider,
          path: `materials/vectors/${filename}`,
          width: vec.width, height: vec.height,
          alt: vec.alt || '',
        });
        console.log(`    ✓ ${filename} (${vec.width}x${vec.height}, vector)`);
      }
    }

    // download images (max 1)
    for (const img of queryImages.slice(0, 1)) {
      if (seenIds.has(img.id)) continue;
      seenIds.add(img.id);
      const ext = (img.url?.match(/\.(jpg|jpeg|png|webp)/i)?.[1]) || 'jpg';
      const filename = `${img.id}.${ext}`;
      const saved = await downloadFile(img.url, join(imagesDir, filename));
      if (saved) {
        allMaterials.push({
          type: 'image', source: img.provider,
          path: `materials/images/${filename}`,
          width: img.width, height: img.height,
          alt: img.alt || '',
        });
        console.log(`    ✓ ${filename} (${img.width}x${img.height})`);
      }
    }

    // download videos (max 1)
    for (const vid of queryVideos.slice(0, 1)) {
      if (seenIds.has(vid.id)) continue;
      seenIds.add(vid.id);
      const filename = `${vid.id}.mp4`;
      const saved = await downloadFile(vid.url, join(videosDir, filename));
      if (saved) {
        const valid = verifyVideo(saved, ffprobeBin);
        if (!valid) {
          try { unlinkSync(saved); } catch {}
          console.warn(`    ✗ ${filename} failed validation`);
          continue;
        }

        const beforeSize = statSync(saved).size;

        // 转码：去音轨 + 重编码到目标分辨率 + CRF 压缩。失败回退保留原文件。
        let width = vid.width, height = vid.height, duration = vid.duration;
        if (VIDEO_TRANSCODE.enabled && ffmpegBin) {
          const result = transcodeVideo(saved, targetShort, ffmpegBin, ffprobeBin);
          if (result?.info) {
            width = result.info.width || width;
            height = result.info.height || height;
            duration = result.info.duration || duration;
            const afterSize = statSync(saved).size;
            console.log(`    ✓ ${filename} (${width}x${height}, ${duration.toFixed(1)}s) [转码 ${(beforeSize / 1024 / 1024).toFixed(1)}MB→${(afterSize / 1024 / 1024).toFixed(1)}MB]`);
          } else {
            console.warn(`    ⚠ ${filename} 转码失败，保留原文件：${result?.error || 'unknown'}`);
            console.log(`    ✓ ${filename} (${vid.width}x${vid.height}, ${vid.duration}s) [未转码 ${(beforeSize / 1024 / 1024).toFixed(1)}MB]`);
          }
        } else {
          console.log(`    ✓ ${filename} (${vid.width}x${vid.height}, ${vid.duration}s)`);
        }

        allMaterials.push({
          type: 'video', source: vid.provider,
          path: `materials/videos/${filename}`,
          width, height, duration, alt: vid.alt || '',
        });
      }
    }
  }

  // write manifest — flat materials pool
  const manifest = { materials: allMaterials };
  const manifestPath = join(projectDir, 'materials.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: ${manifestPath}`);
  console.log(`Total: ${allMaterials.length} materials (${allMaterials.filter(m => m.type === 'image').length} images, ${allMaterials.filter(m => m.type === 'video').length} videos, ${allMaterials.filter(m => m.type === 'vector').length} vectors)`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(2); });
