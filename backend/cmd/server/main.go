package main

import (
	"database/sql"
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
	custommiddleware "github.com/lucasleis/nivalis/internal/middleware"
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
	competitionSvc := competition.NewService(queries)
	competitionHandler := competition.NewHandler(competitionSvc)

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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	slog.Info("Starting server", "port", port)
	e.Logger.Fatal(e.Start(":" + port))
}
