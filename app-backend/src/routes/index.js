const router       = require("express").Router();
const auth         = require("../middlewares/auth");
const validate     = require("../middlewares/validate");

const authCtrl       = require("../controllers/authController");
const perfilesCtrl   = require("../controllers/perfilesController");
const violenciasCtrl = require("../controllers/violenciasController");
const solicitudesCtrl= require("../controllers/solicitudesController");
const estadisticasCtrl= require("../controllers/estadisticasController");
const lugaresCtrl      = require("../controllers/lugaresController");
const emergenciaCtrl   = require("../controllers/emergenciaController");
const adminCtrl       = require("../controllers/adminController");
const termsController = require("../controllers/termsController");

// ── Términos y Condiciones ────────────────────────────────────────
router.get("/terminos", termsController.getTerms);

// ── Health ────────────────────────────────────────────────────────
router.get("/health", (_, res) => res.json({ status: "ok", time: new Date() }));

// ── Auth ──────────────────────────────────────────────────────────
router.post("/auth/login", authCtrl.login);
router.get ("/auth/me",    auth, authCtrl.me);

// ── App móvil: datos del perfil ─────────────────────────────
router.post("/perfiles", validate(perfilesCtrl.validaciones), perfilesCtrl.crear);

router.post("/violencias", validate(violenciasCtrl.validaciones), violenciasCtrl.registrar);

router.post("/solicitudes", validate(solicitudesCtrl.validaciones), solicitudesCtrl.crear);

router.post("/estadisticas", validate(estadisticasCtrl.validaciones), estadisticasCtrl.registrar);

// ── App móvil: lugares y emergencias (PÚBLICOS) ───────────────────────────────
// La app consume estos endpoints en lugar del archivo estático
router.get("/lugares",         lugaresCtrl.listarPublico);   
router.get("/lugares/:tipo",   lugaresCtrl.listarPorTipo);  
router.get("/emergencias",     emergenciaCtrl.listarPublico);

// ── Panel admin:estadísticas y perfiles (protegidos con JWT) ──────────────────────────────
router.get("/admin/perfiles/resumen",    auth, perfilesCtrl.resumen);
router.get("/admin/perfiles/exportar",   auth, perfilesCtrl.exportar);
router.get("/admin/violencias/resumen",  auth, violenciasCtrl.resumen);
router.get("/admin/violencias/exportar", auth, violenciasCtrl.exportar);
router.get("/admin/solicitudes/resumen", auth, solicitudesCtrl.resumen);
router.get("/admin/solicitudes/exportar",auth, solicitudesCtrl.exportar);
router.get("/admin/estadisticas",        auth, estadisticasCtrl.dashboard);

// ── Panel admin: CRUD lugares ─────────────────────────────────────────────────
router.get   ("/admin/lugares",      auth, lugaresCtrl.listarAdmin);
router.post  ("/admin/lugares",      auth, validate(lugaresCtrl.validacionesCrear),      lugaresCtrl.crear);
router.post  ("/admin/lugares/:id/icono",   auth, lugaresCtrl.subirIcono); 
router.delete("/admin/lugares/:id/icono",   auth, lugaresCtrl.eliminarIcono);
router.get   ("/admin/lugares/:id",  auth, lugaresCtrl.obtenerUno);
router.put   ("/admin/lugares/:id",  auth, validate(lugaresCtrl.validacionesActualizar), lugaresCtrl.actualizar);
router.patch ("/admin/lugares/:id",          auth, lugaresCtrl.patchLugar);
router.delete("/admin/lugares/:id",  auth, lugaresCtrl.eliminar);

// ── Panel admin: CRUD emergencias ─────────────────────────────────────────────
router.get   ("/admin/emergencias",      auth, emergenciaCtrl.listarAdmin);
router.get   ("/admin/emergencias/:id",  auth, emergenciaCtrl.obtenerUno);
router.post  ("/admin/emergencias",      auth, validate(emergenciaCtrl.validacionesCrear),      emergenciaCtrl.crear);
router.put   ("/admin/emergencias/:id",  auth, validate(emergenciaCtrl.validacionesActualizar), emergenciaCtrl.actualizar);
router.patch ("/admin/emergencias/:id",  auth, emergenciaCtrl.patchEmergencia);
router.delete("/admin/emergencias/:id",  auth, emergenciaCtrl.eliminar);

// ── Panel admin: gestión de usuarios administradores ─────────────────────────
// superadmin: todo. admin: solo crear viewers y cambiar passwords de viewers.
// viewer: no tiene acceso a usuarios.
router.get   ("/admin/usuarios",             auth, auth.role("superadmin","admin"), adminCtrl.listar);
router.post  ("/admin/usuarios",             auth, auth.role("superadmin","admin"), adminCtrl.crear);
router.put   ("/admin/usuarios/:id",         auth, auth.role("superadmin"),         adminCtrl.actualizar);
router.put   ("/admin/usuarios/:id/password",auth,                                  adminCtrl.cambiarPassword);
router.delete("/admin/usuarios/:id",         auth, auth.role("superadmin"),         adminCtrl.desactivar);

module.exports = router;