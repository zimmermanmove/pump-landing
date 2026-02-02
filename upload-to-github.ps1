# Script for automatic commit and push to GitHub

param(
    [string]$Message = ""
)

# If message is not specified, create automatic one
if ([string]::IsNullOrEmpty($Message)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Message = "Auto-commit: $timestamp"
}

Write-Host "Adding changes..." -ForegroundColor Green
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "No changes to commit" -ForegroundColor Yellow
    exit 0
}

Write-Host "Creating commit: $Message" -ForegroundColor Green
git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error creating commit" -ForegroundColor Red
    exit 1
}

Write-Host "Pushing to GitHub..." -ForegroundColor Green
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "Error pushing. Check connection." -ForegroundColor Red
    exit 1
}
