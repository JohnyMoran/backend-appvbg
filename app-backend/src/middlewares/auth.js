const jwt = require("jsonwebtoken");

const auth = function (req, res, next) {
  const header = req.headers["authorization"] || "";
  if (!header.startsWith("Bearer "))
    return res.status(401).json({ error: "Token requerido" });

  try {
    req.admin = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

auth.role = (...roles) => (req, res, next) => {
  if (!req.admin)
    return res.status(401).json({ error: "No autorizado" });
  if (!roles.includes(req.admin.rol))
    return res.status(403).json({ error: "No tienes permisos para esta acción" });
  next();
};

module.exports = auth;