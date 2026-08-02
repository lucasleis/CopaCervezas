-- name: GetUsuarioByEmail :one
SELECT id, email, password_hash, created_at
FROM usuarios
WHERE email = $1
LIMIT 1;

-- name: GetUsuarioByID :one
SELECT id, email, password_hash FROM usuarios WHERE id = $1;

-- name: GetRolesByUsuario :many
SELECT org_id, rol
FROM usuario_organizacion
WHERE usuario_id = $1;

-- name: InsertRefreshToken :exec
INSERT INTO refresh_tokens (usuario_id, org_id, token_hash, expira_at)
VALUES ($1, $2, $3, $4);

-- name: GetRefreshTokenByHash :one
SELECT id, usuario_id, org_id, token_hash, expira_at, revocado, created_at
FROM refresh_tokens
WHERE token_hash = $1
LIMIT 1;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET revocado = TRUE
WHERE id = $1;

-- name: RevokeAllTokensByUsuario :exec
UPDATE refresh_tokens
SET revocado = TRUE
WHERE usuario_id = $1;
