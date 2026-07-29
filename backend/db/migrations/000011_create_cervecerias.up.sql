CREATE TABLE cervecerias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    edicion_id UUID NOT NULL REFERENCES ediciones(id),
    org_id UUID NOT NULL REFERENCES organizaciones(id),
    nombre_comercial TEXT NOT NULL,
    logo_url TEXT,
    direccion TEXT,
    contacto TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cervecerias_usuario_id ON cervecerias(usuario_id);
CREATE INDEX idx_cervecerias_edicion_id ON cervecerias(edicion_id);
CREATE INDEX idx_cervecerias_org_id ON cervecerias(org_id);
