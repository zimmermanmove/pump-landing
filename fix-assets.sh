#!/bin/bash

# Скрипт для создания недостающих файлов assets

cd ~/pump-landing || exit 1

echo "Создание структуры папок..."

# Создаем папки
mkdir -p assets/avatars
mkdir -p assets/streams

# Проверяем существующие файлы
if [ ! -f "assets/streams/stream1.png" ]; then
    echo "Внимание: assets/streams/stream1.png отсутствует"
fi

# Создаем простые SVG заглушки
echo "Создание заглушек для изображений..."

# coin.png - используем SVG заглушку
cat > assets/coin.svg << 'EOF'
<svg width="86" height="86" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="43" cy="43" r="40" fill="url(#grad)"/>
  <text x="43" y="50" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="bold">$</text>
</svg>
EOF

# sol.png
cat > assets/sol.svg << 'EOF'
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="15" fill="#14f195"/>
  <text x="16" y="21" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="bold">SOL</text>
</svg>
EOF

# Создаем заглушки для аватаров
for avatar in user lucythecat dr.devv creator; do
  cat > "assets/avatars/${avatar}.jpg" << 'EOF'
<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" fill="#6b7280" rx="4"/>
  <circle cx="20" cy="15" r="8" fill="#9ca3af"/>
  <rect x="12" y="26" width="16" height="12" rx="2" fill="#9ca3af"/>
</svg>
EOF
done

echo "Готово! Заглушки созданы."
echo "Примечание: Замените эти файлы на реальные изображения когда они будут доступны."
