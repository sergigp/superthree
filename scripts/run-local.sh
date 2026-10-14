#!/usr/bin/env bash
# Runs superthree locally the way the container will: builds the web SPA and
# starts the server serving it on one port. The SQLite database lives in
# data/ under the repo root (gitignored) so shows persist across restarts;
# pass --fresh-db for a throwaway database in a temp directory.
# For frontend work with hot reload, use `pnpm dev` instead.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8080}"
SKIP_WEB_BUILD=false
FRESH_DB=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"
      shift 2
      ;;
    --skip-web-build)
      SKIP_WEB_BUILD=true
      shift
      ;;
    --fresh-db)
      FRESH_DB=true
      shift
      ;;
    -h | --help)
      cat <<USAGE
Usage: $(basename "$0") [--port <port>] [--skip-web-build] [--fresh-db]

  --port <port>       HTTP port to listen on (default: \$PORT or 8080)
  --skip-web-build    Reuse the existing apps/web/dist instead of rebuilding it
  --fresh-db          Use a throwaway database in a temp directory instead of
                      the persistent one in data/
USAGE
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

REQUIRED_NODE_MAJOR="$(cat "$REPO_ROOT/.nvmrc")"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
if [[ -z "$NODE_MAJOR" ]]; then
  echo "error: node not found on PATH — install Node $REQUIRED_NODE_MAJOR (see .nvmrc)" >&2
  exit 1
fi
if (( NODE_MAJOR < REQUIRED_NODE_MAJOR )); then
  echo "error: Node $REQUIRED_NODE_MAJOR+ required, found $(node --version)" >&2
  exit 1
fi
if ! command -v pnpm >/dev/null; then
  echo "error: pnpm not found on PATH — run 'corepack enable' or install pnpm" >&2
  exit 1
fi

if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$REPO_ROOT/.env"
  set +a
fi

echo "==> installing dependencies"
(cd "$REPO_ROOT" && pnpm install --frozen-lockfile)

WEB_DIST="$REPO_ROOT/apps/web/dist"
if [[ "$SKIP_WEB_BUILD" == false ]]; then
  echo "==> building web UI"
  (cd "$REPO_ROOT" && pnpm build)
elif [[ ! -f "$WEB_DIST/index.html" ]]; then
  echo "error: --skip-web-build given but $WEB_DIST/index.html does not exist" >&2
  exit 1
fi

if [[ "$FRESH_DB" == true ]]; then
  DATA_DIR="$(mktemp -d /tmp/superthree-local-data.XXXXXX)"
else
  DATA_DIR="${DATA_DIR:-$REPO_ROOT/data}"
fi
LOG_LEVEL="${LOG_LEVEL:-info}"

echo "==> environment injected into superthree:"
echo "    PORT=$PORT"
echo "    DATA_DIR=$DATA_DIR"
echo "    WEB_DIST=$WEB_DIST"
echo "    LOG_LEVEL=$LOG_LEVEL"
echo "==> starting superthree on http://localhost:$PORT (Ctrl+C to stop)"

cd "$REPO_ROOT"
exec env \
  PORT="$PORT" \
  DATA_DIR="$DATA_DIR" \
  WEB_DIST="$WEB_DIST" \
  LOG_LEVEL="$LOG_LEVEL" \
  node apps/server/src/main.ts
