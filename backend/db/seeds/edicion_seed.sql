-- Seed: Copa Argentina 2027
-- Requiere auth_seed.sql aplicado primero

INSERT INTO ediciones (id, org_id, nombre, anio, estado, fecha_inicio_inscripcion, fecha_fin_inscripcion, fecha_evento, max_muestras_por_cerveceria) VALUES
  ('dddddddd-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Copa Argentina de Cervezas 2027',
   2027,
   'config',
   '2027-01-01 00:00:00+00',
   '2027-03-31 23:59:59+00',
   '2027-05-15 10:00:00+00',
   3);

INSERT INTO precios_inscripcion (edicion_id, nombre, precio, fecha_desde, fecha_hasta) VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'Early Bird', 4500.00, '2027-01-01 00:00:00+00', '2027-02-28 23:59:59+00'),
  ('dddddddd-0000-0000-0000-000000000001', 'Regular', 6000.00, '2027-03-01 00:00:00+00', '2027-03-31 23:59:59+00');

INSERT INTO lugares_entrega (edicion_id, nombre, direccion, ciudad, provincia, horarios) VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'Sede Central', 'Av. Corrientes 1234', 'Buenos Aires', 'Buenos Aires', 'Lun-Vie 10:00-18:00');

INSERT INTO codigos_descuento (edicion_id, codigo, descuento_porcentaje, max_usos, activo) VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'EARLY2027', 10.00, 50, true);
