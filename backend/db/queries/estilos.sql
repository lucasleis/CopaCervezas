-- name: ListEstilos :many
SELECT id, org_id, codigo, nombre, subestilo_de, requiere_info_adicional, campos_info_adicional
FROM estilos
WHERE org_id IS NULL OR org_id = $1
ORDER BY codigo ASC;

-- name: ListEstilosOrg :many
SELECT id, org_id, codigo, nombre, subestilo_de, requiere_info_adicional, campos_info_adicional
FROM estilos
WHERE org_id = $1
ORDER BY codigo ASC;

-- name: GetEstilo :one
SELECT id, org_id, codigo, nombre, subestilo_de, requiere_info_adicional, campos_info_adicional
FROM estilos
WHERE id = $1;

-- name: GetEstiloByCodigoOrg :one
SELECT id, org_id, codigo, nombre, subestilo_de, requiere_info_adicional, campos_info_adicional
FROM estilos
WHERE org_id = $1 AND codigo = $2;

-- name: CreateEstilo :one
INSERT INTO estilos (id, org_id, codigo, nombre, subestilo_de, requiere_info_adicional, campos_info_adicional)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateEstilo :one
UPDATE estilos
SET nombre = $2, subestilo_de = $3, requiere_info_adicional = $4, campos_info_adicional = $5
WHERE id = $1 AND org_id IS NOT NULL
RETURNING *;

-- name: UpdateEstiloCampos :one
UPDATE estilos
SET campos_info_adicional = $2, requiere_info_adicional = $3
WHERE id = $1 AND org_id IS NOT NULL
RETURNING *;

-- name: CountMuestrasByEstilo :one
SELECT COUNT(*) FROM muestras WHERE estilo_id = $1;

-- name: CountSubestilosByEstiloPadre :one
SELECT COUNT(*) FROM estilos WHERE subestilo_de = $1;

-- name: DeleteEstilo :exec
DELETE FROM estilos WHERE id = $1 AND org_id IS NOT NULL;

-- name: SearchEstilosSimilares :many
SELECT id, org_id, codigo, nombre
FROM estilos
WHERE (org_id IS NULL OR org_id = $1)
  AND LOWER(nombre) % LOWER($2)
ORDER BY similarity(LOWER(nombre), LOWER($2)) DESC
LIMIT 5;
