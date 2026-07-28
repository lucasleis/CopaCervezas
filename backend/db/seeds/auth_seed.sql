-- Auth seed: 1 org, 3 usuarios (admin, judge, brewery)
-- Passwords: admin123, judge123, brewery123

INSERT INTO organizaciones (id, name) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Copa Argentina de Cervezas');

INSERT INTO usuarios (id, email, password_hash) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'admin@copa.com', '$2a$10$xpuZ7CSqrGzTJMdn7tOr5.wavRGY76vd7w0el4Uwhjh3S68.fYfU6'),
  ('cccccccc-0000-0000-0000-000000000002', 'judge@copa.com', '$2a$10$BxxQ2S.SvxG7E38ct3SA7ODLtC56cVbxYeunr2M4n6TAZoGm5FU.W'),
  ('cccccccc-0000-0000-0000-000000000003', 'brewery@copa.com', '$2a$10$vsatiPX/6hhpxpKSLXQuMeVb2o4bO.5xH3yR4TQrIBRCCyl8lXxZi');

INSERT INTO usuario_organizacion (usuario_id, org_id, rol) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'admin'),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'judge'),
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'brewery');
