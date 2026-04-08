$ErrorActionPreference = "Stop"

param(
  [string]$Message = ""
)

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "Ship production update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host "Running production checks..." -ForegroundColor Cyan
cmd /c npm run check
if ($LASTEXITCODE -ne 0) {
  throw "Checks failed. Push cancelled."
}

$status = git status --porcelain
if (-not $status) {
  Write-Host "No changes to ship." -ForegroundColor Yellow
  exit 0
}

Write-Host "Staging changes..." -ForegroundColor Cyan
git add .

Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "Pushing to origin/main..." -ForegroundColor Cyan
git push origin main

Write-Host "Done. Vercel will start a deployment from main." -ForegroundColor Green
