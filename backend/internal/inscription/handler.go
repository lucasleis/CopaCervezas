package inscription

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

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

type createUpdateMuestraRequest struct {
	EstiloID                    uuid.UUID       `json:"estilo_id"`
	NombreComercial             string          `json:"nombre_comercial"`
	InfoAdicional               json.RawMessage `json:"info_adicional"`
	CuentaPremioMejorCerveceria bool            `json:"cuenta_premio_mejor_cerveceria"`
	ComentariosAdicionales      *string         `json:"comentarios_adicionales"`
}

func (r createUpdateMuestraRequest) toInput() MuestraInput {
	return MuestraInput{
		EstiloID:                    r.EstiloID,
		NombreComercial:             r.NombreComercial,
		InfoAdicional:               r.InfoAdicional,
		CuentaPremioMejorCerveceria: r.CuentaPremioMejorCerveceria,
		ComentariosAdicionales:      r.ComentariosAdicionales,
	}
}

type aprobarMuestraRequest struct {
	Aprobada bool `json:"aprobada"`
}

type estadoPagoRequest struct {
	EstadoPago string `json:"estado_pago"`
}

// Response types

type muestraCerveceriaResponse struct {
	ID                          string          `json:"id"`
	EstiloNombre                string          `json:"estilo_nombre"`
	EstiloCodigo                string          `json:"estilo_codigo"`
	NombreComercial             string          `json:"nombre_comercial"`
	InfoAdicional               json.RawMessage `json:"info_adicional"`
	CuentaPremioMejorCerveceria bool            `json:"cuenta_premio_mejor_cerveceria"`
	ComentariosAdicionales      *string         `json:"comentarios_adicionales"`
	Aprobada                    bool            `json:"aprobada"`
	Activa                      bool            `json:"activa"`
	CreatedAt                   string          `json:"created_at"`
}

type muestraCreadaResponse struct {
	ID string `json:"id"`
}

type muestraAdminResponse struct {
	ID               string          `json:"id"`
	CerveceriaID     string          `json:"cerveceria_id"`
	CerveceriaNombre string          `json:"cerveceria_nombre"`
	CerveceriaEmail  string          `json:"cerveceria_email"`
	EstiloNombre     string          `json:"estilo_nombre"`
	NombreComercial  string          `json:"nombre_comercial"`
	InfoAdicional    json.RawMessage `json:"info_adicional"`
	Aprobada         bool            `json:"aprobada"`
	Activa           bool            `json:"activa"`
	EstadoPago       string          `json:"estado_pago"`
	CodParticipante  *string         `json:"cod_participante"`
}

type muestraAprobadaResponse struct {
	ID       string `json:"id"`
	Aprobada bool   `json:"aprobada"`
}

type cerveceriaEstadoPagoResponse struct {
	ID         string `json:"id"`
	EstadoPago string `json:"estado_pago"`
}

// Response helpers

type apiError struct {
	Code      string   `json:"code"`
	Message   string   `json:"message"`
	Faltantes []string `json:"faltantes,omitempty"`
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

func failInfoAdicionalIncompleta(c echo.Context, faltantes []string) error {
	return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{
		"data": nil,
		"error": apiError{
			Code:      "INFO_ADICIONAL_INCOMPLETA",
			Message:   "Faltan campos obligatorios en info_adicional",
			Faltantes: faltantes,
		},
	})
}

func requireBrewery(c echo.Context) bool {
	rol, _ := c.Get("rol").(string)
	return rol == "brewery"
}

func requireAdmin(c echo.Context) bool {
	rol, _ := c.Get("rol").(string)
	return rol == "admin"
}

func usuarioIDFromCtx(c echo.Context) (uuid.UUID, bool) {
	id, ok := c.Get("usuario_id").(uuid.UUID)
	return id, ok
}

func orgIDFromCtx(c echo.Context) (uuid.UUID, bool) {
	id, ok := c.Get("org_id").(uuid.UUID)
	return id, ok
}

func parseUUID(c echo.Context, param string) (uuid.UUID, error) {
	return uuid.Parse(c.Param(param))
}

func handleMuestraError(c echo.Context, err error, logMsg string) error {
	var infoErr *ErrInfoAdicionalIncompleta
	if errors.As(err, &infoErr) {
		return failInfoAdicionalIncompleta(c, infoErr.Faltantes)
	}
	if errors.Is(err, ErrEdicionNotFound) {
		return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
	}
	if errors.Is(err, ErrEdicionNoEnInscripcion) {
		return fail(c, http.StatusForbidden, "EDICION_NO_EN_INSCRIPCION", "La edición no está en período de inscripción")
	}
	if errors.Is(err, ErrCerveceriaNotFound) {
		return fail(c, http.StatusNotFound, "CERVECERIA_NOT_FOUND", "No existe una cervecería para este usuario en esta edición")
	}
	if errors.Is(err, ErrMaxMuestrasAlcanzado) {
		return fail(c, http.StatusUnprocessableEntity, "MAX_MUESTRAS_ALCANZADO", "Se alcanzó el máximo de muestras permitidas para esta cervecería")
	}
	if errors.Is(err, ErrNombreComercialRequerido) {
		return fail(c, http.StatusUnprocessableEntity, "NOMBRE_COMERCIAL_REQUERIDO", "El nombre comercial es requerido")
	}
	if errors.Is(err, ErrEstiloNoValido) {
		return fail(c, http.StatusUnprocessableEntity, "ESTILO_NO_VALIDO", "El estilo seleccionado no es válido")
	}
	if errors.Is(err, ErrMuestraNotFound) || errors.Is(err, sql.ErrNoRows) {
		return fail(c, http.StatusNotFound, "MUESTRA_NOT_FOUND", "La muestra solicitada no existe")
	}
	slog.Error(logMsg, "error", err)
	return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Ocurrió un error inesperado")
}

// Cervecería

type edicionCerveceriaResponse struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
	Estado string `json:"estado"`
}

func (h *Handler) GetEdicionesActivas(c echo.Context) error {
	if !requireBrewery(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol brewery")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	ediciones, err := h.svc.GetEdicionesActivasCerveceria(c.Request().Context(), usuarioID, orgID)
	if err != nil {
		slog.Error("get ediciones activas cerveceria failed", "error", err, "org_id", orgID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener las ediciones")
	}
	result := make([]edicionCerveceriaResponse, len(ediciones))
	for i, e := range ediciones {
		result[i] = edicionCerveceriaResponse{ID: e.ID.String(), Nombre: e.Nombre, Estado: string(e.Estado)}
	}
	return respond(c, http.StatusOK, result)
}

type edicionDisponibleResponse struct {
	ID                     string  `json:"id"`
	Nombre                 string  `json:"nombre"`
	FechaInicioInscripcion *string `json:"fecha_inicio_inscripcion"`
	FechaFinInscripcion    *string `json:"fecha_fin_inscripcion"`
	FechaEvento            *string `json:"fecha_evento"`
}

func formatNullTime(t sql.NullTime) *string {
	if !t.Valid {
		return nil
	}
	formatted := t.Time.Format("2006-01-02T15:04:05Z07:00")
	return &formatted
}

func (h *Handler) GetEdicionesDisponibles(c echo.Context) error {
	if !requireBrewery(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol brewery")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	ediciones, err := h.svc.GetEdicionesDisponiblesCerveceria(c.Request().Context(), usuarioID, orgID)
	if err != nil {
		slog.Error("get ediciones disponibles cerveceria failed", "error", err, "org_id", orgID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener las ediciones disponibles")
	}
	result := make([]edicionDisponibleResponse, len(ediciones))
	for i, e := range ediciones {
		result[i] = edicionDisponibleResponse{
			ID:                     e.ID.String(),
			Nombre:                 e.Nombre,
			FechaInicioInscripcion: formatNullTime(e.FechaInicioInscripcion),
			FechaFinInscripcion:    formatNullTime(e.FechaFinInscripcion),
			FechaEvento:            formatNullTime(e.FechaEvento),
		}
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) ListMuestras(c echo.Context) error {
	if !requireBrewery(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol brewery")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	rows, err := h.svc.ListMuestrasCerveceria(c.Request().Context(), usuarioID, edicionID, orgID)
	if err != nil {
		return handleMuestraError(c, err, "list muestras cerveceria failed")
	}
	result := make([]muestraCerveceriaResponse, len(rows))
	for i, r := range rows {
		item := muestraCerveceriaResponse{
			ID:                          r.ID.String(),
			EstiloNombre:                r.EstiloNombre,
			EstiloCodigo:                r.EstiloCodigo,
			NombreComercial:             r.NombreComercial,
			CuentaPremioMejorCerveceria: r.CuentaPremioMejorCerveceria,
			Aprobada:                    r.Aprobada,
			Activa:                      r.Activa,
			CreatedAt:                   r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		if r.InfoAdicional.Valid {
			item.InfoAdicional = r.InfoAdicional.RawMessage
		}
		if r.ComentariosAdicionales.Valid {
			item.ComentariosAdicionales = &r.ComentariosAdicionales.String
		}
		// cod_participante deliberadamente NO se expone acá — solo al admin.
		result[i] = item
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) CreateMuestra(c echo.Context) error {
	if !requireBrewery(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol brewery")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	var req createUpdateMuestraRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	muestra, err := h.svc.CreateMuestra(c.Request().Context(), usuarioID, edicionID, orgID, req.toInput())
	if err != nil {
		return handleMuestraError(c, err, "create muestra failed")
	}
	return respond(c, http.StatusCreated, muestraCreadaResponse{ID: muestra.ID.String()})
}

func (h *Handler) UpdateMuestra(c echo.Context) error {
	if !requireBrewery(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol brewery")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
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
	var req createUpdateMuestraRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	muestra, err := h.svc.UpdateMuestra(c.Request().Context(), usuarioID, edicionID, orgID, muestraID, req.toInput())
	if err != nil {
		return handleMuestraError(c, err, "update muestra failed")
	}
	return respond(c, http.StatusOK, muestraCreadaResponse{ID: muestra.ID.String()})
}

func (h *Handler) DeleteMuestra(c echo.Context) error {
	if !requireBrewery(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol brewery")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
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
	if err := h.svc.DeleteMuestra(c.Request().Context(), usuarioID, edicionID, orgID, muestraID); err != nil {
		return handleMuestraError(c, err, "delete muestra failed")
	}
	return respond(c, http.StatusOK, muestraCreadaResponse{ID: muestraID.String()})
}

// Admin

func (h *Handler) AdminListMuestras(c echo.Context) error {
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
	rows, err := h.svc.ListMuestrasEdicionAdmin(c.Request().Context(), edicionID, orgID)
	if err != nil {
		return handleMuestraError(c, err, "admin list muestras failed")
	}

	estadoPagoFilter := c.QueryParam("estado_pago")
	aprobadaFilter := c.QueryParam("aprobada")

	result := make([]muestraAdminResponse, 0, len(rows))
	for _, r := range rows {
		if estadoPagoFilter != "" && string(r.EstadoPago) != estadoPagoFilter {
			continue
		}
		if aprobadaFilter != "" {
			want := aprobadaFilter == "true"
			if r.Aprobada != want {
				continue
			}
		}
		item := muestraAdminResponse{
			ID:               r.ID.String(),
			CerveceriaID:     r.CerveceriaID.String(),
			CerveceriaNombre: r.CerveceriaNombre,
			CerveceriaEmail:  r.CerveceriaEmail,
			EstiloNombre:     r.EstiloNombre,
			NombreComercial:  r.NombreComercial,
			Aprobada:         r.Aprobada,
			Activa:           r.Activa,
			EstadoPago:       string(r.EstadoPago),
		}
		if r.InfoAdicional.Valid {
			item.InfoAdicional = r.InfoAdicional.RawMessage
		}
		if r.CodParticipante.Valid {
			item.CodParticipante = &r.CodParticipante.String
		}
		result = append(result, item)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) AprobarMuestra(c echo.Context) error {
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
	var req aprobarMuestraRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	muestra, err := h.svc.AprobarMuestra(c.Request().Context(), edicionID, orgID, muestraID, req.Aprobada)
	if err != nil {
		return handleMuestraError(c, err, "aprobar muestra failed")
	}
	return respond(c, http.StatusOK, muestraAprobadaResponse{ID: muestra.ID.String(), Aprobada: muestra.Aprobada})
}

func (h *Handler) UpdateEstadoPago(c echo.Context) error {
	if !requireAdmin(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol admin")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	cerveceriaID, err := parseUUID(c, "id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de cervecería inválido")
	}
	var req estadoPagoRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	if req.EstadoPago != "pendiente" && req.EstadoPago != "pagado" {
		return fail(c, http.StatusUnprocessableEntity, "ESTADO_PAGO_INVALIDO", "estado_pago debe ser 'pendiente' o 'pagado'")
	}
	cerveceria, err := h.svc.UpdateEstadoPago(c.Request().Context(), cerveceriaID, orgID, db.EstadoPagoEnum(req.EstadoPago))
	if err != nil {
		if errors.Is(err, ErrCerveceriaNotFoundByID) || errors.Is(err, sql.ErrNoRows) {
			return fail(c, http.StatusNotFound, "CERVECERIA_NOT_FOUND", "La cervecería solicitada no existe")
		}
		slog.Error("update estado pago failed", "error", err)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Ocurrió un error inesperado")
	}
	return respond(c, http.StatusOK, cerveceriaEstadoPagoResponse{
		ID:         cerveceria.ID.String(),
		EstadoPago: string(cerveceria.EstadoPago),
	})
}
