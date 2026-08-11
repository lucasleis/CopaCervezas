# Copa Cervezas — Contexto del proyecto para Claude Code

Sos el agente de desarrollo de **Nivalis**, una plataforma SaaS para gestión de competencias de cerveza artesanal. El cliente primario es Copa Argentina de Cervezas.

Leé este archivo antes de cualquier tarea. No pidas aclaraciones sobre lo que está documentado aquí.

---

## Estructura del monorepo

```
CopaCervezas/
├── frontend/                   ← React frontend
│   └── src/
│       ├── api/
│       │   ├── client.ts           ← axios + auto-refresh + request queue
│       │   ├── auth.ts             ← login(), logout(), getMe(), selectOrg()
│       │   └── ediciones.ts        ← full edition API client
│       ├── components/
│       │   ├── ui/                 ← shadcn/ui (@base-ui/react)
│       │   ├── AdminLayout.tsx
│       │   └── Sidebar.tsx
│       ├── contexts/
│       │   └── AuthContext.tsx     ← isAuthenticated, role, loading
│       ├── pages/
│       │   ├── LoginPage.tsx       ← role-based redirect after login
│       │   └── SelectOrgPage.tsx   ← multi-org selection screen
│       └── router.tsx              ← ProtectedRoute (requiredRole), RootRedirect
├── backend/
│   ├── cmd/server/main.go      ← Echo server, CORS, todas las rutas
│   ├── internal/
│   │   ├── auth/
│   │   │   └── handler.go      ← Login, Me, Refresh, Logout, SelectOrg
│   │   ├── middleware/
│   │   │   └── jwt.go          ← JWT middleware, inyecta usuario_id/org_id/rol/email
│   │   └── db/                 ← generado por sqlc — NO EDITAR
│   ├── db/
│   │   ├── migrations/         ← 000001–000008 (auth + edition config)
│   │   ├── queries/
│   │   │   ├── auth.sql
│   │   │   └── ediciones.sql
│   │   └── seeds/
│   │       ├── auth_seed.sql   ← 3 usuarios + 1 org
│   │       └── edicion_seed.sql
│   ├── sqlc.yaml
│   ├── .env                    ← local only, gitignored
│   ├── .env.example
│   ├── go.mod
│   └── go.sum
├── CLAUDE.md
├── package.json
└── vite.config.ts
```

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind v4 + shadcn/ui (@base-ui/react) + React Query |
| Backend | Go + Echo v4 |
| Base de datos | PostgreSQL (local: `copa_cervezas`) |
| Query layer | sqlc |
| Tiempo real | WebSockets (Echo) — panel admin durante la jornada de cata |
| Auth | JWT (15min, memoria de módulo) + httpOnly cookie refresh token (8h) |

---

## Sistema de auth — COMPLETO ✅

- Access token: solo en memoria de módulo (nunca localStorage)
- Refresh token: httpOnly cookie, almacenado hasheado en DB, rotado en cada refresh
- Login URL única para los 3 roles → redirect por rol
- CORS configurado con env var `ALLOWED_ORIGIN`
- Seeds locales: admin@copa.com / judge@copa.com / brewery@copa.com (passwords: admin123 / judge123 / brewery123)
- Org ID: `bbbbbbbb-0000-0000-0000-000000000001`

**Endpoints de auth:**
- `POST /auth/login` — retorna access token o lista de orgs para usuarios multi-org
- `GET /auth/me` — retorna id, email, rol (requiere JWT)
- `POST /auth/refresh` — rota refresh token, retorna nuevo access token
- `POST /auth/logout` — revoca refresh token, limpia cookie
- `POST /auth/select-org` — emite tokens para org seleccionada (requiere JWT)

---

## Módulo de configuración de ediciones — EN PROGRESO (LLE-7)

**Existe:**
- Migrations 000005–000008: ediciones, precios_inscripcion, lugares_entrega, codigos_descuento
- `backend/db/queries/ediciones.sql` — 17 queries sqlc
- `backend/db/seeds/edicion_seed.sql` — seed Copa Argentina 2027
- `frontend/src/api/ediciones.ts` — tipos TypeScript y funciones API completas

**No existe aún:**
- Handlers CRUD de ediciones en backend
- Endpoint de máquina de estados `/ediciones/:id/estado`
- Páginas frontend: EdicionesPage, EdicionDetailPage

---

## Tres roles

| Rol | Redirect post-login | Acceso |
|---|---|---|
| `admin` | `/dashboard` | Gestión completa de la competencia |
| `judge` | `/cata` | Solo los flights asignados |
| `brewery` | `/mis-muestras` | Solo sus muestras y feedback |

---

## Reglas de negocio clave

- Access token: 15 min, solo en memoria de módulo
- Refresh token: 8 horas, httpOnly cookie, hasheado en DB
- Admin puede revocar sesiones (marca refresh token como revocado en DB)
- Feedback no visible para cervecerías hasta que admin cierre la edición
- Códigos anónimos: 4 dígitos numéricos, random, únicos por edición
- **Todas las queries filtran por `org_id` del JWT — nunca desde params del request**

---

## Convenciones de trabajo

- NO almacenar tokens en localStorage o sessionStorage — nunca
- NO corregir errores silenciosamente — reportar archivo y número de línea, luego parar
- NO agregar features más allá de lo explícitamente pedido
- NO editar `backend/internal/db/` — es código generado por sqlc
- Hacer commit después de cada paso completado
- El trabajo con DB requiere PostgreSQL local corriendo (`sudo service postgresql start`)
- Ejecutar `sqlc generate` desde `backend/` después de cualquier cambio en migrations

---

## Convenciones de UI

- Antes de escribir un elemento HTML nativo (`button`, `input`, `textarea`, `select`, `table`, `label`, `checkbox`), revisar `frontend/src/components/ui/`. Si existe el componente equivalente, usarlo.
- Si el componente existe pero le falta una variante o un tamaño para el caso, agregar la variante al componente en `ui/` — no esquivarlo con clases sueltas.
- Los colores salen de los tokens de `@theme` en `index.css` (`primary`, `success`, `warning`, `danger`, `info`, `neutral`, `destructive`). No usar la paleta Tailwind por defecto (`red-*`, `gray-*`, `green-*`, `yellow-*`, `blue-*`, `purple-*`, `orange-*`, `amber-*`).

---

## Convenciones Go

### Nomenclatura

- Paquetes: minúsculas, una palabra, sin guiones bajos (`auth`, `competition`, `tasting`)
- Exported: MixedCaps (`UserID`, `OrgID`, no `UserId`, `OrgId`)
- Acrónimos en mayúscula: `userID`, `orgID`, `httpClient`, `apiKey`
- Interfaces: sustantivo o adjetivo, sin prefijo `I` (`Reader`, `Validator`, no `IReader`)
- Errores sentinel: `var ErrNotFound = errors.New(...)`, prefijo `Err`
- Constructores: `New` o `NewXxx` — nunca `Create`, `Make`, `Build`
- Receivers: una o dos letras, consistentes en todo el tipo (`func (h *Handler)`)
- NO usar `utils/`, `helpers/`, `common/` — mover la función al paquete que corresponde
- NO prefijo `Get` en getters (`user.Name()` no `user.GetName()`)

### Manejo de errores

- Siempre wrappear con contexto: `fmt.Errorf("auth: login failed: %w", err)`
- Usar `errors.Is` / `errors.As` para inspección — nunca comparación directa
- Errores sentinel para casos conocidos: `var ErrTokenExpired = errors.New("token expired")`
- Errores HTTP: devolver mensajes genéricos al cliente, loggear detalles server-side
- NO ignorar errores con `_` salvo en casos explícitamente justificados con comentario
- NO usar `panic` salvo en `init()` con configuración inválida

### Context

- Primer parámetro siempre: `func (h *Handler) Login(ctx context.Context, ...)`
- NO almacenar contexto en structs — pasarlo explícitamente
- NO usar `context.Background()` en handlers — propagar el contexto de Echo: `c.Request().Context()`
- Cancelación: respetar `ctx.Done()` en loops y operaciones largas
- NO guardar valores de negocio en contexto salvo IDs de request/tracing

### Seguridad

- SQL: usar siempre queries parametrizadas de sqlc — nunca concatenación de strings
- Tokens: `crypto/rand` para generación — nunca `math/rand`
- Comparación de secretos: `crypto/subtle.ConstantTimeCompare` — nunca `==`
- Passwords: bcrypt (ya implementado en auth) — nunca MD5/SHA1
- Errores: devolver mensajes genéricos al cliente, detalles solo en logs
- Headers de seguridad: configurar en middleware de Echo
- Secrets: solo via variables de entorno — nunca hardcodeados ni en código fuente
- Race conditions: correr `go test -race ./...` — corregir todos los findings
- `org_id` siempre del JWT, nunca del request body o query params

### Seguridad — httpOnly cookies (específico del proyecto)

- Flags obligatorios: `HttpOnly: true`, `Secure: true` (en prod), `SameSite: http.SameSiteStrictMode`
- NO exponer el refresh token en ninguna respuesta JSON
- Validar `SameSite` antes de procesar cualquier request con cookie

### Safety (prevención de bugs silenciosos)

- Siempre chequear nil antes de dereferenciar punteros
- NO asumir que slices no son nil después de `append` en goroutines concurrentes
- Maps: no acceder concurrentemente sin `sync.RWMutex` o `sync.Map`
- NO comparar floats con `==` — usar epsilon o `math.Round`
- Diseñar structs para que el zero value sea válido cuando sea posible
- Chequear overflow en conversiones numéricas (`int32` → `int64`, etc.)

### Modernización (Go idiomático actual)

- Usar `min()` / `max()` builtins (Go 1.21+) en lugar de funciones custom
- Range-over-int para loops simples: `for i := range n {` (Go 1.22+)
- `slices` y `maps` de stdlib en lugar de loops manuales cuando corresponda
- `slog` para logging estructurado (no `log.Printf`)
- Loop variables: en Go 1.22+ ya no hay shadowing — no agregar copias defensivas innecesarias

### Naming en tests

- Funciones de test: `TestNombreFuncion_Escenario` (`TestLogin_InvalidCredentials`)
- Table-driven tests con `t.Run(tc.name, ...)`
- `require` para precondiciones (si falla, el test no puede continuar)
- `assert` para verificaciones (el test continúa aunque falle)

---

## Convenciones PostgreSQL

### Diseño de tablas

- Primary keys: `BIGINT GENERATED ALWAYS AS IDENTITY` por defecto. Usar `UUID` solo cuando se necesite unicidad global u opacidad (ej: IDs expuestos al cliente)
- Normalizar hasta 3NF por defecto. Desnormalizar solo cuando el problema de performance esté medido y justificado
- `NOT NULL` en todo campo semánticamente requerido. Agregar `DEFAULT` donde tenga sentido
- `snake_case` para nombres de tablas y columnas — nunca camelCase ni identificadores entre comillas

### Tipos de datos

| Dato | Tipo correcto | Evitar |
|---|---|---|
| Timestamps | `TIMESTAMPTZ` | `TIMESTAMP` sin zona |
| Dinero / decimales exactos | `NUMERIC` | `MONEY`, `FLOAT` |
| Strings | `TEXT` | `VARCHAR(n)` salvo restricción real de largo |
| Enteros grandes | `BIGINT` | `INT` si puede crecer |
| Semi-estructurado | `JSONB` | `JSON` (no indexable eficientemente) |
| IDs internos | `BIGINT GENERATED ALWAYS AS IDENTITY` | `SERIAL` (deprecated) |

### Índices

- PostgreSQL **no crea automáticamente índices en FK columns** — agregarlos siempre manualmente
- B-tree: igualdad y rangos (default, la mayoría de los casos)
- GIN: JSONB, arrays, full-text search
- Índices parciales para subsets frecuentes: `CREATE INDEX ... WHERE estado = 'activo'`
- Índices en columnas de filtro frecuente, joins, y ordenamiento

### Gotchas de PostgreSQL

- Identificadores sin comillas → se convierten a minúsculas automáticamente
- `UNIQUE` permite múltiples NULLs por defecto. Usar `NULLS NOT DISTINCT` (PG15+) para restringirlo
- Gaps en sequences/identity son normales (rollbacks, crashes). No intentar corregirlos
- `MVCC` deja dead tuples: VACUUM los limpia. Evitar updates de columnas anchas y frecuentes en filas calientes
- Sin clustered PK por defecto (distinto a MySQL/SQL Server). `CLUSTER` es reorganización one-off, no se mantiene

### Convenciones del proyecto

- Todas las tablas filtran por `org_id` — nunca exponer datos cross-tenant
- `org_id` siempre viene del JWT, nunca del request body o query params
- Migrations numeradas secuencialmente: `000009_descripcion.up.sql` / `000009_descripcion.down.sql`
- NO editar `backend/internal/db/` — es código generado por sqlc
- Ejecutar `sqlc generate` desde `backend/` después de cualquier cambio en queries o migrations

---

## Próxima tarea (inicio de próxima sesión)

Verificar que el login funcione end-to-end desde el browser:
1. Iniciar backend: `cd backend && go run ./cmd/server`
2. Iniciar frontend: `npm run dev` (desde root del repo)
3. Abrir http://localhost:5173 y loguearse con admin@copa.com / admin123
4. Verificar redirect a /dashboard
