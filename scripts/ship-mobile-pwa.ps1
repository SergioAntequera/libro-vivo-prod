param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "Ship mobile PWA /mobile $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

$paths = @(
  "README.md",
  "package.json",
  "public/mobile",
  "scripts/check-mobile-pwa-bundle.mjs",
  "scripts/sync-mobile-pwa.mjs",
  "src/app/mobile"
)

Write-Host "Running mobile PWA checks..." -ForegroundColor Cyan
cmd /c npm run mobile:pwa:check
if ($LASTEXITCODE -ne 0) {
  throw "Mobile PWA validation failed. Push cancelled."
}

Write-Host "Running full production checks..." -ForegroundColor Cyan
cmd /c npm run check
if ($LASTEXITCODE -ne 0) {
  throw "Production checks failed. Push cancelled."
}

$hasRelevantChanges = $false
foreach ($path in $paths) {
  $status = git status --porcelain -- $path
  if ($status) {
    $hasRelevantChanges = $true
    break
  }
}

if (-not $hasRelevantChanges) {
  Write-Host "No mobile PWA changes to ship." -ForegroundColor Yellow
  exit 0
}

Write-Host "Staging only mobile PWA deployment files..." -ForegroundColor Cyan
git add -- README.md package.json public/mobile scripts/check-mobile-pwa-bundle.mjs scripts/sync-mobile-pwa.mjs src/app/mobile

Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "Pushing to origin/main..." -ForegroundColor Cyan
git push origin main

Write-Host "Done. Vercel will start a deployment from main." -ForegroundColor Green
