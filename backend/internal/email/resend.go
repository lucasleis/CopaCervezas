package email

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v2"
)

// ResendSender envía correo vía la API de Resend. Pensado para desarrollo:
// API key gratuita, sin necesidad de aprobación previa. No mantiene estado
// global — cada instancia recibe su propio client.
type ResendSender struct {
	client *resend.Client
	from   string
}

// NewResendSender crea un ResendSender. fromAddress es la dirección remitente
// (configurable vía EMAIL_FROM, nunca hardcodeada).
func NewResendSender(apiKey, fromAddress string) *ResendSender {
	return &ResendSender{
		client: resend.NewClient(apiKey),
		from:   fromAddress,
	}
}

func (s *ResendSender) Send(ctx context.Context, msg Message) error {
	_, err := s.client.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{msg.To},
		Subject: msg.Subject,
		Html:    msg.HTML,
	})
	if err != nil {
		return fmt.Errorf("email: resend send: %w", err)
	}
	return nil
}
