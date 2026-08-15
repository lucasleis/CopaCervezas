ALTER TABLE usuarios DROP COLUMN IF EXISTS email_verificado;

DROP TABLE IF EXISTS tokens_uso_unico;
DROP TYPE IF EXISTS token_tipo_enum;
