const { body, validationResult } = require("express-validator");
const pool = require("../config/db");

// ── Validaciones ──────────────────────────────────────────────────────────────
// Refleja las 5 preguntas exactas de ServicesScreen.
// La app envía "Sí"/"No" como strings; los convertimos a boolean antes de guardar.
const validaciones = [
  body("atencion_medica")
    .optional()
    .isIn(["Sí", "No", true, false])
    .withMessage('atencion_medica debe ser "Sí" o "No"'),

  body("denuncia")
    .optional()
    .isIn(["Sí", "No", true, false])
    .withMessage('denuncia debe ser "Sí" o "No"'),

  body("agresor")
    .optional()
    .isIn(["Sí", "No", true, false])
    .withMessage('agresor debe ser "Sí" o "No"'),

  body("amenaza_hijos")
    .optional()
    .isIn(["Sí", "No", true, false])
    .withMessage('amenaza_hijos debe ser "Sí" o "No"'),

  body("derechos_vulnerados")
    .optional()
    .isIn(["Sí", "No", true, false])
    .withMessage('derechos_vulnerados debe ser "Sí" o "No"'),

  body("lugar_redirigido")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 80 })
    .withMessage("lugar_redirigido debe ser un string de máximo 80 caracteres"),

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

// ── Helper: convierte "Sí"/"No" a boolean ─────────────────────────────────────
const toBoolean = (val) => {
  if (val === "Sí" || val === true)  return true;
  if (val === "No" || val === false) return false;
  return false;
};

// ── POST /solicitudes ─────────────────────────────────────────────────────────
const crear = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }

  const {
    atencion_medica,
    denuncia,
    agresor,
    amenaza_hijos,
    derechos_vulnerados,
    lugar_redirigido,
    dispositivo_id,
    plataforma,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO solicitudes
         (atencion_medica, denuncia, agresor, amenaza_hijos,
          derechos_vulnerados, lugar_redirigido, dispositivo_id, plataforma)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        toBoolean(atencion_medica),
        toBoolean(denuncia),
        toBoolean(agresor),
        toBoolean(amenaza_hijos),
        toBoolean(derechos_vulnerados),
        lugar_redirigido || null,
        dispositivo_id   || null,
        plataforma       || null,
      ]
    );

    return res.status(201).json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error("Error creando solicitud:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ── GET /admin/solicitudes/resumen ────────────────────────────────────────────
// Devuelve totales por cada pregunta (cuántas respondieron "Sí")
// y distribución por lugar redirigido.
const resumen = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE atencion_medica     = true) AS atencion_medica,
        COUNT(*) FILTER (WHERE denuncia            = true) AS denuncia,
        COUNT(*) FILTER (WHERE agresor             = true) AS agresor,
        COUNT(*) FILTER (WHERE amenaza_hijos       = true) AS amenaza_hijos,
        COUNT(*) FILTER (WHERE derechos_vulnerados = true) AS derechos_vulnerados
      FROM solicitudes
    `);

    const { rows: porLugar } = await pool.query(`
      SELECT
        COALESCE(lugar_redirigido, 'sin_redireccion') AS lugar_redirigido,
        COUNT(*)                                       AS total
      FROM solicitudes
      GROUP BY lugar_redirigido
      ORDER BY total DESC
    `);

    const { rows: porDia } = await pool.query(`
      SELECT
        DATE(creado_en)  AS dia,
        COUNT(*)         AS total
      FROM solicitudes
      GROUP BY dia
      ORDER BY dia DESC
      LIMIT 30
    `);

    return res.json({
      total: Number(rows[0].total),
      necesidades: {
        atencion_medica:    rows[0].atencion_medica,
        denuncia:           rows[0].denuncia,
        agresor:            rows[0].agresor,
        amenaza_hijos:      rows[0].amenaza_hijos,
        derechos_vulnerados:rows[0].derechos_vulnerados,
      },
      por_lugar: porLugar,
      por_dia:   porDia,
    });
  } catch (err) {
    console.error("Error obteniendo resumen de solicitudes:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ── GET /admin/solicitudes/exportar ──────────────────────────────────────────
const exportar = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        atencion_medica,
        denuncia,
        agresor,
        amenaza_hijos,
        derechos_vulnerados,
        lugar_redirigido,
        dispositivo_id,
        plataforma,
        creado_en
      FROM solicitudes
      ORDER BY creado_en DESC
    `);

    return res.json(rows);
  } catch (err) {
    console.error("Error exportando solicitudes:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = { validaciones, crear, resumen, exportar };