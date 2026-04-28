// src/controllers/adminController.js
const bcrypt = require("bcryptjs");
const pool   = require("../config/db");

// ── GET /api/admin/usuarios ───────────────────────────────────────────────────
// Lista todos los administradores (sin devolver passwords)
exports.listar = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, email, rol, activo, creado_en
       FROM admins
       ORDER BY creado_en DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("[admin.listar]", err.message);
    res.status(500).json({ error: "Error interno" });
  }
};

// ── POST /api/admin/usuarios ──────────────────────────────────────────────────
// Crea un nuevo administrador
exports.crear = async (req, res) => {
  const { nombre, email, password, rol = "admin" } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio" });
  if (!email?.trim())  return res.status(400).json({ error: "El email es obligatorio" });
  if (!password || password.length < 8)
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  if (!["admin", "superadmin"].includes(rol))
    return res.status(400).json({ error: "Rol inválido" });

  try {
    // Verificar email duplicado
    const existe = await pool.query(`SELECT id FROM admins WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existe.rows.length)
      return res.status(409).json({ error: "Ya existe un usuario con ese email" });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO admins (nombre, email, password, rol, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, nombre, email, rol, activo, creado_en`,
      [nombre.trim(), email.toLowerCase().trim(), hash, rol]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("[admin.crear]", err.message);
    res.status(500).json({ error: "Error interno" });
  }
};

// ── PUT /api/admin/usuarios/:id ───────────────────────────────────────────────
// Actualiza nombre, email, rol y/o estado activo
exports.actualizar = async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol, activo } = req.body;

  try {
    const existe = await pool.query(`SELECT id FROM admins WHERE id = $1`, [id]);
    if (!existe.rows.length) return res.status(404).json({ error: "Usuario no encontrado" });

    // Si cambia el email, verificar que no esté en uso por otro
    if (email) {
      const dup = await pool.query(
        `SELECT id FROM admins WHERE email = $1 AND id != $2`,
        [email.toLowerCase().trim(), id]
      );
      if (dup.rows.length) return res.status(409).json({ error: "Email ya en uso por otro usuario" });
    }

    await pool.query(`
      UPDATE admins SET
        nombre = COALESCE($1, nombre),
        email  = COALESCE($2, email),
        rol    = COALESCE($3, rol),
        activo = COALESCE($4, activo)
      WHERE id = $5
    `, [
      nombre?.trim() || null,
      email?.toLowerCase().trim() || null,
      rol || null,
      activo !== undefined ? activo : null,
      id,
    ]);

    const { rows } = await pool.query(
      `SELECT id, nombre, email, rol, activo, creado_en FROM admins WHERE id = $1`, [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("[admin.actualizar]", err.message);
    res.status(500).json({ error: "Error interno" });
  }
};

// ── PUT /api/admin/usuarios/:id/password ──────────────────────────────────────
// Cambia la contraseña de un usuario. Un superadmin puede cambiar la de cualquiera;
// un admin solo puede cambiar la propia y debe confirmar la contraseña actual.
exports.cambiarPassword = async (req, res) => {
  const { id } = req.params;
  const { password_actual, password_nueva } = req.body;
  const solicitante = req.admin; // viene del middleware auth

  if (!password_nueva || password_nueva.length < 8)
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });

  try {
    const { rows } = await pool.query(
      `SELECT id, password, rol FROM admins WHERE id = $1 AND activo = true`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });

    const objetivo = rows[0];

    // Si el solicitante no es superadmin y está intentando cambiar la de otro → denegar
    if (solicitante.rol !== "superadmin" && String(solicitante.id) !== String(id))
      return res.status(403).json({ error: "No tienes permiso para cambiar la contraseña de otro usuario" });

    // Si no es superadmin (o es el mismo usuario), exigir contraseña actual
    if (solicitante.rol !== "superadmin" || String(solicitante.id) === String(id)) {
      if (!password_actual)
        return res.status(400).json({ error: "Debes ingresar tu contraseña actual" });
      const ok = await bcrypt.compare(password_actual, objetivo.password);
      if (!ok) return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    const hash = await bcrypt.hash(password_nueva, 12);
    await pool.query(`UPDATE admins SET password = $1 WHERE id = $2`, [hash, id]);
    res.json({ ok: true, mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("[admin.cambiarPassword]", err.message);
    res.status(500).json({ error: "Error interno" });
  }
};

// ── DELETE /api/admin/usuarios/:id ───────────────────────────────────────────
// Desactiva un admin (soft delete). No puede desactivarse a sí mismo.
exports.desactivar = async (req, res) => {
  const { id } = req.params;
  if (String(req.admin.id) === String(id))
    return res.status(400).json({ error: "No puedes desactivar tu propia cuenta" });
  try {
    const { rows } = await pool.query(
      `UPDATE admins SET activo = false WHERE id = $1 RETURNING id`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin.desactivar]", err.message);
    res.status(500).json({ error: "Error interno" });
  }
};