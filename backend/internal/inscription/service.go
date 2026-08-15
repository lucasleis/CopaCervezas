package inscription

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/lucasleis/nivalis/internal/db"
	"github.com/sqlc-dev/pqtype"
)

// ErrEdicionNotFound se retorna cuando la edición no existe o no pertenece al org_id del JWT.
var ErrEdicionNotFound = errors.New("inscription: la edición solicitada no existe")

// ErrEdicionNoEnInscripcion se retorna cuando la edición no está en estado 'inscripcion'.
var ErrEdicionNoEnInscripcion = errors.New("inscription: la edición no está en período de inscripción")

// ErrCerveceriaNotFound se retorna cuando no existe cervecería para el usuario+edición.
var ErrCerveceriaNotFound = errors.New("inscription: no existe una cervecería para este usuario en esta edición")

// ErrMaxMuestrasAlcanzado se retorna al superar el máximo de muestras por cervecería.
var ErrMaxMuestrasAlcanzado = errors.New("inscription: se alcanzó el máximo de muestras permitidas")

// ErrNombreComercialRequerido se retorna cuando nombre_comercial viene vacío.
var ErrNombreComercialRequerido = errors.New("inscription: el nombre comercial es requerido")

// ErrEstiloNoValido se retorna cuando el estilo no existe o no es visible para la org.
var ErrEstiloNoValido = errors.New("inscription: el estilo seleccionado no es válido")

// ErrMuestraNotFound se retorna cuando la muestra no existe o no pertenece a la cervecería/edición.
var ErrMuestraNotFound = errors.New("inscription: la muestra solicitada no existe")

// ErrCerveceriaNotFoundByID se retorna cuando la cervecería no existe para la org del JWT.
var ErrCerveceriaNotFoundByID = errors.New("inscription: la cervecería solicitada no existe")

// ErrYaInscripto se retorna cuando el usuario ya tiene una cervecería registrada en la edición.
var ErrYaInscripto = errors.New("inscription: ya estás inscripto en esta edición")

// ErrInfoAdicionalIncompleta se retorna cuando faltan claves obligatorias del schema del estilo.
type ErrInfoAdicionalIncompleta struct {
	Faltantes []string
}

func (e *ErrInfoAdicionalIncompleta) Error() string {
	return "inscription: info_adicional incompleta"
}

type campoDef struct {
	Clave       string `json:"clave"`
	Label       string `json:"label"`
	Tipo        string `json:"tipo"`
	Obligatorio bool   `json:"obligatorio"`
}

type MuestraInput struct {
	EstiloID                    uuid.UUID       `json:"estilo_id"`
	NombreComercial             string          `json:"nombre_comercial"`
	InfoAdicional               json.RawMessage `json:"info_adicional"`
	CuentaPremioMejorCerveceria bool            `json:"cuenta_premio_mejor_cerveceria"`
	ComentariosAdicionales      *string         `json:"comentarios_adicionales"`
}

type Service struct {
	queries *db.Queries
}

func NewService(queries *db.Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) GetEdicionesActivasCerveceria(ctx context.Context, usuarioID, orgID uuid.UUID) ([]db.GetEdicionesActivasCerveceriaRow, error) {
	result, err := s.queries.GetEdicionesActivasCerveceria(ctx, db.GetEdicionesActivasCerveceriaParams{
		OrgID:     orgID,
		UsuarioID: usuarioID,
	})
	if err != nil {
		return nil, fmt.Errorf("inscription: get ediciones activas cerveceria: %w", err)
	}
	return result, nil
}

func (s *Service) GetEdicionesDisponiblesCerveceria(ctx context.Context, usuarioID, orgID uuid.UUID) ([]db.GetEdicionesDisponiblesCerveceriaRow, error) {
	result, err := s.queries.GetEdicionesDisponiblesCerveceria(ctx, db.GetEdicionesDisponiblesCerveceriaParams{
		OrgID:     orgID,
		UsuarioID: usuarioID,
	})
	if err != nil {
		return nil, fmt.Errorf("inscription: get ediciones disponibles cerveceria: %w", err)
	}
	return result, nil
}

type EdicionDisponibleDetalle struct {
	Edicion db.GetEdicionDisponibleDetalleRow
	Precios []db.PreciosInscripcion
	Lugares []db.LugaresEntrega
}

func (s *Service) GetEdicionDisponibleDetalle(ctx context.Context, usuarioID, orgID, edicionID uuid.UUID) (EdicionDisponibleDetalle, error) {
	edicion, err := s.queries.GetEdicionDisponibleDetalle(ctx, db.GetEdicionDisponibleDetalleParams{
		OrgID: orgID,
		ID:    edicionID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return EdicionDisponibleDetalle{}, ErrEdicionNotFound
		}
		return EdicionDisponibleDetalle{}, fmt.Errorf("inscription: get edicion disponible detalle: %w", err)
	}

	if _, err := s.getCerveceria(ctx, usuarioID, edicionID, orgID); err == nil {
		return EdicionDisponibleDetalle{}, ErrYaInscripto
	} else if !errors.Is(err, ErrCerveceriaNotFound) {
		return EdicionDisponibleDetalle{}, err
	}

	precios, err := s.queries.ListPreciosByEdicion(ctx, edicionID)
	if err != nil {
		return EdicionDisponibleDetalle{}, fmt.Errorf("inscription: list precios edicion: %w", err)
	}

	lugares, err := s.queries.ListLugaresByEdicion(ctx, edicionID)
	if err != nil {
		return EdicionDisponibleDetalle{}, fmt.Errorf("inscription: list lugares edicion: %w", err)
	}

	return EdicionDisponibleDetalle{Edicion: edicion, Precios: precios, Lugares: lugares}, nil
}

func (s *Service) InscribirCerveceria(ctx context.Context, usuarioID, edicionID, orgID uuid.UUID) (db.Cerveceria, error) {
	if _, err := s.verifyEdicionEnInscripcion(ctx, edicionID, orgID); err != nil {
		return db.Cerveceria{}, err
	}

	existente, err := s.getCerveceria(ctx, usuarioID, edicionID, orgID)
	if err == nil {
		return existente, nil
	}
	if !errors.Is(err, ErrCerveceriaNotFound) {
		return db.Cerveceria{}, err
	}

	cerveceria, err := s.queries.InscribirCerveceria(ctx, db.InscribirCerveceriaParams{
		ID:        uuid.New(),
		UsuarioID: usuarioID,
		EdicionID: edicionID,
		OrgID:     orgID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return s.getCerveceria(ctx, usuarioID, edicionID, orgID)
		}
		return db.Cerveceria{}, fmt.Errorf("inscription: inscribir cerveceria: %w", err)
	}
	return cerveceria, nil
}

func (s *Service) ListMuestrasCerveceria(ctx context.Context, usuarioID, edicionID, orgID uuid.UUID) ([]db.ListMuestrasCerveceriaRow, error) {
	cerveceria, err := s.getCerveceria(ctx, usuarioID, edicionID, orgID)
	if err != nil {
		return nil, err
	}
	result, err := s.queries.ListMuestrasCerveceria(ctx, db.ListMuestrasCerveceriaParams{
		CerveceriaID: cerveceria.ID,
		EdicionID:    edicionID,
		OrgID:        orgID,
	})
	if err != nil {
		return nil, fmt.Errorf("inscription: list muestras cerveceria: %w", err)
	}
	return result, nil
}

func (s *Service) CreateMuestra(ctx context.Context, usuarioID, edicionID, orgID uuid.UUID, input MuestraInput) (db.Muestra, error) {
	edicion, err := s.verifyEdicionEnInscripcion(ctx, edicionID, orgID)
	if err != nil {
		return db.Muestra{}, err
	}

	cerveceria, err := s.getCerveceria(ctx, usuarioID, edicionID, orgID)
	if err != nil {
		return db.Muestra{}, err
	}

	count, err := s.queries.CountMuestrasCerveceria(ctx, db.CountMuestrasCerveceriaParams{
		CerveceriaID: cerveceria.ID,
		EdicionID:    edicionID,
	})
	if err != nil {
		return db.Muestra{}, fmt.Errorf("inscription: create muestra: count: %w", err)
	}
	if count >= int64(edicion.MaxMuestrasPorCerveceria) {
		return db.Muestra{}, ErrMaxMuestrasAlcanzado
	}

	if err := s.validateMuestraInput(ctx, orgID, input); err != nil {
		return db.Muestra{}, err
	}

	nextCod, err := s.queries.NextCodParticipante(ctx, edicionID)
	if err != nil {
		return db.Muestra{}, fmt.Errorf("inscription: create muestra: next cod: %w", err)
	}

	result, err := s.queries.CreateMuestra(ctx, db.CreateMuestraParams{
		ID:                          uuid.New(),
		CerveceriaID:                cerveceria.ID,
		EdicionID:                   edicionID,
		OrgID:                       orgID,
		EstiloID:                    input.EstiloID,
		NombreComercial:             input.NombreComercial,
		InfoAdicional:               toNullRawMessage(input.InfoAdicional),
		CuentaPremioMejorCerveceria: input.CuentaPremioMejorCerveceria,
		ComentariosAdicionales:      toNullString(input.ComentariosAdicionales),
		CodParticipante:             sql.NullString{String: strconv.Itoa(int(nextCod)), Valid: true},
	})
	if err != nil {
		return db.Muestra{}, fmt.Errorf("inscription: create muestra: %w", err)
	}
	return result, nil
}

func (s *Service) UpdateMuestra(ctx context.Context, usuarioID, edicionID, orgID, muestraID uuid.UUID, input MuestraInput) (db.Muestra, error) {
	if _, err := s.verifyEdicionEnInscripcion(ctx, edicionID, orgID); err != nil {
		return db.Muestra{}, err
	}

	cerveceria, err := s.getCerveceria(ctx, usuarioID, edicionID, orgID)
	if err != nil {
		return db.Muestra{}, err
	}

	if _, err := s.queries.GetMuestraByIDCerveceria(ctx, db.GetMuestraByIDCerveceriaParams{
		ID:           muestraID,
		CerveceriaID: cerveceria.ID,
		EdicionID:    edicionID,
	}); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Muestra{}, ErrMuestraNotFound
		}
		return db.Muestra{}, fmt.Errorf("inscription: update muestra: get: %w", err)
	}

	if err := s.validateMuestraInput(ctx, orgID, input); err != nil {
		return db.Muestra{}, err
	}

	result, err := s.queries.UpdateMuestra(ctx, db.UpdateMuestraParams{
		ID:                          muestraID,
		EstiloID:                    input.EstiloID,
		NombreComercial:             input.NombreComercial,
		InfoAdicional:               toNullRawMessage(input.InfoAdicional),
		CuentaPremioMejorCerveceria: input.CuentaPremioMejorCerveceria,
		ComentariosAdicionales:      toNullString(input.ComentariosAdicionales),
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Muestra{}, ErrMuestraNotFound
		}
		return db.Muestra{}, fmt.Errorf("inscription: update muestra: %w", err)
	}
	return result, nil
}

func (s *Service) DeleteMuestra(ctx context.Context, usuarioID, edicionID, orgID, muestraID uuid.UUID) error {
	if _, err := s.verifyEdicionEnInscripcion(ctx, edicionID, orgID); err != nil {
		return err
	}

	cerveceria, err := s.getCerveceria(ctx, usuarioID, edicionID, orgID)
	if err != nil {
		return err
	}

	if _, err := s.queries.GetMuestraByIDCerveceria(ctx, db.GetMuestraByIDCerveceriaParams{
		ID:           muestraID,
		CerveceriaID: cerveceria.ID,
		EdicionID:    edicionID,
	}); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrMuestraNotFound
		}
		return fmt.Errorf("inscription: delete muestra: get: %w", err)
	}

	if err := s.queries.DeleteMuestra(ctx, muestraID); err != nil {
		return fmt.Errorf("inscription: delete muestra: %w", err)
	}
	return nil
}

// Admin

func (s *Service) ListMuestrasEdicionAdmin(ctx context.Context, edicionID, orgID uuid.UUID) ([]db.ListMuestrasEdicionAdminRow, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return nil, err
	}
	result, err := s.queries.ListMuestrasEdicionAdmin(ctx, db.ListMuestrasEdicionAdminParams{
		EdicionID: edicionID,
		OrgID:     orgID,
	})
	if err != nil {
		return nil, fmt.Errorf("inscription: list muestras edicion admin: %w", err)
	}
	return result, nil
}

func (s *Service) AprobarMuestra(ctx context.Context, edicionID, orgID, muestraID uuid.UUID, aprobada bool) (db.Muestra, error) {
	if err := s.verifyEdicionOwnership(ctx, edicionID, orgID); err != nil {
		return db.Muestra{}, err
	}
	result, err := s.queries.UpdateMuestraAprobada(ctx, db.UpdateMuestraAprobadaParams{
		ID:        muestraID,
		EdicionID: edicionID,
		OrgID:     orgID,
		Aprobada:  aprobada,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Muestra{}, ErrMuestraNotFound
		}
		return db.Muestra{}, fmt.Errorf("inscription: aprobar muestra: %w", err)
	}
	return result, nil
}

// UpdateEstadoPago propaga el estado de pago a todas las muestras activas de la
// cervecería (estado_pago vive en muestras desde 000022_lle24_schema). Si la
// cervecería no tiene muestras activas, el UPDATE no afecta filas pero no es un
// error: se verifica antes que la cervecería exista para distinguir ese caso del
// de "cervecería inexistente".
func (s *Service) UpdateEstadoPago(ctx context.Context, cerveceriaID, orgID uuid.UUID, estadoPago db.EstadoPagoEnum) ([]db.Muestra, error) {
	if _, err := s.queries.GetCerveceriaByIDOrg(ctx, db.GetCerveceriaByIDOrgParams{
		ID:    cerveceriaID,
		OrgID: orgID,
	}); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCerveceriaNotFoundByID
		}
		return nil, fmt.Errorf("inscription: update estado pago: get cerveceria: %w", err)
	}

	result, err := s.queries.UpdateCerveceriaEstadoPago(ctx, db.UpdateCerveceriaEstadoPagoParams{
		CerveceriaID: cerveceriaID,
		OrgID:        orgID,
		EstadoPago:   estadoPago,
	})
	if err != nil {
		return nil, fmt.Errorf("inscription: update estado pago: %w", err)
	}
	return result, nil
}

// Helpers

func (s *Service) validateMuestraInput(ctx context.Context, orgID uuid.UUID, input MuestraInput) error {
	if input.NombreComercial == "" {
		return ErrNombreComercialRequerido
	}

	estilo, err := s.queries.GetEstiloVisibleOrg(ctx, db.GetEstiloVisibleOrgParams{
		ID:    input.EstiloID,
		OrgID: uuid.NullUUID{UUID: orgID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrEstiloNoValido
		}
		return fmt.Errorf("inscription: validate muestra: get estilo: %w", err)
	}

	if estilo.RequiereInfoAdicional && estilo.CamposInfoAdicional.Valid {
		var campos []campoDef
		if err := json.Unmarshal(estilo.CamposInfoAdicional.RawMessage, &campos); err != nil {
			return fmt.Errorf("inscription: validate muestra: unmarshal campos: %w", err)
		}

		var provided map[string]json.RawMessage
		if len(input.InfoAdicional) > 0 {
			if err := json.Unmarshal(input.InfoAdicional, &provided); err != nil {
				return fmt.Errorf("inscription: validate muestra: unmarshal info_adicional: %w", err)
			}
		}

		var faltantes []string
		for _, campo := range campos {
			if !campo.Obligatorio {
				continue
			}
			val, ok := provided[campo.Clave]
			if !ok || isEmptyJSONValue(val) {
				faltantes = append(faltantes, campo.Clave)
			}
		}
		if len(faltantes) > 0 {
			return &ErrInfoAdicionalIncompleta{Faltantes: faltantes}
		}
	}

	return nil
}

func isEmptyJSONValue(raw json.RawMessage) bool {
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s == ""
	}
	return string(raw) == "null"
}

func (s *Service) getCerveceria(ctx context.Context, usuarioID, edicionID, orgID uuid.UUID) (db.Cerveceria, error) {
	cerveceria, err := s.queries.GetCerveceriaByUsuario(ctx, db.GetCerveceriaByUsuarioParams{
		UsuarioID: usuarioID,
		EdicionID: edicionID,
		OrgID:     orgID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Cerveceria{}, ErrCerveceriaNotFound
		}
		return db.Cerveceria{}, fmt.Errorf("inscription: get cerveceria: %w", err)
	}
	return cerveceria, nil
}

func (s *Service) verifyEdicionEnInscripcion(ctx context.Context, edicionID, orgID uuid.UUID) (db.Edicione, error) {
	edicion, err := s.queries.GetEdicionByIDAndOrg(ctx, db.GetEdicionByIDAndOrgParams{ID: edicionID, OrgID: orgID})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.Edicione{}, ErrEdicionNotFound
		}
		return db.Edicione{}, fmt.Errorf("inscription: verify edicion: %w", err)
	}
	if edicion.Estado != db.EstadoEdicionEnumInscripcion {
		return db.Edicione{}, ErrEdicionNoEnInscripcion
	}
	return edicion, nil
}

func (s *Service) verifyEdicionOwnership(ctx context.Context, edicionID, orgID uuid.UUID) error {
	_, err := s.queries.GetEdicionByIDAndOrg(ctx, db.GetEdicionByIDAndOrgParams{ID: edicionID, OrgID: orgID})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrEdicionNotFound
		}
		return fmt.Errorf("inscription: verify edicion ownership: %w", err)
	}
	return nil
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
