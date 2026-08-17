package tasting

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/lucasleis/nivalis/internal/db"
	"github.com/sqlc-dev/pqtype"
)

// ErrSinAsignacion se retorna cuando el juez no tiene asignación para el vuelo indicado.
var ErrSinAsignacion = errors.New("tasting: el juez no tiene asignación para este vuelo")

// ErrEvaluacionDuplicada se retorna cuando ya existe una evaluación para (juez, muestra, vuelo).
var ErrEvaluacionDuplicada = errors.New("tasting: ya existe una evaluación para esta muestra en este vuelo")

// ErrComentarioFinalRequerido se retorna cuando avanza no es null y comentario_final está vacío.
var ErrComentarioFinalRequerido = errors.New("tasting: comentario_final es requerido para evaluaciones finales")

// ErrEvaluacionNotFound se retorna cuando la evaluación no existe o no pertenece a la edición/org.
var ErrEvaluacionNotFound = errors.New("tasting: la evaluación solicitada no existe")

// ErrEdicionNotFound se retorna cuando la edición no existe o no pertenece al org_id del JWT.
var ErrEdicionNotFound = errors.New("tasting: la edición solicitada no existe")

type CreateEvaluacionRequest struct {
	VueloID         uuid.UUID       `json:"vuelo_id"`
	MuestraID       uuid.UUID       `json:"muestra_id"`
	Puntajes        json.RawMessage `json:"puntajes"`
	Comentarios     *string         `json:"comentarios"`
	ComentarioFinal *string         `json:"comentario_final"`
	Avanza          *bool           `json:"avanza"`
}

type Service struct {
	queries *db.Queries
}

func NewService(queries *db.Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) GetVuelosJuez(ctx context.Context, usuarioID, edicionID uuid.UUID) ([]db.GetVuelosJuezRow, error) {
	result, err := s.queries.GetVuelosJuez(ctx, db.GetVuelosJuezParams{UsuarioID: usuarioID, EdicionID: edicionID})
	if err != nil {
		return nil, fmt.Errorf("tasting: get vuelos juez: %w", err)
	}
	return result, nil
}

func (s *Service) GetMuestrasVuelo(ctx context.Context, usuarioID, vueloID uuid.UUID) ([]db.GetMuestrasVueloRow, error) {
	if err := s.verifyAsignacion(ctx, usuarioID, vueloID); err != nil {
		return nil, err
	}
	result, err := s.queries.GetMuestrasVuelo(ctx, vueloID)
	if err != nil {
		return nil, fmt.Errorf("tasting: get muestras vuelo: %w", err)
	}
	return result, nil
}

func (s *Service) CreateEvaluacion(ctx context.Context, juezID uuid.UUID, req CreateEvaluacionRequest) (db.Evaluacione, bool, error) {
	asignacion, err := s.getAsignacion(ctx, juezID, req.VueloID)
	if err != nil {
		return db.Evaluacione{}, false, err
	}

	if _, err := s.queries.GetEvaluacionJuez(ctx, db.GetEvaluacionJuezParams{
		JuezID:    juezID,
		MuestraID: req.MuestraID,
		VueloID:   req.VueloID,
	}); err == nil {
		return db.Evaluacione{}, false, ErrEvaluacionDuplicada
	} else if !errors.Is(err, sql.ErrNoRows) {
		return db.Evaluacione{}, false, fmt.Errorf("tasting: create evaluacion: %w", err)
	}

	if req.Avanza != nil && (req.ComentarioFinal == nil || *req.ComentarioFinal == "") {
		return db.Evaluacione{}, false, ErrComentarioFinalRequerido
	}

	result, err := s.queries.CreateEvaluacion(ctx, db.CreateEvaluacionParams{
		JuezID:          juezID,
		MuestraID:       req.MuestraID,
		VueloID:         req.VueloID,
		Puntajes:        toNullRawMessage(req.Puntajes),
		Comentarios:     toNullString(req.Comentarios),
		ComentarioFinal: toNullString(req.ComentarioFinal),
		Avanza:          toNullBool(req.Avanza),
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Evaluacione{}, false, ErrEvaluacionDuplicada
		}
		return db.Evaluacione{}, false, fmt.Errorf("tasting: create evaluacion: %w", err)
	}

	juezCompletoVuelo, err := s.actualizarProgresoAsignacion(ctx, asignacion, juezID, req.VueloID)
	if err != nil {
		return db.Evaluacione{}, false, fmt.Errorf("tasting: create evaluacion: %w", err)
	}

	return result, juezCompletoVuelo, nil
}

// GetEvaluacionDetalle devuelve el detalle completo de una evaluación propia del juez.
// Filtra por juez_id además del id de la evaluación, así un juez nunca puede
// acceder al detalle de una evaluación de otro juez.
func (s *Service) GetEvaluacionDetalle(ctx context.Context, evaluacionID, juezID uuid.UUID) (db.GetEvaluacionDetalleJuezRow, error) {
	result, err := s.queries.GetEvaluacionDetalleJuez(ctx, db.GetEvaluacionDetalleJuezParams{
		ID:     evaluacionID,
		JuezID: juezID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.GetEvaluacionDetalleJuezRow{}, ErrEvaluacionNotFound
		}
		return db.GetEvaluacionDetalleJuezRow{}, fmt.Errorf("tasting: get evaluacion detalle: %w", err)
	}
	return result, nil
}

// actualizarProgresoAsignacion recalcula si el juez terminó todas las muestras
// del vuelo y actualiza asignaciones_juez.estado en consecuencia.
func (s *Service) actualizarProgresoAsignacion(
	ctx context.Context,
	asignacion db.AsignacionesJuez,
	juezID, vueloID uuid.UUID,
) (bool, error) {
	totalMuestras, err := s.queries.CountMuestrasVuelo(ctx, vueloID)
	if err != nil {
		return false, fmt.Errorf("count muestras vuelo: %w", err)
	}
	completadas, err := s.queries.CountEvaluacionesCompletadasJuez(ctx, db.CountEvaluacionesCompletadasJuezParams{
		JuezID:  juezID,
		VueloID: vueloID,
	})
	if err != nil {
		return false, fmt.Errorf("count evaluaciones completadas juez: %w", err)
	}

	juezCompletoVuelo := totalMuestras > 0 && completadas == totalMuestras

	nuevoEstado := asignacion.Estado
	switch {
	case juezCompletoVuelo:
		nuevoEstado = db.EstadoAsignacionEnumCompletado
	case asignacion.Estado == db.EstadoAsignacionEnumPendiente:
		nuevoEstado = db.EstadoAsignacionEnumEnCurso
	}

	if nuevoEstado != asignacion.Estado {
		if err := s.queries.UpdateAsignacionJuezEstado(ctx, db.UpdateAsignacionJuezEstadoParams{
			UsuarioID: juezID,
			VueloID:   vueloID,
			Estado:    nuevoEstado,
		}); err != nil {
			return false, fmt.Errorf("update asignacion juez estado: %w", err)
		}
	}

	return juezCompletoVuelo, nil
}

func (s *Service) GetEdicionesActivasJuez(ctx context.Context, orgID uuid.UUID) ([]db.GetEdicionesActivasJuezRow, error) {
	result, err := s.queries.GetEdicionesActivasJuez(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("tasting: get ediciones activas juez: %w", err)
	}
	return result, nil
}

func (s *Service) GetEvaluacionesJuez(ctx context.Context, juezID, edicionID uuid.UUID, orderBy string) (interface{}, error) {
	if orderBy == "codigo" {
		result, err := s.queries.GetEvaluacionesJuezByCodigo(ctx, db.GetEvaluacionesJuezByCodigoParams{
			JuezID:    juezID,
			EdicionID: edicionID,
		})
		if err != nil {
			return nil, fmt.Errorf("tasting: get evaluaciones juez: %w", err)
		}
		return result, nil
	}
	result, err := s.queries.GetEvaluacionesJuezByGrupo(ctx, db.GetEvaluacionesJuezByGrupoParams{
		JuezID:    juezID,
		EdicionID: edicionID,
	})
	if err != nil {
		return nil, fmt.Errorf("tasting: get evaluaciones juez: %w", err)
	}
	return result, nil
}

// Admin

type UpdateEvaluacionAdminRequest struct {
	Puntajes        json.RawMessage `json:"puntajes"`
	Comentarios     *string         `json:"comentarios"`
	ComentarioFinal *string         `json:"comentario_final"`
	Avanza          *bool           `json:"avanza"`
}

func (s *Service) GetProgresoVuelosEdicion(ctx context.Context, edicionID, orgID uuid.UUID) ([]db.GetProgresoVuelosEdicionRow, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return nil, err
	}
	result, err := s.queries.GetProgresoVuelosEdicion(ctx, edicionID)
	if err != nil {
		return nil, fmt.Errorf("tasting: get progreso vuelos edicion: %w", err)
	}
	return result, nil
}

func (s *Service) GetIncongruenciasVuelo(ctx context.Context, edicionID, orgID uuid.UUID) ([]db.GetIncongruenciasVueloRow, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return nil, err
	}
	result, err := s.queries.GetIncongruenciasVuelo(ctx, edicionID)
	if err != nil {
		return nil, fmt.Errorf("tasting: get incongruencias vuelo: %w", err)
	}
	return result, nil
}

func (s *Service) UpdateEvaluacionAdmin(ctx context.Context, evaluacionID, edicionID, orgID uuid.UUID, req UpdateEvaluacionAdminRequest) (db.Evaluacione, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.Evaluacione{}, err
	}

	actual, err := s.queries.GetEvaluacionByIDEdicionOrg(ctx, db.GetEvaluacionByIDEdicionOrgParams{
		ID:        evaluacionID,
		EdicionID: edicionID,
		OrgID:     orgID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Evaluacione{}, ErrEvaluacionNotFound
		}
		return db.Evaluacione{}, fmt.Errorf("tasting: update evaluacion admin: %w", err)
	}

	params := db.UpdateEvaluacionAdminParams{
		ID:              evaluacionID,
		Puntajes:        actual.Puntajes,
		Comentarios:     actual.Comentarios,
		ComentarioFinal: actual.ComentarioFinal,
		Avanza:          actual.Avanza,
	}
	if len(req.Puntajes) > 0 {
		params.Puntajes = toNullRawMessage(req.Puntajes)
	}
	if req.Comentarios != nil {
		params.Comentarios = toNullString(req.Comentarios)
	}
	if req.ComentarioFinal != nil {
		params.ComentarioFinal = toNullString(req.ComentarioFinal)
	}
	if req.Avanza != nil {
		params.Avanza = toNullBool(req.Avanza)
	}

	result, err := s.queries.UpdateEvaluacionAdmin(ctx, params)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Evaluacione{}, ErrEvaluacionNotFound
		}
		return db.Evaluacione{}, fmt.Errorf("tasting: update evaluacion admin: %w", err)
	}
	return result, nil
}

func (s *Service) verifyEdicionOwnership(ctx context.Context, edicionID, orgID uuid.UUID) error {
	_, err := s.queries.GetEdicionByIDAndOrg(ctx, db.GetEdicionByIDAndOrgParams{ID: edicionID, OrgID: orgID})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrEdicionNotFound
		}
		return fmt.Errorf("tasting: verify edicion ownership: %w", err)
	}
	return nil
}

func (s *Service) verifyAsignacion(ctx context.Context, usuarioID, vueloID uuid.UUID) error {
	_, err := s.getAsignacion(ctx, usuarioID, vueloID)
	return err
}

func (s *Service) getAsignacion(ctx context.Context, usuarioID, vueloID uuid.UUID) (db.AsignacionesJuez, error) {
	asignacion, err := s.queries.GetAsignacionJuezVuelo(ctx, db.GetAsignacionJuezVueloParams{
		UsuarioID: usuarioID,
		VueloID:   vueloID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.AsignacionesJuez{}, ErrSinAsignacion
		}
		return db.AsignacionesJuez{}, fmt.Errorf("tasting: verify asignacion: %w", err)
	}
	return asignacion, nil
}

func toNullRawMessage(b json.RawMessage) pqtype.NullRawMessage {
	if len(b) == 0 {
		return pqtype.NullRawMessage{}
	}
	return pqtype.NullRawMessage{RawMessage: b, Valid: true}
}

func toNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

func toNullBool(b *bool) sql.NullBool {
	if b == nil {
		return sql.NullBool{}
	}
	return sql.NullBool{Bool: *b, Valid: true}
}
