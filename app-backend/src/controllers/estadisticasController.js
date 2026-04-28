const pool = require("../config/db");
const { body } = require("express-validator");

const EVENTOS_VALIDOS = [
  "abrir_app",
  "ver_tipo_violencia",    
  "abrir_info_violencia",     
  "necesita_atencion",           
  "solicitar_ayuda",
  "ver_emergencias",
  "llamar_emergencia",
  "activar_camuflaje",
  "ver_configuracion",
  "enviar_solicitud",
];

exports.validaciones = [
  body("evento")
    .notEmpty().withMessage("El evento es requerido")
    .isIn(EVENTOS_VALIDOS).withMessage(`Evento no reconocido. Válidos: ${EVENTOS_VALIDOS.join(", ")}`),
  body("detalle").optional().isString().trim().isLength({ max: 120 }),
  body("pantalla").optional().isString().trim().isLength({ max: 60 }),
  body("dispositivo_id").optional().isString().isLength({ max: 120 }),
  body("plataforma").optional().isIn(["ios", "android", "web"]),
];

// POST /api/estadisticas
exports.registrar = async (req, res) => {
  const { evento, detalle, pantalla, dispositivo_id, plataforma } = req.body;
  try {
    await pool.query(
      `INSERT INTO estadisticas (evento, detalle, pantalla, dispositivo_id, plataforma)
       VALUES ($1,$2,$3,$4,$5)`,
      [evento, detalle || null, pantalla || null, dispositivo_id || null, plataforma || null]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error al registrar evento" });
  }
};

// GET /api/admin/estadisticas
exports.dashboard = async (req, res) => {
  try {
    const [porEvento, porPlataforma, porDia, totales, porNecesitaAtencion] = await Promise.all([

      pool.query(`SELECT evento, COUNT(*) AS total FROM estadisticas GROUP BY evento ORDER BY total DESC`),

      pool.query(`SELECT plataforma, COUNT(*) AS total FROM estadisticas WHERE plataforma IS NOT NULL GROUP BY plataforma`),

      pool.query(`SELECT DATE(creado_en) AS dia, COUNT(*) AS total
                  FROM estadisticas WHERE creado_en >= NOW() - INTERVAL '30 days'
                  GROUP BY dia ORDER BY dia ASC`),

      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM perfiles)        AS total_perfiles,
          (SELECT COUNT(*) FROM solicitudes)     AS total_solicitudes,
          (SELECT COUNT(*) FROM violencias_vistas) AS total_violencias,
          (SELECT COUNT(*) FROM estadisticas)    AS total_eventos,
          (SELECT COUNT(DISTINCT dispositivo_id) FROM perfiles
           WHERE dispositivo_id IS NOT NULL)     AS dispositivos_unicos`),

      pool.query(`
          SELECT
            detalle   AS tipo_violencia,
            COUNT(*)  AS total
          FROM estadisticas
          WHERE evento = 'necesita_atencion'
            AND detalle IS NOT NULL
          GROUP BY detalle
          ORDER BY total DESC
        `),
    ]);

    res.json({
      totales:        totales.rows[0],
      por_evento:     porEvento.rows,
      por_plataforma: porPlataforma.rows,
      por_dia:        porDia.rows,
      por_necesita_atencion: porNecesitaAtencion.rows,
    });
  } catch (err) {
    console.error("[estadisticas.dashboard]", err.message);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
};