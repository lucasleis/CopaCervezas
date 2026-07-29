CREATE TABLE lugares_entrega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edicion_id UUID NOT NULL REFERENCES ediciones(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    provincia TEXT NOT NULL,
    horarios TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lugares_entrega_edicion_id ON lugares_entrega(edicion_id);
