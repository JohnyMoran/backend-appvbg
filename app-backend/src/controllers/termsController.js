// src/controllers/termsController.js

exports.getTerms = (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Términos y Condiciones</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --lavender-50:  #f5f3ff;
      --lavender-100: #ede9fe;
      --lavender-400: #a78bfa;
      --lavender-600: #7c3aed;
      --neutral-600:  #4b5563;
      --neutral-800:  #1f2937;
      --warning:      #d97706;
      --white:        #ffffff;
    }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background-color: var(--lavender-50);
      color: var(--neutral-800);
      line-height: 1.6;
      padding: 0;
      min-height: 100vh;
    }

    header {
      background: var(--white);
      border-bottom: 3px solid var(--lavender-600);
      padding: 28px 24px 20px;
      text-align: center;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.08);
    }

    header h1 {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--lavender-600);
      letter-spacing: -0.5px;
    }

    header p.subtitle {
      font-size: 0.85rem;
      color: var(--neutral-600);
      margin-top: 4px;
    }

    main {
      max-width: 760px;
      margin: 32px auto;
      padding: 0 20px 60px;
    }

    .card {
      background: var(--white);
      border-radius: 12px;
      padding: 28px 28px 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .card h2 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--lavender-600);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card p {
      color: var(--neutral-600);
      font-size: 0.95rem;
      line-height: 1.75;
      margin-bottom: 12px;
    }

    .card p:last-child { margin-bottom: 0; }

    .highlight {
      background: var(--lavender-50);
      border-left: 4px solid var(--lavender-600);
      border-radius: 0 8px 8px 0;
      padding: 14px 16px;
      margin-top: 12px;
      color: var(--neutral-600);
      font-size: 0.92rem;
      line-height: 1.7;
    }

    .warning-box {
      background: #fffbeb;
      border: 1.5px solid #fcd34d;
      border-radius: 10px;
      padding: 18px 20px;
      text-align: center;
      margin-top: 8px;
    }

    .warning-box p {
      color: var(--warning);
      font-weight: 600;
      font-size: 0.92rem;
      line-height: 1.6;
      margin: 0;
    }

    footer {
      text-align: center;
      padding: 24px 20px 40px;
      color: var(--neutral-600);
      font-size: 0.8rem;
    }

    @media (max-width: 500px) {
      header h1 { font-size: 1.3rem; }
      .card { padding: 20px 18px; }
      main { padding: 0 12px 40px; }
    }
  </style>
</head>
<body>

  <header>
    <h1>Términos y Condiciones</h1>
    <p class="subtitle">Última actualización: ${new Date().getFullYear()}</p>
  </header>

  <main>

    <div class="card">
      <p>
        Al usar esta aplicación, aceptas este acuerdo. Esta es una herramienta
        informativa que muestra los servicios disponibles y brinda datos de los
        lugares y números de contacto a los que puedes acudir si estás viviendo
        una situación de violencia.
      </p>
      <p>
        La aplicación guía de manera general sobre cómo acceder a estos
        servicios, pero no presta atención directa ni reemplaza a las
        autoridades competentes.
      </p>
    </div>

    <div class="card">
      <h2>📊 Información sociodemográfica</h2>
      <p>
        La aplicación podrá solicitar información de caracterización
        sociodemográfica con el fin de mejorar el servicio que ofrece. Estos
        datos se utilizan únicamente con fines estadísticos y de mejora
        institucional.
      </p>
      <div class="highlight">
        No se solicitan datos que permitan la identificación personal de la
        usuaria, como nombres, números de documento, direcciones exactas u
        otra información que pueda identificarla individualmente.
      </div>
    </div>

    <div class="card">
      <h2>📍 Ubicación</h2>
      <p>
        Si decides activar la ubicación, esta se utilizará únicamente para
        mostrarte los servicios más cercanos y para trazar rutas en el mapa
        desde tu ubicación actual.
      </p>
      <p>
        La ubicación no será almacenada en la aplicación y podrás desactivar
        este permiso en cualquier momento desde la configuración de tu
        dispositivo.
      </p>
    </div>

    <div class="card">
      <h2>📞 Contactos y servicios externos</h2>
      <p>
        La aplicación puede mostrar números telefónicos, enlaces externos y
        un mensaje preelaborado que podrás usar si decides comunicarte con
        un contacto de tu confianza en caso de requerir ayuda.
      </p>
      <p>
        Estos permisos solo se activarán si tú los autorizas, y las llamadas,
        mensajes o interacciones con servicios externos dependerán
        exclusivamente de tu acción directa.
      </p>
    </div>

    <div class="card">
      <h2>⚖️ Responsabilidad</h2>
      <p>
        La información proporcionada es de carácter general y no genera
        responsabilidad sobre la atención o respuesta que brinden las entidades
        externas responsables de rutas de atención a violencias basadas en
        género.
      </p>
    </div>

    <div class="card">
      <div class="highlight">
        Al seleccionar la opción "Acepto términos y condiciones", confirmas
        que has leído y comprendido este acuerdo, y que aceptas sus condiciones
        de uso y tratamiento de la información.
      </div>
      <div class="warning-box" style="margin-top:16px;">
        <p>
          ⚠️ Si no estás de acuerdo con estos términos, puedes cerrar la
          aplicación y no continuar con su uso.
        </p>
      </div>
    </div>

  </main>

  <footer>
    <p>© ${new Date().getFullYear()} · Todos los derechos reservados</p>
  </footer>

</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
};