CREATE TABLE codigos_descuento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicion_id UUID NOT NULL REFERENCES ediciones(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    descuento_porcentaje NUMERIC(5,2) NOT NULL,
    max_usos INT,
    usos_actuales INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(edicion_id, codigo)
);

CREATE INDEX idx_codigos_descuento_edicion_id ON codigos_descuento(edicion_id);
