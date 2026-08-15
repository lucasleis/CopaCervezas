-- name: GetUsuarioByEmail :one
SELECT *
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

-- name: CrearUsuario :one
INSERT INTO usuarios (email, password_hash, nombre, apellido)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: MarcarEmailVerificado :exec
UPDATE usuarios SET email_verificado = TRUE WHERE id = $1;

-- name: UpdatePasswordHash :exec
UPDATE usuarios SET password_hash = $1 WHERE id = $2;

-- name: CrearUsuarioOrganizacion :exec
INSERT INTO usuario_organizacion (usuario_id, org_id, rol)
VALUES ($1, $2, $3);
