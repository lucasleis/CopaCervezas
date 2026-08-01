package styles

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"

	"github.com/google/uuid"
	"github.com/lucasleis/nivalis/internal/db"
	"github.com/sqlc-dev/pqtype"
)

// ErrEstiloNotFound se retorna cuando el estilo no existe o no pertenece a la org.
var ErrEstiloNotFound = errors.New("styles: el estilo solicitado no existe")

// ErrEstiloGlobalNoEditable se retorna al intentar editar un estilo del catálogo BJCP (org_id NULL).
var ErrEstiloGlobalNoEditable = errors.New("styles: el catálogo BJCP global no es editable")

// ErrCodigoDuplicado se retorna cuando ya existe un estilo con ese código para la org.
var ErrCodigoDuplicado = errors.New("styles: ya existe un estilo con ese código en esta organización")

// ErrTipoCampoInvalido se retorna cuando un campo del schema builder tiene un tipo desconocido.
var ErrTipoCampoInvalido = errors.New("styles: tipo de campo inválido")

// ErrClaveCampoInvalida se retorna cuando la clave de un campo no cumple el formato snake_case.
var ErrClaveCampoInvalida = errors.New("styles: clave de campo inválida, debe ser snake_case")

// ErrEstiloEnUso se retorna al intentar eliminar un estilo referenciado por muestras o subestilos.
var ErrEstiloEnUso = errors.New("styles: el estilo tiene muestras o subestilos asociados")

// ErrEstiloSimilarEncontrado se retorna cuando hay estilos con nombre similar y no se confirmó la creación.
type ErrEstiloSimilarEncontrado struct {
	Similares []db.SearchEstilosSimilaresRow
}

func (e *ErrEstiloSimilarEncontrado) Error() string {
	return "styles: se encontraron estilos con nombres similares"
}

var claveRegex = regexp.MustCompile(`^[a-z][a-z0-9_]*$`)

var tiposValidos = map[string]bool{
	"text":     true,
	"textarea": true,
	"boolean":  true,
}

type CampoDef struct {
	Clave       string `json:"clave"`
	Label       string `json:"label"`
	Tipo        string `json:"tipo"`
	Obligatorio bool   `json:"obligatorio"`
}

type CreateEstiloRequest struct {
	Codigo                string     `json:"codigo"`
	Nombre                string     `json:"nombre"`
	SubestiloDe           *uuid.UUID `json:"subestilo_de"`
	RequiereInfoAdicional bool       `json:"requiere_info_adicional"`
	ConfirmarSimilitud    bool       `json:"confirmar_similitud"`
}

type UpdateEstiloRequest struct {
	Nombre                *string    `json:"nombre"`
	SubestiloDe           *uuid.UUID `json:"subestilo_de"`
	RequiereInfoAdicional *bool      `json:"requiere_info_adicional"`
}

type UpdateCamposRequest struct {
	Campos []CampoDef `json:"campos"`
}

type Service struct {
	queries *db.Queries
}

func NewService(queries *db.Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) ListEstilosOrg(ctx context.Context, orgID uuid.UUID) ([]db.ListEstilosOrgRow, error) {
	result, err := s.queries.ListEstilosOrg(ctx, uuid.NullUUID{UUID: orgID, Valid: true})
	if err != nil {
		return nil, fmt.Errorf("styles: list estilos org: %w", err)
	}
	return result, nil
}

func (s *Service) ListEstilosCatalogo(ctx context.Context, orgID uuid.UUID) ([]db.ListEstilosRow, error) {
	result, err := s.queries.ListEstilos(ctx, uuid.NullUUID{UUID: orgID, Valid: true})
	if err != nil {
		return nil, fmt.Errorf("styles: list estilos catalogo: %w", err)
	}
	return result, nil
}

func (s *Service) CreateEstilo(ctx context.Context, orgID uuid.UUID, req CreateEstiloRequest) (db.Estilo, error) {
	if !req.ConfirmarSimilitud {
		similares, err := s.queries.SearchEstilosSimilares(ctx, db.SearchEstilosSimilaresParams{
			OrgID: uuid.NullUUID{UUID: orgID, Valid: true},
			Lower: req.Nombre,
		})
		if err != nil {
			return db.Estilo{}, fmt.Errorf("styles: create estilo: search similares: %w", err)
		}
		if len(similares) > 0 {
			return db.Estilo{}, &ErrEstiloSimilarEncontrado{Similares: similares}
		}
	}

	if _, err := s.queries.GetEstiloByCodigoOrg(ctx, db.GetEstiloByCodigoOrgParams{
		OrgID:  uuid.NullUUID{UUID: orgID, Valid: true},
		Codigo: req.Codigo,
	}); err == nil {
		return db.Estilo{}, ErrCodigoDuplicado
	} else if !errors.Is(err, sql.ErrNoRows) {
		return db.Estilo{}, fmt.Errorf("styles: create estilo: check codigo: %w", err)
	}

	result, err := s.queries.CreateEstilo(ctx, db.CreateEstiloParams{
		ID:                    uuid.New(),
		OrgID:                 uuid.NullUUID{UUID: orgID, Valid: true},
		Codigo:                req.Codigo,
		Nombre:                req.Nombre,
		SubestiloDe:           toNullUUID(req.SubestiloDe),
		RequiereInfoAdicional: req.RequiereInfoAdicional,
	})
	if err != nil {
		return db.Estilo{}, fmt.Errorf("styles: create estilo: %w", err)
	}
	return result, nil
}

func (s *Service) UpdateEstilo(ctx context.Context, id, orgID uuid.UUID, req UpdateEstiloRequest) (db.Estilo, error) {
	actual, err := s.getOwnedEstilo(ctx, id, orgID)
	if err != nil {
		return db.Estilo{}, err
	}

	nombre := actual.Nombre
	if req.Nombre != nil {
		nombre = *req.Nombre
	}
	subestiloDe := actual.SubestiloDe
	if req.SubestiloDe != nil {
		subestiloDe = uuid.NullUUID{UUID: *req.SubestiloDe, Valid: true}
	}
	requiereInfo := actual.RequiereInfoAdicional
	if req.RequiereInfoAdicional != nil {
		requiereInfo = *req.RequiereInfoAdicional
	}

	result, err := s.queries.UpdateEstilo(ctx, db.UpdateEstiloParams{
		ID:                    id,
		Nombre:                nombre,
		SubestiloDe:           subestiloDe,
		RequiereInfoAdicional: requiereInfo,
		CamposInfoAdicional:   actual.CamposInfoAdicional,
	})
	if err != nil {
		return db.Estilo{}, fmt.Errorf("styles: update estilo: %w", err)
	}
	return result, nil
}

func (s *Service) UpdateEstiloCampos(ctx context.Context, id, orgID uuid.UUID, req UpdateCamposRequest) (db.Estilo, error) {
	if _, err := s.getOwnedEstilo(ctx, id, orgID); err != nil {
		return db.Estilo{}, err
	}

	for _, campo := range req.Campos {
		if !tiposValidos[campo.Tipo] {
			return db.Estilo{}, ErrTipoCampoInvalido
		}
		if !claveRegex.MatchString(campo.Clave) {
			return db.Estilo{}, ErrClaveCampoInvalida
		}
	}

	payload, err := json.Marshal(req.Campos)
	if err != nil {
		return db.Estilo{}, fmt.Errorf("styles: update estilo campos: marshal: %w", err)
	}

	result, err := s.queries.UpdateEstiloCampos(ctx, db.UpdateEstiloCamposParams{
		ID:                    id,
		CamposInfoAdicional:   pqtype.NullRawMessage{RawMessage: payload, Valid: true},
		RequiereInfoAdicional: len(req.Campos) > 0,
	})
	if err != nil {
		return db.Estilo{}, fmt.Errorf("styles: update estilo campos: %w", err)
	}
	return result, nil
}

func (s *Service) DeleteEstilo(ctx context.Context, id, orgID uuid.UUID) error {
	if _, err := s.getOwnedEstilo(ctx, id, orgID); err != nil {
		return err
	}

	countMuestras, err := s.queries.CountMuestrasByEstilo(ctx, id)
	if err != nil {
		return fmt.Errorf("styles: delete estilo: count muestras: %w", err)
	}
	if countMuestras > 0 {
		return ErrEstiloEnUso
	}

	countSubestilos, err := s.queries.CountSubestilosByEstiloPadre(ctx, uuid.NullUUID{UUID: id, Valid: true})
	if err != nil {
		return fmt.Errorf("styles: delete estilo: count subestilos: %w", err)
	}
	if countSubestilos > 0 {
		return ErrEstiloEnUso
	}

	if err := s.queries.DeleteEstilo(ctx, id); err != nil {
		return fmt.Errorf("styles: delete estilo: %w", err)
	}
	return nil
}

// getOwnedEstilo verifica que el estilo exista y pertenezca a orgID.
// Si es del catálogo BJCP (org_id NULL) retorna ErrEstiloGlobalNoEditable.
// Si pertenece a otra org retorna ErrEstiloNotFound (no revela su existencia).
func (s *Service) getOwnedEstilo(ctx context.Context, id, orgID uuid.UUID) (db.GetEstiloRow, error) {
	estilo, err := s.queries.GetEstilo(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return db.GetEstiloRow{}, ErrEstiloNotFound
		}
		return db.GetEstiloRow{}, fmt.Errorf("styles: get estilo: %w", err)
	}
	if !estilo.OrgID.Valid {
		return db.GetEstiloRow{}, ErrEstiloGlobalNoEditable
	}
	if estilo.OrgID.UUID != orgID {
		return db.GetEstiloRow{}, ErrEstiloNotFound
	}
	return estilo, nil
}

func toNullUUID(id *uuid.UUID) uuid.NullUUID {
	if id == nil {
		return uuid.NullUUID{}
	}
	return uuid.NullUUID{UUID: *id, Valid: true}
}
