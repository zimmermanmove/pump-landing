# Скрипт для загрузки проекта в GitHub
# Выполните после установки Git

Write-Host "🚀 Инициализация Git репозитория..." -ForegroundColor Green

# Инициализация репозитория
git init

# Добавление remote
git remote add origin git@github.com:zimmermanmove/pump-landing.git

# Проверка remote
Write-Host "📡 Проверка remote..." -ForegroundColor Green
git remote -v

# Добавление всех файлов
Write-Host "📦 Добавление файлов..." -ForegroundColor Green
git add .

# Создание коммита
Write-Host "💾 Создание коммита..." -ForegroundColor Green
git commit -m "Initial commit"

# Переименование ветки в main
git branch -M main

# Push в GitHub
Write-Host "⬆️  Загрузка в GitHub..." -ForegroundColor Green
Write-Host "⚠️  Если используете HTTPS вместо SSH, используйте: git remote set-url origin https://github.com/zimmermanmove/pump-landing.git" -ForegroundColor Yellow
git push -u origin main

Write-Host "✅ Готово!" -ForegroundColor Green
