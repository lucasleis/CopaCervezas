package email

import (
	"context"
	"log/slog"
)

// LogSender no envía correo real — loguea el mensaje con slog. Es el fallback
// cuando EMAIL_PROVIDER está vacío o no definido, útil para desarrollo local
// sin credenciales de ningún proveedor.
type LogSender struct{}

// NewLogSender crea un LogSender.
func NewLogSender() *LogSender {
	return &LogSender{}
}

func (s *LogSender) Send(ctx context.Context, msg Message) error {
	slog.Info("email: send (log sender, no envío real)",
		"to", msg.To,
		"subject", msg.Subject,
		"html", msg.HTML,
	)
	return nil
}
