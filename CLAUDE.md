You are working on **Nivalis** — a SaaS platform for managing craft beer competitions. The primary client is Copa Argentina de Cervezas.

Before starting any task, read this file to understand the project context. Do not ask for clarification on anything covered here.

---

## Monorepo structure

The repo root contains:
- Frontend files directly at root (`src/`, `package.json`, `vite.config.ts`, etc.) — NOT inside a `frontend/` folder
- `backend/` — Go + Echo backend

copa_cervezas/
├── src/ ← React frontend (Vite + TypeScript + Tailwind v4 + shadcn/ui)
│ ├── api/
│ │ ├── client.ts ← axios instance, withCredentials, 401 interceptor
│ │ └── auth.ts ← login(), logout(), getMe(), Role type
│ ├── components/
│ │ ├── ui/ ← shadcn/ui components (@base-ui/react)
│ │ ├── AdminLayout.tsx
│ │ └── Sidebar.tsx
│ ├── contexts/
│ │ └── AuthContext.tsx ← isAuthenticated, role, loading, setAuthenticated, logout
│ ├── pages/
│ │ └── LoginPage.tsx ← role-based redirect after login
│ └── router.tsx ← ProtectedRoute (with requiredRole), RootRedirect
├── backend/
│ ├── cmd/server/main.go ← Echo server, GET /health
│ ├── internal/
│ │ ├── auth/ ← auth handlers (not yet implemented)
│ │ └── middleware/ ← JWT middleware (not yet implemented)
│ ├── db/
│ │ ├── migrations/ ← 8 migration files (000001–000004, up+down)
│ │ └── queries/
│ │ └── auth.sql ← 6 sqlc queries
│ ├── sqlc.yaml
│ ├── go.mod ← module: github.com/lucasleis/copa_cervezas
│ └── go.sum
├── package.json
└── vite.config.ts


---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind v4 + shadcn/ui (@base-ui/react) + React Query |
| Backend | Go + Echo v4 |
| Database | PostgreSQL 15 |
| Query layer | sqlc |
| Real-time | WebSockets (Echo) — for admin panel during tasting |
| Auth | JWT (15min access token in module memory) + httpOnly cookie refresh token (8h) |

---

## Auth system — current state

**What exists:**
- `src/api/client.ts` — axios instance with `withCredentials: true` and a basic 401 → redirect interceptor. Does NOT yet have auto-refresh logic.
- `src/api/auth.ts` — `login()`, `logout()`, `getMe()`. Endpoints: `/auth/login`, `/auth/logout`, `/auth/me`. Returns `Role` type: `"admin" | "judge" | "brewery"`.
- `src/contexts/AuthContext.tsx` — stores `isAuthenticated` and `role`. No token storage.
- `backend/db/migrations/` — 4 migrations: organizaciones, usuarios, usuario_organizacion (with rol_enum), refresh_tokens.
- `backend/db/queries/auth.sql` — 6 sqlc queries ready for `sqlc generate`.
- `backend/cmd/server/main.go` — minimal Echo server with `GET /health`.

**What does NOT exist yet:**
- Auto-refresh logic in `client.ts` (access token in module memory, request queue)
- Backend auth handlers (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`)
- JWT middleware
- sqlc generated code (`internal/db/`) — needs `sqlc generate` with DB running
- Seed data

---

## Three roles

| Role | Redirect after login | Access |
|---|---|---|
| `admin` | `/dashboard` | Full competition management |
| `judge` | `/cata` | Assigned flights only |
| `brewery` | `/mis-muestras` | Own samples and feedback only |

A judge can simultaneously be a brewery participant. The system blocks them from evaluating their own samples.

---

## Key business rules (relevant to current work)

- Access token: 15 min, stored in **module memory only** (never localStorage, never sessionStorage)
- Refresh token: 8 hours, httpOnly cookie, stored hashed in DB
- Single login URL for all roles — role-based redirect after login
- Admin can revoke sessions mid-competition (marks refresh token as revoked in DB)
- Feedback is not visible to breweries until admin explicitly closes the edition
- Anonymous codes are 4 numeric digits, generated randomly, unique per edition

---

## Active ticket

**LLE-5 — AUTH: Login de 0 a 100** (In Progress)

Completed:
- [x] Paso 1 — Monorepo structure (Go backend scaffolded)
- [x] Paso 2 — DB migrations
- [x] Paso 3 — sqlc config and queries

Pending (require local PostgreSQL):
- [ ] Paso 4 — POST /auth/login handler
- [ ] Paso 5 — GET /auth/me + JWT middleware
- [ ] Paso 6 — POST /auth/refresh
- [ ] Paso 7 — POST /auth/logout
- [ ] Paso 8 — Seed data

Pending (can be done without DB):
- [ ] Paso 9 — client.ts auto-refresh with request queue
- [ ] Paso 10 — auth.ts: save access token in memory on login
- [ ] Paso 11 — LoginPage: org selection flow for multi-org users

---

## Working conventions

- Do NOT store tokens in localStorage or sessionStorage — ever
- Do NOT auto-fix errors silently — report file name and line number, then stop
- Do NOT add features beyond what is explicitly requested
- Commit after each completed step with a descriptive message
- All DB work requires local PostgreSQL — skip execution if DB is not available, create files only
