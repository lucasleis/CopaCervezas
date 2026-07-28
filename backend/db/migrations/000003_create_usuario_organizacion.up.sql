CREATE TYPE rol_enum AS ENUM ('admin', 'judge', 'brewery');

CREATE TABLE usuario_organizacion (
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
    rol rol_enum NOT NULL,
    PRIMARY KEY (usuario_id, org_id)
);
