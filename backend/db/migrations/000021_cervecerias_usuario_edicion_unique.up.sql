ALTER TABLE cervecerias
  ADD CONSTRAINT cervecerias_usuario_edicion_unique UNIQUE (usuario_id, edicion_id);
