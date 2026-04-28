const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const pool   = require("../config/db");

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email y contraseña requeridos" });

  try {
    const { rows } = await pool.query(
      "SELECT * FROM admins WHERE email = $1 AND activo = true", [email]
    );
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password)))
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const admin = rows[0];
    const token = jwt.sign(
      { id: admin.id, email: admin.email, rol: admin.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({
      token,
      admin: { id: admin.id, nombre: admin.nombre, email: admin.email, rol: admin.rol },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

exports.me = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre, email, rol FROM admins WHERE id = $1", [req.admin.id]
    );
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Error del servidor" });
  }
};