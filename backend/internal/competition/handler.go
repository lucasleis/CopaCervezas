package competition

import (
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/lucasleis/nivalis/internal/db"
)

type CambiarEstadoRequest struct {
	Estado string `json:"estado"`
}

type estadoResponse struct {
	ID     string `json:"id"`
	Estado string `json:"estado"`
}

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Request types

type CreateEdicionRequest struct {
	Nombre                   string     `json:"nombre"`
	Anio                     int32      `json:"anio"`
	FechaInicioInscripcion   *time.Time `json:"fecha_inicio_inscripcion"`
	FechaFinInscripcion      *time.Time `json:"fecha_fin_inscripcion"`
	FechaEvento              *time.Time `json:"fecha_evento"`
	MaxMuestrasPorCerveceria int32      `json:"max_muestras_por_cerveceria"`
}

type UpdateEdicionRequest = CreateEdicionRequest

type CreatePrecioRequest struct {
	Nombre     string     `json:"nombre"`
	Precio     float64    `json:"precio"`
	FechaDesde *time.Time `json:"fecha_desde"`
	FechaHasta *time.Time `json:"fecha_hasta"`
}

type UpdatePrecioRequest = CreatePrecioRequest

type CreateLugarRequest struct {
	Nombre    string  `json:"nombre"`
	Direccion string  `json:"direccion"`
	Ciudad    string  `json:"ciudad"`
	Provincia string  `json:"provincia"`
	Horarios  *string `json:"horarios"`
}

type UpdateLugarRequest = CreateLugarRequest

type CreateDescuentoRequest struct {
	Codigo              string  `json:"codigo"`
	DescuentoPorcentaje float64 `json:"descuento_porcentaje"`
	MaxUsos             *int32  `json:"max_usos"`
}

type UpdateDescuentoRequest struct {
	Codigo              string  `json:"codigo"`
	DescuentoPorcentaje float64 `json:"descuento_porcentaje"`
	MaxUsos             *int32  `json:"max_usos"`
	Activo              bool    `json:"activo"`
}

// Response types

type edicionResponse struct {
	ID                       string     `json:"id"`
	OrgID                    string     `json:"org_id"`
	Nombre                   string     `json:"nombre"`
	Anio                     int32      `json:"anio"`
	Estado                   string     `json:"estado"`
	FechaInicioInscripcion   *time.Time `json:"fecha_inicio_inscripcion"`
	FechaFinInscripcion      *time.Time `json:"fecha_fin_inscripcion"`
	FechaEvento              *time.Time `json:"fecha_evento"`
	MaxMuestrasPorCerveceria int32      `json:"max_muestras_por_cerveceria"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}

type precioResponse struct {
	ID         string     `json:"id"`
	EdicionID  string     `json:"edicion_id"`
	Nombre     string     `json:"nombre"`
	Precio     string     `json:"precio"`
	FechaDesde *time.Time `json:"fecha_desde"`
	FechaHasta *time.Time `json:"fecha_hasta"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type lugarResponse struct {
	ID        string    `json:"id"`
	EdicionID string    `json:"edicion_id"`
	Nombre    string    `json:"nombre"`
	Direccion string    `json:"direccion"`
	Ciudad    string    `json:"ciudad"`
	Provincia string    `json:"provincia"`
	Horarios  *string   `json:"horarios"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type descuentoResponse struct {
	ID                  string    `json:"id"`
	EdicionID           string    `json:"edicion_id"`
	Codigo              string    `json:"codigo"`
	DescuentoPorcentaje string    `json:"descuento_porcentaje"`
	MaxUsos             *int32    `json:"max_usos"`
	UsosActuales        int32     `json:"usos_actuales"`
	Activo              bool      `json:"activo"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

func toEdicionResponse(e db.Edicione) edicionResponse {
	r := edicionResponse{
		ID:                       e.ID.String(),
		OrgID:                    e.OrgID.String(),
		Nombre:                   e.Nombre,
		Anio:                     e.Anio,
		Estado:                   string(e.Estado),
		MaxMuestrasPorCerveceria: e.MaxMuestrasPorCerveceria,
		CreatedAt:                e.CreatedAt,
		UpdatedAt:                e.UpdatedAt,
	}
	if e.FechaInicioInscripcion.Valid {
		r.FechaInicioInscripcion = &e.FechaInicioInscripcion.Time
	}
	if e.FechaFinInscripcion.Valid {
		r.FechaFinInscripcion = &e.FechaFinInscripcion.Time
	}
	if e.FechaEvento.Valid {
		r.FechaEvento = &e.FechaEvento.Time
	}
	return r
}

func toPrecioResponse(p db.PreciosInscripcion) precioResponse {
	r := precioResponse{
		ID:        p.ID.String(),
		EdicionID: p.EdicionID.String(),
		Nombre:    p.Nombre,
		Precio:    p.Precio,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
	}
	if p.FechaDesde.Valid {
		r.FechaDesde = &p.FechaDesde.Time
	}
	if p.FechaHasta.Valid {
		r.FechaHasta = &p.FechaHasta.Time
	}
	return r
}

func toLugarResponse(l db.LugaresEntrega) lugarResponse {
	r := lugarResponse{
		ID:        l.ID.String(),
		EdicionID: l.EdicionID.String(),
		Nombre:    l.Nombre,
		Direccion: l.Direccion,
		Ciudad:    l.Ciudad,
		Provincia: l.Provincia,
		CreatedAt: l.CreatedAt,
		UpdatedAt: l.UpdatedAt,
	}
	if l.Horarios.Valid {
		r.Horarios = &l.Horarios.String
	}
	return r
}

func toDescuentoResponse(d db.CodigosDescuento) descuentoResponse {
	r := descuentoResponse{
		ID:                  d.ID.String(),
		EdicionID:           d.EdicionID.String(),
		Codigo:              d.Codigo,
		DescuentoPorcentaje: d.DescuentoPorcentaje,
		UsosActuales:        d.UsosActuales,
		Activo:              d.Activo,
		CreatedAt:           d.CreatedAt,
		UpdatedAt:           d.UpdatedAt,
	}
	if d.MaxUsos.Valid {
		r.MaxUsos = &d.MaxUsos.Int32
	}
	return r
}

// Response helpers

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
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

func orgIDFromCtx(c echo.Context) (uuid.UUID, bool) {
	id, ok := c.Get("org_id").(uuid.UUID)
	return id, ok
}

func requireAdmin(c echo.Context) bool {
	rol, _ := c.Get("rol").(string)
	return rol == "admin"
}

func parseUUID(c echo.Context, param string) (uuid.UUID, error) {
	return uuid.Parse(c.Param(param))
}

func isNotFound(err error) bool {
	return errors.Is(err, sql.ErrNoRows)
}

// Ediciones

func (h *Handler) CreateEdicion(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	var req CreateEdicionRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	edicion, err := h.svc.CreateEdicion(c.Request().Context(), orgID, req)
	if err != nil {
		slog.Error("create edicion failed", "error", err)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear la edición")
	}
	return respond(c, http.StatusCreated, toEdicionResponse(edicion))
}

func (h *Handler) ListEdiciones(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	ediciones, err := h.svc.ListEdiciones(c.Request().Context(), orgID)
	if err != nil {
		slog.Error("list ediciones failed", "error", err)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al listar las ediciones")
	}
	result := make([]edicionResponse, len(ediciones))
	for i, e := range ediciones {
		result[i] = toEdicionResponse(e)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) GetEdicion(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	id, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	edicion, err := h.svc.GetEdicion(c.Request().Context(), id, orgID)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("get edicion failed", "error", err, "id", id)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener la edición")
	}
	return respond(c, http.StatusOK, toEdicionResponse(edicion))
}

func (h *Handler) UpdateEdicion(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	id, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	var req UpdateEdicionRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	edicion, err := h.svc.UpdateEdicion(c.Request().Context(), id, orgID, req)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("update edicion failed", "error", err, "id", id)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al actualizar la edición")
	}
	return respond(c, http.StatusOK, toEdicionResponse(edicion))
}

func (h *Handler) CambiarEstado(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	id, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	var req CambiarEstadoRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	edicion, err := h.svc.CambiarEstado(c.Request().Context(), id, orgID, req.Estado)
	if err != nil {
		var transicionErr *TransicionInvalidaError
		if errors.As(err, &transicionErr) {
			return fail(c, http.StatusUnprocessableEntity, "TRANSICION_INVALIDA",
				"No se puede pasar de '"+transicionErr.Desde+"' a '"+transicionErr.Hacia+"'")
		}
		var precondicionErr *PrecondicionNoCumplidaError
		if errors.As(err, &precondicionErr) {
			return fail(c, http.StatusUnprocessableEntity, "PRECONDICION_NO_CUMPLIDA", precondicionErr.Message)
		}
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("cambiar estado failed", "error", err, "id", id)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al cambiar el estado de la edición")
	}
	return respond(c, http.StatusOK, estadoResponse{
		ID:     edicion.ID.String(),
		Estado: string(edicion.Estado),
	})
}

// Precios

func (h *Handler) CreatePrecio(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	var req CreatePrecioRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	precio, err := h.svc.CreatePrecio(c.Request().Context(), edicionID, orgID, req)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("create precio failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear el precio")
	}
	return respond(c, http.StatusCreated, toPrecioResponse(precio))
}

func (h *Handler) ListPrecios(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	precios, err := h.svc.ListPrecios(c.Request().Context(), edicionID, orgID)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("list precios failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al listar los precios")
	}
	result := make([]precioResponse, len(precios))
	for i, p := range precios {
		result[i] = toPrecioResponse(p)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) UpdatePrecio(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	precioID, err := parseUUID(c, "precio_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de precio inválido")
	}
	var req UpdatePrecioRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	precio, err := h.svc.UpdatePrecio(c.Request().Context(), precioID, edicionID, orgID, req)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "PRECIO_NOT_FOUND", "El precio solicitado no existe")
		}
		slog.Error("update precio failed", "error", err, "precio_id", precioID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al actualizar el precio")
	}
	return respond(c, http.StatusOK, toPrecioResponse(precio))
}

func (h *Handler) DeletePrecio(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	precioID, err := parseUUID(c, "precio_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de precio inválido")
	}
	if err := h.svc.DeletePrecio(c.Request().Context(), precioID, edicionID, orgID); err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("delete precio failed", "error", err, "precio_id", precioID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al eliminar el precio")
	}
	return c.NoContent(http.StatusNoContent)
}

// Lugares

func (h *Handler) CreateLugar(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	var req CreateLugarRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	lugar, err := h.svc.CreateLugar(c.Request().Context(), edicionID, orgID, req)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("create lugar failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear el lugar")
	}
	return respond(c, http.StatusCreated, toLugarResponse(lugar))
}

func (h *Handler) ListLugares(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	lugares, err := h.svc.ListLugares(c.Request().Context(), edicionID, orgID)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("list lugares failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al listar los lugares de entrega")
	}
	result := make([]lugarResponse, len(lugares))
	for i, l := range lugares {
		result[i] = toLugarResponse(l)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) UpdateLugar(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	lugarID, err := parseUUID(c, "lugar_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de lugar inválido")
	}
	var req UpdateLugarRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	lugar, err := h.svc.UpdateLugar(c.Request().Context(), lugarID, edicionID, orgID, req)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "LUGAR_NOT_FOUND", "El lugar solicitado no existe")
		}
		slog.Error("update lugar failed", "error", err, "lugar_id", lugarID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al actualizar el lugar")
	}
	return respond(c, http.StatusOK, toLugarResponse(lugar))
}

func (h *Handler) DeleteLugar(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	lugarID, err := parseUUID(c, "lugar_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de lugar inválido")
	}
	if err := h.svc.DeleteLugar(c.Request().Context(), lugarID, edicionID, orgID); err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("delete lugar failed", "error", err, "lugar_id", lugarID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al eliminar el lugar")
	}
	return c.NoContent(http.StatusNoContent)
}

// Descuentos

func (h *Handler) CreateDescuento(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	var req CreateDescuentoRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	descuento, err := h.svc.CreateDescuento(c.Request().Context(), edicionID, orgID, req)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("create descuento failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear el código de descuento")
	}
	return respond(c, http.StatusCreated, toDescuentoResponse(descuento))
}

func (h *Handler) ListDescuentos(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	descuentos, err := h.svc.ListDescuentos(c.Request().Context(), edicionID, orgID)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("list descuentos failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al listar los códigos de descuento")
	}
	result := make([]descuentoResponse, len(descuentos))
	for i, d := range descuentos {
		result[i] = toDescuentoResponse(d)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) UpdateDescuento(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	descuentoID, err := parseUUID(c, "descuento_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de descuento inválido")
	}
	var req UpdateDescuentoRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	descuento, err := h.svc.UpdateDescuento(c.Request().Context(), descuentoID, edicionID, orgID, req)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "DESCUENTO_NOT_FOUND", "El código de descuento solicitado no existe")
		}
		slog.Error("update descuento failed", "error", err, "descuento_id", descuentoID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al actualizar el código de descuento")
	}
	return respond(c, http.StatusOK, toDescuentoResponse(descuento))
}

func (h *Handler) DeleteDescuento(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	descuentoID, err := parseUUID(c, "descuento_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de descuento inválido")
	}
	if err := h.svc.DeleteDescuento(c.Request().Context(), descuentoID, edicionID, orgID); err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("delete descuento failed", "error", err, "descuento_id", descuentoID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al eliminar el código de descuento")
	}
	return c.NoContent(http.StatusNoContent)
}

// Grupos

type grupoRequest struct {
	Nombre    string  `json:"nombre"`
	BosFlight *string `json:"bos_flight"`
}

type moverMuestraRequest struct {
	GrupoID string `json:"grupo_id"`
}

type grupoResponse struct {
	ID           string    `json:"id"`
	EdicionID    string    `json:"edicion_id"`
	Nombre       string    `json:"nombre"`
	CantRondas   int32     `json:"cant_rondas"`
	Orden        int32     `json:"orden"`
	BosFlight    *string   `json:"bos_flight"`
	CantMuestras int64     `json:"cant_muestras"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type muestraSinGrupoResponse struct {
	ID              string  `json:"id"`
	NombreComercial string  `json:"nombre_comercial"`
	CodParticipante *string `json:"cod_participante"`
	EstiloID        string  `json:"estilo_id"`
	EstiloCodigo    string  `json:"estilo_codigo"`
	EstiloNombre    string  `json:"estilo_nombre"`
}

type muestraGrupoResponse struct {
	ID               string  `json:"id"`
	NombreComercial  string  `json:"nombre_comercial"`
	CodParticipante  *string `json:"cod_participante"`
	CodAnonimo       *string `json:"cod_anonimo"`
	AsignacionManual bool    `json:"asignacion_manual"`
	EstiloID         string  `json:"estilo_id"`
	EstiloCodigo     string  `json:"estilo_codigo"`
	EstiloNombre     string  `json:"estilo_nombre"`
}

type autoasignarResponse struct {
	GruposCreados     int `json:"grupos_creados"`
	MuestrasAsignadas int `json:"muestras_asignadas"`
}

func toGrupoResponseFromList(g db.ListGruposEdicionRow, edicionID uuid.UUID) grupoResponse {
	r := grupoResponse{
		ID:           g.ID.String(),
		EdicionID:    edicionID.String(),
		Nombre:       g.Nombre,
		CantRondas:   g.CantRondas,
		Orden:        g.Orden,
		CantMuestras: g.CantMuestras,
		CreatedAt:    g.CreatedAt,
		UpdatedAt:    g.UpdatedAt,
	}
	if g.BosFlight.Valid {
		r.BosFlight = &g.BosFlight.String
	}
	return r
}

func toGrupoResponse(g db.Grupo, cantMuestras int64) grupoResponse {
	r := grupoResponse{
		ID:           g.ID.String(),
		EdicionID:    g.EdicionID.String(),
		Nombre:       g.Nombre,
		CantRondas:   g.CantRondas,
		Orden:        g.Orden,
		CantMuestras: cantMuestras,
		CreatedAt:    g.CreatedAt,
		UpdatedAt:    g.UpdatedAt,
	}
	if g.BosFlight.Valid {
		r.BosFlight = &g.BosFlight.String
	}
	return r
}

func toMuestraSinGrupoResponse(m db.ListMuestrasSinGrupoRow) muestraSinGrupoResponse {
	r := muestraSinGrupoResponse{
		ID:              m.ID.String(),
		NombreComercial: m.NombreComercial,
		EstiloID:        m.EstiloID.String(),
		EstiloCodigo:    m.EstiloCodigo,
		EstiloNombre:    m.EstiloNombre,
	}
	if m.CodParticipante.Valid {
		r.CodParticipante = &m.CodParticipante.String
	}
	return r
}

func toMuestraGrupoResponse(m db.ListMuestrasByGrupoRow) muestraGrupoResponse {
	r := muestraGrupoResponse{
		ID:               m.ID.String(),
		NombreComercial:  m.NombreComercial,
		AsignacionManual: m.AsignacionManual,
		EstiloID:         m.EstiloID.String(),
		EstiloCodigo:     m.EstiloCodigo,
		EstiloNombre:     m.EstiloNombre,
	}
	if m.CodParticipante.Valid {
		r.CodParticipante = &m.CodParticipante.String
	}
	if m.CodAnonimo.Valid {
		r.CodAnonimo = &m.CodAnonimo.String
	}
	return r
}

// failGrupoError mapea los errores tipados del servicio de grupos a su respuesta HTTP.
// Devuelve handled=false si err no es uno de los tipos conocidos, en cuyo caso el
// caller no debe usar resp (fail/c.JSON devuelven nil en éxito, no un sentinel).
func failGrupoError(c echo.Context, err error) (handled bool, resp error) {
	var transicionErr *TransicionInvalidaError
	if errors.As(err, &transicionErr) {
		return true, fail(c, http.StatusUnprocessableEntity, "TRANSICION_INVALIDA",
			"La edición debe estar en estado 'pre-cata' para operar sobre grupos")
	}
	var grupoConMuestrasErr GrupoConMuestrasError
	if errors.As(err, &grupoConMuestrasErr) {
		return true, fail(c, http.StatusConflict, "GRUPO_CON_MUESTRAS", grupoConMuestrasErr.Error())
	}
	var todasAsignadasErr TodasAsignadasError
	if errors.As(err, &todasAsignadasErr) {
		return true, fail(c, http.StatusConflict, "TODAS_MUESTRAS_ASIGNADAS", todasAsignadasErr.Error())
	}
	if isNotFound(err) {
		return true, fail(c, http.StatusNotFound, "NOT_FOUND", "El recurso solicitado no existe")
	}
	return false, nil
}

func (h *Handler) ListGrupos(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	grupos, err := h.svc.ListGrupos(c.Request().Context(), edicionID, orgID)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("list grupos failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al listar los grupos")
	}
	result := make([]grupoResponse, len(grupos))
	for i, g := range grupos {
		result[i] = toGrupoResponseFromList(g, edicionID)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) CreateGrupo(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	var req grupoRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	grupo, err := h.svc.CreateGrupo(c.Request().Context(), edicionID, orgID, req.Nombre, req.BosFlight)
	if err != nil {
		if handled, resp := failGrupoError(c, err); handled {
			return resp
		}
		slog.Error("create grupo failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear el grupo")
	}
	return respond(c, http.StatusCreated, toGrupoResponse(grupo, 0))
}

func (h *Handler) UpdateGrupo(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	grupoID, err := parseUUID(c, "grupo_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de grupo inválido")
	}
	var req grupoRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	grupo, err := h.svc.UpdateGrupo(c.Request().Context(), grupoID, edicionID, orgID, req.Nombre, req.BosFlight)
	if err != nil {
		if handled, resp := failGrupoError(c, err); handled {
			return resp
		}
		slog.Error("update grupo failed", "error", err, "grupo_id", grupoID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al actualizar el grupo")
	}
	return respond(c, http.StatusOK, toGrupoResponse(grupo, 0))
}

func (h *Handler) DeleteGrupo(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	grupoID, err := parseUUID(c, "grupo_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de grupo inválido")
	}
	if err := h.svc.DeleteGrupo(c.Request().Context(), grupoID, edicionID, orgID); err != nil {
		if handled, resp := failGrupoError(c, err); handled {
			return resp
		}
		slog.Error("delete grupo failed", "error", err, "grupo_id", grupoID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al eliminar el grupo")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) AutoasignarGrupos(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	gruposCreados, muestrasAsignadas, err := h.svc.AutoasignarGrupos(c.Request().Context(), edicionID, orgID)
	if err != nil {
		if handled, resp := failGrupoError(c, err); handled {
			return resp
		}
		slog.Error("autoasignar grupos failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al autoasignar los grupos")
	}
	return respond(c, http.StatusOK, autoasignarResponse{
		GruposCreados:     gruposCreados,
		MuestrasAsignadas: muestrasAsignadas,
	})
}

func (h *Handler) MoverMuestra(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	muestraID, err := parseUUID(c, "muestra_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de muestra inválido")
	}
	var req moverMuestraRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	grupoID, err := uuid.Parse(req.GrupoID)
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de grupo inválido")
	}
	if err := h.svc.MoverMuestra(c.Request().Context(), muestraID, grupoID, edicionID, orgID); err != nil {
		if handled, resp := failGrupoError(c, err); handled {
			return resp
		}
		slog.Error("mover muestra failed", "error", err, "muestra_id", muestraID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al mover la muestra")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) ListMuestrasSinGrupo(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	muestras, err := h.svc.ListMuestrasSinGrupo(c.Request().Context(), edicionID, orgID)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("list muestras sin grupo failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al listar las muestras sin grupo")
	}
	result := make([]muestraSinGrupoResponse, len(muestras))
	for i, m := range muestras {
		result[i] = toMuestraSinGrupoResponse(m)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) ListMuestrasByGrupo(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	grupoID, err := parseUUID(c, "grupo_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de grupo inválido")
	}
	muestras, err := h.svc.ListMuestrasByGrupo(c.Request().Context(), grupoID, edicionID, orgID)
	if err != nil {
		if isNotFound(err) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("list muestras by grupo failed", "error", err, "grupo_id", grupoID, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al listar las muestras del grupo")
	}
	result := make([]muestraGrupoResponse, len(muestras))
	for i, m := range muestras {
		result[i] = toMuestraGrupoResponse(m)
	}
	return respond(c, http.StatusOK, result)
}
