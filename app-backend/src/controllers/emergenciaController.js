// controllers/emergenciaController.js
const { body, param, validationResult } = require("express-validator");
const pool = require("../config/db");

// ── Validaciones ──────────────────────────────────────────────────────────────
const validacionesCrear = [
  body("id").notEmpty().isString().trim().isLength({ max: 20 })
    .withMessage("id requerido, máx 20 caracteres"),
  body("nombre").notEmpty().isString().trim().isLength({ max: 120 })
    .withMessage("nombre requerido"),
  body("numero").notEmpty().isString().trim().isLength({ max: 30 })
    .withMessage("numero requerido"),
  body("horario").optional().isString().trim().isLength({ max: 60 }),
  body("descripcion").optional().isString().trim(),
  body("icono_nombre").optional().isString().trim().isLength({ max: 60 }),
  body("prioridad").optional().isBoolean(),
  body("orden").optional().isInt({ min: 0, max: 999 }),
  body("activo").optional().isBoolean(),
];

const validacionesActualizar = [
  param("id").notEmpty().isString().trim(),
  body("nombre").optional().isString().trim().isLength({ max: 120 }),
  body("numero").optional().isString().trim().isLength({ max: 30 }),
  body("horario").optional().isString().trim().isLength({ max: 60 }),
  body("descripcion").optional().isString().trim(),
  body("icono_nombre").optional().isString().trim().isLength({ max: 60 }),
  body("prioridad").optional().isBoolean(),
  body("orden").optional().isInt({ min: 0, max: 999 }),
  body("activo").optional().isBoolean(),
];

const check = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errores: errors.array() });
    return false;
  }
  return true;
};

// ── GET /api/emergencias  (PÚBLICO — app móvil) ───────────────────────────────
const listarPublico = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nombre, numero, horario, descripcion, icono_nombre, prioridad
      FROM   numeros_emergencia
      WHERE  activo = true
      ORDER  BY orden ASC, prioridad DESC, nombre ASC
    `);
    return res.json(rows);
  } catch (err) {
    console.error("[emergencia.listarPublico]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── GET /api/admin/emergencias  (ADMIN) ───────────────────────────────────────
const listarAdmin = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM numeros_emergencia ORDER BY orden ASC, prioridad DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error("[emergencia.listarAdmin]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── GET /api/admin/emergencias/:id ────────────────────────────────────────────
const obtenerUno = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM numeros_emergencia WHERE id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("[emergencia.obtenerUno]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── POST /api/admin/emergencias  ──────────────────────────────────────────────
const crear = async (req, res) => {
  if (!check(req, res)) return;
  const { id, nombre, numero, horario, descripcion, icono_nombre, prioridad, orden, activo } = req.body;
  try {
    const existe = await pool.query(`SELECT id FROM numeros_emergencia WHERE id = $1`, [id]);
    if (existe.rows.length) return res.status(409).json({ error: `Ya existe un número con id "${id}"` });

    await pool.query(`
      INSERT INTO numeros_emergencia (id, nombre, numero, horario, descripcion, icono_nombre, prioridad, orden, activo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [id, nombre, numero, horario||'24 horas', descripcion||null,
        icono_nombre||'alert-circle-outline', prioridad||false, orden||99, activo !== false]);

    return res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error("[emergencia.crear]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── PUT /api/admin/emergencias/:id  ──────────────────────────────────────────
const actualizar = async (req, res) => {
  if (!check(req, res)) return;
  const { id } = req.params;
  const { nombre, numero, horario, descripcion, icono_nombre, prioridad, orden, activo } = req.body;

  try {
    const existe = await pool.query(`SELECT id FROM numeros_emergencia WHERE id = $1`, [id]);
    if (!existe.rows.length) return res.status(404).json({ error: "No encontrado" });

    await pool.query(`
      UPDATE numeros_emergencia SET
        nombre       = COALESCE($1, nombre),
        numero       = COALESCE($2, numero),
        horario      = COALESCE($3, horario),
        descripcion  = COALESCE($4, descripcion),
        icono_nombre = COALESCE($5, icono_nombre),
        prioridad    = COALESCE($6, prioridad),
        orden        = COALESCE($7, orden),
        activo       = COALESCE($8, activo),
        actualizado_en = NOW()
      WHERE id = $9
    `, [nombre||null, numero||null, horario||null, descripcion||null,
        icono_nombre||null, prioridad !== undefined ? prioridad : null,
        orden !== undefined ? orden : null,
        activo !== undefined ? activo : null, id]);

    return res.json({ ok: true, id });
  } catch (err) {
    console.error("[emergencia.actualizar]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── DELETE /api/admin/emergencias/:id  (soft delete) ─────────────────────────
const eliminar = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE numeros_emergencia SET activo = false, actualizado_en = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    return res.json({ ok: true, id: req.params.id });
  } catch (err) {
    console.error("[emergencia.eliminar]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── PATCH /api/admin/emergencias/:id ─────────────────────────────────────────
const patchEmergencia = async (req, res) => {
  const { id } = req.params;
  const campos = req.body;
  if (!campos || Object.keys(campos).length === 0)
    return res.status(400).json({ error: "No se enviaron campos para actualizar" });

  try {
    const existe = await pool.query(
      `SELECT id FROM numeros_emergencia WHERE id = $1`, [id]
    );
    if (!existe.rows.length)
      return res.status(404).json({ error: "Número de emergencia no encontrado" });

    const camposPermitidos = ['activo', 'nombre', 'numero', 'horario',
                              'descripcion', 'icono_nombre', 'prioridad', 'orden'];
    const sets   = [];
    const params = [];
    for (const [key, value] of Object.entries(campos)) {
      if (camposPermitidos.includes(key)) {
        params.push(value === '' ? null : value);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (!sets.length)
      return res.status(400).json({ error: "Sin campos válidos" });

    params.push(id);
    await pool.query(
      `UPDATE numeros_emergencia SET ${sets.join(', ')}, actualizado_en = NOW() WHERE id = $${params.length}`,
      params
    );
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("[emergencia.patchEmergencia]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

module.exports = {
  validacionesCrear, validacionesActualizar,
  listarPublico, listarAdmin, obtenerUno,
  crear, actualizar, eliminar, patchEmergencia,
};