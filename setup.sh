#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "=== zflow-skills Setup ==="
echo ""

# ── Step 0: Ensure Node.js is available ──────────────────────────
if command -v node &>/dev/null; then
    echo "[OK] Node.js found: $(node --version)"
    echo ""
else
    echo "[MISSING] Node.js not found on PATH."
    echo ""

    OS="$(uname -s)"
    INSTALLED=false

    # macOS → Homebrew
    if [[ "$OS" == "Darwin" ]] && command -v brew &>/dev/null; then
        echo "Installing Node.js 22 via Homebrew..."
        brew install node@22
        INSTALLED=true
    fi

    # Linux → apt (NodeSource)
    if [[ "$OS" == "Linux" ]] && [[ "$INSTALLED" == "false" ]] && command -v apt-get &>/dev/null; then
        echo "Installing Node.js 22 via NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
        INSTALLED=true
    fi

    # Fallback → nvm
    if [[ "$INSTALLED" == "false" ]] && command -v nvm &>/dev/null; then
        echo "Installing Node.js 22 via nvm..."
        nvm install 22 && nvm use 22
        INSTALLED=true
    fi

    # Fallback → fnm
    if [[ "$INSTALLED" == "false" ]] && command -v fnm &>/dev/null; then
        echo "Installing Node.js 22 via fnm..."
        fnm install 22 && fnm use 22
        INSTALLED=true
    fi

    # Fallback → volta
    if [[ "$INSTALLED" == "false" ]] && command -v volta &>/dev/null; then
        echo "Installing Node.js 22 via Volta..."
        volta install node@22
        INSTALLED=true
    fi

    # Re-check
    if command -v node &>/dev/null; then
        echo ""
        echo "[OK] Node.js installed: $(node --version)"
        echo ""
    else
        echo ""
        echo "[ERROR] Node.js is required but could not be auto-installed."
        echo ""
        echo "Please install Node.js 22 LTS manually:"
        echo "  macOS:   brew install node@22"
        echo "  Linux:   https://deb.nodesource.com"
        echo "  Any:     https://nodejs.org  (download the LTS installer)"
        echo ""
        echo "Then re-run this script."
        exit 1
    fi
fi

# ── Step 1: Run environment check ────────────────────────────────
echo "Running cross-platform environment check..."
echo ""

node scripts/check-env.mjs --fix

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Environment check failed. Fix the issues above."
    exit 1
fi

echo ""
echo "=== Setup complete ==="
echo "Open this directory in your IDE and invoke /video-brief to get started."
