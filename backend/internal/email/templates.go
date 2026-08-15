package email

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
)

//go:embed templates/*.html
var templatesFS embed.FS

// Render carga el template templateName.html desde templates/ (embebido en el
// binario) y lo renderiza con data. templateName no lleva extensión, ej.
// Render("verificacion", struct{ Nombre, URL string }{...}).
func Render(templateName string, data any) (string, error) {
	path := fmt.Sprintf("templates/%s.html", templateName)
	tmpl, err := template.New(templateName + ".html").ParseFS(templatesFS, path)
	if err != nil {
		return "", fmt.Errorf("email: parse template %q: %w", templateName, err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("email: render template %q: %w", templateName, err)
	}
	return buf.String(), nil
}
