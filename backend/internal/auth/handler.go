package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/lucasleis/nivalis/internal/db"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(queries *db.Queries) *Handler {
	return &Handler{queries: queries}
}

type Claims struct {
	UsuarioID string `json:"sub"`
	OrgID     string `json:"org_id"`
	Rol       string `json:"rol"`
	Email     string `json:"email"`
	jwt.RegisteredClaims
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
}

type loginMultiOrgResponse struct {
	RequiresOrgSelection bool      `json:"requires_org_selection"`
	Orgs                 []orgItem `json:"orgs"`
}

type orgItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

type selectOrgRequest struct {
	OrgID string `json:"org_id"`
}

type meResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

func generateRefreshToken() (raw string, hashed string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}
	raw = hex.EncodeToString(b)
	h := sha256.Sum256([]byte(raw))
	hashed = hex.EncodeToString(h[:])
	return
}

func hashToken(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

func (h *Handler) issueTokens(c echo.Context, usuarioID, orgID uuid.UUID, rol string, email string) (*loginResponse, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	jwtExpiry := os.Getenv("JWT_EXPIRY")
	if jwtExpiry == "" {
		jwtExpiry = "15m"
	}
	refreshExpiry := os.Getenv("REFRESH_TOKEN_EXPIRY")
	if refreshExpiry == "" {
		refreshExpiry = "8h"
	}

	accessDuration, err := time.ParseDuration(jwtExpiry)
	if err != nil {
		return nil, err
	}
	refreshDuration, err := time.ParseDuration(refreshExpiry)
	if err != nil {
		return nil, err
	}

	claims := Claims{
		UsuarioID: usuarioID.String(),
		OrgID:     orgID.String(),
		Rol:       rol,
		Email:     email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(accessDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return nil, err
	}

	raw, hashed, err := generateRefreshToken()
	if err != nil {
		return nil, err
	}
	expiraAt := time.Now().Add(refreshDuration)

	err = h.queries.InsertRefreshToken(c.Request().Context(), db.InsertRefreshTokenParams{
		UsuarioID: usuarioID,
		OrgID:     orgID,
		TokenHash: hashed,
		ExpiraAt:  expiraAt,
	})
	if err != nil {
		return nil, err
	}

	cookie := new(http.Cookie)
	cookie.Name = "refresh_token"
	cookie.Value = raw
	cookie.HttpOnly = true
	cookie.Secure = true
	cookie.SameSite = http.SameSiteStrictMode
	cookie.Path = "/auth/refresh"
	cookie.Expires = expiraAt
	c.SetCookie(cookie)

	return &loginResponse{
		AccessToken: accessToken,
		TokenType:   "Bearer",
	}, nil
}

func (h *Handler) Login(c echo.Context) error {
	var req loginRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	usuario, err := h.queries.GetUsuarioByEmail(c.Request().Context(), req.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusUnauthorized, "credenciales inválidas")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(usuario.PasswordHash), []byte(req.Password)); err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "credenciales inválidas")
	}

	roles, err := h.queries.GetRolesByUsuario(c.Request().Context(), usuario.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}
	if len(roles) == 0 {
		return echo.NewHTTPError(http.StatusUnauthorized, "sin organización asignada")
	}

	if len(roles) == 1 {
		res, err := h.issueTokens(c, usuario.ID, roles[0].OrgID, string(roles[0].Rol), usuario.Email)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
		}
		return c.JSON(http.StatusOK, res)
	}

	items := make([]orgItem, len(roles))
	for i, r := range roles {
		items[i] = orgItem{
			ID:   r.OrgID.String(),
			Name: "",
			Role: string(r.Rol),
		}
	}
	return c.JSON(http.StatusOK, loginMultiOrgResponse{
		RequiresOrgSelection: true,
		Orgs:                 items,
	})
}

func (h *Handler) SelectOrg(c echo.Context) error {
	usuarioID, ok := c.Get("usuario_id").(uuid.UUID)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "no autenticado")
	}

	var req selectOrgRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	orgID, err := uuid.Parse(req.OrgID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "org_id inválido")
	}

	roles, err := h.queries.GetRolesByUsuario(c.Request().Context(), usuarioID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	var matchedRol string
	for _, r := range roles {
		if r.OrgID == orgID {
			matchedRol = string(r.Rol)
			break
		}
	}
	if matchedRol == "" {
		return echo.NewHTTPError(http.StatusForbidden, "sin acceso a esta organización")
	}

	usuario, err := h.queries.GetUsuarioByID(c.Request().Context(), usuarioID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	res, err := h.issueTokens(c, usuarioID, orgID, matchedRol, usuario.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) Me(c echo.Context) error {
	usuarioID := c.Get("usuario_id").(uuid.UUID)
	email := c.Get("email").(string)
	rol := c.Get("rol").(string)

	return c.JSON(http.StatusOK, meResponse{
		ID:    usuarioID.String(),
		Email: email,
		Role:  rol,
	})
}

func (h *Handler) Refresh(c echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "refresh token requerido")
	}

	hashed := hashToken(cookie.Value)
	rt, err := h.queries.GetRefreshTokenByHash(c.Request().Context(), hashed)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusUnauthorized, "refresh token inválido")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	if rt.Revocado || time.Now().After(rt.ExpiraAt) {
		return echo.NewHTTPError(http.StatusUnauthorized, "refresh token expirado o revocado")
	}

	if err := h.queries.RevokeRefreshToken(c.Request().Context(), rt.ID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	roles, err := h.queries.GetRolesByUsuario(c.Request().Context(), rt.UsuarioID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}
	var rol string
	for _, r := range roles {
		if r.OrgID == rt.OrgID {
			rol = string(r.Rol)
			break
		}
	}
	if rol == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "sin rol para esta organización")
	}

	usuario, err := h.queries.GetUsuarioByID(c.Request().Context(), rt.UsuarioID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	res, err := h.issueTokens(c, rt.UsuarioID, rt.OrgID, rol, usuario.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}
	return c.JSON(http.StatusOK, res)
}

func (h *Handler) Logout(c echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err == nil {
		hashed := hashToken(cookie.Value)
		rt, err := h.queries.GetRefreshTokenByHash(c.Request().Context(), hashed)
		if err == nil && !rt.Revocado {
			_ = h.queries.RevokeRefreshToken(c.Request().Context(), rt.ID)
		}
	}

	clear := new(http.Cookie)
	clear.Name = "refresh_token"
	clear.Value = ""
	clear.HttpOnly = true
	clear.Secure = true
	clear.SameSite = http.SameSiteStrictMode
	clear.Path = "/auth/refresh"
	clear.MaxAge = -1
	c.SetCookie(clear)

	return c.NoContent(http.StatusNoContent)
}
