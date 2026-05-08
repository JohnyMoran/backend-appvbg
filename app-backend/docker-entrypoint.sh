#!/bin/sh
set -e

echo "⏳ Esperando PostgreSQL..."
while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL listo"

echo "🔄 Ejecutando migración..."
node src/config/migrate.js

echo "🚀 Iniciando backend..."
exec node src/index.js
