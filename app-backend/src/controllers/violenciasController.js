const { body, validationResult } = require("express-validator");
const pool = require("../config/db");

// ── Tipos válidos ─────────────────────────────────────────────────────────────
// Deben coincidir exactamente con los ids del carrusel en HomeScreen.jsx
// Se usan en minúsculas y sin tildes para consistencia en la BD.
const TIPOS_VIOLENCIA = [
  "fisica",        // Violencia Física
  "sexual",        // Violencia Sexual
  "psicologica",   // Violencia Psicológica
  "economica",     // Violencia Económica
  "patrimonial",   // Violencia Patrimonial
  "digital",       // Violencia Digital
  "vicaria",       // Violencia Vicaria
  "prejuicios",    // Violencia Basada en Prejuicios
];

// ── Validaciones ──────────────────────────────────────────────────────────────
const validaciones = [
  body("tipo_violencia")
    .notEmpty()
    .withMessage("tipo_violencia es requerido")
    .isIn(TIPOS_VIOLENCIA)
    .withMessage(`tipo_violencia debe ser uno de: ${TIPOS_VIOLENCIA.join(", ")}`),

  body("dispositivo_id")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 }),

  body("plataforma")
    .optional()
    .isIn(["ios", "android", "web"])
    .withMessage('plataforma debe ser "ios", "android" o "web"'),
];

// ── POST /violencias ──────────────────────────────────────────────────────────
const registrar = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }

  const { tipo_violencia, dispositivo_id, plataforma } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO violencias_vistas (tipo_violencia, dispositivo_id, plataforma)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [tipo_violencia, dispositivo_id || null, plataforma || null]
    );

    return res.status(201).json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error("Error registrando violencia:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ── GET /admin/violencias/resumen ─────────────────────────────────────────────
const resumen = async (req, res) => {
  try {
    const { rows: total } = await pool.query(
      `SELECT COUNT(*) AS total FROM violencias_vistas`
    );

    // Conteo por tipo — incluye los 8 tipos aunque alguno tenga 0 registros
    const { rows: porTipo } = await pool.query(`
      SELECT
        tipo_violencia,
        COUNT(*) AS total
      FROM violencias_vistas
      GROUP BY tipo_violencia
      ORDER BY total DESC
    `);

    // Garantiza que los 8 tipos siempre aparezcan en la respuesta (con 0 si no hay datos)
    const porTipoCompleto = TIPOS_VIOLENCIA.map((tipo) => {
      const encontrado = porTipo.find((r) => r.tipo_violencia === tipo);
      return {
        tipo_violencia: tipo,
        total: encontrado ? encontrado.total : "0",
      };
    });

    const { rows: porDia } = await pool.query(`
      SELECT
        DATE(creado_en) AS dia,
        COUNT(*)        AS total
      FROM violencias_vistas
      GROUP BY dia
      ORDER BY dia DESC
      LIMIT 30
    `);

    return res.json({
      total:    Number(total[0].total),
      por_tipo: porTipoCompleto,
      por_dia:  porDia,
    });
  } catch (err) {
    console.error("Error obteniendo resumen de violencias:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ── GET /admin/violencias/exportar ────────────────────────────────────────────
const exportar = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, tipo_violencia, dispositivo_id, plataforma, creado_en
      FROM violencias_vistas
      ORDER BY creado_en DESC
    `);

    return res.json(rows);
  } catch (err) {
    console.error("Error exportando violencias:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { validaciones, registrar, resumen, exportar, TIPOS_VIOLENCIA };