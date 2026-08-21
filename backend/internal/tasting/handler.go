package tasting

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	gorillaws "github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/lucasleis/nivalis/internal/db"
	"github.com/lucasleis/nivalis/internal/styles"
	"github.com/lucasleis/nivalis/pkg/websocket"
)

type Handler struct {
	svc           *Service
	hub           *websocket.Hub
	allowedOrigin string
}

func NewHandler(svc *Service, hub *websocket.Hub, allowedOrigin string) *Handler {
	return &Handler{svc: svc, hub: hub, allowedOrigin: allowedOrigin}
}

// checkOrigin restringe el handshake de WebSocket al mismo origen que CORS
// permite para el resto del server (main.go) — reusa esa config, no duplica
// la lista de orígenes permitidos.
func (h *Handler) checkOrigin(r *http.Request) bool {
	return r.Header.Get("Origin") == h.allowedOrigin
}

type evaluacionCompletadaEvent struct {
	Tipo              string    `json:"tipo"`
	VueloID           uuid.UUID `json:"vuelo_id"`
	MuestraID         uuid.UUID `json:"muestra_id"`
	JuezID            uuid.UUID `json:"juez_id"`
	Avanza            *bool     `json:"avanza"`
	JuezCompletoVuelo bool      `json:"juez_completo_vuelo"`
}

// Response types

type edicionJuezResponse struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
	Estado string `json:"estado"`
}

type vueloJuezResponse struct {
	ID          string `json:"id"`
	NumeroRonda int32  `json:"numero_ronda"`
	Orden       int32  `json:"orden"`
	Estado      string `json:"estado"`
	GrupoNombre string `json:"grupo_nombre"`
	CantRondas  int32  `json:"cant_rondas"`
	MiEstado    string `json:"mi_estado"`
}

type muestraVueloResponse struct {
	ID            string          `json:"id"`
	CodAnonimo    *string         `json:"cod_anonimo"`
	InfoAdicional json.RawMessage `json:"info_adicional"`
	EstiloCodigo  string          `json:"estilo_codigo"`
	EstiloNombre  string          `json:"estilo_nombre"`
	Orden         int32           `json:"orden"`
}

type evaluacionCreatedResponse struct {
	ID string `json:"id"`
}

type progresoVueloResponse struct {
	VueloID           string `json:"vuelo_id"`
	NumeroRonda       int32  `json:"numero_ronda"`
	Orden             int32  `json:"orden"`
	Estado            string `json:"estado"`
	GrupoNombre       string `json:"grupo_nombre"`
	TotalJueces       int64  `json:"total_jueces"`
	JuecesCompletados int64  `json:"jueces_completados"`
}

type incongruenciaResponse struct {
	VueloID          string  `json:"vuelo_id"`
	MuestraID        string  `json:"muestra_id"`
	CodAnonimo       *string `json:"cod_anonimo"`
	AvanzaTrueCount  int64   `json:"avanza_true_count"`
	AvanzaFalseCount int64   `json:"avanza_false_count"`
}

type evaluacionJuezResponse struct {
	ID           string    `json:"id"`
	MuestraID    string    `json:"muestra_id"`
	VueloID      string    `json:"vuelo_id"`
	Avanza       *bool     `json:"avanza"`
	CreatedAt    time.Time `json:"created_at"`
	CodAnonimo   *string   `json:"cod_anonimo"`
	EstiloNombre string    `json:"estilo_nombre"`
}

type evaluacionDetalleResponse struct {
	ID              string          `json:"id"`
	MuestraID       string          `json:"muestra_id"`
	VueloID         string          `json:"vuelo_id"`
	Avanza          *bool           `json:"avanza"`
	ComentarioFinal *string         `json:"comentario_final"`
	Puntajes        json.RawMessage `json:"puntajes"`
	CreatedAt       time.Time       `json:"created_at"`
}

func toVueloJuezResponse(v db.GetVuelosJuezRow) vueloJuezResponse {
	return vueloJuezResponse{
		ID:          v.ID.String(),
		NumeroRonda: v.NumeroRonda,
		Orden:       v.Orden,
		Estado:      string(v.Estado),
		GrupoNombre: v.GrupoNombre,
		CantRondas:  v.CantRondas,
		MiEstado:    string(v.MiEstado),
	}
}

func toMuestraVueloResponse(m db.GetMuestrasVueloRow) muestraVueloResponse {
	r := muestraVueloResponse{
		ID:           m.ID.String(),
		EstiloCodigo: m.EstiloCodigo,
		EstiloNombre: m.EstiloNombre,
		Orden:        m.Orden,
	}
	if m.CodAnonimo.Valid {
		r.CodAnonimo = &m.CodAnonimo.String
	}
	if m.InfoAdicional.Valid {
		var camposSchema json.RawMessage
		if m.EstiloCamposInfoAdicional.Valid {
			camposSchema = m.EstiloCamposInfoAdicional.RawMessage
		}
		// Sin schema (camposSchema nil), el helper aplica la misma lista blanca:
		// nada marcado visible_jueces:true, nada se expone.
		r.InfoAdicional = styles.FiltrarInfoAdicionalJueces(m.InfoAdicional.RawMessage, camposSchema)
	}
	return r
}

func toEvaluacionDetalleResponse(ev db.GetEvaluacionDetalleJuezRow) evaluacionDetalleResponse {
	r := evaluacionDetalleResponse{
		ID:        ev.ID.String(),
		MuestraID: ev.MuestraID.String(),
		VueloID:   ev.VueloID.String(),
		CreatedAt: ev.CreatedAt,
	}
	if ev.Avanza.Valid {
		r.Avanza = &ev.Avanza.Bool
	}
	if ev.ComentarioFinal.Valid {
		r.ComentarioFinal = &ev.ComentarioFinal.String
	}
	if ev.Puntajes.Valid {
		r.Puntajes = ev.Puntajes.RawMessage
	}
	return r
}

// Response helpers (mismo formato que competition.Handler)

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

func requireJuez(c echo.Context) bool {
	rol, _ := c.Get("rol").(string)
	return rol == "judge"
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

func (h *Handler) GetEdicionesActivasJuez(c echo.Context) error {
	if !requireJuez(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol judge")
	}
	orgID, ok := orgIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	ediciones, err := h.svc.GetEdicionesActivasJuez(c.Request().Context(), orgID)
	if err != nil {
		slog.Error("get ediciones activas juez failed", "error", err, "org_id", orgID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener las ediciones")
	}
	result := make([]edicionJuezResponse, len(ediciones))
	for i, e := range ediciones {
		result[i] = edicionJuezResponse{
			ID:     e.ID.String(),
			Nombre: e.Nombre,
			Estado: string(e.Estado),
		}
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) GetVuelosJuez(c echo.Context) error {
	if !requireJuez(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol judge")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "edicion_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	vuelos, err := h.svc.GetVuelosJuez(c.Request().Context(), usuarioID, edicionID)
	if err != nil {
		slog.Error("get vuelos juez failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener los vuelos")
	}
	result := make([]vueloJuezResponse, len(vuelos))
	for i, v := range vuelos {
		result[i] = toVueloJuezResponse(v)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) GetMuestrasVuelo(c echo.Context) error {
	if !requireJuez(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol judge")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	vueloID, err := parseUUID(c, "vuelo_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de vuelo inválido")
	}
	muestras, err := h.svc.GetMuestrasVuelo(c.Request().Context(), usuarioID, vueloID)
	if err != nil {
		if errors.Is(err, ErrSinAsignacion) {
			return fail(c, http.StatusForbidden, "SIN_ASIGNACION", "El juez no tiene asignación para este vuelo")
		}
		slog.Error("get muestras vuelo failed", "error", err, "vuelo_id", vueloID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener las muestras")
	}
	result := make([]muestraVueloResponse, len(muestras))
	for i, m := range muestras {
		result[i] = toMuestraVueloResponse(m)
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) CreateEvaluacion(c echo.Context) error {
	if !requireJuez(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol judge")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "edicion_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	var req CreateEvaluacionRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	evaluacion, edicionReal, juezCompletoVuelo, err := h.svc.CreateEvaluacion(c.Request().Context(), usuarioID, edicionID, req)
	if err != nil {
		if errors.Is(err, ErrSinAsignacion) {
			return fail(c, http.StatusForbidden, "SIN_ASIGNACION", "El juez no tiene asignación para este vuelo")
		}
		if errors.Is(err, ErrMuestraNoPerteneceAlVuelo) {
			return fail(c, http.StatusUnprocessableEntity, "MUESTRA_NO_PERTENECE_AL_VUELO", "La muestra indicada no pertenece a este vuelo")
		}
		if errors.Is(err, ErrEdicionNotFound) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		if errors.Is(err, ErrEvaluacionDuplicada) {
			return fail(c, http.StatusConflict, "EVALUACION_DUPLICADA", "Ya existe una evaluación para esta muestra en este vuelo")
		}
		if errors.Is(err, ErrComentarioFinalRequerido) {
			return fail(c, http.StatusUnprocessableEntity, "COMENTARIO_FINAL_REQUERIDO", "El comentario final es requerido para evaluaciones finales")
		}
		slog.Error("create evaluacion failed", "error", err)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al crear la evaluación")
	}
	// edicionReal viene del vuelo (derivado en el servicio), nunca del path —
	// el broadcast no puede depender de un valor que vino del cliente.
	h.broadcastEvaluacionCompletada(edicionReal, evaluacion, juezCompletoVuelo)
	return respond(c, http.StatusCreated, evaluacionCreatedResponse{ID: evaluacion.ID.String()})
}

// GetEvaluacionDetalle devuelve el detalle completo de una evaluación propia
// del juez autenticado (puntajes, comentario_final, avanza).
func (h *Handler) GetEvaluacionDetalle(c echo.Context) error {
	if !requireJuez(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol judge")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	evaluacionID, err := parseUUID(c, "evaluacion_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de evaluación inválido")
	}
	evaluacion, err := h.svc.GetEvaluacionDetalle(c.Request().Context(), evaluacionID, usuarioID)
	if err != nil {
		if errors.Is(err, ErrEvaluacionNotFound) {
			return fail(c, http.StatusNotFound, "EVALUACION_NOT_FOUND", "La evaluación solicitada no existe")
		}
		slog.Error("get evaluacion detalle failed", "error", err, "evaluacion_id", evaluacionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener el detalle de la evaluación")
	}
	return respond(c, http.StatusOK, toEvaluacionDetalleResponse(evaluacion))
}

func (h *Handler) broadcastEvaluacionCompletada(edicionID uuid.UUID, evaluacion db.Evaluacione, juezCompletoVuelo bool) {
	if h.hub == nil {
		return
	}
	event := evaluacionCompletadaEvent{
		Tipo:              "evaluacion_completada",
		VueloID:           evaluacion.VueloID,
		MuestraID:         evaluacion.MuestraID,
		JuezID:            evaluacion.JuezID,
		JuezCompletoVuelo: juezCompletoVuelo,
	}
	if evaluacion.Avanza.Valid {
		event.Avanza = &evaluacion.Avanza.Bool
	}
	payload, err := json.Marshal(event)
	if err != nil {
		slog.Error("marshal evaluacion completada event failed", "error", err)
		return
	}
	h.hub.Broadcast <- websocket.Message{EdicionID: edicionID, Payload: payload}
}

// LiveCata hace upgrade de la conexión a WebSocket y suscribe al admin a los eventos
// de la edición indicada.
func (h *Handler) LiveCata(c echo.Context) error {
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
	// Verificar ownership ANTES del upgrade: permite rechazar con HTTP normal
	// (404 en vez de 101 seguido de cierre), igual que GetProgresoVuelosEdicion
	// y GetIncongruenciasVuelo.
	if err := h.svc.VerificarEdicionOwnership(c.Request().Context(), edicionID, orgID); err != nil {
		if errors.Is(err, ErrEdicionNotFound) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("live cata: verify edicion ownership failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al verificar la edición")
	}
	upgrader := gorillaws.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     h.checkOrigin,
	}
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		slog.Error("websocket upgrade failed", "error", err, "edicion_id", edicionID)
		return err
	}
	client := &websocket.Client{
		EdicionID: edicionID,
		Conn:      conn,
		Send:      make(chan []byte, 16),
	}
	h.hub.ServeClient(client)
	return nil
}

func (h *Handler) GetEvaluacionesJuez(c echo.Context) error {
	if !requireJuez(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol judge")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	edicionID, err := parseUUID(c, "edicion_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de edición inválido")
	}
	orderBy := c.QueryParam("order_by")
	rows, err := h.svc.GetEvaluacionesJuez(c.Request().Context(), usuarioID, edicionID, orderBy)
	if err != nil {
		slog.Error("get evaluaciones juez failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener las evaluaciones")
	}
	result, err := toEvaluacionesJuezResponse(rows)
	if err != nil {
		slog.Error("get evaluaciones juez failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener las evaluaciones")
	}
	return respond(c, http.StatusOK, result)
}

// GetEvaluacionesJuezPorVuelo devuelve las evaluaciones propias del juez para
// un vuelo puntual, identificado directamente por vuelo_id.
func (h *Handler) GetEvaluacionesJuezPorVuelo(c echo.Context) error {
	if !requireJuez(c) {
		return fail(c, http.StatusForbidden, "FORBIDDEN", "Se requiere rol judge")
	}
	usuarioID, ok := usuarioIDFromCtx(c)
	if !ok {
		return fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "No autenticado")
	}
	vueloID, err := parseUUID(c, "vuelo_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de vuelo inválido")
	}
	rows, err := h.svc.GetEvaluacionesJuezPorVuelo(c.Request().Context(), usuarioID, vueloID)
	if err != nil {
		slog.Error("get evaluaciones juez por vuelo failed", "error", err, "vuelo_id", vueloID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener las evaluaciones")
	}
	result := make([]evaluacionJuezResponse, len(rows))
	for i, e := range rows {
		result[i] = evaluacionJuezResponse{
			ID:           e.ID.String(),
			MuestraID:    e.MuestraID.String(),
			VueloID:      e.VueloID.String(),
			CreatedAt:    e.CreatedAt,
			EstiloNombre: e.EstiloNombre,
		}
		if e.Avanza.Valid {
			result[i].Avanza = &e.Avanza.Bool
		}
		if e.CodAnonimo.Valid {
			result[i].CodAnonimo = &e.CodAnonimo.String
		}
	}
	return respond(c, http.StatusOK, result)
}

// Admin

type updateEvaluacionAdminResponse struct {
	ID string `json:"id"`
}

func (h *Handler) GetProgresoVuelosEdicion(c echo.Context) error {
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
	rows, err := h.svc.GetProgresoVuelosEdicion(c.Request().Context(), edicionID, orgID)
	if err != nil {
		if errors.Is(err, ErrEdicionNotFound) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("get progreso vuelos edicion failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener el progreso de los vuelos")
	}
	result := make([]progresoVueloResponse, len(rows))
	for i, r := range rows {
		result[i] = progresoVueloResponse{
			VueloID:           r.ID.String(),
			NumeroRonda:       r.NumeroRonda,
			Orden:             r.Orden,
			Estado:            string(r.Estado),
			GrupoNombre:       r.GrupoNombre,
			TotalJueces:       r.TotalJueces,
			JuecesCompletados: r.JuecesCompletados,
		}
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) GetIncongruenciasVuelo(c echo.Context) error {
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
	rows, err := h.svc.GetIncongruenciasVuelo(c.Request().Context(), edicionID, orgID)
	if err != nil {
		if errors.Is(err, ErrEdicionNotFound) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		slog.Error("get incongruencias vuelo failed", "error", err, "edicion_id", edicionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al obtener las incongruencias")
	}
	result := make([]incongruenciaResponse, len(rows))
	for i, r := range rows {
		item := incongruenciaResponse{
			VueloID:          r.VueloID.String(),
			MuestraID:        r.MuestraID.String(),
			AvanzaTrueCount:  r.CantAvanzaTrue,
			AvanzaFalseCount: r.CantAvanzaFalse,
		}
		if r.CodAnonimo.Valid {
			item.CodAnonimo = &r.CodAnonimo.String
		}
		result[i] = item
	}
	return respond(c, http.StatusOK, result)
}

func (h *Handler) UpdateEvaluacionAdmin(c echo.Context) error {
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
	evaluacionID, err := parseUUID(c, "evaluacion_id")
	if err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "ID de evaluación inválido")
	}
	var req UpdateEvaluacionAdminRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "BAD_REQUEST", "Cuerpo de request inválido")
	}
	evaluacion, err := h.svc.UpdateEvaluacionAdmin(c.Request().Context(), evaluacionID, edicionID, orgID, req)
	if err != nil {
		if errors.Is(err, ErrEdicionNotFound) {
			return fail(c, http.StatusNotFound, "EDICION_NOT_FOUND", "La edición solicitada no existe")
		}
		if errors.Is(err, ErrEvaluacionNotFound) {
			return fail(c, http.StatusNotFound, "EVALUACION_NOT_FOUND", "La evaluación solicitada no existe")
		}
		slog.Error("update evaluacion admin failed", "error", err, "evaluacion_id", evaluacionID)
		return fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Error al actualizar la evaluación")
	}
	return respond(c, http.StatusOK, updateEvaluacionAdminResponse{ID: evaluacion.ID.String()})
}

func toEvaluacionesJuezResponse(rows interface{}) ([]evaluacionJuezResponse, error) {
	switch v := rows.(type) {
	case []db.GetEvaluacionesJuezByGrupoRow:
		result := make([]evaluacionJuezResponse, len(v))
		for i, e := range v {
			result[i] = evaluacionJuezResponse{
				ID:           e.ID.String(),
				MuestraID:    e.MuestraID.String(),
				VueloID:      e.VueloID.String(),
				CreatedAt:    e.CreatedAt,
				EstiloNombre: e.EstiloNombre,
			}
			if e.Avanza.Valid {
				result[i].Avanza = &e.Avanza.Bool
			}
			if e.CodAnonimo.Valid {
				result[i].CodAnonimo = &e.CodAnonimo.String
			}
		}
		return result, nil
	case []db.GetEvaluacionesJuezByCodigoRow:
		result := make([]evaluacionJuezResponse, len(v))
		for i, e := range v {
			result[i] = evaluacionJuezResponse{
				ID:           e.ID.String(),
				MuestraID:    e.MuestraID.String(),
				VueloID:      e.VueloID.String(),
				CreatedAt:    e.CreatedAt,
				EstiloNombre: e.EstiloNombre,
			}
			if e.Avanza.Valid {
				result[i].Avanza = &e.Avanza.Bool
			}
			if e.CodAnonimo.Valid {
				result[i].CodAnonimo = &e.CodAnonimo.String
			}
		}
		return result, nil
	default:
		return nil, errors.New("tasting: unexpected evaluaciones row type")
	}
}
