#!/bin/bash
# MoodCircle – local push script
# Stages all changes, commits with a message, and pushes to GitHub.
#
# Usage:  bash push.sh "your commit message"
#         bash push.sh            (uses a default timestamped message)

set -e

MSG="${1:-"Update $(date '+%Y-%m-%d %H:%M')"}"

echo "=== [1/3] Staging all changes ==="
git add -A

echo ""
echo "=== [2/3] Committing: \"$MSG\" ==="
git commit -m "$MSG" || { echo "Nothing to commit."; exit 0; }

echo ""
echo "=== [3/3] Pushing to origin/main ==="
git push origin main

echo ""
echo "✓ Pushed! Now SSH into cPanel and run:  bash deploy.sh"
