CREATE TABLE grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicion_id UUID NOT NULL REFERENCES ediciones(id),
    nombre TEXT NOT NULL,
    cant_rondas INT NOT NULL CHECK (cant_rondas IN (1, 2, 3)),
    orden INT NOT NULL,
    bos_flight TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grupos_edicion_id ON grupos(edicion_id);
