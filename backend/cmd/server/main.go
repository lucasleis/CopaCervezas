package main

import (
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"
	"github.com/lucasleis/nivalis/internal/auth"
	"github.com/lucasleis/nivalis/internal/competition"
	"github.com/lucasleis/nivalis/internal/db"
	"github.com/lucasleis/nivalis/internal/email"
	"github.com/lucasleis/nivalis/internal/inscription"
	custommiddleware "github.com/lucasleis/nivalis/internal/middleware"
	"github.com/lucasleis/nivalis/internal/styles"
	"github.com/lucasleis/nivalis/internal/tasting"
	"github.com/lucasleis/nivalis/pkg/websocket"
)

func main() {
	if err := godotenv.Load(); err != nil {
		slog.Info("No .env file found, using environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		slog.Error("DATABASE_URL is required")
		os.Exit(1)
	}
	sqlDB, err := sql.Open("postgres", dbURL)
	if err != nil {
		slog.Error("failed to open DB", "error", err)
		os.Exit(1)
	}
	if err := sqlDB.Ping(); err != nil {
		slog.Error("failed to ping DB", "error", err)
		os.Exit(1)
	}
	queries := db.New(sqlDB)

	e := echo.New()

	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:5173"
	}
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{allowedOrigin},
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAuthorization},
		AllowCredentials: true,
	}))

	authHandler := auth.NewHandler(queries)
	competitionSvc := competition.NewService(queries, sqlDB)
	competitionHandler := competition.NewHandler(competitionSvc)
	tastingSvc := tasting.NewService(queries)
	hub := websocket.NewHub()
	go hub.Run()
	tastingHandler := tasting.NewHandler(tastingSvc, hub)
	stylesSvc := styles.NewService(queries)
	stylesHandler := styles.NewHandler(stylesSvc)
	inscriptionSvc := inscription.NewService(queries)
	inscriptionHandler := inscription.NewHandler(inscriptionSvc)

	var emailSender email.Sender
	switch provider := os.Getenv("EMAIL_PROVIDER"); provider {
	case "resend":
		apiKey := os.Getenv("RESEND_API_KEY")
		from := os.Getenv("EMAIL_FROM")
		if apiKey == "" || from == "" {
			slog.Error("RESEND_API_KEY y EMAIL_FROM son requeridos cuando EMAIL_PROVIDER=resend")
			os.Exit(1)
		}
		emailSender = email.NewResendSender(apiKey, from)
	case "ses":
		emailSender = email.NewSESSender()
	case "", "log":
		emailSender = email.NewLogSender()
	default:
		slog.Error("EMAIL_PROVIDER inválido", "provider", provider, "validos", "resend | ses | log")
		os.Exit(1)
	}
	slog.Info("email sender inicializado", "sender", fmt.Sprintf("%T", emailSender))

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})
	e.POST("/auth/login", authHandler.Login)
	e.POST("/auth/refresh", authHandler.Refresh)
	e.POST("/auth/logout", authHandler.Logout)

	protected := e.Group("")
	protected.Use(custommiddleware.JWTMiddleware)
	protected.GET("/auth/me", authHandler.Me)
	protected.POST("/auth/select-org", authHandler.SelectOrg)
	protected.GET("/api/v1/estilos/catalogo", stylesHandler.ListCatalogoAuthenticated)

	admin := protected.Group("/api/v1/admin")
	admin.POST("/ediciones", competitionHandler.CreateEdicion)
	admin.GET("/ediciones", competitionHandler.ListEdiciones)
	admin.GET("/ediciones/:id", competitionHandler.GetEdicion)
	admin.PUT("/ediciones/:id", competitionHandler.UpdateEdicion)
	admin.PATCH("/ediciones/:id/estado", competitionHandler.CambiarEstado)

	admin.POST("/ediciones/:id/precios", competitionHandler.CreatePrecio)
	admin.GET("/ediciones/:id/precios", competitionHandler.ListPrecios)
	admin.PUT("/ediciones/:id/precios/:precio_id", competitionHandler.UpdatePrecio)
	admin.DELETE("/ediciones/:id/precios/:precio_id", competitionHandler.DeletePrecio)

	admin.POST("/ediciones/:id/lugares", competitionHandler.CreateLugar)
	admin.GET("/ediciones/:id/lugares", competitionHandler.ListLugares)
	admin.PUT("/ediciones/:id/lugares/:lugar_id", competitionHandler.UpdateLugar)
	admin.DELETE("/ediciones/:id/lugares/:lugar_id", competitionHandler.DeleteLugar)

	admin.POST("/ediciones/:id/descuentos", competitionHandler.CreateDescuento)
	admin.GET("/ediciones/:id/descuentos", competitionHandler.ListDescuentos)
	admin.PUT("/ediciones/:id/descuentos/:descuento_id", competitionHandler.UpdateDescuento)
	admin.DELETE("/ediciones/:id/descuentos/:descuento_id", competitionHandler.DeleteDescuento)

	admin.GET("/ediciones/:id/cata/progreso", tastingHandler.GetProgresoVuelosEdicion)
	admin.GET("/ediciones/:id/cata/incongruencias", tastingHandler.GetIncongruenciasVuelo)
	admin.PATCH("/ediciones/:id/evaluaciones/:evaluacion_id", tastingHandler.UpdateEvaluacionAdmin)
	admin.GET("/ediciones/:id/cata/live", tastingHandler.LiveCata)

	admin.GET("/estilos", stylesHandler.List)
	admin.GET("/estilos/catalogo", stylesHandler.ListCatalogo)
	admin.POST("/estilos", stylesHandler.Create)
	admin.PATCH("/estilos/:id", stylesHandler.Update)
	admin.PUT("/estilos/:id/campos", stylesHandler.UpdateCampos)
	admin.DELETE("/estilos/:id", stylesHandler.Delete)

	admin.GET("/ediciones/:id/inscripcion/muestras", inscriptionHandler.AdminListMuestras)
	admin.PATCH("/ediciones/:id/muestras/:muestra_id/aprobar", inscriptionHandler.AprobarMuestra)
	admin.PATCH("/cervecerias/:id/estado-pago", inscriptionHandler.UpdateEstadoPago)

	grupos := admin.Group("/ediciones/:id/grupos")
	grupos.GET("", competitionHandler.ListGrupos)
	grupos.POST("", competitionHandler.CreateGrupo)
	grupos.PUT("/:grupo_id", competitionHandler.UpdateGrupo)
	grupos.DELETE("/:grupo_id", competitionHandler.DeleteGrupo)
	grupos.POST("/autoasignar", competitionHandler.AutoasignarGrupos)
	grupos.GET("/:grupo_id/muestras", competitionHandler.ListMuestrasByGrupo)

	admin.PATCH("/ediciones/:id/muestras/:muestra_id/grupo", competitionHandler.MoverMuestra)
	admin.GET("/ediciones/:id/muestras/sin-grupo", competitionHandler.ListMuestrasSinGrupo)

	cerveceria := protected.Group("/api/v1/cerveceria")
	cerveceria.GET("/ediciones", inscriptionHandler.GetEdicionesActivas)
	cerveceria.GET("/ediciones/disponibles", inscriptionHandler.GetEdicionesDisponibles)
	cerveceria.GET("/ediciones/disponibles/:id", inscriptionHandler.GetEdicionDisponibleDetalle)
	cerveceria.POST("/ediciones/:id/inscribirse", inscriptionHandler.InscribirCerveceria)
	cerveceria.GET("/ediciones/:id/muestras", inscriptionHandler.ListMuestras)
	cerveceria.POST("/ediciones/:id/muestras", inscriptionHandler.CreateMuestra)
	cerveceria.PATCH("/ediciones/:id/muestras/:muestra_id", inscriptionHandler.UpdateMuestra)
	cerveceria.DELETE("/ediciones/:id/muestras/:muestra_id", inscriptionHandler.DeleteMuestra)

	juez := protected.Group("/api/v1/juez")
	juez.GET("/ediciones", tastingHandler.GetEdicionesActivasJuez)
	juez.GET("/ediciones/:edicion_id/vuelos", tastingHandler.GetVuelosJuez)
	juez.GET("/ediciones/:edicion_id/vuelos/:vuelo_id/muestras", tastingHandler.GetMuestrasVuelo)
	juez.POST("/ediciones/:edicion_id/evaluaciones", tastingHandler.CreateEvaluacion)
	juez.GET("/ediciones/:edicion_id/evaluaciones", tastingHandler.GetEvaluacionesJuez)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	slog.Info("Starting server", "port", port)
	e.Logger.Fatal(e.Start(":" + port))
}
