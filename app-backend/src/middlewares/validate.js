const { validationResult } = require("express-validator");

// Ejecuta las reglas y devuelve 400 si hay errores
const validate = (rules) => async (req, res, next) => {
  for (const rule of rules) await rule.run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array().map(e => e.msg) });
  next();
};

module.exports = validate;