# Скрипт для автоматического коммита и push в GitHub

param(
    [string]$Message = "Update files"
)

Write-Host "📦 Добавление изменений..." -ForegroundColor Green
git add .

Write-Host "💾 Создание коммита: $Message" -ForegroundColor Green
git commit -m $Message

Write-Host "⬆️  Загрузка в GitHub..." -ForegroundColor Green
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Успешно загружено в GitHub!" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка при загрузке. Проверьте подключение." -ForegroundColor Red
}
