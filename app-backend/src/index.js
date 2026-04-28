require("dotenv").config();
const express   = require("express");
const path      = require("path");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");
const routes    = require("./routes");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Archivos estáticos ──────────────────────────
app.use("/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

// ── Seguridad HTTP ────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN,
    "http://localhost:8081",
    /^exp:\/\//,
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate limiting general ─────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones. Intenta en 15 minutos." },
  skip: (req) => req.path === "/api/health",
}));

// ── Rate limiting estricto para login ─────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos de login. Intenta en 1 hora." },
});

// ── Rate limiting para app móvil ──────────────────────────────────
const appLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: "Límite de peticiones alcanzado." },
});

// ── Parsing ───────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(morgan("dev"));

// ── Sin caché ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ── Rutas ─────────────────────────────────────────────────────────
app.use("/api", routes);
app.use("/api/auth/login", loginLimiter);
app.use("/api/perfiles",     appLimiter);
app.use("/api/violencias",   appLimiter);
app.use("/api/solicitudes",  appLimiter);
app.use("/api/estadisticas", appLimiter);

// ── 404 ───────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// ── Error global ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

// ── Iniciar ───────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Backend corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/api/health\n`);
});