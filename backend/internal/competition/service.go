package competition

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lucasleis/nivalis/internal/db"
)

// TransicionInvalidaError se retorna cuando el estado solicitado no es alcanzable desde el estado actual.
type TransicionInvalidaError struct {
	Desde string
	Hacia string
}

func (e *TransicionInvalidaError) Error() string {
	return fmt.Sprintf("no se puede pasar de '%s' a '%s'", e.Desde, e.Hacia)
}

// PrecondicionNoCumplidaError se retorna cuando la transición es válida pero la edición no cumple los requisitos.
type PrecondicionNoCumplidaError struct {
	Message string
}

func (e *PrecondicionNoCumplidaError) Error() string {
	return e.Message
}

type Service struct {
	queries *db.Queries
}

func NewService(queries *db.Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) CreateEdicion(ctx context.Context, orgID uuid.UUID, req CreateEdicionRequest) (db.Edicione, error) {
	result, err := s.queries.CreateEdicion(ctx, db.CreateEdicionParams{
		OrgID:                    orgID,
		Nombre:                   req.Nombre,
		Anio:                     req.Anio,
		FechaInicioInscripcion:   toNullTime(req.FechaInicioInscripcion),
		FechaFinInscripcion:      toNullTime(req.FechaFinInscripcion),
		FechaEvento:              toNullTime(req.FechaEvento),
		MaxMuestrasPorCerveceria: req.MaxMuestrasPorCerveceria,
	})
	if err != nil {
		return db.Edicione{}, fmt.Errorf("competition: create edicion: %w", err)
	}
	return result, nil
}

func (s *Service) ListEdiciones(ctx context.Context, orgID uuid.UUID) ([]db.Edicione, error) {
	result, err := s.queries.ListEdicionesByOrg(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("competition: list ediciones: %w", err)
	}
	return result, nil
}

func (s *Service) GetEdicion(ctx context.Context, id, orgID uuid.UUID) (db.Edicione, error) {
	result, err := s.queries.GetEdicionByIDAndOrg(ctx, db.GetEdicionByIDAndOrgParams{ID: id, OrgID: orgID})
	if err != nil {
		return db.Edicione{}, fmt.Errorf("competition: get edicion: %w", err)
	}
	return result, nil
}

func (s *Service) UpdateEdicion(ctx context.Context, id, orgID uuid.UUID, req UpdateEdicionRequest) (db.Edicione, error) {
	result, err := s.queries.UpdateEdicion(ctx, db.UpdateEdicionParams{
		ID:                       id,
		OrgID:                    orgID,
		Nombre:                   req.Nombre,
		Anio:                     req.Anio,
		FechaInicioInscripcion:   toNullTime(req.FechaInicioInscripcion),
		FechaFinInscripcion:      toNullTime(req.FechaFinInscripcion),
		FechaEvento:              toNullTime(req.FechaEvento),
		MaxMuestrasPorCerveceria: req.MaxMuestrasPorCerveceria,
	})
	if err != nil {
		return db.Edicione{}, fmt.Errorf("competition: update edicion: %w", err)
	}
	return result, nil
}

// Precios

func (s *Service) CreatePrecio(ctx context.Context, edicionID, orgID uuid.UUID, req CreatePrecioRequest) (db.PreciosInscripcion, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.PreciosInscripcion{}, fmt.Errorf("competition: create precio: %w", err)
	}
	result, err := s.queries.CreatePrecioInscripcion(ctx, db.CreatePrecioInscripcionParams{
		EdicionID:  edicionID,
		Nombre:     req.Nombre,
		Precio:     fmt.Sprintf("%.2f", req.Precio),
		FechaDesde: toNullTime(req.FechaDesde),
		FechaHasta: toNullTime(req.FechaHasta),
	})
	if err != nil {
		return db.PreciosInscripcion{}, fmt.Errorf("competition: create precio: %w", err)
	}
	return result, nil
}

func (s *Service) ListPrecios(ctx context.Context, edicionID, orgID uuid.UUID) ([]db.PreciosInscripcion, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return nil, fmt.Errorf("competition: list precios: %w", err)
	}
	result, err := s.queries.ListPreciosByEdicion(ctx, edicionID)
	if err != nil {
		return nil, fmt.Errorf("competition: list precios: %w", err)
	}
	return result, nil
}

func (s *Service) UpdatePrecio(ctx context.Context, precioID, edicionID, orgID uuid.UUID, req UpdatePrecioRequest) (db.PreciosInscripcion, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.PreciosInscripcion{}, fmt.Errorf("competition: update precio: %w", err)
	}
	result, err := s.queries.UpdatePrecioInscripcion(ctx, db.UpdatePrecioInscripcionParams{
		ID:         precioID,
		EdicionID:  edicionID,
		Nombre:     req.Nombre,
		Precio:     fmt.Sprintf("%.2f", req.Precio),
		FechaDesde: toNullTime(req.FechaDesde),
		FechaHasta: toNullTime(req.FechaHasta),
	})
	if err != nil {
		return db.PreciosInscripcion{}, fmt.Errorf("competition: update precio: %w", err)
	}
	return result, nil
}

func (s *Service) DeletePrecio(ctx context.Context, precioID, edicionID, orgID uuid.UUID) error {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return fmt.Errorf("competition: delete precio: %w", err)
	}
	if err := s.queries.DeletePrecioInscripcion(ctx, db.DeletePrecioInscripcionParams{
		ID:        precioID,
		EdicionID: edicionID,
	}); err != nil {
		return fmt.Errorf("competition: delete precio: %w", err)
	}
	return nil
}

// Lugares

func (s *Service) CreateLugar(ctx context.Context, edicionID, orgID uuid.UUID, req CreateLugarRequest) (db.LugaresEntrega, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.LugaresEntrega{}, fmt.Errorf("competition: create lugar: %w", err)
	}
	result, err := s.queries.CreateLugarEntrega(ctx, db.CreateLugarEntregaParams{
		EdicionID: edicionID,
		Nombre:    req.Nombre,
		Direccion: req.Direccion,
		Ciudad:    req.Ciudad,
		Provincia: req.Provincia,
		Horarios:  toNullString(req.Horarios),
	})
	if err != nil {
		return db.LugaresEntrega{}, fmt.Errorf("competition: create lugar: %w", err)
	}
	return result, nil
}

func (s *Service) ListLugares(ctx context.Context, edicionID, orgID uuid.UUID) ([]db.LugaresEntrega, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return nil, fmt.Errorf("competition: list lugares: %w", err)
	}
	result, err := s.queries.ListLugaresByEdicion(ctx, edicionID)
	if err != nil {
		return nil, fmt.Errorf("competition: list lugares: %w", err)
	}
	return result, nil
}

func (s *Service) UpdateLugar(ctx context.Context, lugarID, edicionID, orgID uuid.UUID, req UpdateLugarRequest) (db.LugaresEntrega, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.LugaresEntrega{}, fmt.Errorf("competition: update lugar: %w", err)
	}
	result, err := s.queries.UpdateLugarEntrega(ctx, db.UpdateLugarEntregaParams{
		ID:        lugarID,
		EdicionID: edicionID,
		Nombre:    req.Nombre,
		Direccion: req.Direccion,
		Ciudad:    req.Ciudad,
		Provincia: req.Provincia,
		Horarios:  toNullString(req.Horarios),
	})
	if err != nil {
		return db.LugaresEntrega{}, fmt.Errorf("competition: update lugar: %w", err)
	}
	return result, nil
}

func (s *Service) DeleteLugar(ctx context.Context, lugarID, edicionID, orgID uuid.UUID) error {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return fmt.Errorf("competition: delete lugar: %w", err)
	}
	if err := s.queries.DeleteLugarEntrega(ctx, db.DeleteLugarEntregaParams{
		ID:        lugarID,
		EdicionID: edicionID,
	}); err != nil {
		return fmt.Errorf("competition: delete lugar: %w", err)
	}
	return nil
}

// Descuentos

func (s *Service) CreateDescuento(ctx context.Context, edicionID, orgID uuid.UUID, req CreateDescuentoRequest) (db.CodigosDescuento, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.CodigosDescuento{}, fmt.Errorf("competition: create descuento: %w", err)
	}
	result, err := s.queries.CreateCodigoDescuento(ctx, db.CreateCodigoDescuentoParams{
		EdicionID:           edicionID,
		Codigo:              req.Codigo,
		DescuentoPorcentaje: fmt.Sprintf("%.2f", req.DescuentoPorcentaje),
		MaxUsos:             toNullInt32(req.MaxUsos),
	})
	if err != nil {
		return db.CodigosDescuento{}, fmt.Errorf("competition: create descuento: %w", err)
	}
	return result, nil
}

func (s *Service) ListDescuentos(ctx context.Context, edicionID, orgID uuid.UUID) ([]db.CodigosDescuento, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return nil, fmt.Errorf("competition: list descuentos: %w", err)
	}
	result, err := s.queries.ListDescuentosByEdicion(ctx, edicionID)
	if err != nil {
		return nil, fmt.Errorf("competition: list descuentos: %w", err)
	}
	return result, nil
}

func (s *Service) UpdateDescuento(ctx context.Context, descuentoID, edicionID, orgID uuid.UUID, req UpdateDescuentoRequest) (db.CodigosDescuento, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.CodigosDescuento{}, fmt.Errorf("competition: update descuento: %w", err)
	}
	result, err := s.queries.UpdateCodigoDescuento(ctx, db.UpdateCodigoDescuentoParams{
		ID:                  descuentoID,
		EdicionID:           edicionID,
		Codigo:              req.Codigo,
		DescuentoPorcentaje: fmt.Sprintf("%.2f", req.DescuentoPorcentaje),
		MaxUsos:             toNullInt32(req.MaxUsos),
		Activo:              req.Activo,
	})
	if err != nil {
		return db.CodigosDescuento{}, fmt.Errorf("competition: update descuento: %w", err)
	}
	return result, nil
}

func (s *Service) DeleteDescuento(ctx context.Context, descuentoID, edicionID, orgID uuid.UUID) error {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return fmt.Errorf("competition: delete descuento: %w", err)
	}
	if err := s.queries.DeleteCodigoDescuento(ctx, db.DeleteCodigoDescuentoParams{
		ID:        descuentoID,
		EdicionID: edicionID,
	}); err != nil {
		return fmt.Errorf("competition: delete descuento: %w", err)
	}
	return nil
}

// CambiarEstado ejecuta la máquina de estados de la edición.
// Solo maneja las transiciones: config→inscripcion e inscripcion→recepcion.
func (s *Service) CambiarEstado(ctx context.Context, id, orgID uuid.UUID, estadoSolicitado string) (db.Edicione, error) {
	edicion, err := s.queries.GetEdicionByIDAndOrg(ctx, db.GetEdicionByIDAndOrgParams{ID: id, OrgID: orgID})
	if err != nil {
		return db.Edicione{}, fmt.Errorf("competition: cambiar estado: %w", err)
	}

	nuevoEstado, err := s.validarTransicion(edicion, estadoSolicitado)
	if err != nil {
		return db.Edicione{}, err
	}

	result, err := s.queries.UpdateEdicionEstado(ctx, db.UpdateEdicionEstadoParams{
		ID:     id,
		OrgID:  orgID,
		Estado: nuevoEstado,
	})
	if err != nil {
		return db.Edicione{}, fmt.Errorf("competition: cambiar estado: %w", err)
	}
	return result, nil
}

func (s *Service) validarTransicion(edicion db.Edicione, hacia string) (db.EstadoEdicionEnum, error) {
	desde := string(edicion.Estado)

	switch {
	case desde == "config" && hacia == "inscripcion":
		if edicion.Nombre == "" || (!edicion.FechaInicioInscripcion.Valid && !edicion.FechaEvento.Valid) {
			return "", &PrecondicionNoCumplidaError{
				Message: "La edición debe tener nombre y al menos una fecha para abrir la inscripción",
			}
		}
		return db.EstadoEdicionEnumInscripcion, nil

	case desde == "inscripcion" && hacia == "recepcion":
		// TODO: verificar muestras cuando exista el módulo de inscripción
		return db.EstadoEdicionEnumRecepcion, nil

	default:
		return "", &TransicionInvalidaError{Desde: desde, Hacia: hacia}
	}
}

func (s *Service) verifyEdicionOwnership(ctx context.Context, edicionID, orgID uuid.UUID) error {
	_, err := s.queries.GetEdicionByIDAndOrg(ctx, db.GetEdicionByIDAndOrgParams{
		ID:    edicionID,
		OrgID: orgID,
	})
	if err != nil {
		return fmt.Errorf("competition: verify edicion ownership: %w", err)
	}
	return nil
}

func toNullTime(t *time.Time) sql.NullTime {
	if t == nil {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: *t, Valid: true}
}

func toNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

func toNullInt32(i *int32) sql.NullInt32 {
	if i == nil {
		return sql.NullInt32{}
	}
	return sql.NullInt32{Int32: *i, Valid: true}
}
