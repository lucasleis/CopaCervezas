-- Corrección de estado_edicion_enum: falta 'devolucion' (ver 000009_fix_estado_enum).
-- No se referencia el valor nuevo en esta misma migración: Postgres no permite usar un
-- valor de enum recién agregado dentro de la misma transacción en la que se lo agrega.
ALTER TYPE estado_edicion_enum ADD VALUE 'devolucion' BEFORE 'cerrada';

-- 1. Tabla guia_estilos (nueva)
CREATE TABLE guia_estilos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    version TEXT,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO guia_estilos (nombre, version) VALUES
    ('World Beer Cup', '2024'),
    ('BJCP', '2021');

-- 2. Columna guia_id en estilos
ALTER TABLE estilos ADD COLUMN guia_id UUID REFERENCES guia_estilos(id);

UPDATE estilos SET guia_id = (SELECT id FROM guia_estilos WHERE nombre = 'World Beer Cup');

ALTER TABLE estilos ALTER COLUMN guia_id SET NOT NULL;

ALTER TABLE estilos ADD COLUMN es_personalizado BOOLEAN NOT NULL DEFAULT false;

DROP INDEX estilo_codigo_global_unique;
DROP INDEX estilo_codigo_org_unique;
CREATE UNIQUE INDEX estilo_codigo_guia_unique ON estilos (guia_id, codigo) WHERE org_id IS NULL;
CREATE UNIQUE INDEX estilo_codigo_guia_org_unique ON estilos (guia_id, org_id, codigo) WHERE org_id IS NOT NULL;

-- 3. Columnas en ediciones
ALTER TABLE ediciones
    ADD COLUMN guia_estilos_id UUID REFERENCES guia_estilos(id),
    ADD COLUMN cantidad_botellas_por_muestra INT NOT NULL DEFAULT 6;

-- 4. Columnas en muestras
ALTER TABLE muestras
    ADD COLUMN estilo_codigo_snapshot TEXT,
    ADD COLUMN estilo_nombre_snapshot TEXT,
    ADD COLUMN estado_pago estado_pago_enum NOT NULL DEFAULT 'pendiente';

-- 5. Columna en asignaciones_juez
ALTER TABLE asignaciones_juez ADD COLUMN orden INT;

-- 6. Eliminar estado_pago de cervecerias
ALTER TABLE cervecerias DROP COLUMN estado_pago;
