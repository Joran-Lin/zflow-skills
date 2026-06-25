/**
 * check-layout.mjs — 校验 HTML composition 布局冲突
 *
 * 用法: node check-layout.mjs <composition-dir-or-html-path>
 *
 * 退出码: 0 = 无冲突, 1 = 发现冲突
 */

import { readFileSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// puppeteer-core: 优先从全局 npm 查找，fallback 到本地
let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  try {
    // Windows 全局 npm 路径
    const { homedir } = require('os');
    const path = require('path');
    const globalPath = process.platform === 'win32'
      ? path.join(homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', 'puppeteer-core')
      : '/usr/local/lib/node_modules/puppeteer-core';
    puppeteer = require(globalPath);
  } catch {
    console.error('Error: puppeteer-core not found. Install globally: npm install -g puppeteer-core');
    process.exit(2);
  }
}

// ── 配置 ──────────────────────────────────────────────

const OVERLAP_THRESHOLD = 0.05; // 重叠面积占较小元素的 5% 以上才报告
const PIXEL_TOLERANCE = 3;      // 3px 以内的接触不算冲突

// 跳过的 CSS class（装饰元素）
const SKIP_CLASSES = ['glow', 'scan-line', 'data-rain', 'caption-group', 'drop', 'gold-dust', 'particle', 'grid-bg', 'circuit-bg', 'circuit-line', 'bg-overlay', 'danger-pulse-border'];

// ── 主流程 ────────────────────────────────────────────

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node check-layout.mjs <composition-dir-or-html-path>');
    process.exit(2);
  }

  const htmlPath = resolveHtmlPath(input);
  console.log(`Checking: ${htmlPath}\n`);

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
  await page.waitForSelector('#root');

  const sceneIds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.scene')).map(s => s.id)
  );

  const allIssues = [];
  const sceneDataMap = {};

  for (const sceneId of sceneIds) {
    const result = await page.evaluate(checkScene, sceneId);
    allIssues.push(...result);
    sceneDataMap[sceneId] = result;
  }

  // 跨 scene 多样性检测
  const diversityIssues = await page.evaluate(checkDiversity, sceneIds);
  allIssues.push(...diversityIssues);

  await browser.close();

  // 输出结果
  if (allIssues.length === 0) {
    console.log('\x1b[32m✓ No layout issues detected (no overlaps, no clipping, no viewport overflow)\x1b[0m');
    process.exit(0);
  } else {
    const overlaps = allIssues.filter(i => i.type === 'overlap');
    const overflows = allIssues.filter(i => i.type === 'viewport-overflow');
    const clips = allIssues.filter(i => i.type === 'content-clipped');

    console.log(`\x1b[31m✗ Found ${allIssues.length} layout issue(s):\x1b[0m\n`);

    if (overlaps.length > 0) {
      console.log(`  \x1b[33m── Overlaps (${overlaps.length}) ──\x1b[0m`);
      for (const issue of overlaps) {
        console.log(`  \x1b[33m[${issue.scene}]\x1b[0m ${issue.el1} ↔ ${issue.el2}`);
        console.log(`    Overlap: ${issue.overlapW}x${issue.overlapH}px (${issue.ratio} of smaller)`);
        console.log(`    ${issue.el1}: left=${issue.r1.l} top=${issue.r1.t} ${issue.r1.w}x${issue.r1.h}`);
        console.log(`    ${issue.el2}: left=${issue.r2.l} top=${issue.r2.t} ${issue.r2.w}x${issue.r2.h}`);
        console.log();
      }
    }

    if (overflows.length > 0) {
      console.log(`  \x1b[33m── Viewport Overflow (${overflows.length}) ──\x1b[0m`);
      for (const issue of overflows) {
        console.log(`  \x1b[33m[${issue.scene}]\x1b[0m ${issue.el1} extends beyond viewport: ${issue.ratio}`);
        console.log(`    Box: left=${issue.r1.l} top=${issue.r1.t} ${issue.r1.w}x${issue.r1.h}`);
        console.log();
      }
    }

    if (clips.length > 0) {
      console.log(`  \x1b[33m── Content Clipped (${clips.length}) ──\x1b[0m`);
      for (const issue of clips) {
        console.log(`  \x1b[33m[${issue.scene}]\x1b[0m ${issue.el1} has overflow:hidden, ${issue.ratio}`);
        console.log(`    Visible: ${issue.r1.w}x${issue.r1.h}, Content: ${issue.r2.w}x${issue.r2.h}`);
        console.log();
      }
    }

    const lowRichness = allIssues.filter(i => i.type === 'low-visual-richness');
    if (lowRichness.length > 0) {
      console.log(`  \x1b[33m── Low Visual Richness (${lowRichness.length}) ──\x1b[0m`);
      for (const issue of lowRichness) {
        console.log(`  \x1b[33m[${issue.scene}]\x1b[0m ${issue.ratio}`);
        console.log(`    Tip: add charts, split comparisons, data badges, icon grids, or alert banners`);
        console.log();
      }
    }

    const captionIntrusions = allIssues.filter(i => i.type === 'caption-zone-intrusion');
    if (captionIntrusions.length > 0) {
      console.log(`  \x1b[33m── Caption Zone Intrusion (${captionIntrusions.length}) ──\x1b[0m`);
      for (const issue of captionIntrusions) {
        console.log(`  \x1b[33m[${issue.scene}]\x1b[0m ${issue.el1} intrudes into caption safe zone`);
        console.log(`    ${issue.ratio}`);
        console.log();
      }
    }

    const excessiveGaps = allIssues.filter(i => i.type === 'excessive-gap');
    if (excessiveGaps.length > 0) {
      console.log(`  \x1b[33m── Excessive Gaps (${excessiveGaps.length}) ──\x1b[0m`);
      for (const issue of excessiveGaps) {
        console.log(`  \x1b[33m[${issue.scene}]\x1b[0m ${issue.el1} ↔ ${issue.el2}`);
        console.log(`    ${issue.ratio}`);
        console.log();
      }
    }

    const diversityWarnings = allIssues.filter(i => i.type === 'diversity-warning');
    if (diversityWarnings.length > 0) {
      console.log(`  \x1b[33m── Scene Diversity (${diversityWarnings.length}) ──\x1b[0m`);
      for (const issue of diversityWarnings) {
        console.log(`  \x1b[33m${issue.ratio}\x1b[0m`);
        console.log();
      }
    }

    process.exit(1);
  }
}

// ── 在浏览器中执行的检测函数 ──────────────────────────────

function checkScene(sceneId) {
  var SKIP_CLASSES = ['glow', 'scan-line', 'data-rain', 'caption-group', 'drop', 'gold-dust', 'particle', 'grid-bg', 'circuit-bg', 'circuit-line', 'bg-overlay', 'danger-pulse-border', 'hero-image-overlay'];
  var scene = document.getElementById(sceneId);
  if (!scene) return [];

  // 隐藏所有 scene，只显示当前
  document.querySelectorAll('.scene').forEach(function(s) { s.style.opacity = '0'; });
  scene.style.opacity = '1';

  var sceneRect = scene.getBoundingClientRect();

  // 收集内容元素
  var elements = [];
  var allWithId = scene.querySelectorAll('[id]');

  allWithId.forEach(function(el) {
    if (el.id === sceneId) return;

    // 跳过装饰元素
    for (var i = 0; i < el.classList.length; i++) {
      if (SKIP_CLASSES.indexOf(el.classList[i]) !== -1) return;
    }

    // 跳过 caption 容器及其子元素
    if (el.closest('.caption-group')) return;

    // 跳过 img-slot 内的 <img>（wrapper 已代表视觉内容，避免重复检测）
    if (el.tagName === 'IMG' && (el.closest('.img-slot') || el.closest('.img-card') || el.closest('.hero-image') || el.closest('.side-strip-img'))) return;

    // 跳过全屏背景图（覆盖 >80% scene 的 img-slot）及其子 img
    if (el.classList.contains('img-slot')) {
      var r = el.getBoundingClientRect();
      if (r.width >= sceneRect.width * 0.8 && r.height >= sceneRect.height * 0.8) return;
    }
    // 也跳过 img-slot 内的 <img>（背景图的子元素）
    if (el.tagName === 'IMG' && el.closest('.img-slot')) {
      var slot = el.closest('.img-slot');
      var sr = slot.getBoundingClientRect();
      if (sr.width >= sceneRect.width * 0.8 && sr.height >= sceneRect.height * 0.8) return;
    }

    // 强制可见以获取真实尺寸
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.style.transform = 'none';
    el.style.display = el.style.display || ''; // 保持原 display

    var rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    elements.push({
      id: el.id,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
      el: el
    });
  });

  // 检测重叠
  var issues = [];
  for (var i = 0; i < elements.length; i++) {
    for (var j = i + 1; j < elements.length; j++) {
      var a = elements[i];
      var b = elements[j];

      // 跳过祖先后代关系
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;

      // 跳过 callout-line / text-overlay 与 img-slot 的重叠（标注线有意叠加在图片上）
      var isCallout = function(el) { return el.classList.contains('callout-line') || el.classList.contains('text-overlay'); };
      var isImgSlot = function(el) { return el.classList.contains('img-slot') || el.closest('.img-slot') || el.classList.contains('img-card') || el.closest('.img-card') || el.classList.contains('hero-image') || el.closest('.hero-image') || el.classList.contains('side-strip-img') || el.closest('.side-strip-img'); };
      if ((isCallout(a.el) && isImgSlot(b.el)) || (isCallout(b.el) && isImgSlot(a.el))) continue;

      // 跳过 gauge 内部元素重叠（center text, glow ring 都在 gauge 容器内）
      var isGaugePart = function(el) { return el.closest('.gauge-ring-wrap') || el.closest('.gauge-ring-container'); };
      if (isGaugePart(a.el) && isGaugePart(b.el)) continue;

      // 跳过 stack-card 互相重叠（卡片堆叠是设计意图）
      if (a.el.classList.contains('stack-card') && b.el.classList.contains('stack-card')) continue;

      // 跳过 bg-image (全出血背景) 与其他元素的重叠
      var isBgImage = function(el) { return el.classList.contains('bg-image'); };
      if (isBgImage(a.el) || isBgImage(b.el)) continue;

      // 跳过 blurred img-slot（半透明模糊背景）与内容的重叠
      var isBlurredBg = function(el) { return el.classList.contains('img-slot') && el.querySelector('img[style*="blur"]'); };
      if (isBlurredBg(a.el) || isBlurredBg(b.el)) continue;

      // 跳过 hero-image 与 badge 的重叠（badge 叠在图片底部是设计意图）
      var isHeroImage = function(el) { return el.classList.contains('hero-image') || el.closest('.hero-image'); };
      var isBadge = function(el) { return el.closest('[id$="-badge"]'); };
      if ((isHeroImage(a.el) && isBadge(b.el)) || (isBadge(a.el) && isHeroImage(b.el))) continue;

      // 跳过 side-strip-img 与 stack-cards/gauges 的重叠（侧边装饰条有意被卡片遮盖）
      var isSideStrip = function(el) { return el.classList.contains('side-strip-img') || el.closest('.side-strip-img'); };
      var isStackCard = function(el) { return el.closest('.stack-cards'); };
      if ((isSideStrip(a.el) && isStackCard(b.el)) || (isStackCard(a.el) && isSideStrip(b.el))) continue;
      if ((isSideStrip(a.el) && isGaugePart(b.el)) || (isGaugePart(a.el) && isSideStrip(b.el))) continue;

      // 跳过 gauge-glow-ring 与下方 info/alert 的重叠（glow ring 有意扩散）
      var isGlowRing = function(el) { return el.classList.contains('gauge-glow-ring'); };
      var isInfoBlock = function(el) { return el.closest('[id$="-info"]') || el.closest('[id$="-alert"]') || el.closest('[id$="-items"]'); };
      if ((isGlowRing(a.el) && isInfoBlock(b.el)) || (isInfoBlock(a.el) && isGlowRing(b.el))) continue;

      // 跳过 badge 与 gauges/cards/timeline 的轻微重叠（badge 在上方，紧贴下方内容）
      if (isBadge(a.el) && !isHeroImage(b.el)) continue;
      if (isBadge(b.el) && !isHeroImage(a.el)) continue;

      // 计算重叠区域
      var ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      var oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

      if (ox > 3 && oy > 3) {
        var overlapArea = ox * oy;
        var minArea = Math.min(a.width * a.height, b.width * b.height);
        var ratio = overlapArea / minArea;

        if (ratio > 0.05) {
          issues.push({
            type: 'overlap',
            scene: sceneId,
            el1: a.id,
            el2: b.id,
            overlapW: Math.round(ox),
            overlapH: Math.round(oy),
            ratio: (ratio * 100).toFixed(1) + '%',
            r1: { l: Math.round(a.left), t: Math.round(a.top), w: Math.round(a.width), h: Math.round(a.height) },
            r2: { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) },
          });
        }
      }
    }
  }

  // 检测视口溢出（元素超出 scene 边界被裁剪）
  var vpW = sceneRect.width;
  var vpH = sceneRect.height;
  for (var i = 0; i < elements.length; i++) {
    var e = elements[i];
    var overflowRight = e.right - sceneRect.left - vpW;
    var overflowBottom = e.bottom - sceneRect.top - vpH;
    var overflowLeft = sceneRect.left - e.left;
    var overflowTop = sceneRect.top - e.top;

    if (overflowRight > 5 || overflowBottom > 5 || overflowLeft > 5 || overflowTop > 5) {
      // 跳过全屏背景图（它们故意超出）
      if (e.el.classList.contains('img-slot')) {
        var sr = e.el.getBoundingClientRect();
        if (sr.width >= vpW * 0.8 && sr.height >= vpH * 0.8) continue;
      }

      var directions = [];
      if (overflowRight > 5) directions.push('right +' + Math.round(overflowRight) + 'px');
      if (overflowBottom > 5) directions.push('bottom +' + Math.round(overflowBottom) + 'px');
      if (overflowLeft > 5) directions.push('left -' + Math.round(overflowLeft) + 'px');
      if (overflowTop > 5) directions.push('top -' + Math.round(overflowTop) + 'px');

      issues.push({
        type: 'viewport-overflow',
        scene: sceneId,
        el1: e.id,
        el2: '',
        overflowW: 0,
        overflowH: 0,
        ratio: directions.join(', '),
        r1: { l: Math.round(e.left), t: Math.round(e.top), w: Math.round(e.width), h: Math.round(e.height) },
        r2: { l: 0, t: 0, w: 0, h: 0 },
      });
    }
  }

  // 检测内容裁剪（overflow:hidden 的容器内子内容被截断）
  var clipContainers = scene.querySelectorAll('[style*="overflow"]');
  clipContainers.forEach(function(el) {
    if (!el.id) return;
    var style = el.style;
    if (style.overflow !== 'hidden' && !style.overflow.includes('hidden')) return;

    // 检查 scrollHeight vs clientHeight / scrollWidth vs clientWidth
    var clippedV = el.scrollHeight > el.clientHeight + 2;
    var clippedH = el.scrollWidth > el.clientWidth + 2;
    if (clippedV || clippedH) {
      var detail = '';
      if (clippedV) detail += Math.round(el.scrollHeight - el.clientHeight) + 'px hidden vertically';
      if (clippedV && clippedH) detail += ', ';
      if (clippedH) detail += Math.round(el.scrollWidth - el.clientWidth) + 'px hidden horizontally';

      issues.push({
        type: 'content-clipped',
        scene: sceneId,
        el1: el.id,
        el2: '',
        overflowW: 0,
        overflowH: 0,
        ratio: detail,
        r1: { l: Math.round(el.getBoundingClientRect().left), t: Math.round(el.getBoundingClientRect().top), w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) },
        r2: { l: 0, t: 0, w: Math.round(el.scrollWidth), h: Math.round(el.scrollHeight) },
      });
    }
  });

  // 检测视觉元素多样性（每个场景必须有 ≥2 种不同类型的非文本视觉组件）
  var componentTypes = {
    chart: false,       // CSS 条形图 (.css-chart, .bar-fill)
    split: false,       // 分屏对比 (.split-container, .split-side)
    badge: false,       // 数据徽章 (.data-badge, .db-value)
    iconGrid: false,    // 图标网格 (.icon-grid, .icon-grid-item, .icon-badge-grid, .icon-badge-item)
    alert: false,       // 警告横幅 (.alert-banner)
    progress: false,    // 进度/仪表 (.progress-gauge, .gauge-ring-wrap, .gauge-bar-wrap)
    image: false,       // 图片 (img not in full-screen bg)
    callout: false,     // 结构标注 (.schematic-callout, .callout-line)
    quoteCard: false,   // 引言卡片 (.quote-card)
    webAnim: false,     // Web 动画容器 (canvas, svg via D3/JSXGraph)
    statGrid: false,    // 数据卡片网格 (.stat-grid, .stat-card)
    flowDiagram: false, // 流程图 (.flow-diagram, .flow-node)
    donutChart: false,  // 环形图 (.donut-chart)
    timeline: false,    // 纵向时间线 (.v-timeline, .vt-item)
    stackCards: false,  // 卡片堆叠 (.stack-cards, .stack-card)
  };

  // 检测 chart
  if (scene.querySelector('.css-chart, .bar-fill, .bar-track')) componentTypes.chart = true;

  // 检测 split
  if (scene.querySelector('.split-container, .split-side, .split-divider')) componentTypes.split = true;

  // 检测 badge
  if (scene.querySelectorAll('.data-badge, .db-value').length >= 2) componentTypes.badge = true;

  // 检测 icon grid
  if (scene.querySelector('.icon-grid, .icon-grid-item, .icon-badge-grid, .icon-badge-item')) componentTypes.iconGrid = true;

  // 检测 alert banner
  if (scene.querySelector('.alert-banner')) componentTypes.alert = true;

  // 检测 progress / gauge
  if (scene.querySelector('.progress-gauge, .gauge-ring-wrap, .gauge-bar-wrap, .gauge-fill-circle')) componentTypes.progress = true;

  // 检测 non-bg image
  var imgs = scene.querySelectorAll('img');
  for (var ii = 0; ii < imgs.length; ii++) {
    if (imgs[ii].classList.contains('bg-image')) continue;
    if (imgs[ii].closest('.side-strip-img')) continue; // side strip is decorative
    var ir = imgs[ii].getBoundingClientRect();
    if (ir.width < vpW * 0.8 || ir.height < vpH * 0.8) {
      componentTypes.image = true;
      break;
    }
  }

  // 检测 callout
  if (scene.querySelector('.schematic-callout, .callout, .callout-line')) componentTypes.callout = true;

  // 检测 quote card
  if (scene.querySelector('.quote-card')) componentTypes.quoteCard = true;

  // 检测 web animation (canvas or board container)
  if (scene.querySelector('canvas, [id*="board"], [id*="chart-"], [id*="d3-"]')) componentTypes.webAnim = true;

  // 检测 stat grid
  if (scene.querySelector('.stat-grid, .stat-card')) componentTypes.statGrid = true;

  // 检测 flow diagram
  if (scene.querySelector('.flow-diagram, .flow-node')) componentTypes.flowDiagram = true;

  // 检测 donut chart
  if (scene.querySelector('.donut-chart')) componentTypes.donutChart = true;

  // 检测 timeline
  if (scene.querySelector('.v-timeline, .vt-item')) componentTypes.timeline = true;

  // 检测 stack cards
  if (scene.querySelector('.stack-cards, .stack-card')) componentTypes.stackCards = true;

  // Count active types
  var activeTypes = Object.keys(componentTypes).filter(function(k) { return componentTypes[k]; });

  // hook 和 outro 场景豁免视觉丰富度检查（它们以氛围为主，通常只有文字+背景）
  var isHookOrOutro = /^s0$/.test(sceneId) || /outro/.test(sceneId) ||
    (scene.querySelectorAll('.quote-card').length > 0 &&
     activeTypes.length === 0) ||
    (scene.querySelectorAll('.scene-content .hero-text').length > 0 &&
     activeTypes.length === 0);

  if (activeTypes.length < 2 && !isHookOrOutro) {
    issues.push({
      type: 'low-visual-richness',
      scene: sceneId,
      el1: '(scene)',
      el2: '',
      overflowW: 0,
      overflowH: 0,
      ratio: 'only ' + activeTypes.length + ' visual component type(s): [' + (activeTypes.length > 0 ? activeTypes.join(', ') : 'none') + '] — need ≥2',
      r1: { l: 0, t: 0, w: 0, h: 0 },
      r2: { l: 0, t: 0, w: 0, h: 0 },
    });
  }

  // 检测字幕安全区侵入（非字幕元素的底部不得低于场景底部 - 200px）
  var captionZoneTop = vpH - 200;
  for (var i = 0; i < elements.length; i++) {
    var e = elements[i];
    if (e.el.closest('.caption-group')) continue;
    if (e.el.classList.contains('text-overlay')) {
      // text-overlay 的 bottom 如果超过 captionZoneTop 则报告
      var elBottom = e.bottom - sceneRect.top;
      if (elBottom > captionZoneTop) {
        var intrusion = elBottom - captionZoneTop;
        if (intrusion > 10) {
          issues.push({
            type: 'caption-zone-intrusion',
            scene: sceneId,
            el1: e.id,
            el2: '',
            overlapW: 0,
            overlapH: 0,
            ratio: 'element bottom at y=' + Math.round(elBottom) + ', caption zone starts at y=' + captionZoneTop + ', intrusion=' + Math.round(intrusion) + 'px. Move element up or use top: Npx where N + height < ' + captionZoneTop,
            r1: { l: Math.round(e.left), t: Math.round(e.top), w: Math.round(e.width), h: Math.round(e.height) },
            r2: { l: 0, t: 0, w: 0, h: 0 },
          });
        }
      }
    }
  }

  // 检测垂直空白过大（相邻元素间距 > 150px）
  if (elements.length >= 2) {
    var sorted = elements.slice().sort(function(a, b) { return a.top - b.top; });
    for (var i = 0; i < sorted.length - 1; i++) {
      var gap = sorted[i + 1].top - sorted[i].bottom;
      if (gap > 150) {
        issues.push({
          type: 'excessive-gap',
          scene: sceneId,
          el1: sorted[i].id,
          el2: sorted[i + 1].id,
          overlapW: 0,
          overlapH: 0,
          ratio: Math.round(gap) + 'px vertical gap. Reduce to < 150px by moving elements closer or adding content',
          r1: { l: Math.round(sorted[i].left), t: Math.round(sorted[i].top), w: Math.round(sorted[i].width), h: Math.round(sorted[i].height) },
          r2: { l: Math.round(sorted[i + 1].left), t: Math.round(sorted[i + 1].top), w: Math.round(sorted[i + 1].width), h: Math.round(sorted[i + 1].height) },
        });
      }
    }
  }

  // 恢复 scene
  scene.style.opacity = '0';

  return issues;
}

// ── 工具函数 ──────────────────────────────────────────

// 跨 scene 多样性检测
function checkDiversity(sceneIds) {
  var issues = [];
  if (sceneIds.length < 2) return issues;

  // 1. 统计每个 scene 的主要视觉组件类型
  var sceneSignatures = {};
  sceneIds.forEach(function(sceneId) {
    var scene = document.getElementById(sceneId);
    if (!scene) return;

    var sig = {
      hasGauge: !!scene.querySelector('.gauge-ring-wrap, .gauge-bar-wrap'),
      hasStatGrid: !!scene.querySelector('.stat-grid, .stat-card'),
      hasChart: !!scene.querySelector('.css-chart, .bar-fill, .bar-track'),
      hasDonut: !!scene.querySelector('.donut-chart'),
      hasTimeline: !!scene.querySelector('.v-timeline, .vt-item'),
      hasStackCards: !!scene.querySelector('.stack-cards, .stack-card'),
      hasFlowDiagram: !!scene.querySelector('.flow-diagram, .flow-node'),
      hasSplit: !!scene.querySelector('.split-container, .split-side'),
      hasCallout: !!scene.querySelector('.schematic-callout, .callout-line'),
      hasQuote: !!scene.querySelector('.quote-card'),
      hasSideImage: !!scene.querySelector('.side-strip-img'),
      hasFxOverlay: !!scene.querySelector('.fx-overlay, .glow, .scan-line, .data-rain'),
    };

    // 生成布局签名（基于主要内容的排列方式）
    var mainElements = scene.querySelectorAll('.gauge-ring-wrap, .stat-grid, .css-chart, .donut-chart, .v-timeline, .stack-cards, .flow-diagram, .img-card, .side-strip-img');
    sig.layoutHash = Array.from(mainElements).map(function(el) {
      return el.tagName + '.' + Array.from(el.classList).sort().join('.');
    }).sort().join('|');

    sceneSignatures[sceneId] = sig;
  });

  // 2. 检查连续 scene 相同布局
  for (var i = 0; i < sceneIds.length - 1; i++) {
    var cur = sceneSignatures[sceneIds[i]];
    var next = sceneSignatures[sceneIds[i + 1]];
    if (cur && next && cur.layoutHash === next.layoutHash && cur.layoutHash.length > 0) {
      issues.push({
        type: 'diversity-warning',
        scene: sceneIds[i] + ' → ' + sceneIds[i + 1],
        el1: '',
        el2: '',
        overlapW: 0,
        overlapH: 0,
        ratio: 'Consecutive scenes (' + sceneIds[i] + ', ' + sceneIds[i + 1] + ') have identical layout structure. Use a different layout for one of them.',
        r1: { l: 0, t: 0, w: 0, h: 0 },
        r2: { l: 0, t: 0, w: 0, h: 0 },
      });
    }
  }

  // 3. 检查相同组件出现次数
  var componentCounts = {
    'gauge-ring': 0,
    'stat-grid': 0,
    'css-chart': 0,
    'donut-chart': 0,
    'v-timeline': 0,
    'stack-cards': 0,
    'flow-diagram': 0,
    'side-strip-img': 0,
  };

  sceneIds.forEach(function(sceneId) {
    var scene = document.getElementById(sceneId);
    if (!scene) return;
    if (scene.querySelector('.gauge-ring-wrap, .gauge-bar-wrap')) componentCounts['gauge-ring']++;
    if (scene.querySelector('.stat-grid')) componentCounts['stat-grid']++;
    if (scene.querySelector('.css-chart')) componentCounts['css-chart']++;
    if (scene.querySelector('.donut-chart')) componentCounts['donut-chart']++;
    if (scene.querySelector('.v-timeline')) componentCounts['v-timeline']++;
    if (scene.querySelector('.stack-cards')) componentCounts['stack-cards']++;
    if (scene.querySelector('.flow-diagram')) componentCounts['flow-diagram']++;
    if (scene.querySelector('.side-strip-img')) componentCounts['side-strip-img']++;
  });

  Object.keys(componentCounts).forEach(function(comp) {
    if (componentCounts[comp] > 3) {
      issues.push({
        type: 'diversity-warning',
        scene: '(all scenes)',
        el1: '',
        el2: '',
        overlapW: 0,
        overlapH: 0,
        ratio: '.' + comp + ' appears in ' + componentCounts[comp] + ' scenes (max 3). Replace some with alternative components from the component library.',
        r1: { l: 0, t: 0, w: 0, h: 0 },
        r2: { l: 0, t: 0, w: 0, h: 0 },
      });
    }
  });

  return issues;
}

function resolveHtmlPath(input) {
  const resolved = resolve(input);
  const stat = statSync(resolved);
  if (stat.isDirectory()) {
    return join(resolved, 'index.html');
  }
  return resolved;
}

function findChrome() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.CHROME_PATH,
  ].filter(Boolean);

  for (const p of candidates) {
    try { statSync(p); return p; } catch { /* continue */ }
  }

  console.error('Chrome not found. Set CHROME_PATH env variable.');
  process.exit(2);
}

main().catch(function(e) {
  console.error('Error:', e.message);
  process.exit(2);
});
