UPDATE estilos SET
  requiere_info_adicional = false,
  campos_info_adicional = NULL
WHERE org_id IS NULL
  AND requiere_info_adicional = true;
