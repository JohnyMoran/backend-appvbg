const pool = require("../config/db");
const { body } = require("express-validator");

// ── Reglas de validación ──────────────────────────────────────────
const REGIONES  = ["Tumaco", "Buenaventura"];
const ZONAS     = ["Rural", "Urbana"];
const ETNIAS    = ["Indígena", "Afrodescendiente", "Mestizo"];
const EDADES    = ["joven", "adulta_joven", "adulta", "adulta_mayor"];
const LABORALES = ["Empleado", "Desempleado", "Estudiante", "Independiente"];

exports.validaciones = [
  body("region")
    .notEmpty().withMessage("La región es requerida")
    .isIn(REGIONES).withMessage(`Región inválida. Valores: ${REGIONES.join(", ")}`),

  body("zona")
    .notEmpty().withMessage("La zona es requerida")
    .isIn(ZONAS).withMessage(`Zona inválida. Valores: ${ZONAS.join(", ")}`),

  body("etnia")
    .notEmpty().withMessage("El grupo étnico es requerido")
    .custom(val => {
      // Puede venir como string simple o array (multiple)
      const valores = Array.isArray(val) ? val : [val];
      const validos = [...ETNIAS, "Otro"];
      const invalidos = valores.filter(v => !validos.includes(v) && typeof v === "string" && v.trim().length < 2);
      if (invalidos.length) throw new Error("Etnia inválida");
      return true;
    }),

  body("edad")
    .notEmpty().withMessage("El rango de edad es requerido")
    .isIn(EDADES).withMessage(`Edad inválida. Valores: ${EDADES.join(", ")}`),

  body("laboral")
    .notEmpty().withMessage("La situación laboral es requerida")
    .isIn(LABORALES).withMessage(`Laboral inválido. Valores: ${LABORALES.join(", ")}`),

  body("dispositivo_id")
    .optional()
    .isString()
    .isLength({ max: 120 }).withMessage("device_id demasiado largo"),
];

// POST /api/perfiles
exports.crear = async (req, res) => {
  const { region, zona, etnia, edad, laboral, dispositivo_id, plataforma } = req.body;

  try {
    await pool.query(
      `INSERT INTO perfiles (region, zona, etnia, edad, laboral, dispositivo_id, plataforma)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        region,
        zona,
        Array.isArray(etnia) ? etnia.join(", ") : etnia,
        edad,
        laboral,
        dispositivo_id || null,
        plataforma     || null,
      ]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[perfiles.crear]", err.message);
    res.status(500).json({ error: "Error al guardar perfil" });
  }
};

// GET /api/admin/perfiles/resumen
exports.resumen = async (req, res) => {
  try {
    const [porRegion, porZona, porEtnia, porEdad, porLaboral, total] =
      await Promise.all([
        pool.query(`SELECT region, COUNT(*) AS total FROM perfiles WHERE region IS NOT NULL GROUP BY region ORDER BY total DESC`),
        pool.query(`SELECT zona, COUNT(*) AS total FROM perfiles WHERE zona IS NOT NULL GROUP BY zona ORDER BY total DESC`),
        pool.query(`SELECT etnia, COUNT(*) AS total FROM perfiles WHERE etnia IS NOT NULL GROUP BY etnia ORDER BY total DESC`),
        pool.query(`SELECT edad, COUNT(*) AS total FROM perfiles WHERE edad IS NOT NULL GROUP BY edad ORDER BY total DESC`),
        pool.query(`SELECT laboral, COUNT(*) AS total FROM perfiles WHERE laboral IS NOT NULL GROUP BY laboral ORDER BY total DESC`),
        pool.query(`SELECT COUNT(*) AS total FROM perfiles`),
      ]);

    res.json({
      total:       +total.rows[0].total,
      por_region:  porRegion.rows,
      por_zona:    porZona.rows,
      por_etnia:   porEtnia.rows,
      por_edad:    porEdad.rows,
      por_laboral: porLaboral.rows,
    });
  } catch (err) {
    console.error("[perfiles.resumen]", err.message);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
};

// GET /api/admin/perfiles/exportar
exports.exportar = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, region, zona, etnia, edad, laboral, plataforma,
              TO_CHAR(creado_en, 'DD/MM/YYYY HH24:MI') AS fecha
       FROM perfiles ORDER BY creado_en DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al exportar" });
  }
};