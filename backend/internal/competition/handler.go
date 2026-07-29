package competition

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/lucasleis/nivalis/internal/db"
)

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
	return err == sql.ErrNoRows
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
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al actualizar la edición")
	}
	return respond(c, http.StatusOK, toEdicionResponse(edicion))
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
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear el precio")
	}
	return respond(c, http.StatusCreated, toPrecioResponse(precio))
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
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear el lugar")
	}
	return respond(c, http.StatusCreated, toLugarResponse(lugar))
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
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear el código de descuento")
	}
	return respond(c, http.StatusCreated, toDescuentoResponse(descuento))
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
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al eliminar el código de descuento")
	}
	return c.NoContent(http.StatusNoContent)
}
