package auth

import (
	"context"
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
	"github.com/lucasleis/nivalis/internal/email"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	queries         *db.Queries
	emailSender     email.Sender
	frontendBaseURL string
	jwtSecret       string
}

func NewHandler(queries *db.Queries, emailSender email.Sender, frontendBaseURL, jwtSecret string) *Handler {
	return &Handler{
		queries:         queries,
		emailSender:     emailSender,
		frontendBaseURL: frontendBaseURL,
		jwtSecret:       jwtSecret,
	}
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
	jwtSecret := h.jwtSecret
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
	usuarioID, ok := c.Get("usuario_id").(uuid.UUID)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "no autenticado")
	}
	email, ok := c.Get("email").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "no autenticado")
	}
	rol, ok := c.Get("rol").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "no autenticado")
	}

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

// ---------------------------------------------------------------------------
// Registro de cervecerías e invitación de jueces (LLE-16)
// ---------------------------------------------------------------------------

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Nombre   string `json:"nombre"`
	Apellido string `json:"apellido"`
}

type verifyEmailRequest struct {
	Token string `json:"token"`
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type invitarUsuarioRequest struct {
	Email    string `json:"email"`
	Nombre   string `json:"nombre"`
	Apellido string `json:"apellido"`
	Rol      string `json:"rol"`
}

type setPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type messageResponse struct {
	Message string `json:"message"`
}

// generarTokenUsoUnico genera un token criptográfico aleatorio de 32 bytes,
// devuelve el token en texto plano (para incluir en el link) y su hash SHA-256
// (para guardar en la DB). Mismo patrón que generateRefreshToken/hashToken.
func generarTokenUsoUnico() (plain string, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}
	plain = hex.EncodeToString(b)
	h := sha256.Sum256([]byte(plain))
	hash = hex.EncodeToString(h[:])
	return
}

// crearYEnviarToken crea un token_uso_unico en la DB y envía el mail
// correspondiente. Antes de crear el token nuevo, revoca los tokens
// anteriores del mismo tipo para ese usuario.
func (h *Handler) crearYEnviarToken(ctx context.Context, usuarioID uuid.UUID, tipo db.TokenTipoEnum, destinatario, nombre, baseURL string) error {
	if err := h.queries.RevocarTokensUsuario(ctx, db.RevocarTokensUsuarioParams{
		UsuarioID: usuarioID,
		Tipo:      tipo,
	}); err != nil {
		return err
	}

	var (
		ruta         string
		expiry       time.Duration
		templateName string
		subject      string
	)
	switch tipo {
	case db.TokenTipoEnumVerificacionEmail:
		ruta = "/verify-email"
		expiry = 24 * time.Hour
		templateName = "verificacion"
		subject = "Verificá tu cuenta — Copa Argentina de Cervezas"
	case db.TokenTipoEnumRecuperacionPassword:
		ruta = "/reset-password"
		expiry = 1 * time.Hour
		templateName = "recuperacion"
		subject = "Restablecé tu contraseña — Copa Argentina de Cervezas"
	case db.TokenTipoEnumInvitacion:
		ruta = "/set-password"
		expiry = 72 * time.Hour
		templateName = "verificacion"
		subject = "Invitación — Copa Argentina de Cervezas"
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "tipo de token no soportado")
	}

	plain, hashed, err := generarTokenUsoUnico()
	if err != nil {
		return err
	}

	if _, err := h.queries.CrearTokenUsoUnico(ctx, db.CrearTokenUsoUnicoParams{
		UsuarioID: usuarioID,
		Tipo:      tipo,
		TokenHash: hashed,
		ExpiraAt:  time.Now().Add(expiry),
	}); err != nil {
		return err
	}

	url := baseURL + ruta + "?token=" + plain
	html, err := email.Render(templateName, struct {
		Nombre string
		URL    string
	}{Nombre: nombre, URL: url})
	if err != nil {
		return err
	}

	return h.emailSender.Send(ctx, email.Message{
		To:      destinatario,
		Subject: subject,
		HTML:    html,
	})
}

// Register crea una cuenta de cervecería. Registro público, sin aprobación
// previa del admin — requiere verificación de email antes de operar.
func (h *Handler) Register(c echo.Context) error {
	var req registerRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	if req.Email == "" || len(req.Password) < 8 || req.Nombre == "" || req.Apellido == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "datos inválidos")
	}

	ctx := c.Request().Context()

	if _, err := h.queries.GetUsuarioByEmail(ctx, req.Email); err == nil {
		return echo.NewHTTPError(http.StatusConflict, "EMAIL_EN_USO")
	} else if err != sql.ErrNoRows {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	usuario, err := h.queries.CrearUsuario(ctx, db.CrearUsuarioParams{
		Email:        req.Email,
		PasswordHash: string(passwordHash),
		Nombre:       sql.NullString{String: req.Nombre, Valid: true},
		Apellido:     sql.NullString{String: req.Apellido, Valid: true},
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	if err := h.crearYEnviarToken(ctx, usuario.ID, db.TokenTipoEnumVerificacionEmail, usuario.Email, req.Nombre, h.frontendBaseURL); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	return c.JSON(http.StatusCreated, messageResponse{
		Message: "Cuenta creada. Revisá tu email para verificar tu dirección.",
	})
}

// VerifyEmail confirma la dirección de correo a partir de un token de
// verificacion_email.
func (h *Handler) VerifyEmail(c echo.Context) error {
	var req verifyEmailRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	ctx := c.Request().Context()
	hashed := hashToken(req.Token)

	tok, err := h.queries.GetTokenUsoUnico(ctx, db.GetTokenUsoUnicoParams{
		TokenHash: hashed,
		Tipo:      db.TokenTipoEnumVerificacionEmail,
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusBadRequest, "TOKEN_INVALIDO")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	if err := h.queries.MarcarEmailVerificado(ctx, tok.UsuarioID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}
	if err := h.queries.MarcarTokenUsado(ctx, tok.ID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	return c.JSON(http.StatusOK, messageResponse{Message: "Email verificado correctamente."})
}

// ForgotPassword dispara el flujo de recuperación de contraseña. No revela
// si el email existe o no en la respuesta.
func (h *Handler) ForgotPassword(c echo.Context) error {
	var req forgotPasswordRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}

	ctx := c.Request().Context()
	const genericMsg = "Si el email existe, recibirás un link para restablecer tu contraseña."

	usuario, err := h.queries.GetUsuarioByEmail(ctx, req.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.JSON(http.StatusOK, messageResponse{Message: genericMsg})
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	if err := h.queries.RevocarTokensUsuario(ctx, db.RevocarTokensUsuarioParams{
		UsuarioID: usuario.ID,
		Tipo:      db.TokenTipoEnumRecuperacionPassword,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	nombre := usuario.Nombre.String
	if err := h.crearYEnviarToken(ctx, usuario.ID, db.TokenTipoEnumRecuperacionPassword, usuario.Email, nombre, h.frontendBaseURL); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	return c.JSON(http.StatusOK, messageResponse{Message: genericMsg})
}

// ResetPassword completa el flujo de recuperación de contraseña a partir de
// un token de recuperacion_password. Revoca todas las sesiones activas del
// usuario para forzar re-login en todos los dispositivos.
func (h *Handler) ResetPassword(c echo.Context) error {
	var req resetPasswordRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if len(req.Password) < 8 {
		return echo.NewHTTPError(http.StatusBadRequest, "datos inválidos")
	}

	ctx := c.Request().Context()
	hashed := hashToken(req.Token)

	tok, err := h.queries.GetTokenUsoUnico(ctx, db.GetTokenUsoUnicoParams{
		TokenHash: hashed,
		Tipo:      db.TokenTipoEnumRecuperacionPassword,
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusBadRequest, "TOKEN_INVALIDO")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	if err := h.queries.UpdatePasswordHash(ctx, db.UpdatePasswordHashParams{
		PasswordHash: string(passwordHash),
		ID:           tok.UsuarioID,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}
	if err := h.queries.MarcarTokenUsado(ctx, tok.ID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}
	if err := h.queries.RevokeAllTokensByUsuario(ctx, tok.UsuarioID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	return c.JSON(http.StatusOK, messageResponse{Message: "Contraseña actualizada correctamente."})
}

// InvitarUsuario da de alta a un juez desde el panel admin y le envía un
// link de invitación para que setee su contraseña. Solo entra quien el
// admin habilita — por ahora solo soporta rol "juez".
func (h *Handler) InvitarUsuario(c echo.Context) error {
	if rol, _ := c.Get("rol").(string); rol != "admin" {
		return echo.NewHTTPError(http.StatusForbidden, "acceso denegado")
	}

	var req invitarUsuarioRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if req.Rol != "judge" {
		return echo.NewHTTPError(http.StatusBadRequest, "ROL_NO_SOPORTADO")
	}
	if req.Email == "" || req.Nombre == "" || req.Apellido == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "datos inválidos")
	}

	orgID, ok := c.Get("org_id").(uuid.UUID)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "no autenticado")
	}

	ctx := c.Request().Context()

	if _, err := h.queries.GetUsuarioByEmail(ctx, req.Email); err == nil {
		return echo.NewHTTPError(http.StatusConflict, "EMAIL_EN_USO")
	} else if err != sql.ErrNoRows {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	usuario, err := h.queries.CrearUsuario(ctx, db.CrearUsuarioParams{
		Email:        req.Email,
		PasswordHash: "INVITACION_PENDIENTE",
		Nombre:       sql.NullString{String: req.Nombre, Valid: true},
		Apellido:     sql.NullString{String: req.Apellido, Valid: true},
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	if err := h.queries.CrearUsuarioOrganizacion(ctx, db.CrearUsuarioOrganizacionParams{
		UsuarioID: usuario.ID,
		OrgID:     orgID,
		Rol:       db.RolEnumJudge,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	if err := h.crearYEnviarToken(ctx, usuario.ID, db.TokenTipoEnumInvitacion, usuario.Email, req.Nombre, h.frontendBaseURL); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	return c.JSON(http.StatusCreated, messageResponse{Message: "Invitación enviada."})
}

// SetPassword completa la aceptación de una invitación: setea la contraseña
// inicial y marca el email como verificado.
func (h *Handler) SetPassword(c echo.Context) error {
	var req setPasswordRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if len(req.Password) < 8 {
		return echo.NewHTTPError(http.StatusBadRequest, "datos inválidos")
	}

	ctx := c.Request().Context()
	hashed := hashToken(req.Token)

	tok, err := h.queries.GetTokenUsoUnico(ctx, db.GetTokenUsoUnicoParams{
		TokenHash: hashed,
		Tipo:      db.TokenTipoEnumInvitacion,
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusBadRequest, "TOKEN_INVALIDO")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	if err := h.queries.UpdatePasswordHash(ctx, db.UpdatePasswordHashParams{
		PasswordHash: string(passwordHash),
		ID:           tok.UsuarioID,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}
	if err := h.queries.MarcarEmailVerificado(ctx, tok.UsuarioID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}
	if err := h.queries.MarcarTokenUsado(ctx, tok.ID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "error interno")
	}

	return c.JSON(http.StatusOK, messageResponse{Message: "Contraseña establecida. Ya podés iniciar sesión."})
}
