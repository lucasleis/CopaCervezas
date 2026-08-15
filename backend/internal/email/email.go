// Package email define la abstracción de envío de correo transaccional (Sender)
// y sus implementaciones: Resend (desarrollo), SES (producción, stub) y Log
// (fallback sin credenciales). El proveedor se elige por variable de entorno
// en cmd/server/main.go y se inyecta como dependencia — nunca como global.
package email

import "context"

// Message es el correo a enviar, ya con el HTML renderizado.
type Message struct {
	To      string
	Subject string
	HTML    string
}

// Sender envía un Message. Las implementaciones no comparten estado global.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}
