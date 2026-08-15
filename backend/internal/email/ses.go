package email

import (
	"context"
	"fmt"
)

// TODO: implementar con github.com/aws/aws-sdk-go-v2/service/sesv2 cuando se apruebe el acceso de producción de SES.
type SESSender struct{}

// NewSESSender crea un SESSender. Stub hasta que se apruebe el acceso de producción.
func NewSESSender() *SESSender {
	return &SESSender{}
}

func (s *SESSender) Send(ctx context.Context, msg Message) error {
	return fmt.Errorf("email: SES sender not yet configured")
}
