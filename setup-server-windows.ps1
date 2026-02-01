# PowerShell скрипт для первоначальной настройки на Windows (для тестирования)
# Использование: .\setup-server-windows.ps1 GITHUB_USERNAME GITHUB_REPO

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [Parameter(Mandatory=$true)]
    [string]$GitHubRepo
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Начинаем настройку..." -ForegroundColor Green

$GitHubUrl = "https://github.com/${GitHubUsername}/${GitHubRepo}.git"
Write-Host "GitHub репозиторий: $GitHubUrl" -ForegroundColor Cyan

# Проверка Git
Write-Host "`nПроверка Git..." -ForegroundColor Yellow
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git не установлен! Установите Git с https://git-scm.com/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Git установлен" -ForegroundColor Green

# Проверка Node.js
Write-Host "`nПроверка Node.js..." -ForegroundColor Yellow
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js не установлен! Установите Node.js с https://nodejs.org/" -ForegroundColor Red
    exit 1
}
$nodeVersion = node --version
Write-Host "✅ Node.js установлен: $nodeVersion" -ForegroundColor Green

# Проверка npm
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm не установлен!" -ForegroundColor Red
    exit 1
}
$npmVersion = npm --version
Write-Host "✅ npm установлен: $npmVersion" -ForegroundColor Green

# Инициализация Git репозитория (если еще не инициализирован)
Write-Host "`nПроверка Git репозитория..." -ForegroundColor Yellow
if (!(Test-Path ".git")) {
    Write-Host "Инициализация Git репозитория..." -ForegroundColor Cyan
    git init
    git add .
    git commit -m "Initial commit: Pump landing page"
    Write-Host "✅ Git репозиторий инициализирован" -ForegroundColor Green
} else {
    Write-Host "✅ Git репозиторий уже инициализирован" -ForegroundColor Green
}

# Проверка remote
Write-Host "`nПроверка remote репозитория..." -ForegroundColor Yellow
$remotes = git remote -v
if ($remotes -notmatch "origin") {
    Write-Host "Добавление remote репозитория..." -ForegroundColor Cyan
    git remote add origin $GitHubUrl
    Write-Host "✅ Remote добавлен" -ForegroundColor Green
} else {
    Write-Host "✅ Remote уже настроен" -ForegroundColor Green
}

# Проверка ветки
Write-Host "`nПроверка ветки..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
if (!$currentBranch) {
    Write-Host "Создание ветки main..." -ForegroundColor Cyan
    git branch -M main
    Write-Host "✅ Ветка main создана" -ForegroundColor Green
} else {
    Write-Host "✅ Текущая ветка: $currentBranch" -ForegroundColor Green
}

Write-Host "`n✅ Настройка завершена!" -ForegroundColor Green
Write-Host "`n📝 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Отправьте код на GitHub:" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host "`n2. На сервере выполните:" -ForegroundColor White
Write-Host "   cd /var/www" -ForegroundColor Yellow
Write-Host "   git clone $GitHubUrl pump-landing" -ForegroundColor Yellow
Write-Host "   cd pump-landing" -ForegroundColor Yellow
Write-Host "   chmod +x setup-server.sh" -ForegroundColor Yellow
Write-Host "   ./setup-server.sh $GitHubUsername $GitHubRepo" -ForegroundColor Yellow
