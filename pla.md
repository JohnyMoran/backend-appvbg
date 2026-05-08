# Plan de Dockerización - Backend App VBG

## Arquitectura

```
docker-compose.yml
├── postgres (contenedor)
│   ├── image: postgres:16-alpine
│   ├── volume: pgdata (datos persistentes)
│   └── healthcheck
└── backend (contenedor)
    ├── build: ./app-backend (Dockerfile)
    ├── depends_on: postgres (condition: healthy)
    ├── volume: uploads (iconos persistentes)
    ├── port: 3000
    └── entrypoint: wait + migrate + start
```

## Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `app-backend/Dockerfile` | Build de la imagen Node.js |
| `app-backend/.dockerignore` | Excluir node_modules, .env, etc. |
| `app-backend/docker-entrypoint.sh` | Script de inicio: espera DB, migra, arranca |
| `docker-compose.yml` | Orquestación backend + PostgreSQL |
| `app-backend/.gitignore` | Crear también para proteger .env |

---

## 1. `app-backend/Dockerfile`

```dockerfile
# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ---- Production stage ----
FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY . .

RUN mkdir -p src/uploads/iconos-lugares && chown -R appuser:appgroup src/uploads

USER appuser
EXPOSE 3000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
```

---

## 2. `app-backend/docker-entrypoint.sh`

```bash
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
```

---

## 3. `app-backend/.dockerignore`

```
node_modules/
.env
.git
.gitignore
*.md
npm-debug.log
verify_data.js
fix_solicitudes.sql
```

---

## 4. `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: appvbg-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: app-violencia
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-1234}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  backend:
    build:
      context: ./app-backend
    container_name: appvbg-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: app-violencia
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD:-1234}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:4200}
    volumes:
      - uploads:/app/src/uploads
    ports:
      - "${API_PORT:-3000}:3000"
    networks:
      - app-network

volumes:
  pgdata:
  uploads:

networks:
  app-network:
    driver: bridge
```

### Variables de entorno (`.env` en la raíz del proyecto)

```env
DB_PASSWORD=contraseña_segura_produccion
JWT_SECRET=sorora_jwt_secret_muy_largo_2024
CORS_ORIGIN=https://panel.midominio.com
API_PORT=3000
```

---

## 5. `app-backend/.gitignore`

```
node_modules/
.env
uploads/iconos-lugares/*
!uploads/iconos-lugares/.gitkeep
```

---

## Consideraciones de producción

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| **PostgreSQL image** | `postgres:16-alpine` | Versión estable, imagen pequeña |
| **Node image** | `node:20-alpine` | Coincide con versión local, ligera |
| **Non-root user** | Sí | Buenas prácticas de seguridad |
| **Healthcheck** | `pg_isready` + `depends_on` | Evita race condition al iniciar |
| **Volumen uploads** | Named volume `uploads` | Los iconos subidos persisten entre reinicios |
| **Volumen pgdata** | Named volume `pgdata` | La BD persiste entre reinicios |
| **Red** | Bridge personalizada | Aislamiento de otros contenedores |
| **Restart policy** | `unless-stopped` | Auto-recuperación ante caídas |

---

## Cómo usar

```bash
# Construir y levantar
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Verificar health
curl http://localhost:3000/api/health

# Detener
docker-compose down

# Detener y borrar volúmenes (¡cuidado! pierde datos)
docker-compose down -v
```

---

## Frontend (Angular app-panel)

Actualmente no está dockerizado ni servido por el backend. Opciones:

1. **Servir desde el backend**: agregar `express.static` apuntando al `dist/` del Angular. Requiere build previo.
2. **Docker aparte**: Dockerfile + Nginx para el Angular.
3. **Host externo**: desplegar el panel en Vercel, Netlify, etc.
