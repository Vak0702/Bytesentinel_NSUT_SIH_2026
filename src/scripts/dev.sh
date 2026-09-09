#!/usr/bin/env bash
# Start all three processes for development.
#
#   backend  http://localhost:5000   Flask API
#   landing  http://localhost:3000   Next.js marketing site + /login
#   console  http://localhost:5173   Vite officer console
#
# Both frontends proxy /api to Flask, so everything looks same-origin to the
# browser and the session cookie is shared across all three.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() { echo; echo "Stopping..."; kill 0; }
trap cleanup EXIT INT TERM

echo "==> Flask API on :5000"
( cd "$ROOT/backend" && python app.py ) &

echo "==> Next.js landing on :3000"
( cd "$ROOT/frontend/landing" && npm run dev ) &

echo "==> Vite console on :5173"
( cd "$ROOT/frontend/console" && npm run dev ) &

echo
echo "Open http://localhost:3000/login  —  sign in with DL001 / Veridex@2026"
wait
