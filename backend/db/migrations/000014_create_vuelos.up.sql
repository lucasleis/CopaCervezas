CREATE TYPE estado_vuelo_enum AS ENUM ('pendiente', 'en_curso', 'completado');

CREATE TABLE vuelos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos(id),
    numero_ronda INT NOT NULL,
    orden INT NOT NULL,
    estado estado_vuelo_enum NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vuelo_muestras (
    vuelo_id UUID NOT NULL REFERENCES vuelos(id),
    muestra_id UUID NOT NULL REFERENCES muestras(id),
    orden INT NOT NULL,
    PRIMARY KEY (vuelo_id, muestra_id)
);

CREATE INDEX idx_vuelos_grupo_id ON vuelos(grupo_id);
CREATE INDEX idx_vuelo_muestras_muestra_id ON vuelo_muestras(muestra_id);
