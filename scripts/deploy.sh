#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Деплой Genchik CRM Full-Stack приложения"
echo "=========================================="
echo "Дата: $(date)"
echo ""

APP_DIR="/home/millix-vm/apps/genchik_crm"
BACKEND_DIR="$APP_DIR/server"
FRONTEND_DIR="$APP_DIR"

# Проверка директории
cd "$APP_DIR" || {
    echo "❌ Ошибка: Директория $APP_DIR не существует"
    echo "Выполните: git clone https://github.com/euzy-arch/genchik_crm.git"
    exit 1
}

echo "📥 1. Получаем изменения из Git..."
git fetch origin
git reset --hard origin/main
echo "✅ Git обновлен"

echo ""
echo "🔄 2. Устанавливаем зависимости Frontend..."
cd "$FRONTEND_DIR"
npm ci --only=production
echo "✅ Frontend зависимости установлены"

echo ""
echo "🔨 3. Собираем Frontend (Vite build)..."
npm run build
if [ -d "dist" ]; then
    echo "✅ Frontend собран в dist/"
else
    echo "❌ Ошибка: Папка dist не создана"
    exit 1
fi

echo ""
echo "⚙️ 4. Устанавливаем зависимости Backend..."
cd "$BACKEND_DIR"
npm ci --only=production
echo "✅ Backend зависимости установлены"

echo ""
echo "📝 5. Настраиваем базу данных (если нужно)..."
if [ -f "scripts/setup-database.js" ]; then
    echo "Запускаем настройку БД..."
    node scripts/setup-database.js || echo "⚠️ Настройка БД завершилась с предупреждением"
fi

echo ""
echo "🔄 6. Перезапускаем приложения..."

# Backend
echo "Перезапуск Backend (порт 3003)..."
if pm2 list | grep -q "genchik-crm-backend"; then
    pm2 restart genchik-crm-backend
else
    pm2 start "$APP_DIR/ecosystem.config.js" --only genchik-crm-backend
fi

# Frontend
echo "Перезапуск Frontend (порт 3002)..."
if pm2 list | grep -q "genchik-crm-frontend"; then
    pm2 restart genchik-crm-frontend
else
    pm2 start "$APP_DIR/ecosystem.config.js" --only genchik-crm-frontend
fi

echo ""
echo "💾 7. Сохраняем процессы PM2..."
pm2 save

echo ""
echo "✅ 8. Деплой завершен!"
echo "Время: $(date)"
echo ""
echo "📊 Статус приложений:"
pm2 list | grep -A2 "genchik-crm"

echo ""
echo "🌐 Доступ к приложению:"
echo "   Frontend: http://localhost:3002"
echo "   Backend API: http://localhost:3003"
echo "   PM2 логи: pm2 logs [имя-приложения]"
echo "=========================================="