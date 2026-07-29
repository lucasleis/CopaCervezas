package competition

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lucasleis/nivalis/internal/db"
)

type Service struct {
	queries *db.Queries
}

func NewService(queries *db.Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) CreateEdicion(ctx context.Context, orgID uuid.UUID, req CreateEdicionRequest) (db.Edicione, error) {
	return s.queries.CreateEdicion(ctx, db.CreateEdicionParams{
		OrgID:                    orgID,
		Nombre:                   req.Nombre,
		Anio:                     req.Anio,
		FechaInicioInscripcion:   toNullTime(req.FechaInicioInscripcion),
		FechaFinInscripcion:      toNullTime(req.FechaFinInscripcion),
		FechaEvento:              toNullTime(req.FechaEvento),
		MaxMuestrasPorCerveceria: req.MaxMuestrasPorCerveceria,
	})
}

func (s *Service) ListEdiciones(ctx context.Context, orgID uuid.UUID) ([]db.Edicione, error) {
	return s.queries.ListEdicionesByOrg(ctx, orgID)
}

func (s *Service) GetEdicion(ctx context.Context, id, orgID uuid.UUID) (db.Edicione, error) {
	return s.queries.GetEdicionByIDAndOrg(ctx, db.GetEdicionByIDAndOrgParams{ID: id, OrgID: orgID})
}

func (s *Service) UpdateEdicion(ctx context.Context, id, orgID uuid.UUID, req UpdateEdicionRequest) (db.Edicione, error) {
	return s.queries.UpdateEdicion(ctx, db.UpdateEdicionParams{
		ID:                       id,
		OrgID:                    orgID,
		Nombre:                   req.Nombre,
		Anio:                     req.Anio,
		FechaInicioInscripcion:   toNullTime(req.FechaInicioInscripcion),
		FechaFinInscripcion:      toNullTime(req.FechaFinInscripcion),
		FechaEvento:              toNullTime(req.FechaEvento),
		MaxMuestrasPorCerveceria: req.MaxMuestrasPorCerveceria,
	})
}

// Precios

func (s *Service) CreatePrecio(ctx context.Context, edicionID, orgID uuid.UUID, req CreatePrecioRequest) (db.PreciosInscripcion, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.PreciosInscripcion{}, err
	}
	return s.queries.CreatePrecioInscripcion(ctx, db.CreatePrecioInscripcionParams{
		EdicionID:  edicionID,
		Nombre:     req.Nombre,
		Precio:     fmt.Sprintf("%g", req.Precio),
		FechaDesde: toNullTime(req.FechaDesde),
		FechaHasta: toNullTime(req.FechaHasta),
	})
}

func (s *Service) UpdatePrecio(ctx context.Context, precioID, edicionID, orgID uuid.UUID, req UpdatePrecioRequest) (db.PreciosInscripcion, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.PreciosInscripcion{}, err
	}
	return s.queries.UpdatePrecioInscripcion(ctx, db.UpdatePrecioInscripcionParams{
		ID:         precioID,
		EdicionID:  edicionID,
		Nombre:     req.Nombre,
		Precio:     fmt.Sprintf("%g", req.Precio),
		FechaDesde: toNullTime(req.FechaDesde),
		FechaHasta: toNullTime(req.FechaHasta),
	})
}

func (s *Service) DeletePrecio(ctx context.Context, precioID, edicionID, orgID uuid.UUID) error {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return err
	}
	return s.queries.DeletePrecioInscripcion(ctx, db.DeletePrecioInscripcionParams{
		ID:        precioID,
		EdicionID: edicionID,
	})
}

// Lugares

func (s *Service) CreateLugar(ctx context.Context, edicionID, orgID uuid.UUID, req CreateLugarRequest) (db.LugaresEntrega, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.LugaresEntrega{}, err
	}
	return s.queries.CreateLugarEntrega(ctx, db.CreateLugarEntregaParams{
		EdicionID: edicionID,
		Nombre:    req.Nombre,
		Direccion: req.Direccion,
		Ciudad:    req.Ciudad,
		Provincia: req.Provincia,
		Horarios:  toNullString(req.Horarios),
	})
}

func (s *Service) UpdateLugar(ctx context.Context, lugarID, edicionID, orgID uuid.UUID, req UpdateLugarRequest) (db.LugaresEntrega, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.LugaresEntrega{}, err
	}
	return s.queries.UpdateLugarEntrega(ctx, db.UpdateLugarEntregaParams{
		ID:        lugarID,
		EdicionID: edicionID,
		Nombre:    req.Nombre,
		Direccion: req.Direccion,
		Ciudad:    req.Ciudad,
		Provincia: req.Provincia,
		Horarios:  toNullString(req.Horarios),
	})
}

func (s *Service) DeleteLugar(ctx context.Context, lugarID, edicionID, orgID uuid.UUID) error {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return err
	}
	return s.queries.DeleteLugarEntrega(ctx, db.DeleteLugarEntregaParams{
		ID:        lugarID,
		EdicionID: edicionID,
	})
}

// Descuentos

func (s *Service) CreateDescuento(ctx context.Context, edicionID, orgID uuid.UUID, req CreateDescuentoRequest) (db.CodigosDescuento, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.CodigosDescuento{}, err
	}
	return s.queries.CreateCodigoDescuento(ctx, db.CreateCodigoDescuentoParams{
		EdicionID:           edicionID,
		Codigo:              req.Codigo,
		DescuentoPorcentaje: fmt.Sprintf("%g", req.DescuentoPorcentaje),
		MaxUsos:             toNullInt32(req.MaxUsos),
	})
}

func (s *Service) UpdateDescuento(ctx context.Context, descuentoID, edicionID, orgID uuid.UUID, req UpdateDescuentoRequest) (db.CodigosDescuento, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.CodigosDescuento{}, err
	}
	return s.queries.UpdateCodigoDescuento(ctx, db.UpdateCodigoDescuentoParams{
		ID:                  descuentoID,
		EdicionID:           edicionID,
		Codigo:              req.Codigo,
		DescuentoPorcentaje: fmt.Sprintf("%g", req.DescuentoPorcentaje),
		MaxUsos:             toNullInt32(req.MaxUsos),
		Activo:              req.Activo,
	})
}

func (s *Service) DeleteDescuento(ctx context.Context, descuentoID, edicionID, orgID uuid.UUID) error {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return err
	}
	return s.queries.DeleteCodigoDescuento(ctx, db.DeleteCodigoDescuentoParams{
		ID:        descuentoID,
		EdicionID: edicionID,
	})
}

func (s *Service) verifyEdicionOwnership(ctx context.Context, edicionID, orgID uuid.UUID) error {
	_, err := s.queries.GetEdicionByIDAndOrg(ctx, db.GetEdicionByIDAndOrgParams{
		ID:    edicionID,
		OrgID: orgID,
	})
	return err
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
