require("dotenv").config();
const pool = require("../../src/config/db");

async function migrate() {
  console.log("🔄 Creando tablas lugares y numeros_emergencia...");

  await pool.query(`
    -- ── Lugares (placesData.js → BD) ────────────────────────────
    CREATE TABLE IF NOT EXISTS lugares (
      id           VARCHAR(80)   PRIMARY KEY,   -- mismo id del archivo estático
      nombre       VARCHAR(200)  NOT NULL,
      ciudad       VARCHAR(50)   NOT NULL CHECK (ciudad IN ('Tumaco','Buenaventura')),
      tipo         VARCHAR(40)   NOT NULL CHECK (tipo IN ('salud','protección','justicia','ministerio_publico')),
      direccion    TEXT,
      telefono     TEXT,
      horario      TEXT,
      descripcion  TEXT,
      icono        VARCHAR(60)   DEFAULT 'default',
      latitud      DECIMAL(12,8),
      longitud     DECIMAL(12,8),
      activo       BOOLEAN       DEFAULT true,
      creado_en    TIMESTAMP     DEFAULT NOW(),
      actualizado_en TIMESTAMP   DEFAULT NOW()
    );

    -- ── Números de emergencia (emergencyData.js → BD) ────────────
    CREATE TABLE IF NOT EXISTS numeros_emergencia (
      id           VARCHAR(20)   PRIMARY KEY,   -- mismo id del archivo estático
      nombre       VARCHAR(120)  NOT NULL,
      numero       VARCHAR(30)   NOT NULL,
      horario      VARCHAR(60)   DEFAULT '24 horas',
      descripcion  TEXT,
      icono_nombre VARCHAR(60)   DEFAULT 'alert-circle-outline',  -- nombre Ionicons
      prioridad    BOOLEAN       DEFAULT false,
      activo       BOOLEAN       DEFAULT true,
      orden        INTEGER       DEFAULT 99,
      creado_en    TIMESTAMP     DEFAULT NOW(),
      actualizado_en TIMESTAMP   DEFAULT NOW()
    );

    -- ── Índices ──────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_lugares_tipo   ON lugares(tipo);
    CREATE INDEX IF NOT EXISTS idx_lugares_ciudad ON lugares(ciudad);
    CREATE INDEX IF NOT EXISTS idx_lugares_activo ON lugares(activo);
    CREATE INDEX IF NOT EXISTS idx_emergencia_orden ON numeros_emergencia(orden, prioridad);
  `);

  console.log("✅ Tablas creadas");

  // ── SEED: Lugares (todos los del placesData.js) ───────────────
  const lugares = [
    // JUSTICIA ────────────────────────────────────────────────────
    { id:"fiscalia_tumaco", nombre:"Fiscalía General de la Nación", ciudad:"Tumaco", tipo:"justicia",
      direccion:"Avenida de los Estudiantes Edificio Capid",
      telefono:"122\n018000919748",
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-6:00pm",
      descripcion:"Se encarga de investigar los posibles delitos, proteger a las víctimas y pedir medidas de protección para las mujeres que sufran de violencia, dentro o fuera de su familia.",
      icono:"justicia", latitud:1.8189894663045683, longitud:-78.7624061865076 },
    { id:"fiscalia_buenaventura", nombre:"Fiscalía General de la Nación", ciudad:"Buenaventura", tipo:"justicia",
      direccion:"Calle 9 No 2 – 83",
      telefono:"122\n018000919748",
      horario:"Lunes a Viernes\n8:00am-12:00m\n1:00pm-5:00pm",
      descripcion:"Se encarga de investigar los posibles delitos, proteger a las víctimas y pedir medidas de protección para las mujeres que sufran de violencia, dentro o fuera de su familia.",
      icono:"justicia", latitud:3.8916622258165905, longitud:-77.07791747116414 },
    { id:"cti_tumaco", nombre:"Policía Judicial (CTI, SIJIN, DIJIN)", ciudad:"Tumaco", tipo:"justicia",
      direccion:"Esquina Avenida Férrea y Calle Mosquera",
      telefono:"3203024362",
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Apoya a la fiscalía en la investigación de posibles delitos. Se encargan de recibir quejas y denuncias, realizan investigaciones urgentes, y si la víctima necesita un examen médico, la acompañan al centro de salud.",
      icono:"justicia", latitud:1.8086993080773277, longitud:-78.76656535582066 },
    { id:"cti_buenaventura", nombre:"Policía Judicial (CTI, SIJIN, DIJIN)", ciudad:"Buenaventura", tipo:"justicia",
      direccion:"C 19 E N° 6 - 90",
      telefono:"3203046448",
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Apoya a la fiscalía en la investigación de posibles delitos.",
      icono:"justicia", latitud:3.8856077515648635, longitud:-77.0599214 },
    { id:"medicina_legal_tumaco", nombre:"Instituto Nacional de Medicina Legal y Ciencias Forenses", ciudad:"Tumaco", tipo:"justicia",
      direccion:"Ciudadela Sector Nuevo Horizonte Enseguida del Centro Hospital Divino Niño",
      telefono:"602 8274174\n602 3980041",
      horario:"Lunes a Domingo\n7:00am-7:00pm\nSabados, Domingos y Festivos\n7:00am-1:00pm",
      descripcion:"Brindar apoyo técnico y científico a la justicia cuando las autoridades lo soliciten.",
      icono:"justicia", latitud:1.7888627283933127, longitud:-78.78712048465654 },
    { id:"medicina_legal_buenaventura", nombre:"Instituto Nacional de Medicina Legal y Ciencias Forenses", ciudad:"Buenaventura", tipo:"justicia",
      direccion:"Av. Simón Bolívar No.17-40",
      telefono:"602 8274174\n602 3980041",
      horario:"Lunes a Domingo\n7:00am-7:00pm\nSabados, Domingos y Festivos\n7:00am-1:00pm",
      descripcion:"Brindar apoyo técnico y científico a la justicia cuando las autoridades lo soliciten.",
      icono:"justicia", latitud:3.881665598582891, longitud:-77.06437609444673 },

    // PROTECCIÓN ──────────────────────────────────────────────────
    { id:"comisaria_tumaco", nombre:"Comisaría de Familia", ciudad:"Tumaco", tipo:"protección",
      direccion:"Alcaldía Municipal de Tumaco, Cl. 11 #9-2",
      telefono:"(572)7276156",
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-6:00pm",
      descripcion:"Establece medidas para cuidar, proteger y ayudar a las mujeres que son víctimas de violencia dentro de la familia.",
      icono:"proteccion", latitud:1.807628096720489, longitud:-78.76544270423693 },
    { id:"comisaria_buenaventura", nombre:"Comisaría de Familia", ciudad:"Buenaventura", tipo:"protección",
      direccion:"Calle 4 sur Cra 73 esquina, Barrio Nueva Granada",
      telefono:"3170820627",
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Establece medidas para cuidar, proteger y ayudar a las mujeres que son víctimas de violencia dentro de la familia.",
      icono:"proteccion", latitud:3.8636936635472394, longitud:-76.99349771772933 },
    { id:"policia_tumaco", nombre:"Policía Nacional - Tumaco", ciudad:"Tumaco", tipo:"protección",
      direccion:"Esquina de la Avenida Férrea y la Calle Mosquera",
      telefono:"3203024362",
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Realiza tareas muy importantes para proteger y ayudar a las víctimas y para recibir denuncias.",
      icono:"proteccion", latitud:1.808786449015912, longitud:-78.76618319074454 },
    { id:"policia_buenaventura", nombre:"Policía Nacional - Buenaventura", ciudad:"Buenaventura", tipo:"protección",
      direccion:"C 19 E N° 6 - 90",
      telefono:"3203024362",
      horario:"Lunes a Viernes\n8:00am-12:00m\n2:00pm-5:00pm",
      descripcion:"Realiza tareas muy importantes para proteger y ayudar a las víctimas y para recibir denuncias.",
      icono:"proteccion", latitud:3.8858646516974926, longitud:-77.05966390793913 },
    { id:"icbf_tumaco", nombre:"Instituto de Bienestar Familiar", ciudad:"Tumaco", tipo:"protección",
      direccion:"Parque Colón, San Andrés de Tumaco - Nariño",
      telefono:"601 4377630",
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Ayuda a garantizar la seguridad de los menores de edad.",
      icono:"proteccion", latitud:1.8067567142886514, longitud:-78.76358307116412 },
    { id:"icbf_buenaventura", nombre:"Instituto de Bienestar Familiar", ciudad:"Buenaventura", tipo:"protección",
      direccion:"Avenida Simón Bolívar Km 9 sobre la vía de ingreso Barrio",
      telefono:"3215744988",
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Ayuda a garantizar la seguridad de los menores de edad.",
      icono:"proteccion", latitud:3.880748170538906, longitud:-77.01042880304402 },

    // MINISTERIO PÚBLICO ──────────────────────────────────────────
    { id:"procuraduria_general_de_nacion_tumaco", nombre:"Procuraduría General de Nación", ciudad:"Tumaco", tipo:"ministerio_publico",
      direccion:"Avenida Los Estudiantes, Sector La Y - TUMACO (NARINO)",
      telefono:"(572) 5878750",
      horario:"Lunes a Viernes\n8:00am-12:00pm\n1:00pm-5:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:1.8162992212235298, longitud:-78.7636289580418 },
    { id:"procuraduria_general_de_nacion_buenaventura", nombre:"Procuraduría General de Nación", ciudad:"Buenaventura", tipo:"ministerio_publico",
      direccion:"Calle 6 # 5 - 11",
      telefono:"3215744988",
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:3.889324893936952, longitud:-77.07458247952376 },
    { id:"defensoria_del_pueblo_tumaco", nombre:"Defensoría del Pueblo", ciudad:"Tumaco", tipo:"ministerio_publico",
      direccion:"Barrio la Florida La Rada T-35-20 Casa 1 via al aeropuerto",
      telefono:"3223866321",
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:1.816355213407996, longitud:-78.75348661534346 },
    { id:"defensoria_del_pueblo_buenaventura", nombre:"Defensoría del Pueblo", ciudad:"Buenaventura", tipo:"ministerio_publico",
      direccion:"Calle 1 No. 7 51 Barrio Pueblo Nuevo",
      telefono:"",
      horario:"Lunes a Viernes\n8:00am-5:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:3.884417202372204, longitud:-77.07540222883586 },
    { id:"personería_municipal_tumaco", nombre:"Personería Municipal", ciudad:"Tumaco", tipo:"ministerio_publico",
      direccion:"Cl. 11 #9-2, Tumaco, San Andres de Tumaco, Nariño",
      telefono:"(572)7271201",
      horario:"Martes a Viernes\n8:00am-12:30pm\n2:00pm-6:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:1.8076602672107762, longitud:-78.76582894232826 },
    { id:"personería_municipal_buenaventura", nombre:"Personería Municipal", ciudad:"Buenaventura", tipo:"ministerio_publico",
      direccion:"Calle segunda edificio el CAD, piso # 10",
      telefono:"3116073104\n2978928",
      horario:"8:00am-12:00am\n2:00pm-6:00pm",
      descripcion:"Debe promover, cuidar y defender los derechos de las mujeres.",
      icono:"ministerio_publico", latitud:3.889324893936952, longitud:-78.76582894232826 },

    // SALUD ───────────────────────────────────────────────────────
    { id:"hospital_san_andres", nombre:"Hospital San Andrés E.S.E.", ciudad:"Tumaco", tipo:"salud",
      direccion:"Km 23 Inguapi del Carmen",
      telefono:"3203757591",
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:1.67234769600039, longitud:-78.75234138465652 },
    { id:"ips_puente_medio", nombre:"IPS Puente del Medio", ciudad:"Tumaco", tipo:"salud",
      direccion:"sede 1: Calle Santander (diagonal a Cootranar)\nsede 2: Avenida Los Estudiantes (antigua Clínica Miramar).",
      telefono:"7271556",
      horario:"24 horas",
      descripcion:"Entidad de segundo nivel de complejidad con sedes en la Calle Santander y Avenida Los Estudiantes.",
      icono:"salud", latitud:1.8077449316847172, longitud:-78.76428676931305 },
    { id:"divino_nino", nombre:"Centro Hospital Divino Niño E.S.E.", ciudad:"Tumaco", tipo:"salud",
      direccion:"Barrio Nuevo Horizonte",
      telefono:"3027270404\n927271556",
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:1.788207639589229, longitud:-78.78844703862607 },
    { id:"ips_los_angeles", nombre:"IPS Los Ángeles", ciudad:"Tumaco", tipo:"salud",
      direccion:"Calle 11 #9-2, Tumaco, San Andres de Tumaco, Nariño",
      telefono:"7276712\n3175383956\n3205041354",
      horario:"7:00am-6:00pm",
      descripcion:"Brindar apoyo científico y técnico a la justicia cuando lo pidan fiscales, jueces y la policía judicial.",
      icono:"salud", latitud:1.8135852452074122, longitud:-78.76634640553385 },
    { id:"hospital_luis_ablanque_independencia", nombre:"Centro de Salud Independencia (Luis Ablanque De La Plata)", ciudad:"Buenaventura", tipo:"salud",
      direccion:"# 57ASN, Cl. 6 #120, Buenaventura, Valle del Cauca",
      telefono:"315 5476004",
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.8769602550930453, longitud:-77.00452831305293 },
    { id:"hospital_luis_ablanque_bellavista", nombre:"Centro de Salud Bellavista (Hospital Luis Ablanque de la Plata)", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Cra. 47 #22 a 2-84, Buenaventura, Valle del Cauca",
      telefono:"2437441",
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.8801200620969247, longitud:-77.02059020262098 },
    { id:"hospital_luis_ablanque_distrital", nombre:"Hospital Distrital Luis Ablanque De La Plata", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Cl. 5 #18-24, Buenaventura, Valle del Cauca",
      telefono:"",
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.8802699214913403, longitud:-77.02046145659054 },
    { id:"clinica_santa_sofia", nombre:"Clínica Santa Sofía del Pacífico", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Cra. 47 #42, Buenaventura, Valle del Cauca",
      telefono:"22421880",
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.8808727013535913, longitud:-77.02026621485183 },
    { id:"hospital_luis_ablanque_modelo", nombre:"Puesto de Salud El Modelo (Hospital Luis Ablanque De La Plata)", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Cl. 6 #1902, Buenaventura, Valle del Cauca",
      telefono:"",
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.896968244035304, longitud:-77.0302609494981 },
    { id:"hospital_departamental_buenaventura", nombre:"Hospital Departamental De Buenaventura E.s.e", ciudad:"Buenaventura", tipo:"salud",
      direccion:"Av. Simón Bolívar #17-40, Buenaventura, Valle del Cauca",
      telefono:"",
      horario:"24 horas",
      descripcion:"Dar atención tanto física como psicológica a la persona.",
      icono:"salud", latitud:3.87618058199835, longitud:-77.00463557473458 },
  ];

  for (const l of lugares) {
    await pool.query(`
      INSERT INTO lugares (id, nombre, ciudad, tipo, direccion, telefono, horario, descripcion, icono, latitud, longitud)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO NOTHING
    `, [l.id, l.nombre, l.ciudad, l.tipo, l.direccion||null, l.telefono||null,
        l.horario||null, l.descripcion||null, l.icono||'default', l.latitud||null, l.longitud||null]);
  }
  console.log(`✅ ${lugares.length} lugares importados`);

  // ── SEED: Números de emergencia (emergencyData.js) ────────────
  const emergencias = [
    { id:"e-1",  nombre:"Línea de Mujeres",               numero:"155",           horario:"24 horas", prioridad:true,  orden:1,  icono_nombre:"woman-outline",          descripcion:"Atención especializada a víctimas de violencia de género." },
    { id:"e-2",  nombre:"Línea Violencia Intrafamiliar",   numero:"141",           horario:"24 horas", prioridad:true,  orden:2,  icono_nombre:"home-outline",           descripcion:"Orientación y activación de rutas de atención en violencia intrafamiliar." },
    { id:"e-3",  nombre:"ICBF – Bienestar Familiar",       numero:"018000918080",  horario:"24 horas", prioridad:true,  orden:3,  icono_nombre:"people-outline",         descripcion:"Protección de niñas, niños y adolescentes víctimas de violencia." },
    { id:"e-4",  nombre:"Policía Infancia y Adolescencia", numero:"145",           horario:"24 horas", prioridad:false, orden:4,  icono_nombre:"shield-checkmark-outline",descripcion:"Protección policial para menores en situación de riesgo o abuso." },
    { id:"e-5",  nombre:"Fiscalía General",                numero:"122",           horario:"24 horas", prioridad:false, orden:5,  icono_nombre:"scale-outline",          descripcion:"Denuncia de delitos, incluidos los de violencia sexual y de género." },
    { id:"e-6",  nombre:"Emergencias Policía",             numero:"123",           horario:"24 horas", prioridad:false, orden:6,  icono_nombre:"alert-circle-outline",   descripcion:"Atención inmediata ante crímenes, amenazas o peligro inminente." },
    { id:"e-10", nombre:"Línea Amiga – Salud Mental",      numero:"106",           horario:"24 horas", prioridad:false, orden:7,  icono_nombre:"heart-outline",          descripcion:"Apoyo psicológico en crisis y prevención del suicidio." },
  ];

  for (const e of emergencias) {
    await pool.query(`
      INSERT INTO numeros_emergencia (id, nombre, numero, horario, descripcion, icono_nombre, prioridad, orden)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO NOTHING
    `, [e.id, e.nombre, e.numero, e.horario, e.descripcion, e.icono_nombre, e.prioridad, e.orden]);
  }
  console.log(`✅ ${emergencias.length} números de emergencia importados`);

  await pool.end();
  console.log("🎉 Migración de lugares completa");
}

migrate().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});