CREATE TYPE tipo_medalla_enum AS ENUM ('oro', 'plata', 'bronce', 'sin_medalla');

CREATE TABLE medallas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    muestra_id UUID NOT NULL REFERENCES muestras(id),
    edicion_id UUID NOT NULL REFERENCES ediciones(id),
    grupo_id UUID NOT NULL REFERENCES grupos(id),
    tipo tipo_medalla_enum NOT NULL,
    UNIQUE(muestra_id)
);

CREATE INDEX idx_medallas_muestra_id ON medallas(muestra_id);
CREATE INDEX idx_medallas_edicion_id ON medallas(edicion_id);
CREATE INDEX idx_medallas_grupo_id ON medallas(grupo_id);
