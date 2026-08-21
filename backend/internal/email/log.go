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
	// NO loguear msg.HTML: el cuerpo lleva en texto plano el link con el token
	// de un solo uso (verificación de email, invitación, recuperación de
	// contraseña) — quien lea los logs se apropiaría de la cuenta.
	slog.Info("email: send (log sender, no envío real)",
		"to", msg.To,
		"subject", msg.Subject,
	)
	return nil
}
