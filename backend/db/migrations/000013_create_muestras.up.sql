CREATE TABLE muestras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cerveceria_id UUID NOT NULL REFERENCES cervecerias(id),
    edicion_id UUID NOT NULL REFERENCES ediciones(id),
    org_id UUID NOT NULL REFERENCES organizaciones(id),
    estilo_id UUID NOT NULL REFERENCES estilos(id),
    grupo_id UUID REFERENCES grupos(id),
    nombre_comercial TEXT NOT NULL,
    info_adicional JSONB,
    cod_participante TEXT,
    cod_anonimo TEXT CHECK (cod_anonimo ~ '^\d{4}$'),
    asignacion_manual BOOLEAN NOT NULL DEFAULT false,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(edicion_id, cod_anonimo)
);

CREATE INDEX idx_muestras_cerveceria_id ON muestras(cerveceria_id);
CREATE INDEX idx_muestras_edicion_id ON muestras(edicion_id);
CREATE INDEX idx_muestras_org_id ON muestras(org_id);
CREATE INDEX idx_muestras_estilo_id ON muestras(estilo_id);
CREATE INDEX idx_muestras_grupo_id ON muestras(grupo_id);
CREATE INDEX idx_muestras_activa ON muestras(id) WHERE activa = true;
