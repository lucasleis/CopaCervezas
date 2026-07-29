CREATE TYPE estado_asignacion_enum AS ENUM ('pendiente', 'en_curso', 'completado');

CREATE TABLE asignaciones_juez (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    vuelo_id UUID NOT NULL REFERENCES vuelos(id),
    estado estado_asignacion_enum NOT NULL DEFAULT 'pendiente',
    es_steward BOOLEAN NOT NULL DEFAULT false,
    generada_automaticamente BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(usuario_id, vuelo_id)
);

CREATE INDEX idx_asignaciones_juez_usuario_id ON asignaciones_juez(usuario_id);
CREATE INDEX idx_asignaciones_juez_vuelo_id ON asignaciones_juez(vuelo_id);
