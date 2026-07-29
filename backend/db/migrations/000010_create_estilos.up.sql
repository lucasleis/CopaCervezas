CREATE TABLE estilos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    subestilo_de UUID REFERENCES estilos(id),
    requiere_info_adicional BOOLEAN NOT NULL DEFAULT false,
    campos_info_adicional JSONB,
    UNIQUE(codigo)
);

CREATE INDEX idx_estilos_subestilo_de ON estilos(subestilo_de);
