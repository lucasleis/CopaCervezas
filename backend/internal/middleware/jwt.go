package middleware

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	authpkg "github.com/lucasleis/nivalis/internal/auth"
)

// NewJWTMiddleware crea el middleware de autenticación estándar: exige el
// token en el header Authorization (Bearer). secret se inyecta una sola vez
// al arranque, ya validado — nunca se lee de env en caliente por request.
func NewJWTMiddleware(secret string) echo.MiddlewareFunc {
	return newAuthMiddleware(secret, false)
}

// NewJWTMiddlewareWS crea la única variante que acepta el token por query
// string (?token=), exclusiva de la ruta de WebSocket: los navegadores no
// permiten headers custom al abrir un WS, así que no hay otra forma de
// autenticar el handshake. Nunca debe aplicarse a un endpoint HTTP normal —
// un token en la URL queda en logs de proxy, historial del navegador y el
// header Referer si la página lo dispara.
func NewJWTMiddlewareWS(secret string) echo.MiddlewareFunc {
	return newAuthMiddleware(secret, true)
}

func newAuthMiddleware(secret string, allowQueryToken bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")

			var tokenStr string
			switch {
			case strings.HasPrefix(authHeader, "Bearer "):
				tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
			case allowQueryToken && authHeader == "" && c.QueryParam("token") != "":
				tokenStr = c.QueryParam("token")
			default:
				return echo.NewHTTPError(http.StatusUnauthorized, "token requerido")
			}

			token, err := jwt.ParseWithClaims(tokenStr, &authpkg.Claims{}, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, echo.NewHTTPError(http.StatusUnauthorized, "método de firma inválido")
				}
				return []byte(secret), nil
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
}
