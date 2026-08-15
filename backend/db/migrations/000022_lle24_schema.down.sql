-- Restaurar estado_pago en cervecerias
ALTER TABLE cervecerias ADD COLUMN estado_pago estado_pago_enum NOT NULL DEFAULT 'pendiente';

-- Eliminar orden de asignaciones_juez
ALTER TABLE asignaciones_juez DROP COLUMN orden;

-- Eliminar columnas de muestras (estado_pago, snapshots)
ALTER TABLE muestras
    DROP COLUMN estado_pago,
    DROP COLUMN estilo_nombre_snapshot,
    DROP COLUMN estilo_codigo_snapshot;

-- Eliminar columnas de ediciones
ALTER TABLE ediciones
    DROP COLUMN cantidad_botellas_por_muestra,
    DROP COLUMN guia_estilos_id;

-- Restaurar índices de estilos (drop nuevos, crear viejos)
DROP INDEX estilo_codigo_guia_org_unique;
DROP INDEX estilo_codigo_guia_unique;
CREATE UNIQUE INDEX estilo_codigo_global_unique ON estilos (codigo) WHERE org_id IS NULL;
CREATE UNIQUE INDEX estilo_codigo_org_unique ON estilos (org_id, codigo) WHERE org_id IS NOT NULL;

-- Eliminar es_personalizado y guia_id de estilos
ALTER TABLE estilos
    DROP COLUMN es_personalizado,
    DROP COLUMN guia_id;

-- Drop tabla guia_estilos
DROP TABLE guia_estilos;

-- NOTA: no es posible revertir "ALTER TYPE estado_edicion_enum ADD VALUE 'devolucion'"
-- de forma nativa en PostgreSQL (no existe DROP VALUE para enums). Si este down se
-- ejecuta, el valor 'devolucion' queda en el tipo aunque el resto del schema se revierta.
-- Revertirlo requeriría recrear el tipo desde cero (rename + create + cast de columnas
-- dependientes), lo cual está fuera del alcance de este rollback y se deja documentado.
