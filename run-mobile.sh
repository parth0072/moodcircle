#!/bin/bash
# MoodCircle – run the mobile app on your Mac
# Installs what the app needs, then starts Expo so you can open the app in the iOS Simulator or on
# your iPhone. The app talks to your live server (the address in mobile/.env.development), or to a
# throwaway test copy of the API on this Mac with --local.
#
# Usage:  bash run-mobile.sh                iOS Simulator + your live server (needs Xcode)
#         bash run-mobile.sh --phone        iPhone with Expo Go: shows a QR code to scan
#         bash run-mobile.sh --local        use a throwaway test server on this Mac instead of the live one
#         bash run-mobile.sh --api URL      use another server,
#                                           e.g. --api https://your-domain.com/moodcircle/api
#         bash run-mobile.sh --reset        with --local: empty the test database first (see sign-up again)
#         bash run-mobile.sh --check        check the setup, then stop
#         bash run-mobile.sh --help         all options

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
MOBILE="$ROOT/mobile"

TARGET="simulator"   # simulator | phone
API_URL=""
API_FROM_ENV=0       # 1 when API_URL came from the app's .env files
LOCAL=0              # 1: start a throwaway test server on this Mac
PORT=""
RESET=0
SKIP_INSTALL=0
CHECK_ONLY=0
WORK=""
API_PID=""
WATCH_PID=""

die()  { echo ""; echo "ERROR: $*" >&2; exit 1; }
warn() { echo "WARNING: $*" >&2; }

usage() {
  cat <<'EOF'
MoodCircle – run the mobile app on your Mac

  bash run-mobile.sh [options]

  --simulator      open the app in the iOS Simulator (default; needs Xcode)
  --phone          open the app on your iPhone with Expo Go (scan the QR code)
  --local          use a throwaway test server on this Mac instead of your live server
                   (the sign-in code is printed in this window; nothing is emailed)
  --api URL        use this server, for example https://your-domain.com/moodcircle/api
                   (without --local or --api, the address in mobile/.env.development is used)
  --port N         with --local: port for the test server (default: any free port)
  --reset          with --local: empty the test database first, to see sign-up again
  --skip-install   do not run npm install
  --check          check the setup (Node, dependencies, server), then stop
  -h, --help       show this help
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --simulator)    TARGET="simulator" ;;
    --phone)        TARGET="phone" ;;
    --local)        LOCAL=1 ;;
    --api)          [ -n "$2" ] || die "--api needs an address, for example: --api https://your-domain.com/api"
                    API_URL="$2"; shift ;;
    --port)         case "$2" in ''|*[!0-9]*) die "--port needs a number, for example: --port 3000" ;; esac
                    PORT="$2"; shift ;;
    --reset)        RESET=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    --check)        CHECK_ONLY=1 ;;
    -h|--help)      usage; exit 0 ;;
    *)              die "Unknown option: $1 (try --help)" ;;
  esac
  shift
done

# ── Stop the local test server when this script ends (Ctrl+C included) ────────
cleanup() {
  if [ -n "$WATCH_PID" ]; then
    pkill -P "$WATCH_PID" 2>/dev/null || true
    kill "$WATCH_PID" 2>/dev/null || true
  fi
  if [ -n "$API_PID" ]; then
    kill "$API_PID" 2>/dev/null || true
    echo "Stopped the local test server."
  fi
  if [ -n "$WORK" ]; then rm -rf "$WORK"; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# ── Setup helpers: check what is needed, offer to fix it, say exactly what to do otherwise ──
ask() {   # ask "question" -> yes unless the answer starts with n (no answer, e.g. no terminal: no)
  printf '%s [Y/n] ' "$1"
  read -r reply || return 1
  case "$reply" in n*|N*) return 1 ;; esac
  return 0
}

run_fix() {   # run_fix "why" command args...
  why="$1"; shift
  echo "Needed: $why"
  echo "  command: $*"
  if ask "Run it now?"; then
    "$@" || die "That command failed. Run it yourself, then run this script again: $*"
  else
    die "Run this yourself, then run this script again: $*"
  fi
}

node_ok() {
  command -v node >/dev/null 2>&1 &&
    node -e 'var v=process.versions.node.split(".").map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=13)?0:1)'
}

ensure_node() {
  node_ok && return 0
  if command -v node >/dev/null 2>&1; then echo "Node.js $(node -v) is too old: the app needs 22.13 or newer."
  else echo "Node.js is not installed."; fi
  if command -v brew >/dev/null 2>&1; then
    # node@22 is "keg-only" in Homebrew: use it for this run without changing your global setup.
    NODE22="$(brew --prefix node@22 2>/dev/null)"
    if [ ! -x "$NODE22/bin/node" ]; then
      run_fix "Install Node.js 22 with Homebrew" brew install node@22
      NODE22="$(brew --prefix node@22 2>/dev/null)"
    fi
    export PATH="$NODE22/bin:$PATH"
    hash -r
  fi
  node_ok || die "Install Node.js 22 or newer (the LTS installer from https://nodejs.org is the easiest), open a new Terminal window and run this again."
}

ensure_xcode() {
  if [ ! -d /Applications/Xcode.app ]; then
    echo "Xcode is not installed. It is free in the Mac App Store (a big download, 10+ GB)."
    if ask "Open the Xcode page in the App Store now?"; then
      open "macappstore://apps.apple.com/app/xcode/id497799835" 2>/dev/null || open "https://apps.apple.com/app/xcode/id497799835" || true
    fi
    die "Install Xcode, open it once and let it finish installing components, then run this script again.
No Xcode? Use your iPhone instead: bash run-mobile.sh --phone"
  fi
  if ! xcodebuild -version >/dev/null 2>&1; then
    if ! xcode-select -p 2>/dev/null | grep -q "Xcode.app"; then
      run_fix "Point the command line tools at Xcode" sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
    fi
    if ! xcodebuild -version >/dev/null 2>&1; then
      run_fix "Accept Xcode's license" sudo xcodebuild -license accept
    fi
    xcodebuild -version >/dev/null 2>&1 || die "Xcode is not ready. Open Xcode once, accept what it asks, then run this script again."
  fi
  if ! xcrun simctl list runtimes >/dev/null 2>&1; then
    run_fix "Finish Xcode's first-time setup" sudo xcodebuild -runFirstLaunch
  fi
  if ! xcrun simctl list runtimes 2>/dev/null | grep -q "iOS "; then
    run_fix "Download the iOS Simulator (a few GB)" xcodebuild -downloadPlatform iOS
  fi
  xcodebuild -version | head -1
}

# ── This Mac's Wi-Fi address, so an iPhone on the same network can reach it ───
lan_ip() {
  if command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
  elif command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{print $1}' || true
  fi
}

# The server address in the app's env files, in the order Expo reads them (the first one found wins).
# mobile/.env.development holds the live server; mobile/.env.local (not in git) can override it.
env_file_api_url() {
  local file value
  for file in .env.development.local .env.local .env.development .env; do
    [ -f "$MOBILE/$file" ] || continue
    value="$(sed -n 's/^[[:space:]]*EXPO_PUBLIC_API_URL[[:space:]]*=[[:space:]]*//p' "$MOBILE/$file" \
      | tail -n 1 | tr -d '\r' | sed -e "s/^[\"']//" -e "s/[\"'][[:space:]]*\$//" -e 's/[[:space:]]*$//')"
    case "$value" in
      ''|*your-domain*) continue ;;   # empty, or still the placeholder from .env.example
    esac
    echo "$value"
    return 0
  done
  return 0
}

use_remote_server() {
  API_URL="${API_URL%/}"
  case "$API_URL" in
    http://*|https://*) ;;
    *) die "The server address must start with http:// or https:// (got: $API_URL)" ;;
  esac
  case "$API_URL" in
    */api) ;;
    *) warn "The address normally ends with /api, for example https://your-domain.com/api (got: $API_URL)" ;;
  esac
  [ "$RESET" -eq 0 ] || warn "--reset only applies with --local; ignored."
  if [ "$API_FROM_ENV" -eq 1 ]; then
    echo "Using your server, the address in mobile/.env.development (add --local for a test server on this Mac)."
  fi
  if curl -fsS -m 15 "$API_URL/health" 2>/dev/null | grep -q '"ok":true'; then
    echo "Reachable: $API_URL/health"
  else
    hint=""
    [ "$API_FROM_ENV" -eq 0 ] || hint="
The address comes from mobile/.env.development. To try the app without your server: bash run-mobile.sh --local"
    die "This Mac could not reach $API_URL/health (it should show {\"ok\":true}). Open that address in a browser to see what is wrong.$hint"
  fi
  # The mood screens need /entries, which older server releases do not have. Without signing in, the
  # route answers 401 when it exists and 404 when the server has not been updated yet.
  entries_code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$API_URL/entries/stats?date=2000-01-01" || true)"
  if [ "$entries_code" = "404" ]; then
    warn "This server does not have the mood entries yet (/entries answered 404). Signing in will work, but the mood screens will show errors until the latest main is deployed on the server (run deploy.sh there)."
  fi
}

start_local_server() {
  [ -d "$ROOT/node_modules" ] || die "The project's dependencies are missing: run this without --skip-install once."
  DB="$ROOT/data/mobile-test.db"
  if [ "$RESET" -eq 1 ]; then
    rm -f "$DB" "$DB-shm" "$DB-wal"
    echo "Emptied the local test database."
  fi
  if [ -z "$PORT" ]; then
    PORT="$(node -e 'var s=require("net").createServer();s.listen(0,function(){console.log(s.address().port);s.close()})')"
  fi
  mkdir -p "$ROOT/data"
  LOG="$WORK/api.log"

  # Same settings the test tools use: no SMTP (so the sign-in code is printed instead of emailed),
  # a throwaway secret, and a separate database file from the one 'npm run dev' uses.
  ( cd "$ROOT" && exec env PORT="$PORT" DB_PATH="$DB" JWT_SECRET="mobile-test-only-secret" \
      NODE_ENV=development BASE_PATH="" SMTP_USER="" SMTP_PASS="" node server.js ) >"$LOG" 2>&1 &
  API_PID=$!

  i=0
  until curl -fsS -m 2 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; do
    i=$((i + 1))
    if ! kill -0 "$API_PID" 2>/dev/null || [ "$i" -ge 30 ]; then
      echo "--- server output ---"
      tail -n 20 "$LOG"
      die "The local test server did not start."
    fi
    sleep 1
  done
  echo "Local test server is running on port $PORT (data: data/mobile-test.db)."
  echo "It sends no emails: the sign-in code appears in this window as '>>> Sign-in code: 123456'."

  ( tail -n 0 -F "$LOG" 2>/dev/null | while IFS= read -r line; do
      case "$line" in
        "[OTP]"*) printf '\n  >>> Sign-in code: %s\n\n' "${line#\[OTP\] }" ;;
      esac
    done ) &
  WATCH_PID=$!
}

# Which server does the app talk to? --api wins, then --local; otherwise the address in the app's env files.
if [ "$LOCAL" -eq 1 ] && [ -n "$API_URL" ]; then
  die "Use either --local or --api, not both."
fi
if [ "$LOCAL" -eq 0 ] && [ -z "$API_URL" ]; then
  API_URL="$(env_file_api_url)"
  if [ -n "$API_URL" ]; then API_FROM_ENV=1; fi
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/moodcircle-run.XXXXXX")"

# ── 1. This computer ──────────────────────────────────────────────────────────
echo "=== [1/5] Checking this computer ==="
if [ "$(uname)" != "Darwin" ]; then
  warn "This is $(uname), not macOS. The iOS Simulator only exists on a Mac."
fi
[ -d "$MOBILE" ] || die "The mobile/ folder is missing. The app lives on the main branch:
  git fetch origin && git checkout main && git pull"
ensure_node
command -v npm >/dev/null 2>&1 || die "npm was not found (it is installed together with Node.js)."
command -v curl >/dev/null 2>&1 || die "curl was not found."
echo "Node $(node -v), npm $(npm -v)"

if [ "$TARGET" = "simulator" ] && [ "$(uname)" = "Darwin" ]; then
  ensure_xcode
fi

# ── 2. Dependencies ───────────────────────────────────────────────────────────
echo ""
echo "=== [2/5] Installing dependencies (the first run takes a few minutes) ==="
if [ "$SKIP_INSTALL" -eq 1 ]; then
  echo "Skipped (--skip-install)."
else
  # --no-save never rewrites package.json or package-lock.json, so git stays clean.
  (cd "$MOBILE" && npm install --no-save --no-audit --no-fund) || die "npm install failed in mobile/."
  if [ -z "$API_URL" ]; then
    (cd "$ROOT" && npm install --omit=dev --no-save --no-audit --no-fund) \
      || die "npm install failed in the project folder. If it mentions gyp or a compiler, run: xcode-select --install"
  fi
fi
[ -d "$MOBILE/node_modules" ] || die "The app's dependencies are missing: run this without --skip-install once."

# ── 3. API server ─────────────────────────────────────────────────────────────
echo ""
echo "=== [3/5] API server ==="
if [ -n "$API_URL" ]; then
  use_remote_server
else
  start_local_server
fi

# ── 4. Address the app will use ───────────────────────────────────────────────
echo ""
echo "=== [4/5] Address the app will use ==="
if [ -z "$API_URL" ]; then
  if [ "$TARGET" = "phone" ]; then
    HOST="$(lan_ip)"
    [ -n "$HOST" ] || die "Could not find this Mac's Wi-Fi address. Connect to Wi-Fi (the iPhone must be on the same one) and run this again."
  else
    HOST="localhost"   # the Simulator shares this Mac's network
  fi
  API_URL="http://$HOST:$PORT/api"
fi
# Expo bakes EXPO_PUBLIC_* variables into the app; a value set here wins over mobile/.env.
export EXPO_PUBLIC_API_URL="$API_URL"
echo "The app will talk to: $EXPO_PUBLIC_API_URL"

if [ "$CHECK_ONLY" -eq 1 ]; then
  echo ""
  echo "Setup looks good (--check: Expo was not started)."
  exit 0
fi

# ── 5. Start the app ──────────────────────────────────────────────────────────
echo ""
echo "=== [5/5] Starting the app (press Ctrl+C to stop everything) ==="
cd "$MOBILE"
if [ "$TARGET" = "phone" ]; then
  if ! npx expo whoami >/dev/null 2>&1; then
    echo "Expo Go on a physical iPhone needs you signed in to Expo (free account: https://expo.dev/signup)."
    npx expo login || die "Signing in to Expo failed."
  fi
  echo "Signed in to Expo as: $(npx expo whoami 2>/dev/null)"
  cat <<'EOF'

On the iPhone:
  1. Open Expo Go, tap the account icon (top right) and sign in with the same Expo account.
  2. Scan the QR code below with the Camera app, then tap the banner.
  The iPhone must be on the same Wi-Fi as this Mac. If macOS asks whether "node" may accept
  incoming connections, choose Allow.
  If Expo Go says "Project is incompatible with this version of Expo Go", the App Store version
  is too old for this app: see "Run it on your iPhone" in mobile/README.md.

EOF
  npx expo start --clear
else
  cat <<'EOF'

Expo will open the iOS Simulator and install Expo Go in it by itself (the first time can take
a few minutes). Then sign up or sign in inside the Simulator.

EOF
  npx expo start --clear --ios
fi
