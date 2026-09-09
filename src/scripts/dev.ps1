# Windows equivalent of dev.sh. Opens three PowerShell windows.
#   Run from the project root:  .\scripts\dev.ps1

$root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\backend'; python app.py"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\frontend\landing'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\frontend\console'; npm run dev"

Write-Host ""
Write-Host "Open http://localhost:3000/login  -  sign in with DL001 / Veridex@2026"
