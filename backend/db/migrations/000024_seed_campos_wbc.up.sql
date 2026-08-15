-- Seed de campos_info_adicional para el catálogo WBC (org_id IS NULL), según
-- listado provisto por Nicolás. Los códigos con letra de subestilo están en
-- minúscula en la DB ('8a', '18b', etc.), excepto la serie 999 que está en
-- mayúscula ('999A'..'999E').

-- 2. Fruit Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"fruta","label":"Fruta","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '2' AND org_id IS NULL;

-- 3. Fruit Wheat Beer (mismos campos que 2)
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"fruta","label":"Fruta","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '3' AND org_id IS NULL;

-- 4. Field Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"vegetal","label":"Vegetal","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '4' AND org_id IS NULL;

-- 5. Pumpkin/Squash or Pumpkin Spice Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_calabaza","label":"Tipo de Calabaza","tipo":"text","obligatorio":false,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '5' AND org_id IS NULL;

-- 6. Chili Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"chili","label":"Chili","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '6' AND org_id IS NULL;

-- 7. Herb and Spice Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"hierbas_especias","label":"Hierbas y/o Especias","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '7' AND org_id IS NULL;

-- 8a. Other Tea Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_te","label":"Tipo de Té","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '8a' AND org_id IS NULL;

-- 8b. Green Tea Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"te_verde","label":"Té verde","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '8b' AND org_id IS NULL;

-- 9. Chocolate Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"chocolate","label":"Chocolate","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '9' AND org_id IS NULL;

-- 10. Coffee Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"cafe","label":"Café","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '10' AND org_id IS NULL;

-- 11. Coffee Stout or Porter
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"cafe","label":"Café","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '11' AND org_id IS NULL;

-- 12. Dessert or Pastry Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_culinarios","label":"Ingredientes culinarios","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '12' AND org_id IS NULL;

-- 13a. Rye Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"centeno","label":"Centeno (tipo/porcentaje del grist)","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '13a' AND org_id IS NULL;

-- 14. Honey Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_miel","label":"Tipo de miel","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '14' AND org_id IS NULL;

-- 15. Classic Non-Alcohol Ale or Lager
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '15' AND org_id IS NULL;

-- 16. Hoppy Non-Alcohol Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '16' AND org_id IS NULL;

-- 17. Specialty Non-Alcohol Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '17' AND org_id IS NULL;

-- 18a. Session Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"abv_superior_5","label":"ABV superior a 5%","tipo":"boolean","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '18a' AND org_id IS NULL;

-- 18b. Belgian-Style Table Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base Clásico","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '18b' AND org_id IS NULL;

-- 18c. Belgian-Style Session Ale
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base Clásico","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '18c' AND org_id IS NULL;

-- 19. Session India Pale Ale
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"abv_superior_5","label":"ABV superior a 5%","tipo":"boolean","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '19' AND org_id IS NULL;

-- 21a. Other Strong Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '21a' AND org_id IS NULL;

-- 22a. Ginjo Beer or Sake-Yeast Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '22a' AND org_id IS NULL;

-- 22b. Wild Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '22b' AND org_id IS NULL;

-- 22c. Fresh Hop Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"tecnica_lupulado","label":"Técnica de lupulado","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"variedad_lupulo","label":"Variedad de lúpulo","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"estilo_base","label":"Estilo base","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '22c' AND org_id IS NULL;

-- 22d. Experimental Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"cualidad_experimental","label":"Cualidad Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '22d' AND org_id IS NULL;

-- 23. Experimental India Pale Ale
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"tipo_ipa","label":"Tipo de IPA","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '23' AND org_id IS NULL;

-- 24a. Historical Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"cualidad_historica","label":"Cualidad Histórica o Regional","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '24a' AND org_id IS NULL;

-- 25. Gluten-Free Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"fuentes_carbohidratos","label":"Fuentes de carbohidratos","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_fermentacion","label":"Tipo de Fermentación","tipo":"text","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '25' AND org_id IS NULL;

-- 26. American-Belgo-Style Ale
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '26' AND org_id IS NULL;

-- 27a. American-Style Sour Ale
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true},
    {"clave":"tipo_microorganismos","label":"Tipo de contribución de los microorganismos","tipo":"text","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '27a' AND org_id IS NULL;

-- 27b. Wood- and Barrel-Aged Sour Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_barrica","label":"Tipo de Barrica","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"metodo_acidificacion","label":"Método de acidificación","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '27b' AND org_id IS NULL;

-- 28. Fruited American-Style Sour Ale
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"fruta","label":"Fruta","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true},
    {"clave":"tipo_microorganismos","label":"Tipo de contribución de los microorganismos","tipo":"text","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '28' AND org_id IS NULL;

-- 29. Brett Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true},
    {"clave":"tipo_microorganismos","label":"Tipo de contribución de los microorganismos","tipo":"text","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '29' AND org_id IS NULL;

-- 30. Mixed-Culture Brett Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true},
    {"clave":"tipo_microorganismos","label":"Tipo de contribución de los microorganismos","tipo":"text","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '30' AND org_id IS NULL;

-- 31. Wood- and Barrel-Aged Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_barrica","label":"Tipo de Barrica","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '31' AND org_id IS NULL;

-- 32. Wood- and Barrel-Aged Strong Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_barrica","label":"Tipo de Barrica","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '32' AND org_id IS NULL;

-- 33. Wood- and Barrel-Aged Strong Stout
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_barrica","label":"Tipo de Barrica","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '33' AND org_id IS NULL;

-- 34. Wood- and Barrel-Aged Dessert or Pastry Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_barrica","label":"Tipo de Barrica","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_culinarios","label":"Ingredientes culinarios","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '34' AND org_id IS NULL;

-- 35. Fruited Wood- and Barrel-Aged Sour Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_barrica","label":"Tipo de Barrica","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"fruta","label":"Fruta","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"metodo_acidificacion","label":"Método de acidificación","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '35' AND org_id IS NULL;

-- 36a. Unfiltered European-Style Ale
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico","tipo":"textarea","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '36a' AND org_id IS NULL;

-- 36b. Unfiltered European-Style Lager
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '36b' AND org_id IS NULL;

-- 37a. Other Smoke Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_madera","label":"Tipo de madera/Otro","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '37a' AND org_id IS NULL;

-- 37b. Smoke Porter
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_madera","label":"Tipo de madera/Otro","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '37b' AND org_id IS NULL;

-- 37c. Bamberg-Style Weiss Rauchbier
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tipo_madera","label":"Tipo de madera/Otro","tipo":"text","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '37c' AND org_id IS NULL;

-- 41b. Other Hoppy Lager
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"variedades_lupulo","label":"Variedades de lúpulo","tipo":"text","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '41b' AND org_id IS NULL;

-- 68a. Leipzig-Style Gose
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":true,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '68a' AND org_id IS NULL;

-- 68b. Contemporary Gose
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '68b' AND org_id IS NULL;

-- 69b. Specialty Berliner-Style Weisse
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '69b' AND org_id IS NULL;

-- 77a. Specialty Saison
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '77a' AND org_id IS NULL;

-- 84a. Other Belgian-Style Strong Specialty Ale
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true},
    {"clave":"cualidad_historica_regional","label":"Cualidad Histórica o Regional","tipo":"text","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '84a' AND org_id IS NULL;

-- 84d. Other Belgian-Style Abbey Ale
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true},
    {"clave":"cualidad_historica_regional","label":"Cualidad Histórica o Regional","tipo":"text","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '84d' AND org_id IS NULL;

-- 85a. Belgian-Style Fruit Lambic
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"fruta","label":"Fruta","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '85a' AND org_id IS NULL;

-- 85b. Belgian-Style Fruit Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"fruta","label":"Fruta","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '85b' AND org_id IS NULL;

-- 94c. Aged Beer
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"tiempo_anejamiento","label":"Tiempo total y Proceso de Añejamiento","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"container","label":"Container (Botella, Inoxidable, etc)","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '94c' AND org_id IS NULL;

-- 999B. IPA Argenta
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"variedades_lupulo","label":"Variedades de lúpulo","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"parametros_relevantes","label":"Parámetros o dato relevante","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '999B' AND org_id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- 999C. Catharina Sour
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"fruta","label":"Fruta","tipo":"text","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true},
    {"clave":"tipo_microorganismos","label":"Tipo de contribución de los microorganismos","tipo":"text","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '999C' AND org_id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- 999D. Cervezas Colaborativas — único caso con visible_jueces:false
-- (fábricas participantes es un dato interno del organizador, no se muestra
-- a jueces).
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true},
    {"clave":"fabricas_participantes","label":"Fábricas participantes de la cerveza colaborativa","tipo":"textarea","obligatorio":true,"visible_jueces":false}
  ]'::jsonb
WHERE codigo = '999D' AND org_id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- 999E. Malvinas / No me Olvides
UPDATE estilos SET
  requiere_info_adicional = true,
  campos_info_adicional = '[
    {"clave":"estilo_base","label":"Indicar estilo Base - Detallar el estilo Clásico o Experimental","tipo":"textarea","obligatorio":true,"visible_jueces":true},
    {"clave":"ingredientes_especiales","label":"Ingredientes especiales o procesos","tipo":"textarea","obligatorio":false,"visible_jueces":true}
  ]'::jsonb
WHERE codigo = '999E' AND org_id = 'bbbbbbbb-0000-0000-0000-000000000001';
