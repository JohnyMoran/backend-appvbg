require("dotenv").config();
const pool   = require("./db");
const bcrypt = require("bcryptjs");

async function migrate() {
  console.log("🔄 Ejecutando migración unificada...\n");

  // ════════════════════════════════════════════════════════════════
  // 1. TABLAS CORE (auth + analytics)
  // ════════════════════════════════════════════════════════════════
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id        SERIAL       PRIMARY KEY,
      nombre    VARCHAR(100) NOT NULL,
      email     VARCHAR(150) UNIQUE NOT NULL,
      password  VARCHAR(255) NOT NULL,
      rol       VARCHAR(20)  DEFAULT 'admin',
      activo    BOOLEAN      DEFAULT true,
      creado_en TIMESTAMP    DEFAULT NOW()
    );

    -- region: "Tumaco" | "Buenaventura"
    -- zona:   "Rural"  | "Urbana"
    -- edad:   "joven"  | "adulto" | "adulto_mayor"
    -- laboral:"Empleado" | "Desempleado" | "Estudiante" | "Independiente"
    CREATE TABLE IF NOT EXISTS perfiles (
      id             SERIAL      PRIMARY KEY,
      region         VARCHAR(50),
      zona           VARCHAR(30),
      etnia          TEXT,
      edad           VARCHAR(30),
      laboral        VARCHAR(50),
      dispositivo_id VARCHAR(120),
      plataforma     VARCHAR(20),
      creado_en      TIMESTAMP   DEFAULT NOW()
    );

    -- tipo_violencia: "fisica" | "sexual" | "psicologica" | "economica" |
    --                 "patrimonial" | "digital" | "vicaria" | "prejuicios"
    CREATE TABLE IF NOT EXISTS violencias_vistas (
      id             SERIAL      PRIMARY KEY,
      tipo_violencia VARCHAR(80) NOT NULL,
      dispositivo_id VARCHAR(120),
      plataforma     VARCHAR(20),
      creado_en      TIMESTAMP   DEFAULT NOW()
    );

    -- Refleja las 5 preguntas de ServicesScreen
    CREATE TABLE IF NOT EXISTS solicitudes (
      id                   SERIAL      PRIMARY KEY,
      atencion_medica      BOOLEAN     DEFAULT false,
      denuncia             BOOLEAN     DEFAULT false,
      agresor              BOOLEAN     DEFAULT false,
      amenaza_hijos        BOOLEAN     DEFAULT false,
      derechos_vulnerados  BOOLEAN     DEFAULT false,
      lugar_redirigido     VARCHAR(80),
      dispositivo_id       VARCHAR(120),
      plataforma           VARCHAR(20),
      creado_en            TIMESTAMP   DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS estadisticas (
      id             SERIAL      PRIMARY KEY,
      evento         VARCHAR(80) NOT NULL,
      detalle        VARCHAR(120),
      pantalla       VARCHAR(60),
      dispositivo_id VARCHAR(120),
      plataforma     VARCHAR(20),
      creado_en      TIMESTAMP   DEFAULT NOW()
    );
  `);
  console.log("✅ Tablas core creadas");

    // ════════════════════════════════════════════════════════════════
  // 2. TABLAS DE CONTENIDO (lugares + emergencias)
  // ════════════════════════════════════════════════════════════════
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lugares (
      id             VARCHAR(80)  PRIMARY KEY,
      nombre         VARCHAR(200) NOT NULL,
      ciudad         VARCHAR(50)  NOT NULL
                       CHECK (ciudad IN ('Tumaco','Buenaventura')),
      tipo           VARCHAR(40)  NOT NULL
                       CHECK (tipo IN ('salud','protección','justicia',
                                       'ministerio_publico','duplas','otro')),
      direccion      TEXT,
      telefono       TEXT,
      whatsapp       VARCHAR(30),
      horario        TEXT,
      descripcion    TEXT,
      icono          VARCHAR(60)  DEFAULT 'default',
      icono_url      VARCHAR(255),
      latitud        DECIMAL(12,8),
      longitud       DECIMAL(12,8),
      activo         BOOLEAN      DEFAULT true,
      creado_en      TIMESTAMP    DEFAULT NOW(),
      actualizado_en TIMESTAMP    DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS numeros_emergencia (
      id             VARCHAR(20)  PRIMARY KEY,
      nombre         VARCHAR(120) NOT NULL,
      numero         VARCHAR(30)  NOT NULL,
      horario        VARCHAR(60)  DEFAULT '24 horas',
      descripcion    TEXT,
      icono_nombre   VARCHAR(60)  DEFAULT 'alert-circle-outline',
      prioridad      BOOLEAN      DEFAULT false,
      activo         BOOLEAN      DEFAULT true,
      orden          INTEGER      DEFAULT 99,
      creado_en      TIMESTAMP    DEFAULT NOW(),
      actualizado_en TIMESTAMP    DEFAULT NOW()
    );
  `);
  console.log("✅ Tablas de contenido creadas");

  // ════════════════════════════════════════════════════════════════
  // 3. ÍNDICES
  // ════════════════════════════════════════════════════════════════
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_perfiles_region    ON perfiles(region);
    CREATE INDEX IF NOT EXISTS idx_perfiles_fecha     ON perfiles(creado_en DESC);
    CREATE INDEX IF NOT EXISTS idx_violencias_tipo    ON violencias_vistas(tipo_violencia);
    CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha  ON solicitudes(creado_en DESC);
    CREATE INDEX IF NOT EXISTS idx_stats_evento       ON estadisticas(evento);
    CREATE INDEX IF NOT EXISTS idx_stats_fecha        ON estadisticas(creado_en DESC);
    CREATE INDEX IF NOT EXISTS idx_lugares_tipo       ON lugares(tipo);
    CREATE INDEX IF NOT EXISTS idx_lugares_ciudad     ON lugares(ciudad);
    CREATE INDEX IF NOT EXISTS idx_lugares_activo     ON lugares(activo);
    CREATE INDEX IF NOT EXISTS idx_emergencia_orden   ON numeros_emergencia(orden, prioridad);
  `);
  console.log("✅ Índices creados");

  // ════════════════════════════════════════════════════════════════
  // 3b. MIGRACIONES INCREMENTALES
  //     Aplican cambios sobre tablas que ya pueden existir.
  //     Seguras de correr múltiples veces (IF NOT EXISTS / DO NOTHING).
  // ════════════════════════════════════════════════════════════════

  await pool.query(`
    ALTER TABLE lugares ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);
    ALTER TABLE lugares ADD COLUMN IF NOT EXISTS icono_url VARCHAR(255);
  `);

  // PostgreSQL no permite ALTER CHECK — hay que eliminar y recrear
  await pool.query(`
    ALTER TABLE lugares DROP CONSTRAINT IF EXISTS lugares_tipo_check;
    ALTER TABLE lugares ADD CONSTRAINT lugares_tipo_check
      CHECK (tipo IN ('salud','protección','justicia','ministerio_publico','duplas','otro'));
  `);

  console.log("✅ Columna whatsapp y constraint duplas aplicados");

  // ════════════════════════════════════════════════════════════════
  // 4. SEED: Admin
  // ════════════════════════════════════════════════════════════════
  const hash = await bcrypt.hash("Admin2026*", 10);
  await pool.query(`
    INSERT INTO admins (nombre, email, password, rol)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (email) DO NOTHING
  `, ["Administrador", "admin@perla.com", hash, "superadmin"]);
  console.log("✅ Admin → admin@perla.com / Admin2026*");

  // ════════════════════════════════════════════════════════════════
  // 5. SEED: Lugares
  // ════════════════════════════════════════════════════════════════
  const lugares = [
    // ── JUSTICIA ─────────────────────────────────────────────────
    { id:"fiscalia_tumaco", nombre:"Fiscalía General de la Nación", ciudad:"Tumaco", tipo:"justicia",
      direccion:"Avenida los Estudiantes, Sector Miramar",
      telefono:"122", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-6:00pm",
      descripcion:"Se encarga de investigar los posibles delitos, proteger a las víctimas y pedir medidas de protección.",
      icono:"justicia", latitud:1.8189894663045683, longitud:-78.7624061865076 },

    { id:"fiscalia_buenaventura", nombre:"Fiscalía General de la Nación", ciudad:"Buenaventura", tipo:"justicia",
      direccion:"Calle 9 No 2 – 83",
      telefono:"122\n018000919748", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-12:00m\n1:00pm-5:00pm",
      descripcion:"Se encarga de investigar los posibles delitos, proteger a las víctimas y pedir medidas de protección.",
      icono:"justicia", latitud:3.8916622258165905, longitud:-77.07791747116414 },

    { id:"cti_tumaco", nombre:"Policía Judicial (CTI, SIJIN, DIJIN)", ciudad:"Tumaco", tipo:"justicia",
      direccion:"Esquina Avenida Férrea y Calle Mosquera",
      telefono:"3203024362", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Apoya a la fiscalía en la investigación de posibles delitos.",
      icono:"justicia", latitud:1.8086993080773277, longitud:-78.76656535582066 },

    { id:"cti_buenaventura", nombre:"Policía Judicial (CTI, SIJIN, DIJIN)", ciudad:"Buenaventura", tipo:"justicia",
      direccion:"C 19 E N° 6 - 90",
      telefono:"3203046448", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Apoya a la fiscalía en la investigación de posibles delitos.",
      icono:"justicia", latitud:3.8856077515648635, longitud:-77.0599214 },

    { id:"medicina_legal_tumaco", nombre:"Instituto Nacional de Medicina Legal y Ciencias Forenses", ciudad:"Tumaco", tipo:"justicia",
      direccion:"Ciudadela Sector Nuevo Horizonte, enseguida del Centro Hospital Divino Niño",
      telefono:"602 8274174\n602 3980041", whatsapp:null,
      horario:"Lunes a Domingo\n7:00am-7:00pm\nSábados, Domingos y Festivos\n7:00am-1:00pm",
      descripcion:"Brindar apoyo técnico y científico a la justicia cuando las autoridades lo soliciten.",
      icono:"justicia", latitud:1.7888627283933127, longitud:-78.78712048465654 },

    { id:"medicina_legal_buenaventura", nombre:"Instituto Nacional de Medicina Legal y Ciencias Forenses", ciudad:"Buenaventura", tipo:"justicia",
      direccion:"Av. Simón Bolívar No.17-40",
      telefono:"602 8274174\n602 3980041", whatsapp:null,
      horario:"Lunes a Domingo\n7:00am-7:00pm\nSábados, Domingos y Festivos\n7:00am-1:00pm",
      descripcion:"Brindar apoyo técnico y científico a la justicia cuando las autoridades lo soliciten.",
      icono:"justicia", latitud:3.881665598582891, longitud:-77.06437609444673 },

    // ── PROTECCIÓN ───────────────────────────────────────────────
    { id:"comisaria_tumaco", nombre:"Comisaría de Familia", ciudad:"Tumaco", tipo:"protección",
      direccion:"Casa de Justicia, Avenida los Estudiantes, Sector la Y",
      telefono:"7276159", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-6:00pm",
      descripcion:"Establece medidas para cuidar, proteger y ayudar a las mujeres que son víctimas de violencia dentro de la familia.",
      icono:"proteccion", latitud:1.8145480432037724, longitud:-78.76422545767173 },

    { id:"comisaria_buenaventura", nombre:"Comisaría de Familia", ciudad:"Buenaventura", tipo:"protección",
      direccion:"Calle 4 sur Cra 73 esquina, Barrio Nueva Granada",
      telefono:"3123734559", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Establece medidas para cuidar, proteger y ayudar a las mujeres que son víctimas de violencia dentro de la familia.",
      icono:"proteccion", latitud:3.8636936635472394, longitud:-76.99349771772933 },

    { id:"policia_tumaco", nombre:"Policía Nacional - Tumaco", ciudad:"Tumaco", tipo:"protección",
      direccion:"Esquina de la Avenida Férrea y la Calle Mosquera",
      telefono:"3203024362", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Realiza tareas muy importantes para proteger y ayudar a las víctimas y para recibir denuncias.",
      icono:"proteccion", latitud:1.808786449015912, longitud:-78.76618319074454 },

    { id:"policia_buenaventura", nombre:"Policía Nacional - Buenaventura", ciudad:"Buenaventura", tipo:"protección",
      direccion:"C 19 E N° 6 - 90",
      telefono:"3203024362", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Realiza tareas muy importantes para proteger y ayudar a las víctimas y para recibir denuncias.",
      icono:"proteccion", latitud:3.8858646516974926, longitud:-77.05966390793913 },

    { id:"icbf_tumaco", nombre:"Instituto de Bienestar Familiar", ciudad:"Tumaco", tipo:"protección",
      direccion:"Parque Colón, San Andrés de Tumaco - Nariño",
      telefono:"57(601) 437 76 30 Ext: 233014 - 233015", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Ayuda a garantizar la seguridad de los menores de edad.",
      icono:"proteccion", latitud:1.8067567142886514, longitud:-78.76358307116412 },

    { id:"icbf_buenaventura", nombre:"Instituto de Bienestar Familiar", ciudad:"Buenaventura", tipo:"protección",
      direccion:"Avenida Simón Bolívar, diagonal al barrio Transformación",
      telefono:"3215744988", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Ayuda a garantizar la seguridad de los menores de edad.",
      icono:"proteccion", latitud:3.880748170538906, longitud:-77.01042880304402 },

    // ── MINISTERIO PÚBLICO ───────────────────────────────────────
    { id:"procuraduria_general_de_nacion_tumaco", nombre:"Procuraduría General de Nación", ciudad:"Tumaco", tipo:"ministerio_publico",
      direccion:"Avenida Los Estudiantes, Sector La Y",
      telefono:"(572) 5878750", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-12:00pm\n1:00pm-5:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:1.8162992212235298, longitud:-78.7636289580418 },

    { id:"procuraduria_general_de_nacion_buenaventura", nombre:"Procuraduría General de Nación", ciudad:"Buenaventura", tipo:"ministerio_publico",
      direccion:"Calle 6 # 5 - 11",
      telefono:"3215744988", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:3.889324893936952, longitud:-77.07458247952376 },

    { id:"defensoria_del_pueblo_tumaco", nombre:"Defensoría del Pueblo", ciudad:"Tumaco", tipo:"ministerio_publico",
      direccion:"Calle Santander",
      telefono:"3223866321", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:1.80805810815122, longitud:-78.76547818650761 },

    { id:"defensoria_del_pueblo_buenaventura", nombre:"Defensoría del Pueblo", ciudad:"Buenaventura", tipo:"ministerio_publico",
      direccion:"Cl. 2° Sur #7-228",
      telefono:"3134092554", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:3.884417202372204, longitud:-77.07540222883586 },

    { id:"personería_municipal_tumaco", nombre:"Personería Municipal", ciudad:"Tumaco", tipo:"ministerio_publico",
      direccion:"Cl. 11 #9-2, Tumaco",
      telefono:"(572)7271201", whatsapp:null,
      horario:"Martes a Viernes\n8:00am-12:30pm\n2:00pm-6:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:1.8060228789437267, longitud:-78.76924000059647 },

    { id:"personería_municipal_buenaventura", nombre:"Personería Distrital", ciudad:"Buenaventura", tipo:"ministerio_publico",
      direccion:"Calle segunda edificio el CAD, piso # 10",
      telefono:"3116073104\n2978928", whatsapp:null,
      horario:"8:00am-12:00pm\n2:00pm-6:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:3.889324893936952, longitud:-78.76582894232826 },

    // ── SALUD ────────────────────────────────────────────────────
    { id:"hospital_san_andres", nombre:"Hospital San Andrés E.S.E.", ciudad:"Tumaco", tipo:"salud",
      direccion:"Km 23 Inguapi del Carmen",
      telefono:"3184096662", whatsapp:null,
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:1.67234769600039, longitud:-78.75234138465652 },

    { id:"ips_puente_medio", nombre:"IPS Puente del Medio", ciudad:"Tumaco", tipo:"salud",
      direccion:"Sede 1: Calle Santander / Sede 2: Avenida Los Estudiantes",
      telefono:"3160259999\n3242661258\n3156016279", whatsapp:null,
      horario:"24 horas",
      descripcion:"Entidad de segundo nivel de complejidad.",
      icono:"salud", latitud:1.8077449316847172, longitud:-78.76428676931305 },

    { id:"divino_nino", nombre:"Centro Hospital Divino Niño E.S.E.", ciudad:"Tumaco", tipo:"salud",
      direccion:"Barrio Nuevo Horizonte",
      telefono:"3027270404", whatsapp:null,
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:1.788207639589229, longitud:-78.78844703862607 },

    { id:"ips_los_angeles", nombre:"IPS Los Ángeles", ciudad:"Tumaco", tipo:"salud",
      direccion:"Calle 11 #9-2, Tumaco",
      telefono:"3205041354", whatsapp:null,
      horario:"7:00am-6:00pm",
      descripcion:"Evaluaciones médicas y peritajes.",
      icono:"salud", latitud:1.8135852452074122, longitud:-78.76634640553385 },

    { id:"hospital_luis_ablanque_independencia", nombre:"Centro de Salud Independencia (Luis Ablanque De La Plata)", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Cl. 6 #120, Buenaventura",
      telefono:"315 5476004", whatsapp:null,
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.8769602550930453, longitud:-77.00452831305293 },

    { id:"hospital_luis_ablanque_bellavista", nombre:"Centro de Salud Bellavista (Hospital Luis Ablanque de la Plata)", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Barrio Jorge, Cra. 47 #22A-2-84",
      telefono:"3123734529", whatsapp:null,
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.8801200620969247, longitud:-77.02059020262098 },

    { id:"hospital_luis_ablanque_distrital", nombre:"Hospital Distrital Luis Ablanque De La Plata", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Cl. 5 #18-24, Buenaventura",
      telefono:"", whatsapp:null,
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.8802699214913403, longitud:-77.02046145659054 },

    { id:"clinica_santa_sofia", nombre:"Clínica Santa Sofía del Pacífico", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Cra. 47 #42, Buenaventura",
      telefono:"3123736537\n22421880", whatsapp:null,
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.8808727013535913, longitud:-77.02026621485183 },

    { id:"hospital_luis_ablanque_modelo", nombre:"Puesto de Salud El Modelo (Hospital Luis Ablanque De La Plata)", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Cl. 6 #1902, Buenaventura",
      telefono:"", whatsapp:null,
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.896968244035304, longitud:-77.0302609494981 },

    { id:"hospital_departamental_buenaventura", nombre:"Hospital Departamental De Buenaventura E.s.e", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Av. Simón Bolívar #17-40, Buenaventura",
      telefono:"", whatsapp:null,
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.87618058199835, longitud:-77.00463557473458 },

    // ── DUPLAS ───────────────────────────────────────────────────
    { id:"dupla_tumaco", nombre:"Dupla de Género Secretaría de la Mujer, Equidad y Género, Alcaldia Distrital de Tumaco", ciudad:"Tumaco", tipo:"duplas",
      direccion:"Calle Nueva Creación con Popayán",
      telefono:"3173694360", whatsapp:"3170820627",
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-6:00pm",
      descripcion:"Establece medidas para cuidar, proteger y ayudar a las mujeres que son víctimas de violencia dentro de la familia.",
      icono:"proteccion", latitud:1.807628096720489, longitud:-78.76544270423693 },

    { id:"dupla_buenaventura", nombre:"Dupla de Atención a Víctimas", ciudad:"Buenaventura", tipo:"duplas",
      direccion:"Calle 4 sur Cra 73 esquina, Barrio Nueva Granada",
      telefono:"3170820627", whatsapp:"3170820627",
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Establece medidas para cuidar, proteger y ayudar a las mujeres que son víctimas de violencia dentro de la familia.",
      icono:"proteccion", latitud:3.8636936635472394, longitud:-76.99349771772933 },

    // ── NUEVOS ────────────────────────────────────────────────────
    { id:"centro_salud_maria_mulumba", nombre:"Centro de Salud María Mulumba", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Cl. 1 #74-51",
      telefono:"-", whatsapp:null,
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.8802699214913403, longitud:-77.02046145659054 },

    { id:"secretaria_mujeres_buenaventura", nombre:"Secretaría de las Mujeres, Equidad de Género e Igualdad de Derechos", ciudad:"Buenaventura", tipo:"protección",
      direccion:"Barrio Los Pinos, Calle 5 No. 63A-58",
      telefono:"3218440784", whatsapp:null,
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Promover, proteger y garantizar los derechos de las mujeres.",
      icono:"proteccion", latitud:3.872808966, longitud:-77.0005967 },
  ];

  for (const l of lugares) {
    await pool.query(`
      INSERT INTO lugares
        (id, nombre, ciudad, tipo, direccion, telefono, whatsapp,
         horario, descripcion, icono, latitud, longitud)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (id) DO NOTHING
    `, [
      l.id, l.nombre, l.ciudad, l.tipo,
      l.direccion || null, l.telefono || null, l.whatsapp || null,
      l.horario   || null, l.descripcion || null, l.icono || "default",
      l.latitud   || null, l.longitud || null,
    ]);
  }
  console.log(`✅ ${lugares.length} lugares importados`);

  // ════════════════════════════════════════════════════════════════
  // 5b. ACTUALIZACIÓN DE LUGARES (correcciones 2026)
  //     Se aplican sobre registros que ya existen en BD.
  // ════════════════════════════════════════════════════════════════
  const updates = [
    // Tumaco
    `UPDATE lugares SET telefono='3184096662' WHERE id='hospital_san_andres'`,
    `UPDATE lugares SET telefono='3027270404' WHERE id='divino_nino'`,
    `UPDATE lugares SET telefono='3160259999\n3242661258\n3156016279' WHERE id='ips_puente_medio'`,
    `UPDATE lugares SET telefono='3205041354' WHERE id='ips_los_angeles'`,
    `UPDATE lugares SET direccion='Casa de Justicia, Avenida los Estudiantes, Sector la Y', telefono='7276159', latitud=1.8145480432037724, longitud=-78.76422545767173 WHERE id='comisaria_tumaco'`,
    `UPDATE lugares SET telefono='57(601) 437 76 30 Ext: 233014 - 233015' WHERE id='icbf_tumaco'`,
    `UPDATE lugares SET direccion='Avenida los Estudiantes, Sector Miramar', telefono='122' WHERE id='fiscalia_tumaco'`,
    `UPDATE lugares SET direccion='Calle Santander', latitud=1.80805810815122, longitud=-78.76547818650761 WHERE id='defensoria_del_pueblo_tumaco'`,
    `UPDATE lugares SET nombre='Dupla de Género Secretaría de la Mujer, Equidad y Género, Alcaldia Distrital de Tumaco', direccion='Calle Nueva Creación con Popayán', telefono='3173694360' WHERE id='dupla_tumaco'`,
    `UPDATE lugares SET latitud=1.8060228789437267, longitud=-78.76924000059647 WHERE id='personería_municipal_tumaco'`,
    // Buenaventura
    `UPDATE lugares SET telefono='3123734529', direccion='Barrio Jorge, Cra. 47 #22A-2-84' WHERE id='hospital_luis_ablanque_bellavista'`,
    `UPDATE lugares SET telefono='3123736537\n22421880' WHERE id='clinica_santa_sofia'`,
    `UPDATE lugares SET telefono='3123734559' WHERE id='comisaria_buenaventura'`,
    `UPDATE lugares SET telefono='3134092554', direccion='Cl. 2° Sur #7-228' WHERE id='defensoria_del_pueblo_buenaventura'`,
    `UPDATE lugares SET direccion='Avenida Simón Bolívar, diagonal al barrio Transformación' WHERE id='icbf_buenaventura'`,
    `UPDATE lugares SET nombre='Personería Distrital' WHERE id='personería_municipal_buenaventura'`,
    // Soft deletes
    `UPDATE lugares SET activo=false WHERE id IN ('cti_tumaco','procuraduria_general_de_nacion_tumaco','hospital_departamental_buenaventura')`,
  ];
  for (const sql of updates) {
    await pool.query(sql);
  }
  console.log(`✅ ${updates.length} actualizaciones de lugares aplicadas`);

  // ════════════════════════════════════════════════════════════════
  // 6. SEED: Números de emergencia
  // ════════════════════════════════════════════════════════════════
  const emergencias = [
    { id:"e-1",  nombre:"Línea de Mujeres",               numero:"155",          horario:"24 horas", prioridad:true,  orden:1, icono_nombre:"woman-outline",            descripcion:"Atención especializada a víctimas de violencia de género." },
    { id:"e-2",  nombre:"Línea Violencia Intrafamiliar",   numero:"141",          horario:"24 horas", prioridad:true,  orden:2, icono_nombre:"home-outline",             descripcion:"Orientación y activación de rutas de atención en violencia intrafamiliar." },
    { id:"e-3",  nombre:"ICBF – Bienestar Familiar",       numero:"018000918080", horario:"24 horas", prioridad:true,  orden:3, icono_nombre:"people-outline",           descripcion:"Protección de niñas, niños y adolescentes víctimas de violencia." },
    { id:"e-4",  nombre:"Policía Infancia y Adolescencia", numero:"145",          horario:"24 horas", prioridad:false, orden:4, icono_nombre:"shield-checkmark-outline", descripcion:"Protección policial para menores en situación de riesgo o abuso." },
    { id:"e-5",  nombre:"Fiscalía General",                numero:"122",          horario:"24 horas", prioridad:false, orden:5, icono_nombre:"scale-outline",            descripcion:"Denuncia de delitos, incluidos los de violencia sexual y de género." },
    { id:"e-6",  nombre:"Emergencias Policía",             numero:"123",          horario:"24 horas", prioridad:false, orden:6, icono_nombre:"alert-circle-outline",     descripcion:"Atención inmediata ante crímenes, amenazas o peligro inminente." },
    { id:"e-10", nombre:"Línea Amiga – Salud Mental",      numero:"106",          horario:"24 horas", prioridad:false, orden:7, icono_nombre:"heart-outline",            descripcion:"Apoyo psicológico en crisis y prevención del suicidio." },
  ];

  for (const e of emergencias) {
    await pool.query(`
      INSERT INTO numeros_emergencia
        (id, nombre, numero, horario, descripcion, icono_nombre, prioridad, orden)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO NOTHING
    `, [e.id, e.nombre, e.numero, e.horario,
        e.descripcion, e.icono_nombre, e.prioridad, e.orden]);
  }
  console.log(`✅ ${emergencias.length} números de emergencia importados`);

  // ════════════════════════════════════════════════════════════════
  // FIN
  // ════════════════════════════════════════════════════════════════
  await pool.end();
  console.log("\n🎉 Migración unificada completa");
  console.log("   Tablas: admins · perfiles · violencias_vistas · solicitudes");
  console.log("           estadisticas · lugares · numeros_emergencia");
  console.log(`   Seeds:  ${lugares.length} lugares · ${emergencias.length} emergencias · 1 admin`);
}

migrate().catch(err => {
  console.error("❌ Error en migración:", err.message);
  process.exit(1);
});