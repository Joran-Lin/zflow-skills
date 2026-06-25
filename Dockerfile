##
## zflow-skills — environment image
##
## This is a "CLI pipeline environment image", not a long-running web service.
## Once inside the container you can run /start, hyperframes render, ffmpeg,
## node scripts/check-env.mjs exactly as you would locally.
##
## Typical usage (see "Run examples" at the end of this file):
##   docker build -t zflow-skills .
##   docker run --rm -it \
##     --env-file .env \
##     -v "$PWD/output:/pipeline/output" \
##     zflow-skills
##

FROM node:22-bookworm-slim

# ── Locale / timezone ────────────────────────────────────────
#   C.UTF-8: keeps Chinese narration / logs from turning into mojibake
ENV TZ=Asia/Shanghai \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive

# ── Point puppeteer/check at the system chromium (no extra download in the image) ──
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium

# ── npm registry (matches local; speeds up builds. Remove this line if outside China) ──
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

# ── System dependencies ──────────────────────────────────────
#   ffmpeg / ffprobe       rendering + audio mux (render skill)
#   chromium               hyperframes rendering + check layout validation
#   fonts-noto-cjk         ★ required for Chinese rendering, otherwise CJK shows as tofu boxes
#   fonts-noto-color-emoji emoji render correctly
#   fonts-liberation       hyperframes default sans-serif fallback
#   ca-certificates / tini HTTPS certs / PID 1 signal forwarding
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        chromium \
        fonts-noto-cjk \
        fonts-noto-color-emoji \
        fonts-liberation \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/*

# ── Global npm tools (matches check-env.mjs item 6) ──────────
#   hyperframes     HTML → MP4 render engine
#   puppeteer-core  check layout validation (connects to system chromium)
RUN npm install -g hyperframes puppeteer-core \
    && npm cache clean --force

# ── Working directory ────────────────────────────────────────
WORKDIR /pipeline

# Copy package*.json first to leverage layer caching (deps unchanged -> skip reinstall)
COPY package*.json ./

# Local dependencies (currently only ws). Use ci if a lockfile exists, else fall back to install
RUN if [ -f package-lock.json ]; then \
        (npm ci --omit=dev || npm install --omit=dev); \
    else \
        npm install --omit=dev; \
    fi \
    && npm cache clean --force

# ── Project source (.dockerignore already excludes .env / output / node_modules / .git) ──
COPY . .

# Create the artifacts directory. Strongly recommend overriding at runtime with -v,
# otherwise artifacts are lost when the container is destroyed.
RUN mkdir -p output
VOLUME ["/pipeline/output"]

# Runs as root: puppeteer detects uid=0 and auto-adds --no-sandbox,
# so no need to change launch args in the hyperframes / check scripts.
# To run as a non-root user, you must also pass --no-sandbox to chromium.

# Default: enter the container -> run an env self-check -> drop into an interactive shell
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bash", "-lc", "node scripts/check-env.mjs --check; exec bash"]

# ─────────────────────────────────────────────────────────────
# Run examples
# ─────────────────────────────────────────────────────────────
# Build:
#   docker build -t zflow-skills .
#
# Interactive entry (recommended; keys injected via .env, artifacts land on host):
#   docker run --rm -it \
#     --env-file .env \
#     -v "$PWD/output:/pipeline/output" \
#     zflow-skills
#
# Run a single command:
#   docker run --rm zflow-skills hyperframes --version
#   docker run --rm zflow-skills ffmpeg -version
#
# Note: global npm tools are pre-installed; check-env.mjs showing API keys as
# unconfigured is expected (keys are no longer baked in — inject via --env-file).
