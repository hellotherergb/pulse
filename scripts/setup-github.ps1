# Wire GitHub remote for Pulse (run after creating an empty repo on github.com)
# Usage:
#   .\scripts\setup-github.ps1 -Username YOUR_GITHUB_USERNAME [-Repo pulse]
param(
  [Parameter(Mandatory = $true)][string]$Username,
  [string]$Repo = "pulse"
)

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path
Set-Location $PSScriptRoot\..

git branch -M main
$origin = "https://github.com/$Username/$Repo.git"

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $existing) {
  Write-Host "Updating origin -> $origin"
  git remote set-url origin $origin
} else {
  Write-Host "Adding origin -> $origin"
  git remote add origin $origin
}

Write-Host "Pushing main..."
git push -u origin main
Write-Host "Done. Next: import this repo in https://vercel.com/new"
