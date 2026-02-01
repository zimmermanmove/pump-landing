#!/bin/bash

# Создание структуры папок для assets

cd ~/pump-landing

# Создаем папки
mkdir -p assets/avatars
mkdir -p assets/streams

# Создаем простые SVG заглушки для отсутствующих изображений
# Если у вас есть реальные изображения, замените эти заглушки

# Заглушка для coin.png (создадим простой SVG)
cat > assets/coin.svg << 'EOF'
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" fill="#3b82f6" stroke="#1e40af" stroke-width="2"/>
  <text x="50" y="55" font-family="Arial" font-size="30" fill="white" text-anchor="middle">$</text>
</svg>
EOF

# Заглушка для sol.png
cat > assets/sol.svg << 'EOF'
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" fill="#14f195" stroke="#0d9f6e" stroke-width="2"/>
  <text x="50" y="60" font-family="Arial" font-size="24" fill="white" text-anchor="middle" font-weight="bold">SOL</text>
</svg>
EOF

# Создаем простые заглушки для аватаров (можно заменить на реальные изображения)
# Используем простые цветные квадраты как заглушки
for avatar in user.jpg lucythecat.jpg dr.devv.jpg creator.jpg; do
  # Создаем простой SVG как заглушку (браузеры поддерживают SVG даже с расширением .jpg если указать правильный content-type)
  cat > "assets/avatars/$avatar" << 'EOF'
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#6b7280"/>
  <circle cx="50" cy="40" r="20" fill="#9ca3af"/>
  <rect x="30" y="65" width="40" height="30" rx="5" fill="#9ca3af"/>
</svg>
EOF
done

# Создаем заглушку для coin.png (копируем SVG как PNG заглушку, но лучше использовать SVG)
# Для PNG нужно реальное изображение, но пока используем SVG
ln -sf coin.svg assets/coin.png 2>/dev/null || cp assets/coin.svg assets/coin.png
ln -sf sol.svg assets/sol.png 2>/dev/null || cp assets/sol.svg assets/sol.png

echo "Структура папок создана!"
echo "Примечание: Замените заглушки на реальные изображения когда они будут доступны."
