#!/usr/bin/env bash
# DocMan — clean Linux verification (Ubuntu / WSL / CI). Uses natively installed services, same as production.
#
#   bash scripts/verify-linux.sh             # install, unit tests, build both frontends, end-to-end smoke test
#   SKIP_E2E=1 bash scripts/verify-linux.sh  # skip the MongoDB/Redis end-to-end part
#
# End-to-end uses the MongoDB already installed on this machine (default mongodb://127.0.0.1:27017) and a
# throwaway database named docman_verify_<timestamp>, so existing data is never touched. Override with:
#   MONGO_URI=mongodb://user:pass@127.0.0.1:27017/?authSource=admin
# Redis is optional: set REDIS_URL=redis://:password@127.0.0.1:6379/0 to test the self-hosted Redis store;
# without it the in-memory store is used.
#
# Run it from a Linux filesystem path (e.g. ~/docman in WSL), not /mnt/c/..., so node_modules get Linux binaries.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${SMOKE_PORT:-5099}"
LOG_DIR="$ROOT/.verify-logs"
mkdir -p "$LOG_DIR"
SERVER_PID=""

step() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then kill "$SERVER_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT

case "$ROOT" in
  /mnt/[a-z]/*) echo "⚠  Running from a Windows drive ($ROOT). It works, but is slow and replaces node_modules for Linux.";;
esac

step "Toolchain"
command -v node >/dev/null || fail "Node.js is required (20.19+ or 22.12+). Install via nvm or NodeSource."
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(!(a>22||(a===22&&b>=12)||(a===20&&b>=19)||a>=23)) {console.error("Node "+process.versions.node+" is too old (need 20.19+ or 22.12+)"); process.exit(1)}'
echo "node $(node -v), npm $(npm -v)"

step "Install (npm ci)"
(cd backend && npm ci --no-audit --no-fund) > "$LOG_DIR/install-backend.log" 2>&1 || fail "backend npm ci failed (see $LOG_DIR/install-backend.log)"
(cd frontend-vue && npm ci --no-audit --no-fund) > "$LOG_DIR/install-frontend-vue.log" 2>&1 || fail "frontend-vue npm ci failed (see $LOG_DIR/install-frontend-vue.log)"
(cd frontend && npm ci --no-audit --no-fund) > "$LOG_DIR/install-frontend.log" 2>&1 || fail "frontend npm ci failed (see $LOG_DIR/install-frontend.log)"
echo "ok"

step "Backend unit tests (compliance + security)"
(cd backend && NODE_ENV=test npx jest src/__tests__/compliance src/__tests__/services/identityService.authentik.test.js --ci 2>&1 | tee "$LOG_DIR/unit.log") || fail "unit tests failed (see $LOG_DIR/unit.log)"

step "Build Vue frontend"
(cd frontend-vue && npm run build) > "$LOG_DIR/build-vue.log" 2>&1 || fail "Vue build failed (see $LOG_DIR/build-vue.log)"
tail -n 3 "$LOG_DIR/build-vue.log"

step "Build Vue remote bundle"
(cd frontend-vue && npm run build:remote) > "$LOG_DIR/build-remote.log" 2>&1 || fail "Vue remote build failed (see $LOG_DIR/build-remote.log)"

step "Build React frontend (legacy)"
(cd frontend && npm run build) > "$LOG_DIR/build-react.log" 2>&1 || fail "React build failed (see $LOG_DIR/build-react.log)"
tail -n 3 "$LOG_DIR/build-react.log"

if [[ "${SKIP_E2E:-0}" == "1" ]]; then
  step "End-to-end skipped (SKIP_E2E=1)"; exit 0
fi

step "MongoDB + Redis"
MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017}"
MONGO_HOSTPORT="$(echo "$MONGO_URI" | sed -E 's#^mongodb://([^@/]*@)?([^/?,]+).*#\2#')"
MONGO_HOST="${MONGO_HOSTPORT%%:*}"; MONGO_PORT="${MONGO_HOSTPORT##*:}"; [[ "$MONGO_PORT" == "$MONGO_HOST" ]] && MONGO_PORT=27017
if ! (exec 3<>"/dev/tcp/$MONGO_HOST/$MONGO_PORT") 2>/dev/null; then
  fail "MongoDB is not reachable at $MONGO_HOST:$MONGO_PORT. Start it (sudo systemctl start mongod), set MONGO_URI, or use SKIP_E2E=1."
fi
if [[ -n "${REDIS_URL:-}" ]]; then
  REDIS_HOSTPORT="$(echo "$REDIS_URL" | sed -E 's#^rediss?://([^@/]*@)?([^/?]+).*#\2#')"
  (exec 3<>"/dev/tcp/${REDIS_HOSTPORT%%:*}/${REDIS_HOSTPORT##*:}") 2>/dev/null || fail "Redis is not reachable at $REDIS_HOSTPORT (sudo systemctl start redis-server)."
fi
DB_NAME="docman_verify_$(date +%s)"
case "$MONGO_URI" in
  *\?*) DB_URI="${MONGO_URI%%\?*}"; DB_URI="${DB_URI%/}/$DB_NAME?${MONGO_URI#*\?}";;
  *) DB_URI="${MONGO_URI%/}/$DB_NAME";;
esac
echo "database: $DB_NAME"
echo "redis:    ${REDIS_URL:+${REDIS_URL//:*@/:***@}}${REDIS_URL:-not set (memory store)}"

step "Start backend"
UPLOAD_TMP="$(mktemp -d)"
(
  cd backend
  NODE_ENV=verify \
  PORT="$PORT" \
  MONGO_URI="$DB_URI" \
  JWT_SECRET="verify-$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')" \
  SEED_ON_DEPLOY=true \
  DOCMAN_DEFAULT_EMAIL=admin@example.test \
  DOCMAN_DEFAULT_PASSWORD='VerifyAdmin!2026' \
  REDIS_PROVIDER="${REDIS_URL:+local}" \
  REDIS_URL="${REDIS_URL:-}" \
  UPLOAD_DIR="$UPLOAD_TMP" \
  AUDIT_LOG_READS=true \
  exec node src/server.js
) > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/api/docs"; then break; fi
  kill -0 "$SERVER_PID" 2>/dev/null || { tail -n 30 "$LOG_DIR/server.log"; fail "backend exited during startup"; }
  sleep 1
done
curl -s -o /dev/null "http://127.0.0.1:$PORT/api/docs" || fail "backend did not start (see $LOG_DIR/server.log)"
echo "listening on :$PORT"

step "Data migration (should be a no-op on a fresh database)"
(cd backend && NODE_ENV=verify MONGO_URI="$DB_URI" UPLOAD_DIR="$UPLOAD_TMP" node src/scripts/migrateComplianceFields.js) 2>&1 | tail -n 2

step "End-to-end smoke test"
(cd backend && SMOKE_BASE_URL="http://127.0.0.1:$PORT" \
  SMOKE_ADMIN_EMAIL=admin@example.test SMOKE_ADMIN_PASSWORD='VerifyAdmin!2026' \
  SMOKE_EXPECT_REDIS_PROVIDER="${REDIS_URL:+local}" \
  node src/scripts/smokeTest.js) || { echo; echo "server log tail:"; tail -n 40 "$LOG_DIR/server.log"; fail "smoke test failed"; }

step "All checks passed"
