# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ---- Production stage ----
FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN apk add --no-cache busybox-extras

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY . .

RUN mkdir -p src/uploads/iconos-lugares && chown -R appuser:appgroup src/uploads

USER appuser
EXPOSE 3000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
