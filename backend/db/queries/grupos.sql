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
-- Para la autoasignación: agrupa todas las muestras activas de la edición por estilo
-- (código de estilo completo, con letra incluida) y cuenta cuántas hay, sin importar
-- si ya tienen un grupo asignado de una corrida anterior.
SELECT
    e.id AS estilo_id,
    e.codigo AS estilo_codigo,
    e.nombre AS estilo_nombre,
    COUNT(m.id) AS cant_muestras
FROM muestras m
JOIN estilos e ON e.id = m.estilo_id
WHERE m.edicion_id = $1 AND m.org_id = $2 AND m.activa = true
GROUP BY e.id, e.codigo, e.nombre
ORDER BY e.codigo ASC;

-- name: AsignarGrupoMuestrasByEstilo :exec
-- Autoasignación: asigna todas las muestras activas de un estilo a un grupo,
-- sin importar el grupo que tuvieran asignado previamente.
UPDATE muestras
SET grupo_id = $3, updated_at = NOW()
WHERE edicion_id = $1 AND estilo_id = $2 AND activa = true;

-- name: DesasignarGrupoMuestrasByEstilo :exec
-- Autoasignación: quita el grupo de todas las muestras activas de un estilo
-- (estilos con menos de 10 muestras activas quedan en la bandeja "sin grupo").
UPDATE muestras
SET grupo_id = NULL, asignacion_manual = false, updated_at = NOW()
WHERE edicion_id = $1 AND estilo_id = $2 AND activa = true;

-- name: GetGrupoByNombreEdicion :one
-- Busca un grupo existente por nombre exacto dentro de la edición (para reutilizarlo
-- en corridas repetidas de autoasignación).
SELECT * FROM grupos WHERE edicion_id = $1 AND nombre = $2;

-- name: FindGrupoVariosByEdicion :many
-- Busca grupos "comodín" (nombre 'Varios' o variantes) en la edición, a eliminar
-- antes de recalcular la autoasignación.
SELECT * FROM grupos WHERE edicion_id = $1 AND nombre ILIKE 'varios%';

-- name: DesasignarGrupoMuestrasByGrupo :exec
-- Quita el grupo de todas las muestras activas que referencian un grupo dado
-- (usado para desasociar muestras del grupo "Varios" antes de eliminarlo).
UPDATE muestras
SET grupo_id = NULL, asignacion_manual = false, updated_at = NOW()
WHERE grupo_id = $1 AND activa = true;
