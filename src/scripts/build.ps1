# Build both frontends into backend/static so ONE Flask process serves the
# whole site on http://localhost:5000 — no separate windows, no npm running.
#
#   Run from the project root:   .\scripts\build.ps1
#   Then:                        cd backend ; python app.py
#
# Result:
#   http://localhost:5000/          landing page
#   http://localhost:5000/login     sign-in
#   http://localhost:5000/console   officer console
#   http://localhost:5000/api/...   the API

$ErrorActionPreference = "Stop"
$root   = Split-Path -Parent $PSScriptRoot
$static = Join-Path $root "backend\static"

Write-Host "==> Cleaning $static" -ForegroundColor Cyan
if (Test-Path $static) { Remove-Item -Recurse -Force $static }
New-Item -ItemType Directory -Force -Path $static | Out-Null

Write-Host "==> Building the console (Vite)" -ForegroundColor Cyan
Push-Location (Join-Path $root "frontend\console")
npm install --no-audit --no-fund
# base=/console/ so the built index.html asks for /console/assets/... not
# /assets/... ; LOGIN_URL=/login because landing and console now share an origin.
$env:VITE_BASE      = "/console/"
$env:VITE_LOGIN_URL = "/login"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Console build failed" }
Pop-Location

Write-Host "==> Building the landing site (Next.js static export)" -ForegroundColor Cyan
Push-Location (Join-Path $root "frontend\landing")
npm install --no-audit --no-fund
$env:NEXT_OUTPUT             = "export"
$env:NEXT_PUBLIC_CONSOLE_URL = "/console"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Landing build failed" }
Pop-Location

Write-Host "==> Assembling backend\static" -ForegroundColor Cyan
Copy-Item -Recurse -Force (Join-Path $root "frontend\landing\out\*") $static
New-Item -ItemType Directory -Force -Path (Join-Path $static "console") | Out-Null
Copy-Item -Recurse -Force (Join-Path $root "frontend\console\dist\*") (Join-Path $static "console")

# Clear the env vars so a later `npm run dev` in this same shell is unaffected.
Remove-Item Env:VITE_BASE, Env:VITE_LOGIN_URL, Env:NEXT_OUTPUT, Env:NEXT_PUBLIC_CONSOLE_URL -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Build complete." -ForegroundColor Green
Write-Host "IMPORTANT: set CONSOLE_URL=/console in backend\.env" -ForegroundColor Yellow
Write-Host "           (otherwise sign-in still redirects to localhost:5173)"
Write-Host ""
Write-Host "Now run:   cd backend ; python app.py"
Write-Host "Then open: http://localhost:5000"
