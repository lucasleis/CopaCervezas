-- name: CrearTokenUsoUnico :one
INSERT INTO tokens_uso_unico (usuario_id, tipo, token_hash, expira_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetTokenUsoUnico :one
SELECT * FROM tokens_uso_unico
WHERE token_hash = $1
  AND tipo = $2
  AND usado = FALSE
  AND expira_at > NOW();

-- name: MarcarTokenUsado :exec
UPDATE tokens_uso_unico SET usado = TRUE WHERE id = $1;

-- name: RevocarTokensUsuario :exec
UPDATE tokens_uso_unico SET usado = TRUE
WHERE usuario_id = $1 AND tipo = $2 AND usado = FALSE;
