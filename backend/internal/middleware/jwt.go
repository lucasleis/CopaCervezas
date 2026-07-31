package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	authpkg "github.com/lucasleis/nivalis/internal/auth"
)

func JWTMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")

		var tokenStr string
		switch {
		case strings.HasPrefix(authHeader, "Bearer "):
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		case authHeader == "" && c.QueryParam("token") != "":
			// El navegador no permite headers custom al abrir un WebSocket,
			// así que el WS handler acepta el token como query param.
			tokenStr = c.QueryParam("token")
		default:
			return echo.NewHTTPError(http.StatusUnauthorized, "token requerido")
		}
		jwtSecret := os.Getenv("JWT_SECRET")

		token, err := jwt.ParseWithClaims(tokenStr, &authpkg.Claims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, echo.NewHTTPError(http.StatusUnauthorized, "método de firma inválido")
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			return echo.NewHTTPError(http.StatusUnauthorized, "token inválido o expirado")
		}

		claims, ok := token.Claims.(*authpkg.Claims)
		if !ok {
			return echo.NewHTTPError(http.StatusUnauthorized, "claims inválidos")
		}

		usuarioID, err := uuid.Parse(claims.UsuarioID)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "usuario_id inválido")
		}
		orgID, err := uuid.Parse(claims.OrgID)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "org_id inválido")
		}

		c.Set("usuario_id", usuarioID)
		c.Set("org_id", orgID)
		c.Set("rol", claims.Rol)
		c.Set("email", claims.Email)

		return next(c)
	}
}
