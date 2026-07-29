CREATE TABLE evaluaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    juez_id UUID NOT NULL REFERENCES usuarios(id),
    muestra_id UUID NOT NULL REFERENCES muestras(id),
    vuelo_id UUID NOT NULL REFERENCES vuelos(id),
    puntajes JSONB,
    comentarios TEXT,
    comentario_final TEXT,
    avanza BOOLEAN,
    editada_por_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(juez_id, muestra_id, vuelo_id)
);

CREATE INDEX idx_evaluaciones_juez_id ON evaluaciones(juez_id);
CREATE INDEX idx_evaluaciones_muestra_id ON evaluaciones(muestra_id);
CREATE INDEX idx_evaluaciones_vuelo_id ON evaluaciones(vuelo_id);
