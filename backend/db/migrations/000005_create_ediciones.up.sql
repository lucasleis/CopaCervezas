CREATE TYPE estado_edicion_enum AS ENUM ('config', 'inscripcion', 'recepcion', 'cata', 'cerrada');

CREATE TABLE ediciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    anio INT NOT NULL,
    estado estado_edicion_enum NOT NULL DEFAULT 'config',
    fecha_inicio_inscripcion TIMESTAMPTZ,
    fecha_fin_inscripcion TIMESTAMPTZ,
    fecha_evento TIMESTAMPTZ,
    max_muestras_por_cerveceria INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ediciones_org_id ON ediciones(org_id);
