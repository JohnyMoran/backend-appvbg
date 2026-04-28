-- fix_solicitudes.sql
-- Ejecutar UNA VEZ en la base de datos para sincronizar la tabla solicitudes

ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS agresor             BOOLEAN DEFAULT false;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS amenaza_hijos       BOOLEAN DEFAULT false;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS derechos_vulnerados BOOLEAN DEFAULT false;

ALTER TABLE solicitudes DROP COLUMN IF EXISTS apoyo_psicologico;
ALTER TABLE solicitudes DROP COLUMN IF EXISTS hablar_con_policia;
ALTER TABLE solicitudes DROP COLUMN IF EXISTS proteccion;
ALTER TABLE solicitudes DROP COLUMN IF EXISTS asesoria_legal;
ALTER TABLE solicitudes DROP COLUMN IF EXISTS apoyo_ninos;

-- Verificar
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'solicitudes' ORDER BY ordinal_position;
