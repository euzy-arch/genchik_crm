# server/Dockerfile
FROM node:20-alpine

# Установите зависимости для SQLite
RUN apk add --no-cache sqlite

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем исходный код
COPY .. .

# Создаем папку для базы данных
RUN mkdir -p /var/lib/finance-crm && \
    chown -R node:node /var/lib/finance-crm

# Переключаемся на пользователя node
USER node

# Экспортируем порт
EXPOSE 5001

# Запускаем сервер
CMD ["node", "index.js"]