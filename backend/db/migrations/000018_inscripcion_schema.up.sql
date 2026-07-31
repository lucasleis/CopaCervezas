-- MUESTRA: campos de inscripción
ALTER TABLE muestras
  ADD COLUMN cuenta_premio_mejor_cerveceria boolean NOT NULL DEFAULT false,
  ADD COLUMN comentarios_adicionales text,
  ADD COLUMN aprobada boolean NOT NULL DEFAULT false;

-- ESTILO: multi-tenancy de catálogo
ALTER TABLE estilos
  ADD COLUMN org_id uuid REFERENCES organizaciones(id);

ALTER TABLE estilos DROP CONSTRAINT estilos_codigo_key;

CREATE UNIQUE INDEX estilo_codigo_global_unique ON estilos (codigo) WHERE org_id IS NULL;
CREATE UNIQUE INDEX estilo_codigo_org_unique ON estilos (org_id, codigo) WHERE org_id IS NOT NULL;

-- CERVECERIA: estado de pago (stub manual, integración real en Módulo 7)
CREATE TYPE estado_pago_enum AS ENUM ('pendiente', 'pagado');

ALTER TABLE cervecerias
  ADD COLUMN estado_pago estado_pago_enum NOT NULL DEFAULT 'pendiente';
