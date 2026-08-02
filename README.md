# Nivalis — Plataforma de Competencias de Cervezas

Sistema de gestión integral para competencias de evaluación de cervezas artesanales. Cliente inicial: Copa Argentina de Cervezas.

## Stack

- **Backend:** Go + Echo, PostgreSQL, sqlc
- **Frontend:** React + Vite + shadcn/ui + React Query
- **Auth:** JWT (access token en memoria) + refresh token en cookie httpOnly

---

## Requisitos previos

- Go 1.22+
- Node.js 18+
- PostgreSQL 15+ corriendo localmente
- [golang-migrate CLI](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate)

---

## Configuración inicial (primera vez)

### 1. Clonar el repo

```bash
git clone <repo-url>
cd CopaCervezas
```

### 2. Crear la base de datos

```bash
psql -U postgres -c "CREATE DATABASE copa_cervezas;"
```

### 3. Configurar variables de entorno

**Backend** — crear `backend/.env` copiando el ejemplo:

```bash
cp backend/.env.example backend/.env
```

Contenido de `backend/.env`:

```
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost/copa_cervezas?sslmode=disable
JWT_SECRET=cambia-esto-por-un-secreto-seguro-en-produccion
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=8h
ALLOWED_ORIGIN=http://localhost:5173
```

**Frontend** — crear `frontend/.env` copiando el ejemplo:

```bash
cp frontend/.env.example frontend/.env
```

Contenido de `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:8080
```

### 4. Correr las migraciones

```bash
cd backend
migrate -path db/migrations -database "postgres://postgres:postgres@localhost/copa_cervezas?sslmode=disable" up
```

### 5. Cargar el seed inicial

```bash
cd backend
go run ./cmd/seed
```

Esto crea la organización, usuarios y datos de ejemplo necesarios para usar la app.

### 6. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

---

## Levantar la app en local

Abrí **dos terminales**:

**Terminal 1 — Backend:**

```bash
cd backend
go run ./cmd/server
```

El backend queda corriendo en `http://localhost:8080`.

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

El frontend queda corriendo en `http://localhost:5173`.

Abrí el navegador en **http://localhost:5173**.

---

## Usuarios del seed

| Email | Password | Rol |
|---|---|---|
| admin@copa.com | admin123 | Administrador |
| judge@copa.com | judge123 | Juez |
| brewery@copa.com | brewery123 | Cervecería |

---

## Qué podés ver en la app hoy

### Como administrador (`admin@copa.com`)

| Sección | URL | Descripción |
|---|---|---|
| Ediciones | `/admin/ediciones` | Lista y gestión de ediciones de la competencia |
| Detalle de edición | `/admin/ediciones/:id` | Configuración general, precios, lugares, descuentos y estado |
| Agrupación de muestras | `/admin/ediciones/:id/grupos` | Agrupar estilos en grupos de premiación (disponible en estado `pre-cata`) |
| Inscriptos | `/admin/ediciones/:id/inscripcion` | Ver muestras inscriptas, aprobar, marcar pagos, exportar mails |
| Estilos | `/admin/estilos` | Gestión del catálogo de estilos propio de la organización |
| Cata en vivo | `/admin/cata/:edicion_id` | Panel de progreso en tiempo real durante la jornada de cata |

### Como cervecería (`brewery@copa.com`)

| Sección | URL | Descripción |
|---|---|---|
| Mis muestras | `/mis-muestras` | Inscribir y gestionar muestras propias |

### Como juez (`judge@copa.com`)

| Sección | URL | Descripción |
|---|---|---|
| Mis vuelos | `/cata` | Ver vuelos asignados y estado de evaluación |
| Evaluar vuelo | `/cata/:vuelo_id` | Formulario de evaluación horizontal con validaciones en tiempo real |

---

## Estados de una edición

```
config → inscripcion → pre-cata → cata → devolucion → cerrada
```

| Estado | Qué está habilitado |
|---|---|
| `config` | Configuración general, precios, lugares, descuentos |
| `inscripcion` | Las cervecerías pueden inscribir muestras |
| `pre-cata` | Agrupación de estilos, generación de códigos anónimos, armado de vuelos |
| `cata` | Jornada de cata — jueces evalúan, admin monitorea en tiempo real |
| `devolucion` | Las cervecerías acceden a sus devoluciones |
| `cerrada` | Edición finalizada |

---

## Estructura del monorepo

```
CopaCervezas/
├── backend/
│   ├── cmd/
│   │   ├── server/        # Entry point del servidor
│   │   └── seed/          # Seed de datos iniciales
│   ├── db/
│   │   ├── migrations/    # Migraciones SQL (golang-migrate)
│   │   └── queries/       # Queries sqlc (.sql)
│   └── internal/
│       ├── auth/          # Módulo de autenticación
│       ├── competition/   # Ediciones, grupos, vuelos
│       ├── db/            # Código generado por sqlc (no editar)
│       ├── inscription/   # Inscripción de muestras
│       ├── middleware/    # JWT middleware
│       ├── styles/        # Estilos BJCP y custom
│       └── tasting/       # Sistema de cata
└── frontend/
    └── src/
        ├── api/           # Funciones de fetch por módulo
        ├── components/    # Componentes reutilizables (shadcn + propios)
        ├── contexts/      # AuthContext
        └── pages/
            ├── admin/     # Páginas del panel administrador
            ├── brewery/   # Páginas de la cervecería
            └── juez/      # Páginas del juez
```

---

## Comandos útiles

### Regenerar código sqlc (después de modificar queries .sql)

```bash
cd backend
sqlc generate
```

### Crear una nueva migración

```bash
migrate create -ext sql -dir db/migrations -seq nombre_de_la_migracion
```

### Revertir la última migración

```bash
cd backend
migrate -path db/migrations -database "postgres://postgres:postgres@localhost/copa_cervezas?sslmode=disable" down 1
```

### Build de producción del frontend

```bash
cd frontend
npm run build
```

---

## Notas de desarrollo

- El access token JWT **nunca** se guarda en localStorage ni sessionStorage — vive en memoria del módulo `api/client.ts`. El refresh token vive en una cookie `httpOnly`.
- Todas las queries filtran por `org_id` extraído del JWT — nunca del request body o query params.
- `backend/internal/db/` es código generado por sqlc. **No editar manualmente** — siempre correr `sqlc generate` después de modificar los `.sql`.
- El frontend está en `frontend/` (no en la raíz del monorepo).



to kill procces in port X
fuser -k 5173/tcp

clear && fuser -k 8080/tcp && cd /mnt/c/Users/lucas/Codigos/CopaCervezas/backend && go run ./cmd/server