// controllers/lugaresController.js
const { body, param, validationResult } = require("express-validator");
const pool = require("../config/db");
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

const TIPOS    = ["salud", "protección", "justicia", "ministerio_publico", "duplas", "otro"];
const CIUDADES = ["Tumaco", "Buenaventura"];

// ── Configuración de multer ───────────────────────────────────────────────────
// Los iconos se guardan en /uploads/iconos-lugares/

const UPLOAD_DIR = path.join(__dirname, "../uploads/iconos-lugares");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
 
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Usa el id del lugar como nombre para que sea predecible y sobreescribible
    const id  = req.params.id || req.body.id || Date.now().toString();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${id}${ext}`);
  },
});
 
const fileFilter = (_req, file, cb) => {
  const permitidos = [".jpg", ".jpeg", ".png", ".svg", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (permitidos.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes: jpg, png, svg, webp"), false);
  }
};
 
const uploadIcono = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB máx
}).single("icono_file");

// ── Validaciones ──────────────────────────────────────────────────────────────
const validacionesCrear = [
  body("id").notEmpty().isString().trim().isLength({ max: 80 })
    .withMessage("id requerido, máx 80 caracteres"),
  body("nombre").notEmpty().isString().trim().isLength({ max: 200 })
    .withMessage("nombre requerido"),
  body("ciudad").notEmpty().isIn(CIUDADES)
    .withMessage(`ciudad debe ser: ${CIUDADES.join(" | ")}`),
  body("tipo").notEmpty().isIn(TIPOS)
    .withMessage(`tipo debe ser: ${TIPOS.join(" | ")}`),
  body("direccion").optional().isString().trim(),
  body("telefono").optional().isString().trim(),
  body("whatsapp").optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
  body("horario").optional().isString().trim(),
  body("descripcion").optional().isString().trim(),
  body("icono").optional().isString().trim(),
  body("latitud").optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body("longitud").optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  body("activo").optional({ nullable: true }).isBoolean(),
];

const validacionesActualizar = [
  param("id").notEmpty().isString().trim(),
  body("nombre").optional().isString().trim().isLength({ max: 200 }),
  body("ciudad").optional().isIn(CIUDADES),
  body("tipo").optional().isIn(TIPOS),
  body("direccion").optional({ nullable: true }).isString().trim(),
  body("telefono").optional({ nullable: true }).isString().trim(),
  body("whatsapp").optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
  body("horario").optional({ nullable: true }).isString().trim(),
  body("descripcion").optional({ nullable: true }).isString().trim(),
  body("icono").optional().isString().trim(), 
  body("latitud").optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body("longitud").optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  body("activo").optional({ nullable: true }).isBoolean(),
];

// ── Helper ────────────────────────────────────────────────────────────────────
const check = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errores: errors.array() });
    return false;
  }
  return true;
};

// ── Helper: parsear coordenadas ───────────────────────────────────────────────
const parseCoords = (l) => ({
  ...l,
  latitud:  l.latitud  ? parseFloat(l.latitud)  : null,
  longitud: l.longitud ? parseFloat(l.longitud) : null,
});

// ── Helpers para valores nulos ─────────────────────────────────────────────────
// nullOrValue: convierte cadena vacía en NULL, permite limpiar campos opcionales
const nullOrValue = (val) => (val === undefined || val === null || String(val).trim() === '') ? null : String(val).trim();

// ── GET /api/lugares  (PÚBLICO — app móvil) ───────────────────────────────────
// Devuelve todos los lugares activos agrupados por tipo, igual que placesData.js
const listarPublico = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nombre, ciudad, tipo, direccion, telefono, whatsapp, horario, descripcion, icono, icono_url, latitud, longitud
      FROM   lugares
      WHERE  activo = true
      ORDER  BY tipo, ciudad, nombre
    `);
 
    const agrupado = {};
    for (const l of rows) {
      if (!agrupado[l.tipo]) agrupado[l.tipo] = [];
      agrupado[l.tipo].push(parseCoords(l));
    }
    return res.json(agrupado);
  } catch (err) {
    console.error("[lugares.listarPublico]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── GET /api/lugares/:tipo  (PÚBLICO — filtra por tipo) ───────────────────────
const listarPorTipo = async (req, res) => {
  try {
    const { tipo } = req.params;
    const { ciudad } = req.query;

    let query = `
      SELECT id, nombre, ciudad, tipo, direccion, telefono, whatsapp, horario, descripcion, icono, icono_url, latitud, longitud
      FROM   lugares
      WHERE  activo = true AND tipo = $1
    `;
    const params = [tipo];

    if (ciudad) {
      query += ` AND ciudad = $2`;
      params.push(ciudad);
    }

    query += ` ORDER BY ciudad, nombre`;

    const { rows } = await pool.query(query, params);
    return res.json(rows.map(parseCoords));
  } catch (err) {
    console.error("[lugares.listarPorTipo]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── GET /api/admin/lugares  (ADMIN — lista completa con inactivos) ─────────────
const listarAdmin = async (req, res) => {
  try {
    const { tipo, ciudad } = req.query;
    let query = `SELECT * FROM lugares`;
    const params = [];
    const conds  = [];

    if (tipo)   { conds.push(`tipo = $${params.length+1}`);   params.push(tipo); }
    if (ciudad) { conds.push(`ciudad = $${params.length+1}`); params.push(ciudad); }
    if (conds.length) query += ` WHERE ${conds.join(" AND ")}`;
    query += ` ORDER BY tipo, ciudad, nombre`;

    const { rows } = await pool.query(query, params);
    return res.json(rows.map(parseCoords));
  } catch (err) {
    console.error("[lugares.listarAdmin]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── GET /api/admin/lugares/:id  ────────────────────────────────────────────────
const obtenerUno = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM lugares WHERE id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Lugar no encontrado" });
    return res.json(parseCoords(rows[0]));
  } catch (err) {
    console.error("[lugares.obtenerUno]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── POST /api/admin/lugares  ──────────────────────────────────────────────────
const crear = async (req, res) => {
  if (!check(req, res)) return;
  const { id, nombre, ciudad, tipo, direccion, telefono, whatsapp, horario, descripcion, icono, latitud, longitud, activo } = req.body;
  try {
    // Verificar duplicado
    const existe = await pool.query(`SELECT id FROM lugares WHERE id = $1`, [id]);
    if (existe.rows.length) return res.status(409).json({ error: `Ya existe un lugar con id "${id}"` });

    await pool.query(`
      INSERT INTO lugares (id, nombre, ciudad, tipo, direccion, telefono, whatsapp, horario, descripcion, icono, latitud, longitud, activo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, $13)
    `, [
      id, nombre, ciudad, tipo,
      nullOrValue(direccion), nullOrValue(telefono), nullOrValue(whatsapp),
      nullOrValue(horario), nullOrValue(descripcion), icono || 'default',
      latitud || null, longitud || null,
      activo !== false,]);

    return res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error("[lugares.crear]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── PUT /api/admin/lugares/:id  ───────────────────────────────────────────────
const actualizar = async (req, res) => {
  if (!check(req, res)) return;
  const { id } = req.params;
  const { nombre, ciudad, tipo, direccion, telefono, whatsapp, horario, descripcion, icono, latitud, longitud, activo } = req.body;

  try {
    const existe = await pool.query(`SELECT id FROM lugares WHERE id = $1`, [id]);
    if (!existe.rows.length) return res.status(404).json({ error: "Lugar no encontrado" });

    await pool.query(`
      UPDATE lugares SET
        nombre        = COALESCE($1, nombre),
        ciudad        = COALESCE($2, ciudad),
        tipo          = COALESCE($3, tipo),
        direccion     = $4,
        telefono      = $5,
        whatsapp      = $6,
        horario       = $7,
        descripcion   = $8,
        icono         = COALESCE($9, icono),
        latitud       = $10,
        longitud      = $11,
        activo        = COALESCE($12, activo),
        actualizado_en = NOW()
      WHERE id = $13
    `, [
      nombre  || null,
      ciudad  || null,
      tipo    || null,
      nullOrValue(direccion),
      nullOrValue(telefono),
      nullOrValue(whatsapp),   
      nullOrValue(horario),
      nullOrValue(descripcion),
      icono   || null,
      latitud  != null ? latitud  : null,
      longitud != null ? longitud : null,
      activo  !== undefined ? activo : null,
      id,]);

    return res.json({ ok: true, id });
  } catch (err) {
    console.error("[lugares.actualizar]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── PATCH /api/admin/lugares/:id ──────────────────────────────────────────────
// Actualización PARCIAL: solo modifica los campos enviados.
// Usado por toggleActivo en el frontend para no pisar campos con COALESCE.
const patchLugar = async (req, res) => {
  const { id } = req.params;
  const campos = req.body;
  if (!campos || Object.keys(campos).length === 0)
    return res.status(400).json({ error: "No se enviaron campos para actualizar" });
 
  try {
    const existe = await pool.query(`SELECT id FROM lugares WHERE id = $1`, [id]);
    if (!existe.rows.length) return res.status(404).json({ error: "Lugar no encontrado" });
 
    // Construir SET dinámico — solo los campos enviados
    const camposPermitidos = ['activo', 'nombre', 'ciudad', 'tipo', 'direccion',
                              'telefono', 'whatsapp', 'horario', 'descripcion', 'icono'];
    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(campos)) {
      if (camposPermitidos.includes(key)) {
        params.push(value === '' ? null : value);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ error: "Sin campos válidos" });
    params.push(id);
    await pool.query(
      `UPDATE lugares SET ${sets.join(', ')}, actualizado_en = NOW() WHERE id = $${params.length}`,
      params
    );
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("[lugares.patchLugar]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── POST /api/admin/lugares/:id/icono  ────────────────────────────────────────
// Recibe multipart/form-data con campo "icono_file" (imagen).
// Guarda el archivo en /uploads/iconos-lugares/ y actualiza icono_url en BD.
// El servidor debe servir /uploads como estático para que la URL sea accesible.
const subirIcono = (req, res) => {
  uploadIcono(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Error de archivo: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo" });
    }
 
    const { id } = req.params;
    const icono_url = `/uploads/iconos-lugares/${req.file.filename}`;
 
    try {
      const { rows } = await pool.query(
        `UPDATE lugares
         SET icono_url = $1, actualizado_en = NOW()
         WHERE id = $2
         RETURNING id, icono_url`,
        [icono_url, id]
      );
      if (!rows.length) {
        return res.status(404).json({ error: "Lugar no encontrado" });
      }
      return res.json({ ok: true, id, icono_url });
    } catch (dbErr) {
      console.error("[lugares.subirIcono]", dbErr.message);
      return res.status(500).json({ error: "Error al guardar en BD" });
    }
  });
};

// ── DELETE /api/admin/lugares/:id/icono  ──────────────────────────────────────
// Elimina el archivo del disco y borra icono_url de la BD.
const eliminarIcono = async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT icono_url FROM lugares WHERE id = $1`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Lugar no encontrado" });
 
    const iconoUrl = rows[0].icono_url;
    if (iconoUrl) {
      const filePath = path.join(__dirname, "..", iconoUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
 
    await pool.query(
      `UPDATE lugares SET icono_url = NULL, actualizado_en = NOW() WHERE id = $1`, [id]
    );
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("[lugares.eliminarIcono]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

// ── DELETE /api/admin/lugares/:id  (soft delete) ─────────────────────────────
const eliminar = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE lugares SET activo = false, actualizado_en = NOW() WHERE id = $1 RETURNING id`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Lugar no encontrado" });
    return res.json({ ok: true, id: req.params.id });
  } catch (err) {
    console.error("[lugares.eliminar]", err.message);
    return res.status(500).json({ error: "Error interno" });
  }
};

module.exports = {
  validacionesCrear, 
  validacionesActualizar,
  listarPublico, 
  listarPorTipo, 
  listarAdmin, 
  obtenerUno,
  crear,
  actualizar,
  patchLugar,
  subirIcono,
  eliminarIcono, 
  eliminar,
};