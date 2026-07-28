You are working on **Nivalis** — a SaaS platform for managing craft beer competitions. The primary client is Copa Argentina de Cervezas.

Before starting any task, read this file to understand the project context. Do not ask for clarification on anything covered here.

---

## Monorepo structure

The repo root contains:
- Frontend files directly at root (`src/`, `package.json`, `vite.config.ts`, etc.) — NOT inside a `frontend/` folder
- `backend/` — Go + Echo backend

CopaCervezas/
├── src/ ← React frontend
│ ├── api/
│ │ ├── client.ts ← axios + auto-refresh + request queue
│ │ ├── auth.ts ← login(), logout(), getMe(), selectOrg()
│ │ └── ediciones.ts ← full edition API client
│ ├── components/
│ │ ├── ui/ ← shadcn/ui (@base-ui/react)
│ │ ├── AdminLayout.tsx
│ │ └── Sidebar.tsx
│ ├── contexts/
│ │ └── AuthContext.tsx ← isAuthenticated, role, loading
│ ├── pages/
│ │ ├── LoginPage.tsx ← role-based redirect after login
│ │ └── SelectOrgPage.tsx ← multi-org selection screen
│ └── router.tsx ← ProtectedRoute (requiredRole), RootRedirect
├── backend/
│ ├── cmd/server/main.go ← Echo server, CORS, all routes wired
│ ├── internal/
│ │ ├── auth/
│ │ │ └── handler.go ← Login, Me, Refresh, Logout, SelectOrg
│ │ ├── middleware/
│ │ │ └── jwt.go ← JWT middleware, injects usuario_id/org_id/rol/email
│ │ └── db/ ← sqlc generated — DO NOT EDIT
│ ├── db/
│ │ ├── migrations/ ← 000001–000008 (auth + edition config)
│ │ ├── queries/
│ │ │ ├── auth.sql
│ │ │ └── ediciones.sql
│ │ └── seeds/
│ │ ├── auth_seed.sql ← 3 users + 1 org
│ │ └── edicion_seed.sql
│ ├── sqlc.yaml
│ ├── .env ← local only, gitignored
│ ├── .env.example
│ ├── go.mod
│ └── go.sum
├── CLAUDE.md
├── package.json
└── vite.config.ts


---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind v4 + shadcn/ui (@base-ui/react) + React Query |
| Backend | Go + Echo v4 |
| Database | PostgreSQL (local: `copa_cervezas`) |
| Query layer | sqlc |
| Real-time | WebSockets (Echo) — for admin panel during tasting |
| Auth | JWT (15min access token in module memory) + httpOnly cookie refresh token (8h) |

---

## Auth system — COMPLETE ✅

- Access token: stored in module memory only (never localStorage)
- Refresh token: httpOnly cookie, stored hashed in DB, rotated on each refresh
- Single login URL for all 3 roles → role-based redirect
- CORS configured with `ALLOWED_ORIGIN` env var
- Local seeds: admin@copa.com / judge@copa.com / brewery@copa.com (passwords: admin123 / judge123 / brewery123)
- Org ID: `bbbbbbbb-0000-0000-0000-000000000001`

**Backend endpoints:**
- `POST /auth/login` — returns access token or org list for multi-org users
- `GET /auth/me` — returns id, email, role (JWT required)
- `POST /auth/refresh` — rotates refresh token, returns new access token
- `POST /auth/logout` — revokes refresh token, clears cookie
- `POST /auth/select-org` — issues tokens for selected org (JWT required)

---

## Edition config module — IN PROGRESS (LLE-7)

**What exists:**
- Migrations 000005–000008: ediciones, precios_inscripcion, lugares_entrega, codigos_descuento
- `backend/db/queries/ediciones.sql` — 17 sqlc queries
- `backend/db/seeds/edicion_seed.sql` — Copa Argentina 2027 seed
- `src/api/ediciones.ts` — full TypeScript types and API functions

**What does NOT exist yet:**
- Backend CRUD handlers for ediciones
- State machine endpoint `/ediciones/:id/estado`
- Frontend pages: EdicionesPage, EdicionDetailPage

---

## Three roles

| Role | Redirect after login | Access |
|---|---|---|
| `admin` | `/dashboard` | Full competition management |
| `judge` | `/cata` | Assigned flights only |
| `brewery` | `/mis-muestras` | Own samples and feedback only |

---

## Next task (start of next session)

Verify that login works end-to-end from the browser:
1. Start backend: `cd backend && go run ./cmd/server`
2. Start frontend: `npm run dev` (from repo root)
3. Open http://localhost:5173 and login with admin@copa.com / admin123
4. Verify redirect to /dashboard

---

## Key business rules

- Access token: 15 min, module memory only
- Refresh token: 8 hours, httpOnly cookie, hashed in DB
- Admin can revoke sessions (marks refresh token revoked in DB)
- Feedback not visible to breweries until admin closes the edition
- Anonymous codes: 4 numeric digits, random, unique per edition
- All DB queries filter by org_id from JWT — never from request params

---

## Working conventions

- Do NOT store tokens in localStorage or sessionStorage — ever
- Do NOT auto-fix errors silently — report file name and line number, then stop
- Do NOT add features beyond what is explicitly requested
- Do NOT edit `backend/internal/db/` — it is sqlc generated
- Commit after each completed step
- DB work requires local PostgreSQL running (`sudo service postgresql start`)
- Run `sqlc generate` from `backend/` after any migration changes
