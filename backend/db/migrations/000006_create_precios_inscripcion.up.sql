CREATE TABLE precios_inscripcion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicion_id UUID NOT NULL REFERENCES ediciones(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    fecha_desde TIMESTAMPTZ,
    fecha_hasta TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_precios_inscripcion_edicion_id ON precios_inscripcion(edicion_id);
