CREATE TYPE token_tipo_enum AS ENUM (
    'verificacion_email',
    'recuperacion_password',
    'invitacion'
);

CREATE TABLE tokens_uso_unico (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo        token_tipo_enum NOT NULL,
    token_hash  TEXT NOT NULL UNIQUE,
    expira_at   TIMESTAMPTZ NOT NULL,
    usado       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tokens_uso_unico_usuario_id ON tokens_uso_unico(usuario_id);
CREATE INDEX idx_tokens_uso_unico_token_hash ON tokens_uso_unico(token_hash);

ALTER TABLE usuarios ADD COLUMN email_verificado BOOLEAN NOT NULL DEFAULT FALSE;
