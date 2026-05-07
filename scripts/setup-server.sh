#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# setup-server.sh — Configuración inicial del servidor para CI/CD
# Ejecutar UNA SOLA VEZ en el servidor remoto vía SSH
# ═══════════════════════════════════════════════════════════════════

echo "=========================================="
echo "  Configuración inicial - AppPerla"
echo "=========================================="

# ── 1. Crear estructura de directorios ──────────────────────────
echo "[1/4] Creando directorio del proyecto..."
mkdir -p ~/AppPerla
cd ~/AppPerla

# ── 2. Clonar repositorio ───────────────────────────────────────
echo "[2/4] Clonando repositorio..."
if [ -d "backend-appvbg" ]; then
  echo "  → Ya existe, haciendo pull..."
  cd backend-appvbg && git pull
else
  git clone https://github.com/victorloal/backend-appvbg.git
  cd backend-appvbg
fi

# ── 3. Crear archivo .env con variables de producción ───────────
echo "[3/4] Creando .env de producción..."
if [ -f ".env" ]; then
  echo "  → .env ya existe, NO se sobrescribe"
  echo "  → Si necesitas cambiarlo, edítalo manualmente"
else
  cat > .env << 'ENVEOF'
# ── Base de datos ──────────────────────────────────────────
DB_PASSWORD=<CAMBIAR_POR_CONTRASEÑA_SEGURA>

# ── JWT ───────────────────────────────────────────────────
JWT_SECRET=<CAMBIAR_POR_SECRETO_LARGO_64_CARACTERES>

# ── Admin password (para admin@perla.com) ─────────────────
ADMIN_PASSWORD=<CAMBIAR_POR_CONTRASEÑA_ADMIN>

# ── CORS (dominios permitidos, separados por coma) ────────
CORS_ORIGIN=https://dominiodelapp.com/Perla

# ── Puerto interno del API (no expuesto al host) ──────────
API_PORT=3000
ENVEOF
  echo "  → .env creado. EDÍTALO con los valores reales:"
  echo "     nano ~/AppPerla/backend-appvbg/.env"
fi

# ── 4. Verificar instalación de Docker ──────────────────────────
echo "[4/4] Verificando Docker..."
if command -v docker &> /dev/null; then
  echo "  → Docker: $(docker --version)"
else
  echo "  → ERROR: Docker no está instalado"
  exit 1
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
  echo "  → Docker Compose: $(docker compose version 2>/dev/null || docker-compose --version)"
else
  echo "  → ERROR: Docker Compose no está instalado"
  exit 1
fi

# ── 5. Agregar usuario al grupo docker (si no está) ────────────
if groups "$USER" | grep -q docker; then
  echo "  → Usuario ya está en grupo docker"
else
  echo "  → Agregando usuario al grupo docker..."
  sudo usermod -aG docker "$USER"
  echo "  → IMPORTANTE: Cierra sesión y vuelve a entrar para aplicar cambios"
fi

echo ""
echo "=========================================="
echo "  Configuración completada"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "  1. Editar .env con valores reales:"
echo "     nano ~/AppPerla/backend-appvbg/.env"
echo ""
echo "  2. Hacer deploy manual inicial:"
echo "     cd ~/AppPerla/backend-appvbg"
echo "     docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  3. Registrar el self-hosted runner en GitHub:"
echo "     Ve a Settings → Actions → Runners del repo"
echo "     Sigue las instrucciones para registrar el runner"
echo ""
echo "  4. Verificar que funciona:"
echo "     curl http://localhost:3000/api/health"
echo "     curl https://localhost/Perla/api/health"
echo ""
