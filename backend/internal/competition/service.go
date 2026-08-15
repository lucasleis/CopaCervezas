package competition

import (
	"context"
	"database/sql"
	"errors"
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
	sqlDB   *sql.DB
}

func NewService(queries *db.Queries, sqlDB *sql.DB) *Service {
	return &Service{queries: queries, sqlDB: sqlDB}
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
// Solo maneja las transiciones: config→inscripcion e inscripcion→pre-cata.
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

	case desde == "inscripcion" && hacia == "pre-cata":
		// TODO: verificar muestras cuando exista el módulo de inscripción
		return db.EstadoEdicionEnumPreCata, nil

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

// GrupoConMuestrasError se retorna al intentar eliminar un grupo con muestras activas.
type GrupoConMuestrasError struct{}

func (e GrupoConMuestrasError) Error() string { return "el grupo tiene muestras activas" }

// TodasAsignadasError se retorna cuando la autoasignación no encuentra muestras sin grupo.
type TodasAsignadasError struct{}

func (e TodasAsignadasError) Error() string { return "todas las muestras ya tienen grupo asignado" }

// Grupos

func calcularCantRondas(cantMuestras int64) int32 {
	switch {
	case cantMuestras >= 33:
		return 3
	case cantMuestras >= 11:
		return 2
	default:
		return 1
	}
}

func (s *Service) verifyEdicionEnPreCata(ctx context.Context, edicionID, orgID uuid.UUID) (db.Edicione, error) {
	edicion, err := s.queries.GetEdicionByIDAndOrg(ctx, db.GetEdicionByIDAndOrgParams{ID: edicionID, OrgID: orgID})
	if err != nil {
		return db.Edicione{}, fmt.Errorf("competition: verify edicion pre-cata: %w", err)
	}
	if edicion.Estado != db.EstadoEdicionEnumPreCata {
		return db.Edicione{}, &TransicionInvalidaError{Desde: string(edicion.Estado), Hacia: "pre-cata"}
	}
	return edicion, nil
}

func (s *Service) ListGrupos(ctx context.Context, edicionID, orgID uuid.UUID) ([]db.ListGruposEdicionRow, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return nil, fmt.Errorf("competition: list grupos: %w", err)
	}
	result, err := s.queries.ListGruposEdicion(ctx, edicionID)
	if err != nil {
		return nil, fmt.Errorf("competition: list grupos: %w", err)
	}
	return result, nil
}

func (s *Service) CreateGrupo(ctx context.Context, edicionID, orgID uuid.UUID, nombre string, bosFlight *string) (db.Grupo, error) {
	if _, err := s.verifyEdicionEnPreCata(ctx, edicionID, orgID); err != nil {
		return db.Grupo{}, err
	}
	maxOrden, err := s.queries.MaxOrdenGrupos(ctx, edicionID)
	if err != nil {
		return db.Grupo{}, fmt.Errorf("competition: create grupo: %w", err)
	}
	orden, err := toInt32(maxOrden)
	if err != nil {
		return db.Grupo{}, fmt.Errorf("competition: create grupo: %w", err)
	}
	result, err := s.queries.CreateGrupo(ctx, db.CreateGrupoParams{
		EdicionID:  edicionID,
		Nombre:     nombre,
		CantRondas: 1,
		Orden:      orden + 1,
		BosFlight:  toNullString(bosFlight),
	})
	if err != nil {
		return db.Grupo{}, fmt.Errorf("competition: create grupo: %w", err)
	}
	return result, nil
}

func (s *Service) UpdateGrupo(ctx context.Context, id, edicionID, orgID uuid.UUID, nombre string, bosFlight *string) (db.Grupo, error) {
	if _, err := s.verifyEdicionEnPreCata(ctx, edicionID, orgID); err != nil {
		return db.Grupo{}, err
	}
	result, err := s.queries.UpdateGrupo(ctx, db.UpdateGrupoParams{
		ID:        id,
		EdicionID: edicionID,
		Nombre:    nombre,
		BosFlight: toNullString(bosFlight),
	})
	if err != nil {
		return db.Grupo{}, fmt.Errorf("competition: update grupo: %w", err)
	}
	return result, nil
}

func (s *Service) DeleteGrupo(ctx context.Context, id, edicionID, orgID uuid.UUID) error {
	if _, err := s.verifyEdicionEnPreCata(ctx, edicionID, orgID); err != nil {
		return err
	}
	grupo, err := s.queries.GetGrupoByIDEdicion(ctx, db.GetGrupoByIDEdicionParams{ID: id, EdicionID: edicionID})
	if err != nil {
		return fmt.Errorf("competition: delete grupo: %w", err)
	}
	if grupo.CantMuestras > 0 {
		return GrupoConMuestrasError{}
	}
	if err := s.queries.DeleteGrupo(ctx, db.DeleteGrupoParams{ID: id, EdicionID: edicionID}); err != nil {
		return fmt.Errorf("competition: delete grupo: %w", err)
	}
	return nil
}

// AutoasignarGrupos recalcula la agrupación de muestras activas por estilo (código
// completo con letra incluida, sin agrupar por parentesco A/B). Cada estilo con 10 o
// más muestras activas recibe grupo propio; el resto queda con grupo_id = NULL en la
// bandeja "sin grupo" para asignación manual. No existe grupo comodín "Varios": si
// hubiera uno de una corrida anterior, se elimina y sus muestras se desasocian.
func (s *Service) AutoasignarGrupos(ctx context.Context, edicionID, orgID uuid.UUID) (int, int, error) {
	if _, err := s.verifyEdicionEnPreCata(ctx, edicionID, orgID); err != nil {
		return 0, 0, err
	}

	tx, err := s.sqlDB.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // rollback es no-op si el commit ya se ejecutó

	q := s.queries.WithTx(tx)

	countAntes, err := q.CountMuestrasSinGrupo(ctx, db.CountMuestrasSinGrupoParams{
		EdicionID: edicionID,
		OrgID:     orgID,
	})
	if err != nil {
		return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
	}

	estilos, err := q.ListEstilosConMuestras(ctx, db.ListEstilosConMuestrasParams{
		EdicionID: edicionID,
		OrgID:     orgID,
	})
	if err != nil {
		return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
	}
	if len(estilos) == 0 {
		return 0, 0, TodasAsignadasError{}
	}

	// Eliminar cualquier grupo comodín "Varios" (o variante) de corridas anteriores,
	// desasociando primero las muestras que lo referencian.
	gruposVarios, err := q.FindGrupoVariosByEdicion(ctx, edicionID)
	if err != nil {
		return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
	}
	for _, gv := range gruposVarios {
		if err := q.DesasignarGrupoMuestrasByGrupo(ctx, uuid.NullUUID{UUID: gv.ID, Valid: true}); err != nil {
			return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
		}
		if err := q.DeleteGrupo(ctx, db.DeleteGrupoParams{ID: gv.ID, EdicionID: edicionID}); err != nil {
			return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
		}
	}

	maxOrden, err := q.MaxOrdenGrupos(ctx, edicionID)
	if err != nil {
		return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
	}
	orden, err := toInt32(maxOrden)
	if err != nil {
		return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
	}

	gruposCreados := 0

	for _, estilo := range estilos {
		if estilo.CantMuestras < 10 {
			if err := q.DesasignarGrupoMuestrasByEstilo(ctx, db.DesasignarGrupoMuestrasByEstiloParams{
				EdicionID: edicionID,
				EstiloID:  estilo.EstiloID,
			}); err != nil {
				return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
			}
			continue
		}

		grupo, err := q.GetGrupoByNombreEdicion(ctx, db.GetGrupoByNombreEdicionParams{
			EdicionID: edicionID,
			Nombre:    estilo.EstiloNombre,
		})
		cantRondas := calcularCantRondas(estilo.CantMuestras)
		switch {
		case errors.Is(err, sql.ErrNoRows):
			orden++
			grupo, err = q.CreateGrupo(ctx, db.CreateGrupoParams{
				EdicionID:  edicionID,
				Nombre:     estilo.EstiloNombre,
				CantRondas: cantRondas,
				Orden:      orden,
			})
			if err != nil {
				return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
			}
			gruposCreados++
		case err != nil:
			return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
		default:
			if _, err := q.UpdateGrupoCantRondas(ctx, db.UpdateGrupoCantRondasParams{
				ID:         grupo.ID,
				CantRondas: cantRondas,
			}); err != nil {
				return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
			}
		}

		if err := q.AsignarGrupoMuestrasByEstilo(ctx, db.AsignarGrupoMuestrasByEstiloParams{
			EdicionID: edicionID,
			EstiloID:  estilo.EstiloID,
			GrupoID:   uuid.NullUUID{UUID: grupo.ID, Valid: true},
		}); err != nil {
			return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
		}
	}

	countDespues, err := q.CountMuestrasSinGrupo(ctx, db.CountMuestrasSinGrupoParams{
		EdicionID: edicionID,
		OrgID:     orgID,
	})
	if err != nil {
		return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return 0, 0, fmt.Errorf("competition: autoasignar grupos: %w", err)
	}

	muestrasAsignadas := int(countAntes) - int(countDespues)
	return gruposCreados, muestrasAsignadas, nil
}

// MoverMuestra reasigna manualmente una muestra a un grupo destino, recalculando
// cant_rondas tanto del grupo destino como del grupo de origen (si existía).
func (s *Service) MoverMuestra(ctx context.Context, muestraID, grupoID, edicionID, orgID uuid.UUID) error {
	if _, err := s.verifyEdicionEnPreCata(ctx, edicionID, orgID); err != nil {
		return err
	}

	muestra, err := s.queries.GetMuestraByIDEdicionOrg(ctx, db.GetMuestraByIDEdicionOrgParams{
		ID:        muestraID,
		EdicionID: edicionID,
		OrgID:     orgID,
	})
	if err != nil {
		return fmt.Errorf("competition: mover muestra: %w", err)
	}

	if _, err := s.queries.GetGrupoByIDEdicion(ctx, db.GetGrupoByIDEdicionParams{
		ID:        grupoID,
		EdicionID: edicionID,
	}); err != nil {
		return fmt.Errorf("competition: mover muestra: %w", err)
	}

	if _, err := s.queries.AsignarGrupoMuestra(ctx, db.AsignarGrupoMuestraParams{
		ID:               muestraID,
		GrupoID:          uuid.NullUUID{UUID: grupoID, Valid: true},
		AsignacionManual: true,
	}); err != nil {
		return fmt.Errorf("competition: mover muestra: %w", err)
	}

	if err := s.recalcularCantRondas(ctx, grupoID, edicionID); err != nil {
		return fmt.Errorf("competition: mover muestra: %w", err)
	}

	if muestra.GrupoID.Valid && muestra.GrupoID.UUID != grupoID {
		if err := s.recalcularCantRondas(ctx, muestra.GrupoID.UUID, edicionID); err != nil {
			return fmt.Errorf("competition: mover muestra: %w", err)
		}
	}

	return nil
}

func (s *Service) recalcularCantRondas(ctx context.Context, grupoID, edicionID uuid.UUID) error {
	grupo, err := s.queries.GetGrupoByIDEdicion(ctx, db.GetGrupoByIDEdicionParams{ID: grupoID, EdicionID: edicionID})
	if err != nil {
		return err
	}
	_, err = s.queries.UpdateGrupoCantRondas(ctx, db.UpdateGrupoCantRondasParams{
		ID:         grupoID,
		CantRondas: calcularCantRondas(grupo.CantMuestras),
	})
	return err
}

func (s *Service) ListMuestrasSinGrupo(ctx context.Context, edicionID, orgID uuid.UUID) ([]db.ListMuestrasSinGrupoRow, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return nil, fmt.Errorf("competition: list muestras sin grupo: %w", err)
	}
	result, err := s.queries.ListMuestrasSinGrupo(ctx, db.ListMuestrasSinGrupoParams{
		EdicionID: edicionID,
		OrgID:     orgID,
	})
	if err != nil {
		return nil, fmt.Errorf("competition: list muestras sin grupo: %w", err)
	}
	return result, nil
}

func (s *Service) ListMuestrasByGrupo(ctx context.Context, grupoID, edicionID uuid.UUID) ([]db.ListMuestrasByGrupoRow, error) {
	if _, err := s.queries.GetGrupoByIDEdicion(ctx, db.GetGrupoByIDEdicionParams{ID: grupoID, EdicionID: edicionID}); err != nil {
		return nil, fmt.Errorf("competition: list muestras by grupo: %w", err)
	}
	result, err := s.queries.ListMuestrasByGrupo(ctx, uuid.NullUUID{UUID: grupoID, Valid: true})
	if err != nil {
		return nil, fmt.Errorf("competition: list muestras by grupo: %w", err)
	}
	return result, nil
}

// toInt32 normaliza el resultado de COALESCE(MAX(...), 0), que el driver puede
// devolver como int32 o int64 según el tipo inferido por Postgres.
func toInt32(v interface{}) (int32, error) {
	switch n := v.(type) {
	case int32:
		return n, nil
	case int64:
		return int32(n), nil
	case nil:
		return 0, nil
	default:
		return 0, fmt.Errorf("tipo inesperado para orden: %T", v)
	}
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
