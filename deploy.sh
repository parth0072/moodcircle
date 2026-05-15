#!/bin/bash
# MoodCircle – cPanel deploy script
# Run this on the cPanel server after pushing from your local machine.
# It pulls the latest code and installs production dependencies.
#
# Usage:  bash deploy.sh

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Find npm on cPanel (non-standard PATH) ─────────────────────────────────────
if ! command -v npm &>/dev/null; then
  for NVDIR in "$HOME"/nodevenv/*/*/bin; do
    [ -f "$NVDIR/npm" ] && export PATH="$NVDIR:$PATH" && break
  done
fi
if ! command -v npm &>/dev/null; then
  for P in /usr/local/bin /opt/cpanel/ea-nodejs*/bin /usr/bin; do
    [ -f "$P/npm" ] && export PATH="$P:$PATH" && break
  done
fi
if ! command -v npm &>/dev/null; then
  echo "ERROR: npm not found. Restart the Node.js app manually from cPanel."
  exit 1
fi

echo "Using npm: $(which npm)"
echo "Using node: $(node -v 2>/dev/null || echo 'unknown')"

echo ""
echo "=== [1/2] Pulling latest code from main ==="
cd "$ROOT"

# If this directory was uploaded manually (not cloned), initialise git first
if [ ! -d ".git" ]; then
  echo "  → No git repo found. Initialising and connecting to remote..."
  git init
  git remote add origin https://github.com/parth0072/moodcircle.git
  git fetch origin main
  git reset --hard origin/main
else
  git pull origin main
fi

echo ""
echo "=== [2/2] Installing production dependencies ==="
npm install --omit=dev --no-audit

echo ""
echo "✓ Done! Go to cPanel → Node.js Apps → Restart your app."
