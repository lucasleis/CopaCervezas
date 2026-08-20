-- name: GetAsignacionJuezVuelo :one
SELECT * FROM asignaciones_juez
WHERE usuario_id = $1 AND vuelo_id = $2
LIMIT 1;

-- name: GetVuelosJuez :many
SELECT
    v.id,
    v.numero_ronda,
    v.orden,
    v.estado,
    g.nombre AS grupo_nombre,
    g.cant_rondas,
    aj.estado AS mi_estado
FROM asignaciones_juez aj
JOIN vuelos v ON v.id = aj.vuelo_id
JOIN grupos g ON g.id = v.grupo_id
WHERE aj.usuario_id = $1 AND g.edicion_id = $2
ORDER BY g.orden ASC, v.numero_ronda ASC, v.orden ASC;

-- name: GetMuestrasVuelo :many
SELECT
    m.id,
    m.cod_anonimo,
    m.info_adicional,
    e.codigo AS estilo_codigo,
    e.nombre AS estilo_nombre,
    e.campos_info_adicional AS estilo_campos_info_adicional,
    vm.orden
FROM vuelo_muestras vm
JOIN muestras m ON m.id = vm.muestra_id
JOIN estilos e ON e.id = m.estilo_id
WHERE vm.vuelo_id = $1
ORDER BY vm.orden ASC;

-- name: GetEvaluacionJuez :one
SELECT * FROM evaluaciones
WHERE juez_id = $1 AND muestra_id = $2 AND vuelo_id = $3
LIMIT 1;

-- name: CreateEvaluacion :one
INSERT INTO evaluaciones (id, juez_id, muestra_id, vuelo_id, puntajes, comentarios, comentario_final, avanza)
VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (juez_id, muestra_id, vuelo_id) DO NOTHING
RETURNING *;

-- name: GetEvaluacionesJuezByGrupo :many
SELECT
    ev.id,
    ev.muestra_id,
    ev.vuelo_id,
    ev.avanza,
    ev.created_at,
    m.cod_anonimo,
    es.nombre AS estilo_nombre
FROM evaluaciones ev
JOIN muestras m ON m.id = ev.muestra_id
JOIN estilos es ON es.id = m.estilo_id
JOIN grupos g ON g.id = m.grupo_id
WHERE ev.juez_id = $1 AND m.edicion_id = $2
ORDER BY g.orden ASC, ev.created_at ASC;

-- name: GetEvaluacionesJuezByCodigo :many
SELECT
    ev.id,
    ev.muestra_id,
    ev.vuelo_id,
    ev.avanza,
    ev.created_at,
    m.cod_anonimo,
    es.nombre AS estilo_nombre
FROM evaluaciones ev
JOIN muestras m ON m.id = ev.muestra_id
JOIN estilos es ON es.id = m.estilo_id
WHERE ev.juez_id = $1 AND m.edicion_id = $2
ORDER BY m.cod_anonimo ASC;

-- name: GetEvaluacionDetalleJuez :one
SELECT
    id,
    muestra_id,
    vuelo_id,
    avanza,
    comentario_final,
    puntajes,
    created_at
FROM evaluaciones
WHERE id = $1 AND juez_id = $2
LIMIT 1;

-- name: GetEvaluacionesJuezPorVuelo :many
SELECT
    ev.id,
    ev.muestra_id,
    ev.vuelo_id,
    ev.avanza,
    ev.created_at,
    m.cod_anonimo,
    es.nombre AS estilo_nombre
FROM evaluaciones ev
JOIN muestras m ON m.id = ev.muestra_id
JOIN estilos es ON es.id = m.estilo_id
WHERE ev.juez_id = $1 AND ev.vuelo_id = $2
ORDER BY ev.created_at ASC;

-- name: GetProgresoVuelosEdicion :many
SELECT
    v.id,
    v.numero_ronda,
    v.orden,
    v.estado,
    g.nombre AS grupo_nombre,
    COUNT(aj.id) AS total_jueces,
    COUNT(CASE WHEN aj.estado = 'completado' THEN 1 END) AS jueces_completados
FROM vuelos v
JOIN grupos g ON g.id = v.grupo_id
LEFT JOIN asignaciones_juez aj ON aj.vuelo_id = v.id
WHERE g.edicion_id = $1
GROUP BY v.id, g.nombre, g.orden
ORDER BY g.orden ASC, v.numero_ronda ASC, v.orden ASC;

-- name: GetIncongruenciasVuelo :many
SELECT
    ev.vuelo_id,
    ev.muestra_id,
    m.cod_anonimo,
    COUNT(CASE WHEN ev.avanza = true THEN 1 END) AS cant_avanza_true,
    COUNT(CASE WHEN ev.avanza = false THEN 1 END) AS cant_avanza_false
FROM evaluaciones ev
JOIN muestras m ON m.id = ev.muestra_id
WHERE m.edicion_id = $1 AND ev.avanza IS NOT NULL
GROUP BY ev.vuelo_id, ev.muestra_id, m.cod_anonimo
HAVING COUNT(CASE WHEN ev.avanza = true THEN 1 END) > 0
   AND COUNT(CASE WHEN ev.avanza = false THEN 1 END) > 0;

-- name: GetEvaluacionByIDEdicionOrg :one
SELECT ev.* FROM evaluaciones ev
JOIN muestras m ON m.id = ev.muestra_id
WHERE ev.id = $1 AND m.edicion_id = $2 AND m.org_id = $3
LIMIT 1;

-- name: CountMuestrasVuelo :one
SELECT COUNT(*) FROM vuelo_muestras WHERE vuelo_id = $1;

-- name: CountEvaluacionesCompletadasJuez :one
SELECT COUNT(*) FROM evaluaciones
WHERE juez_id = $1 AND vuelo_id = $2 AND avanza IS NOT NULL;

-- name: UpdateAsignacionJuezEstado :exec
UPDATE asignaciones_juez
SET estado = $3, updated_at = NOW()
WHERE usuario_id = $1 AND vuelo_id = $2;

-- name: GetEdicionesActivasJuez :many
SELECT id, nombre, estado FROM ediciones
WHERE org_id = $1 AND estado IN ('cata', 'pre-cata')
ORDER BY created_at DESC;

-- name: UpdateEvaluacionAdmin :one
UPDATE evaluaciones
SET
    puntajes = $2,
    comentarios = $3,
    comentario_final = $4,
    avanza = $5,
    editada_por_admin = true
WHERE id = $1
RETURNING *;
