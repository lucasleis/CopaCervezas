-- name: ListGruposEdicion :many
-- Devuelve todos los grupos de una edición con el conteo de muestras activas.
-- Necesita: edicion_id, org_id (para verificar ownership via edicion)
SELECT
    g.id,
    g.nombre,
    g.cant_rondas,
    g.orden,
    g.bos_flight,
    g.created_at,
    g.updated_at,
    COUNT(m.id) FILTER (WHERE m.activa = true) AS cant_muestras
FROM grupos g
LEFT JOIN muestras m ON m.grupo_id = g.id
WHERE g.edicion_id = $1
GROUP BY g.id
ORDER BY g.orden ASC;

-- name: GetGrupoByIDEdicion :one
-- Verifica ownership: el grupo debe pertenecer a la edición.
SELECT g.*, COUNT(m.id) FILTER (WHERE m.activa = true) AS cant_muestras
FROM grupos g
LEFT JOIN muestras m ON m.grupo_id = g.id
WHERE g.id = $1 AND g.edicion_id = $2
GROUP BY g.id;

-- name: CreateGrupo :one
INSERT INTO grupos (edicion_id, nombre, cant_rondas, orden, bos_flight)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateGrupo :one
UPDATE grupos
SET nombre = $3, bos_flight = $4, updated_at = NOW()
WHERE id = $1 AND edicion_id = $2
RETURNING *;

-- name: UpdateGrupoCantRondas :one
-- Se llama automáticamente después de mover muestras entre grupos.
UPDATE grupos
SET cant_rondas = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteGrupo :exec
-- Solo ejecutar si el grupo no tiene muestras activas (verificar en la capa de negocio).
DELETE FROM grupos WHERE id = $1 AND edicion_id = $2;

-- name: MaxOrdenGrupos :one
-- Para asignar el siguiente orden al crear un grupo.
SELECT COALESCE(MAX(orden), 0) FROM grupos WHERE edicion_id = $1;

-- name: ListMuestrasSinGrupo :many
-- Muestras activas de una edición que todavía no tienen grupo asignado.
SELECT
    m.id,
    m.nombre_comercial,
    m.cod_participante,
    m.estilo_id,
    e.codigo AS estilo_codigo,
    e.nombre AS estilo_nombre
FROM muestras m
JOIN estilos e ON e.id = m.estilo_id
WHERE m.edicion_id = $1 AND m.org_id = $2 AND m.activa = true AND m.grupo_id IS NULL
ORDER BY e.codigo ASC, m.created_at ASC;

-- name: CountMuestrasSinGrupo :one
-- Precondición para generar códigos anónimos: debe ser 0.
SELECT COUNT(*) FROM muestras
WHERE edicion_id = $1 AND org_id = $2 AND activa = true AND grupo_id IS NULL;

-- name: ListMuestrasByGrupo :many
-- Muestras activas de un grupo específico.
SELECT
    m.id,
    m.nombre_comercial,
    m.cod_participante,
    m.cod_anonimo,
    m.asignacion_manual,
    m.estilo_id,
    e.codigo AS estilo_codigo,
    e.nombre AS estilo_nombre
FROM muestras m
JOIN estilos e ON e.id = m.estilo_id
WHERE m.grupo_id = $1 AND m.activa = true
ORDER BY e.codigo ASC, m.created_at ASC;

-- name: AsignarGrupoMuestra :one
-- Mueve una muestra a un grupo. Setea asignacion_manual=true si es ajuste manual.
UPDATE muestras
SET grupo_id = $2, asignacion_manual = $3, updated_at = NOW()
WHERE id = $1 AND activa = true
RETURNING *;

-- name: DesasignarGrupoMuestra :exec
-- Quita el grupo de una muestra (para reasignación).
UPDATE muestras
SET grupo_id = NULL, asignacion_manual = false, updated_at = NOW()
WHERE id = $1 AND activa = true;

-- name: ListEstilosConMuestras :many
-- Para la autoasignación: agrupa muestras activas por estilo y cuenta cuántas hay.
-- Devuelve solo estilos que tienen al menos 1 muestra activa en la edición.
SELECT
    e.id AS estilo_id,
    e.codigo AS estilo_codigo,
    e.nombre AS estilo_nombre,
    COUNT(m.id) AS cant_muestras
FROM muestras m
JOIN estilos e ON e.id = m.estilo_id
WHERE m.edicion_id = $1 AND m.org_id = $2 AND m.activa = true AND m.grupo_id IS NULL
GROUP BY e.id, e.codigo, e.nombre
ORDER BY e.codigo ASC;

-- name: AsignarGrupoMuestrasByEstilo :exec
-- Autoasignación: asigna todas las muestras de un estilo a un grupo.
-- Solo afecta muestras sin grupo asignado (grupo_id IS NULL).
UPDATE muestras
SET grupo_id = $3, updated_at = NOW()
WHERE edicion_id = $1 AND estilo_id = $2 AND activa = true AND grupo_id IS NULL;
