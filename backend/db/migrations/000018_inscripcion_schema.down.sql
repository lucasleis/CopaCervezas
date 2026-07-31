ALTER TABLE cervecerias
  DROP COLUMN estado_pago;

DROP TYPE estado_pago_enum;

DROP INDEX estilo_codigo_org_unique;
DROP INDEX estilo_codigo_global_unique;

ALTER TABLE estilos ADD CONSTRAINT estilos_codigo_key UNIQUE (codigo);

ALTER TABLE estilos
  DROP COLUMN org_id;

ALTER TABLE muestras
  DROP COLUMN aprobada,
  DROP COLUMN comentarios_adicionales,
  DROP COLUMN cuenta_premio_mejor_cerveceria;
