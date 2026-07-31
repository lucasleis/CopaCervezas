-- =============================================================================
-- Seed: Estilos propios de Copa Argentina de Cervezas (org_id != NULL)
-- Fuente: documento de formulario de inscripción provisto por el cliente.
-- Idempotente: usa ON CONFLICT (org_id, codigo) WHERE org_id IS NOT NULL DO NOTHING.
-- =============================================================================

INSERT INTO estilos (id, org_id, codigo, nombre, subestilo_de, requiere_info_adicional)
VALUES
  ('00000000-0000-0000-0002-000000000001',
   (SELECT id FROM organizaciones WHERE name = 'Copa Argentina de Cervezas' LIMIT 1),
   '999A', 'Dorada Pampeana', NULL, false),
  ('00000000-0000-0000-0002-000000000002',
   (SELECT id FROM organizaciones WHERE name = 'Copa Argentina de Cervezas' LIMIT 1),
   '999B', 'IPA Argenta', NULL, true),
  ('00000000-0000-0000-0002-000000000003',
   (SELECT id FROM organizaciones WHERE name = 'Copa Argentina de Cervezas' LIMIT 1),
   '999C', 'Catharina Sour', NULL, true),
  ('00000000-0000-0000-0002-000000000004',
   (SELECT id FROM organizaciones WHERE name = 'Copa Argentina de Cervezas' LIMIT 1),
   '999D', 'Cervezas Colaborativas', NULL, true),
  ('00000000-0000-0000-0002-000000000005',
   (SELECT id FROM organizaciones WHERE name = 'Copa Argentina de Cervezas' LIMIT 1),
   '999E', 'Malvinas / No me Olvides', NULL, true)
ON CONFLICT (org_id, codigo) WHERE org_id IS NOT NULL DO NOTHING;
