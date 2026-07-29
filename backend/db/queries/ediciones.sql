-- name: CreateEdicion :one
INSERT INTO ediciones (org_id, nombre, anio, fecha_inicio_inscripcion, fecha_fin_inscripcion, fecha_evento, max_muestras_por_cerveceria)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListEdicionesByOrg :many
SELECT * FROM ediciones
WHERE org_id = $1
ORDER BY anio DESC, created_at DESC;

-- name: GetEdicionByIDAndOrg :one
SELECT * FROM ediciones
WHERE id = $1 AND org_id = $2
LIMIT 1;

-- name: UpdateEdicion :one
UPDATE ediciones
SET
    nombre = $3,
    anio = $4,
    fecha_inicio_inscripcion = $5,
    fecha_fin_inscripcion = $6,
    fecha_evento = $7,
    max_muestras_por_cerveceria = $8,
    updated_at = NOW()
WHERE id = $1 AND org_id = $2
RETURNING *;

-- name: CreatePrecioInscripcion :one
INSERT INTO precios_inscripcion (edicion_id, nombre, precio, fecha_desde, fecha_hasta)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListPreciosByEdicion :many
SELECT * FROM precios_inscripcion
WHERE edicion_id = $1
ORDER BY created_at ASC;

-- name: GetPrecioByIDAndEdicion :one
SELECT * FROM precios_inscripcion
WHERE id = $1 AND edicion_id = $2
LIMIT 1;

-- name: UpdatePrecioInscripcion :one
UPDATE precios_inscripcion
SET
    nombre = $3,
    precio = $4,
    fecha_desde = $5,
    fecha_hasta = $6,
    updated_at = NOW()
WHERE id = $1 AND edicion_id = $2
RETURNING *;

-- name: DeletePrecioInscripcion :exec
DELETE FROM precios_inscripcion
WHERE id = $1 AND edicion_id = $2;

-- name: CreateLugarEntrega :one
INSERT INTO lugares_entrega (edicion_id, nombre, direccion, ciudad, provincia, horarios)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListLugaresByEdicion :many
SELECT * FROM lugares_entrega
WHERE edicion_id = $1
ORDER BY created_at ASC;

-- name: GetLugarByIDAndEdicion :one
SELECT * FROM lugares_entrega
WHERE id = $1 AND edicion_id = $2
LIMIT 1;

-- name: UpdateLugarEntrega :one
UPDATE lugares_entrega
SET
    nombre = $3,
    direccion = $4,
    ciudad = $5,
    provincia = $6,
    horarios = $7,
    updated_at = NOW()
WHERE id = $1 AND edicion_id = $2
RETURNING *;

-- name: DeleteLugarEntrega :exec
DELETE FROM lugares_entrega
WHERE id = $1 AND edicion_id = $2;

-- name: CreateCodigoDescuento :one
INSERT INTO codigos_descuento (edicion_id, codigo, descuento_porcentaje, max_usos)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListDescuentosByEdicion :many
SELECT * FROM codigos_descuento
WHERE edicion_id = $1
ORDER BY created_at ASC;

-- name: GetDescuentoByIDAndEdicion :one
SELECT * FROM codigos_descuento
WHERE id = $1 AND edicion_id = $2
LIMIT 1;

-- name: UpdateCodigoDescuento :one
UPDATE codigos_descuento
SET
    codigo = $3,
    descuento_porcentaje = $4,
    max_usos = $5,
    activo = $6,
    updated_at = NOW()
WHERE id = $1 AND edicion_id = $2
RETURNING *;

-- name: DeleteCodigoDescuento :exec
DELETE FROM codigos_descuento
WHERE id = $1 AND edicion_id = $2;

-- name: UpdateEdicionEstado :one
UPDATE ediciones
SET
    estado = $3,
    updated_at = NOW()
WHERE id = $1 AND org_id = $2
RETURNING *;
