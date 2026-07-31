-- name: GetEdicionesActivasCerveceria :many
SELECT id, nombre, estado FROM ediciones
WHERE org_id = $1 AND estado = 'inscripcion'
ORDER BY created_at DESC;

-- name: GetCerveceriaByUsuario :one
SELECT * FROM cervecerias
WHERE usuario_id = $1 AND edicion_id = $2 AND org_id = $3;

-- name: GetCerveceriaByIDOrg :one
SELECT * FROM cervecerias
WHERE id = $1 AND org_id = $2;

-- name: ListMuestrasCerveceria :many
SELECT m.*, e.nombre AS estilo_nombre, e.codigo AS estilo_codigo
FROM muestras m
JOIN estilos e ON e.id = m.estilo_id
WHERE m.cerveceria_id = $1 AND m.edicion_id = $2 AND m.org_id = $3
ORDER BY m.created_at ASC;

-- name: ListMuestrasEdicionAdmin :many
SELECT
    m.id,
    m.nombre_comercial,
    m.info_adicional,
    m.aprobada,
    m.activa,
    m.cod_participante,
    e.nombre AS estilo_nombre,
    c.id AS cerveceria_id,
    c.nombre_comercial AS cerveceria_nombre,
    c.estado_pago,
    u.email AS cerveceria_email
FROM muestras m
JOIN estilos e ON e.id = m.estilo_id
JOIN cervecerias c ON c.id = m.cerveceria_id
JOIN usuarios u ON u.id = c.usuario_id
WHERE m.edicion_id = $1 AND m.org_id = $2
ORDER BY m.created_at ASC;

-- name: GetMuestraByIDCerveceria :one
SELECT * FROM muestras
WHERE id = $1 AND cerveceria_id = $2 AND edicion_id = $3 AND activa = true;

-- name: GetMuestraByIDEdicionOrg :one
SELECT * FROM muestras
WHERE id = $1 AND edicion_id = $2 AND org_id = $3;

-- name: GetEstiloVisibleOrg :one
SELECT * FROM estilos
WHERE id = $1 AND (org_id IS NULL OR org_id = $2);

-- name: CreateMuestra :one
INSERT INTO muestras (id, cerveceria_id, edicion_id, org_id, estilo_id, nombre_comercial, info_adicional, cuenta_premio_mejor_cerveceria, comentarios_adicionales, cod_participante, aprobada, activa)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, true)
RETURNING *;

-- name: UpdateMuestra :one
UPDATE muestras
SET estilo_id = $2, nombre_comercial = $3, info_adicional = $4, cuenta_premio_mejor_cerveceria = $5, comentarios_adicionales = $6, aprobada = false, updated_at = NOW()
WHERE id = $1 AND activa = true
RETURNING *;

-- name: DeleteMuestra :exec
UPDATE muestras SET activa = false, updated_at = NOW()
WHERE id = $1;

-- name: CountMuestrasCerveceria :one
SELECT COUNT(*) FROM muestras
WHERE cerveceria_id = $1 AND edicion_id = $2 AND activa = true;

-- name: NextCodParticipante :one
SELECT COALESCE(MAX(CAST(cod_participante AS INTEGER)), 0) + 1
FROM muestras
WHERE edicion_id = $1;

-- name: UpdateMuestraAprobada :one
UPDATE muestras
SET aprobada = $4, updated_at = NOW()
WHERE id = $1 AND edicion_id = $2 AND org_id = $3
RETURNING *;

-- name: UpdateCerveceriaEstadoPago :one
UPDATE cervecerias
SET estado_pago = $2, updated_at = NOW()
WHERE id = $1 AND org_id = $3
RETURNING *;
