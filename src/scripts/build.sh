#!/usr/bin/env bash
# Build both frontends into backend/static so a single Flask process serves
# the whole product on one port. Useful for a demo machine or a judging laptop
# where three terminals is three things to go wrong.
#
# Result:
#   backend/static/            exported landing site   ->  http://localhost:5000/
#   backend/static/console/    built officer console   ->  http://localhost:5000/console
#
# Run it, then: cd backend && python app.py

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATIC="$ROOT/backend/static"

echo "==> Cleaning $STATIC"
rm -rf "$STATIC"
mkdir -p "$STATIC"

echo "==> Building the console (Vite)"
cd "$ROOT/frontend/console"
npm install --no-audit --no-fund
# base=/console/ so asset URLs resolve under that path;
# VITE_LOGIN_URL=/login because landing and console now share an origin.
VITE_BASE=/console/ VITE_LOGIN_URL=/login npm run build

echo "==> Building the landing site (Next.js static export)"
cd "$ROOT/frontend/landing"
npm install --no-audit --no-fund
NEXT_OUTPUT=export NEXT_PUBLIC_CONSOLE_URL=/console npm run build

echo "==> Assembling backend/static"
cp -r "$ROOT/frontend/landing/out/." "$STATIC/"
mkdir -p "$STATIC/console"
cp -r "$ROOT/frontend/console/dist/." "$STATIC/console/"

echo
echo "IMPORTANT: set CONSOLE_URL=/console in backend/.env"
echo
echo "Done. Now:  cd backend && python app.py"
echo "Then open:  http://localhost:5000"
