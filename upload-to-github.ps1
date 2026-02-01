# Скрипт для автоматического коммита и push в GitHub

param(
    [string]$Message = ""
)

# Если сообщение не указано, создаем автоматическое
if ([string]::IsNullOrEmpty($Message)) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Message = "Auto-commit: $timestamp"
}

Write-Host "📦 Добавление изменений..." -ForegroundColor Green
git add .

# Проверяем, есть ли изменения для коммита
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "ℹ️  Нет изменений для коммита" -ForegroundColor Yellow
    exit 0
}

Write-Host "💾 Создание коммита: $Message" -ForegroundColor Green
git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при создании коммита" -ForegroundColor Red
    exit 1
}

Write-Host "⬆️  Загрузка в GitHub..." -ForegroundColor Green
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Успешно загружено в GitHub!" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка при загрузке. Проверьте подключение." -ForegroundColor Red
    exit 1
}
