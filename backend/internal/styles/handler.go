package styles

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/lucasleis/nivalis/internal/db"
	"github.com/sqlc-dev/pqtype"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Response types

type estiloResponse struct {
	ID                    string          `json:"id"`
	OrgID                 *string         `json:"org_id"`
	Codigo                string          `json:"codigo"`
	Nombre                string          `json:"nombre"`
	SubestiloDe           *string         `json:"subestilo_de"`
	RequiereInfoAdicional bool            `json:"requiere_info_adicional"`
	CamposInfoAdicional   json.RawMessage `json:"campos_info_adicional"`
}

type estiloCreadoResponse struct {
	ID     string `json:"id"`
	Codigo string `json:"codigo"`
	Nombre string `json:"nombre"`
}

type estiloCamposResponse struct {
	ID                  string          `json:"id"`
	CamposInfoAdicional json.RawMessage `json:"campos_info_adicional"`
}

type similarResponse struct {
	ID     string `json:"id"`
	Codigo string `json:"codigo"`
	Nombre string `json:"nombre"`
}

func toEstiloResponse(id uuid.UUID, orgID uuid.NullUUID, codigo, nombre string, subestiloDe uuid.NullUUID, requiereInfo bool, campos pqtype.NullRawMessage) estiloResponse {
	r := estiloResponse{
		ID:                    id.String(),
		Codigo:                codigo,
		Nombre:                nombre,
		RequiereInfoAdicional: requiereInfo,
	}
	if orgID.Valid {
		s := orgID.UUID.String()
		r.OrgID = &s
	}
	if subestiloDe.Valid {
		s := subestiloDe.UUID.String()
		r.SubestiloDe = &s
	}
	if campos.Valid {
		r.CamposInfoAdicional = campos.RawMessage
	}
	return r
}

// Response helpers (mismo formato que tasting.Handler / competition.Handler)

type apiError struct {
	Code      string            `json:"code"`
	Message   string            `json:"message"`
	Similares []similarResponse `json:"similares,omitempty"`
}

func respond(c echo.Context, status int, data interface{}) error {
	return c.JSON(status, map[string]interface{}{"data": data, "error": nil})
}

func fail(c echo.Context, status int, code, message string) error {
	return c.JSON(status, map[string]interface{}{
		"data":  nil,
		"error": apiError{Code: code, Message: message},
	})
}

func failSimilares(c echo.Context, similares []db.SearchEstilosSimilaresRow) error {
	result := make([]similarResponse, len(similares))
	for i, s := range similares {
		result[i] = similarResponse{ID: s.ID.String(), Codigo: s.Codigo, Nombre: s.Nombre}
	}
	return c.JSON(http.StatusConflict, map[string]interface{}{
		"data": nil,
		"error": apiError{
			Code:      "ESTILO_SIMILAR_ENCONTRADO",
			Message:   "Se encontraron estilos con nombres similares",
			Similares: result,
		},
	})
}

func requireAdmin(c echo.Context) bool {
	rol, _ := c.Get("rol").(string)
	return rol == "admin"
}

func orgIDFromCtx(c echo.Context) (uuid.UUID, bool) {
	id, ok := c.Get("org_id").(uuid.UUID)
	return id, ok
}

func parseUUID(c echo.Context, param string) (uuid.UUID, error) {
	return uuid.Parse(c.Param(param))
}

func (h *Handler) List(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	rows, err := h.svc.ListEstilosOrg(c.Request().Context(), orgID)
	if err != nil {
		slog.Error("list estilos org failed", "error", err, "org_id", orgID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener los estilos")
	}
	result := make([]estiloResponse, len(rows))
	for i, r := range rows {
		result[i] = toEstiloResponse(r.ID, r.OrgID, r.Codigo, r.Nombre, r.SubestiloDe, r.RequiereInfoAdicional, r.CamposInfoAdicional)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) ListCatalogo(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	return h.listCatalogo(c)
}

// ListCatalogoAuthenticated expone el catálogo de estilos a cualquier usuario
// autenticado de la org (no es dato sensible) — lo necesita, por ejemplo, la
// cervecería para elegir el estilo al inscribir una muestra.
func (h *Handler) ListCatalogoAuthenticated(c echo.Context) error {
	return h.listCatalogo(c)
}

func (h *Handler) listCatalogo(c echo.Context) error {
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	rows, err := h.svc.ListEstilosCatalogo(c.Request().Context(), orgID)
	if err != nil {
		slog.Error("list estilos catalogo failed", "error", err, "org_id", orgID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener el catálogo de estilos")
	}
	result := make([]estiloResponse, len(rows))
	for i, r := range rows {
		result[i] = toEstiloResponse(r.ID, r.OrgID, r.Codigo, r.Nombre, r.SubestiloDe, r.RequiereInfoAdicional, r.CamposInfoAdicional)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) Create(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	var req CreateEstiloRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	estilo, err := h.svc.CreateEstilo(c.Request().Context(), orgID, req)
	if err != nil {
		var similarErr *ErrEstiloSimilarEncontrado
		if errors.As(err, &similarErr) {
			return failSimilares(c, similarErr.Similares)
		}
		if errors.Is(err, ErrCodigoDuplicado) {
			return fail(c, http.StatusConflict, "CODIGO_DUPLICADO", "Ya existe un estilo con ese código en esta organización")
		}
		slog.Error("create estilo failed", "error", err, "org_id", orgID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear el estilo")
	}
	return respond(c, http.StatusCreated, estiloCreadoResponse{
		ID:     estilo.ID.String(),
		Codigo: estilo.Codigo,
		Nombre: estilo.Nombre,
	})
}

func (h *Handler) Update(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	id, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de estilo inválido")
	}
	var req UpdateEstiloRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	estilo, err := h.svc.UpdateEstilo(c.Request().Context(), id, orgID, req)
	if err != nil {
		if errors.Is(err, ErrEstiloGlobalNoEditable) {
			return fail(c, http.StatusForbidden, "ESTILO_GLOBAL_NO_EDITABLE", "El catálogo BJCP global no es editable")
		}
		if errors.Is(err, ErrEstiloNotFound) || errors.Is(err, sql.ErrNoRows) {
			return fail(c, http.StatusNotFound, "ESTILO_NOT_FOUND", "El estilo solicitado no existe")
		}
		slog.Error("update estilo failed", "error", err, "id", id)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al actualizar el estilo")
	}
	return respond(c, http.StatusOK, estiloCreadoResponse{
		ID:     estilo.ID.String(),
		Codigo: estilo.Codigo,
		Nombre: estilo.Nombre,
	})
}

func (h *Handler) Delete(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	id, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de estilo inválido")
	}
	if err := h.svc.DeleteEstilo(c.Request().Context(), id, orgID); err != nil {
		if errors.Is(err, ErrEstiloGlobalNoEditable) {
			return fail(c, http.StatusForbidden, "ESTILO_GLOBAL_NO_EDITABLE", "El catálogo BJCP global no es editable")
		}
		if errors.Is(err, ErrEstiloNotFound) || errors.Is(err, sql.ErrNoRows) {
			return fail(c, http.StatusNotFound, "ESTILO_NOT_FOUND", "El estilo solicitado no existe")
		}
		if errors.Is(err, ErrEstiloEnUso) {
			return fail(c, http.StatusConflict, "ESTILO_EN_USO", "El estilo tiene muestras o subestilos asociados")
		}
		slog.Error("delete estilo failed", "error", err, "id", id)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al eliminar el estilo")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) UpdateCampos(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	id, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de estilo inválido")
	}
	var req UpdateCamposRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	estilo, err := h.svc.UpdateEstiloCampos(c.Request().Context(), id, orgID, req)
	if err != nil {
		if errors.Is(err, ErrEstiloGlobalNoEditable) {
			return fail(c, http.StatusForbidden, "ESTILO_GLOBAL_NO_EDITABLE", "El catálogo BJCP global no es editable")
		}
		if errors.Is(err, ErrEstiloNotFound) || errors.Is(err, sql.ErrNoRows) {
			return fail(c, http.StatusNotFound, "ESTILO_NOT_FOUND", "El estilo solicitado no existe")
		}
		if errors.Is(err, ErrTipoCampoInvalido) {
			return fail(c, http.StatusUnprocessableEntity, "TIPO_CAMPO_INVALIDO", "Uno o más campos tienen un tipo inválido (válidos: text, textarea, boolean)")
		}
		if errors.Is(err, ErrClaveCampoInvalida) {
			return fail(c, http.StatusUnprocessableEntity, "CLAVE_CAMPO_INVALIDA", "La clave de un campo debe ser snake_case (^[a-z][a-z0-9_]*$)")
		}
		slog.Error("update estilo campos failed", "error", err, "id", id)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al actualizar los campos del estilo")
	}
	return respond(c, http.StatusOK, estiloCamposResponse{
		ID:                  estilo.ID.String(),
		CamposInfoAdicional: estilo.CamposInfoAdicional.RawMessage,
	})
}
