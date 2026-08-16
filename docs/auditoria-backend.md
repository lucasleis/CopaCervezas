# Auditoría de backend — Copa Cervezas / Nivalis

> Auditoría de solo lectura ejecutada el 16/08/2026 sobre la rama `claude/backend-multitenant-audit-yrypjl`.
> No se modificó ningún archivo del backend. Este documento es la única salida.
>
> Documentos de Linear leídos completos antes de mirar código: Reglas de Negocio, Esquema Conceptual, Stack Tecnológico y Arquitectura, Modelo de Autenticación, API — Endpoints. Los cinco se pudieron leer.

---

## 1. Estructura real del repositorio verificada

La estructura real **no coincide** con ninguno de los dos documentos que la describen. Es la primera divergencia y conviene resolverla antes que nada, porque las otras dos versiones mandan a buscar archivos a rutas que no existen.

```
CopaCervezas/
├── frontend/                        ← el frontend está en frontend/, NO en la raíz
│   └── src/{api,components,contexts,hooks,lib,pages}/
│   ├── package.json, vite.config.ts, index.html
├── backend/
│   ├── cmd/server/main.go           (189 líneas — rutas y wiring)
│   ├── internal/
│   │   ├── auth/handler.go          (714)
│   │   ├── competition/{handler.go (1072), service.go (677)}
│   │   ├── inscription/{handler.go (677), service.go (482)}
│   │   ├── tasting/{handler.go (505), service.go (308)}
│   │   ├── styles/{handler.go (310), service.go (264)}
│   │   ├── email/{email,log,resend,ses,templates}.go + templates/*.html
│   │   ├── middleware/jwt.go        (62)
│   │   └── db/                      ← AUSENTE del repo (gitignored, generado por sqlc)
│   ├── db/
│   │   ├── migrations/              000001–000024 (24 migraciones, up+down)
│   │   ├── queries/                 auth, cata, ediciones, estilos, grupos, inscripcion, tokens (668 líneas)
│   │   └── seeds/                   auth, edicion, cata, estilos_bjcp, estilos_org
│   ├── pkg/websocket/hub.go         (154)
│   ├── go.mod (module github.com/lucasleis/nivalis), sqlc.yaml, .env.example
├── CLAUDE.md, README.md, LICENSE, auditoria-ui.md
└── .claude/settings.local.json
```

Tres contradicciones de estructura contra la documentación:

| Fuente | Dice | Realidad |
|---|---|---|
| *Stack Tecnológico y Arquitectura* (corregido 09/08) | "el frontend está en la raíz del repositorio", `src/` en root | El frontend está en `frontend/src/`. La "corrección" del 09/08 introdujo el error. |
| `CLAUDE.md` | `backend/internal/` contiene solo `auth`, `middleware`, `db` | Contiene además `competition`, `inscription`, `tasting`, `styles`, `email` |
| *Stack Tecnológico* | `internal/feedback/`, `docker-compose.yml` | No existen |

**Total backend: 5.542 líneas de Go, 668 de SQL, 0 líneas de test.**

`backend/internal/db/` está en `.gitignore` y no está en el repo. Toda referencia a tipos `db.*` en esta auditoría se infirió de los `.sql` de `db/queries/` y de las migraciones.

---

## 2. Resumen ejecutivo

### Hallazgos por severidad

| Severidad | Cantidad |
|---|---|
| **Crítico** | 4 |
| **Alto** | 11 |
| **Medio** | 35 |
| **Bajo** | 15 |
| **Total** | **65** |

### Los 5 más graves

1. **AUD-001 (Crítico)** — `GET /admin/ediciones/:id/grupos/:grupo_id/muestras` descarta el `org_id` del JWT: cualquier admin lee las muestras de otra organización, con nombre comercial, código de participante y código anónimo.
2. **AUD-002 (Crítico)** — El WebSocket `/admin/ediciones/:id/cata/live` no verifica que la edición pertenezca a la organización del token: un admin se suscribe al panel de cata en vivo de otro tenant.
3. **AUD-003 (Crítico)** — `JWT_SECRET` no se valida al arranque; si falta, el servidor firma y valida tokens con clave vacía y cualquiera puede forjar un admin de cualquier organización.
4. **AUD-004 (Crítico)** — El endpoint del juez serializa `info_adicional` completo, incluido `fabricas_participantes` del estilo 999D, que la documentación marca como "NUNCA a jueces". El flag `visible_jueces` existe en el código pero nadie lo lee.
5. **AUD-065 (Alto)** — El registro público de cervecerías nunca crea la fila en `usuario_organizacion`: toda cuenta nueva recibe "sin organización asignada" al intentar loguearse. El flujo documentado en *Modelo de Autenticación* está roto de punta a punta.

### Lo que está bien y conviene no romper

No todo es hallazgo. Cuatro cosas están resueltas con criterio y merecen quedar registradas:

- **`AutoasignarGrupos`** (`competition/service.go:439-560`) es la única operación multi-escritura correctamente transaccional, con `defer tx.Rollback()` y `WithTx`. Es el patrón a replicar en el resto.
- **Los mensajes de error al cliente son genéricos en todos los handlers**; los detalles van a `slog` server-side. No se filtran nombres de tabla, SQL ni stack traces en ninguna respuesta.
- **Cobertura de índices en FKs**: todas las tablas indexan sus columnas de FK manualmente, como pide la convención de PostgreSQL del proyecto. No encontré ninguna columna filtrada frecuentemente sin índice.
- **Los tokens de un solo uso** (`db/queries/tokens.sql:6-11`) filtran `usado = FALSE AND expira_at > NOW()` en la query, no en Go. Correcto.

---

## 3. Hallazgos

## Eje 1 — Aislamiento multi-tenant

### AUD-001 · Crítico · Fuga de muestras entre organizaciones

**Archivo:** `backend/internal/competition/handler.go:1044-1072` y `backend/internal/competition/service.go:632-641`

El handler obtiene el `org_id` del contexto y lo **descarta con `_`**:

```
1048:  if _, ok := orgIDFromCtx(c); !ok {
1059:  muestras, err := h.svc.ListMuestrasByGrupo(c.Request().Context(), grupoID, edicionID)
```

La firma del servicio ni siquiera acepta `orgID`. Lo único que valida es que el grupo pertenezca a la edición (`GetGrupoByIDEdicion`), nunca que la edición pertenezca al tenant. La query final (`db/queries/grupos.sql:72-86`) filtra solo por `m.grupo_id`.

**Qué se rompe en producción:** cualquier usuario con rol `admin` en cualquier organización hace `GET /api/v1/admin/ediciones/{edicion_ajena}/grupos/{grupo_ajeno}/muestras` y obtiene el listado completo de muestras del competidor: `nombre_comercial`, `cod_participante`, `cod_anonimo` y estilo. Es simultáneamente una fuga cross-tenant y la ruptura del anonimato, porque devuelve el mapeo código anónimo ↔ nombre comercial en la misma fila. Los IDs son UUID, así que hace falta conocerlos; `ListGrupos` de la propia org no los expone, pero cualquier filtración parcial, log compartido o export los revela, y un tenant que alguna vez fue admin de otra org los conserva.

**Fix propuesto:** agregar `orgID` a la firma de `ListMuestrasByGrupo` y llamar a `verifyEdicionOwnership(ctx, edicionID, orgID)` como primera línea, igual que hacen `ListGrupos`, `ListMuestrasSinGrupo` y el resto de los métodos del mismo servicio. Complementariamente, agregar el filtro por `org_id` a la query `ListMuestrasByGrupo` para que el aislamiento no dependa solo de la capa de servicio.

---

### AUD-002 · Crítico · El WebSocket de cata en vivo no valida el tenant

**Archivo:** `backend/internal/tasting/handler.go:305-325`

`LiveCata` verifica el rol (`requireAdmin`), parsea el `edicion_id` del path y hace el upgrade directamente. No hay llamada a `verifyEdicionOwnership`, que sí existe en el mismo servicio (`tasting/service.go:259-268`) y sí se usa en los tres handlers admin vecinos (`GetProgresoVuelosEdicion`, `GetIncongruenciasVuelo`, `UpdateEvaluacionAdmin`).

El hub agrupa los clients por `EdicionID` sin ninguna noción de organización (`pkg/websocket/hub.go:33`), así que la sala se determina íntegramente por un parámetro del request.

**Qué se rompe en producción:** un admin de la organización A abre `wss://.../api/v1/admin/ediciones/{edicion_de_B}/cata/live?token=...` y recibe en tiempo real cada evaluación que se guarda en la jornada de cata de B: `vuelo_id`, `muestra_id`, `juez_id` y `avanza`. Es vigilancia en vivo de la competencia ajena, sin dejar rastro en ningún log de negocio.

**Fix propuesto:** llamar a `verifyEdicionOwnership` antes del `upgrader.Upgrade`, devolviendo 404 si falla. Como defensa adicional, incorporar el `org_id` a la clave de sala del hub en lugar de usar solo el `edicion_id`, para que un ID adivinado no alcance.

---

### AUD-005 · Medio · Los endpoints del juez ignoran el `org_id` del token

**Archivo:** `backend/internal/tasting/handler.go:196-218` (`GetVuelosJuez`), `:327-351` (`GetEvaluacionesJuez`); queries `db/queries/cata.sql:6-19` y `:46-75`

Estos handlers toman el `edicion_id` del path y el `usuario_id` del token, pero nunca el `org_id`. Las queries filtran por `aj.usuario_id`/`ev.juez_id` y por `edicion_id`, sin tocar `org_id`.

**Qué se rompe en producción:** el aislamiento aguanta porque el filtro por juez es propio del usuario, así que un juez no ve datos de otro. Pero un juez que tenga rol en dos organizaciones puede, con un token emitido para la organización A, consultar sus vuelos y evaluaciones de la organización B pasando el `edicion_id` de B. El token deja de definir el contexto activo, que es justamente lo que el *Modelo de Autenticación* promete ("La organización activa queda fija en el token hasta que el usuario cambie de contexto"). El daño hoy es acotado; la regla queda rota y el próximo endpoint que se apoye en ella hereda el agujero.

**Fix propuesto:** verificar la pertenencia de la edición al `org_id` del token antes de ejecutar la query, con el mismo helper que ya usan los handlers admin del módulo.

---

### AUD-006 · Medio · Escrituras sin filtro de tenant que dependen de un pre-chequeo en el servicio

**Archivos:** `db/queries/inscripcion.sql:84-92` (`UpdateMuestra`, `DeleteMuestra`), `db/queries/grupos.sql:38-43` (`UpdateGrupoCantRondas`), `:88-99` (`AsignarGrupoMuestra`, `DesasignarGrupoMuestra`), `:140-145` (`DesasignarGrupoMuestrasByGrupo`), `db/queries/cata.sql:130-139` (`UpdateEvaluacionAdmin`), `db/queries/estilos.sql:28-47`

Nueve queries de escritura tienen por cláusula `WHERE id = $1` (o equivalente) sin `org_id` ni `edicion_id`. Hoy ninguna es explotable: en todos los casos el servicio hace un `Get...` de ownership antes. Verifiqué uno por uno.

**Qué se rompe en producción:** nada todavía. El problema es estructural: la garantía de aislamiento vive en una convención que hay que recordar en cada llamada nueva, y ya falló una vez exactamente así (AUD-001, donde el pre-chequeo existe pero le falta el `org_id`). Con 24 queries de escritura y una sola capa de defensa, la próxima omisión es cuestión de tiempo.

**Fix propuesto:** agregar `AND org_id = $n` (o el join equivalente hacia `ediciones`) a las queries que operan sobre tablas con `org_id` desnormalizado, y `AND edicion_id = $n` a las que cuelgan de una edición. Es redundante con el pre-chequeo y esa es la idea. La alternativa de fondo, más cara pero definitiva, es Row-Level Security en PostgreSQL con el `org_id` seteado por conexión.

---

## Eje 2 — Confidencialidad entre cervecerías

**No encontré ningún endpoint donde una cervecería pueda leer datos de otra cambiando un ID.** Los cinco handlers de cervecería (`inscription/handler.go:381-561`) siguen todos el mismo patrón correcto: rol verificado, `usuario_id` y `org_id` tomados del contexto, y resolución de `cerveceria_id` server-side vía `getCerveceria(usuarioID, edicionID, orgID)` antes de tocar nada. El `cerveceria_id` nunca se acepta como parámetro. `ListMuestrasAnterioresCerveceria` filtra por `c.usuario_id` y `m.org_id`. `GetMuestraByIDCerveceria` exige `cerveceria_id` además del `id`.

Dos observaciones que no son fugas pero condicionan el eje:

### AUD-007 · Medio · El módulo de devoluciones no existe: la regla central del eje está sin implementar ni verificar

**Archivo:** `backend/cmd/server/main.go:165-174` (grupo `cerveceria`)

Los endpoints `GET /cerveceria/ediciones/:id/devoluciones`, `/devoluciones/:muestra_id` y `/devoluciones/:muestra_id/pdf` de *API — Endpoints* no están montados, y no hay queries de devoluciones en `db/queries/`.

**Qué se rompe en producción:** la regla de negocio más sensible del eje — "las devoluciones no son visibles durante la competencia, el admin habilita el acceso manualmente ~10 días después de la premiación" — no tiene hoy ninguna implementación que auditar. Cuando se construya, hay que verificar dos filtros a la vez (`cerveceria_id` del token **y** `estado IN ('devolucion','cerrada')`), y el segundo no tiene precedente en el código actual: ningún endpoint de cervecería consulta hoy el estado de la edición para decidir visibilidad de lectura.

**Fix propuesto:** al implementar LLE-27, exigir que la query de devoluciones lleve ambos filtros en el SQL y no en Go, y cubrirla con el primer test de integración del repo.

### AUD-008 · Bajo · El tope de muestras cuenta solo las activas

**Archivo:** `backend/internal/inscription/service.go:204-213` con `db/queries/inscripcion.sql:94-96`

`CountMuestrasCerveceria` filtra `activa = true`, y `DeleteMuestra` es un soft delete. Una cervecería puede cargar 3 muestras, borrar una y cargar otra, indefinidamente.

**Qué se rompe en producción:** el `max_muestras_por_cerveceria` limita las muestras vivas, no las inscripciones. Si el precio se cobra por muestra, la cuenta de facturación y la cuenta del tope divergen. No está documentado cuál de las dos semánticas quiere el cliente — ver *Supuestos no documentados* #19.

**Fix propuesto:** definir la semántica con el cliente antes de tocar nada. Si el tope es de muestras vivas, el código ya es correcto y solo falta documentarlo.

---

## Eje 3 — Anonimato de la cata

### AUD-004 · Crítico · `info_adicional` viaja completo al juez, ignorando el flag de visibilidad que el propio código define

**Archivos:** `db/queries/cata.sql:21-33` (`GetMuestrasVuelo`), `backend/internal/tasting/handler.go:114-128` (`toMuestraVueloResponse`), `backend/internal/tasting/handler.go:61-68` (`muestraVueloResponse`)

La query del juez está bien pensada en lo obvio: selecciona `m.id, m.cod_anonimo, m.info_adicional, e.codigo, e.nombre` y **no** trae `nombre_comercial`, `cuenta_premio_mejor_cerveceria` ni `comentarios_adicionales`. Los tres campos que el Esquema Conceptual marca en rojo están correctamente excluidos.

El problema es el cuarto. `info_adicional` es un JSONB de forma libre y se serializa entero:

```go
124:  if m.InfoAdicional.Valid {
125:      r.InfoAdicional = m.InfoAdicional.RawMessage
126:  }
```

El Esquema Conceptual es explícito: *"El campo `fabricas_participantes` dentro de `info_adicional` del estilo 999D (Cervezas Colaborativas) tampoco va a los jueces."* Ese campo se guarda dentro de `info_adicional` y sale con el resto.

Lo agrava que el mecanismo para evitarlo **ya está construido y nadie lo usa**: `styles/service.go:54-60` define

```go
type CampoDef struct {
    Clave         string `json:"clave"`
    ...
    VisibleJueces bool   `json:"visible_jueces"`
}
```

`VisibleJueces` se persiste en `campos_info_adicional` vía `UpdateEstiloCampos`, y ningún consumidor lo lee jamás. El `campoDef` paralelo de `inscription/service.go:52-57` ni siquiera declara el campo.

**Qué se rompe en producción:** en el estilo 999D (Cervezas Colaborativas) el juez recibe en el JSON la lista de fábricas participantes, es decir los nombres de las cervecerías que produjeron la muestra que está evaluando. Es la ruptura directa del anonimato de la cata, sobre el estilo donde más importa porque la colaboración identifica a los productores por construcción. Que la UI no lo pinte es irrelevante: viaja en el payload y se ve en las herramientas de desarrollador de cualquier navegador. Lo mismo aplica a cualquier campo futuro que un admin marque como no visible desde el schema builder.

**Fix propuesto:** antes de serializar, cargar el `campos_info_adicional` del estilo de la muestra y proyectar `info_adicional` quedándose únicamente con las claves cuyo `visible_jueces` sea verdadero. Decidir explícitamente el default para claves ausentes del schema — recomiendo excluirlas, es decir lista blanca y no lista negra, para que un campo nuevo no se filtre por olvido. Alternativa más barata y más robusta: hacer la proyección en SQL con `jsonb_object_agg` sobre las claves permitidas, para que el dato confidencial no llegue nunca al proceso Go.

---

### AUD-009 · Medio · El juez recibe el UUID interno de la muestra

**Archivo:** `backend/internal/tasting/handler.go:62` y `:117`

`muestraVueloResponse.ID` expone `muestras.id`. Es el mismo identificador que aparece en las respuestas de admin y de cervecería.

**Qué se rompe en producción:** el UUID es necesario para que el juez pueda hacer `POST /evaluaciones` con `muestra_id`, así que no es gratuito quitarlo. Pero es un identificador estable y correlacionable: un juez que también es cervecería en la misma edición (caso explícitamente contemplado en las Reglas de Negocio) ve el mismo UUID en `/cerveceria/.../muestras` y en `/juez/.../muestras`, y puede reconocer sus propias muestras — o las de un tercero si alguna vez tuvo el ID. La restricción automática de asignación ("un juez no puede ser asignado a un vuelo con muestras de su propia cervecería") no está implementada, lo que vuelve el escenario concreto.

**Fix propuesto:** usar un identificador opaco por vuelo para el ciclo de evaluación (por ejemplo el par `vuelo_id` + `orden`, que ya es único por `vuelo_muestras`), o al menos implementar la restricción de asignación antes de la jornada.

---

### AUD-010 · Medio · El juez ve el estilo vivo, no el snapshot

**Archivo:** `db/queries/cata.sql:26-31` — `JOIN estilos e ON e.id = m.estilo_id`

La hoja del juez lee `e.codigo` y `e.nombre` de la tabla `estilos`, no de `m.estilo_codigo_snapshot` / `m.estilo_nombre_snapshot`.

**Qué se rompe en producción:** si un admin edita el nombre de un estilo propio mientras la edición está en cata, cambia bajo los pies lo que ven los jueces y lo que dice la hoja de vuelo impresa. Está directamente ligado a AUD-021, donde el snapshot nunca llega a poblarse.

**Fix propuesto:** una vez que el snapshot se popule en la transición `inscripcion → pre-cata`, leer de esas columnas en todos los consumidores posteriores (juez, etiquetas, devoluciones) con fallback al join solo si el snapshot es nulo.

---

## Eje 4 — Autorización por rol

### AUD-011 · Medio · No existe middleware de rol; la verificación es manual en cada handler

**Archivo:** `backend/cmd/server/main.go:108-181`

Los tres grupos de rutas se construyen con el mismo y único middleware:

```
109:  protected.Use(custommiddleware.JWTMiddleware)
114:  admin := protected.Group("/api/v1/admin")
165:  cerveceria := protected.Group("/api/v1/cerveceria")
176:  juez := protected.Group("/api/v1/juez")
```

El prefijo `/admin` no impone nada. Cada handler repite a mano su propio `requireAdmin(c)` / `requireJuez(c)` / `requireBrewery(c)`, y el helper está duplicado cuatro veces, uno por paquete (`competition/handler.go:226`, `tasting/handler.go:153`, `inscription/handler.go:129`, `styles/handler.go:112`).

**Recorrí los 48 handlers montados y hoy no hay ninguno sin verificación de rol.** Las excepciones son deliberadas y correctas: `/api/v1/estilos/catalogo` es para cualquier autenticado y `/auth/me` y `/auth/select-org` no dependen del rol. La verificación es siempre lo primero que ocurre, antes de leer el body o consultar la base.

**Qué se rompe en producción:** nada hoy. Pero la ruta no garantiza nada: agregar una línea en `main.go` sin agregar la guarda correspondiente en el handler publica un endpoint admin a cualquier juez o cervecería autenticada, y no hay test ni tipo que lo detecte. Con cuatro copias del mismo helper, un cambio en la definición de un rol (por ejemplo el renombre `judge`/`juez` que el eje 8 documenta) hay que aplicarlo en cuatro lugares.

**Fix propuesto:** un middleware `RequireRol(roles ...string)` en `internal/middleware`, aplicado a nivel de grupo en `main.go`, y eliminar los cuatro helpers duplicados. Los handlers que hoy chequean pueden conservar la guarda sin costo mientras dure la transición.

---

### AUD-012 · Bajo · `Me` hace type assertions sin verificar

**Archivo:** `backend/internal/auth/handler.go:250-253`

```go
usuarioID := c.Get("usuario_id").(uuid.UUID)
email := c.Get("email").(string)
rol := c.Get("rol").(string)
```

Sin la forma de dos valores. El resto del código usa consistentemente `v, ok := ...`.

**Qué se rompe en producción:** hoy nada — el middleware siempre setea las tres claves antes de llegar. Si alguna vez se monta `Me` fuera del grupo protegido, o el middleware cambia, es un panic que Echo convierte en 500. Contradice la convención "siempre chequear nil antes de dereferenciar" de `CLAUDE.md`.

**Fix propuesto:** usar la forma de dos valores y devolver 401 si falta alguna, como hace `SelectOrg` diez líneas más arriba.

---

## Eje 5 — Atomicidad

### AUD-013 · Alto · `InvitarUsuario` hace tres escrituras sin transacción y deja usuarios inutilizables

**Archivo:** `backend/internal/auth/handler.go:645-667`

Secuencia: `CrearUsuario` → `CrearUsuarioOrganizacion` → `crearYEnviarToken` (que a su vez hace `RevocarTokensUsuario` + `CrearTokenUsoUnico` + envío de mail). Cinco escrituras y una llamada de red, sin transacción.

**Qué se rompe en producción:** si falla en el paso 2, queda un usuario sin organización: nunca puede loguearse (`Login` devuelve "sin organización asignada" en `handler.go:180-182`) y su email queda tomado para siempre, porque el chequeo de `EMAIL_EN_USO` en la línea 639 lo va a encontrar en cada reintento. El admin no tiene forma de recuperarlo desde la aplicación. Si falla en el envío del mail, el usuario y la membresía existen pero nunca llega la invitación, y reintentar da `EMAIL_EN_USO`. Con 157 cervecerías y un cuerpo de jueces a dar de alta antes de la jornada, esto se va a manifestar.

**Fix propuesto:** envolver las escrituras de base en una transacción (`s.sqlDB.BeginTx` + `queries.WithTx`, exactamente el patrón que ya usa `AutoasignarGrupos`), hacer commit, y recién después enviar el mail. El envío de mail no debe estar dentro de la transacción porque no es reversible; su fallo debe devolver un error que indique que la cuenta se creó y la invitación se puede reenviar, no un 500 genérico. Complementariamente, hacer el flujo idempotente: si el email ya existe pero está en estado `INVITACION_PENDIENTE`, reenviar la invitación en lugar de rechazar con 409.

---

### AUD-014 · Alto · `cod_participante` se calcula con `MAX(...)+1` sin transacción ni constraint

**Archivos:** `db/queries/inscripcion.sql:98-101` y `backend/internal/inscription/service.go:219-235`

```sql
SELECT COALESCE(MAX(CAST(cod_participante AS INTEGER)), 0) + 1
FROM muestras WHERE edicion_id = $1;
```

El `SELECT` y el `INSERT` posterior son dos operaciones separadas, sin transacción, sin `FOR UPDATE` y sin secuencia. La tabla `muestras` (migración 000013 + 000018) **no tiene constraint de unicidad sobre `(edicion_id, cod_participante)`**.

**Qué se rompe en producción:** dos cervecerías que cargan una muestra en el mismo instante reciben el mismo `cod_participante`, y la base lo acepta en silencio. El código correlativo interno es lo que usa el admin para reconciliar la muestra física con el registro y lo que aparece en la etiqueta de control junto al código anónimo. Duplicados ahí significan muestras que no se pueden distinguir en la mesa de recepción. Se detecta tarde, cuando ya hay botellas etiquetadas. En una apertura de inscripción con envío masivo de mails, la concurrencia no es hipotética.

Hay un segundo defecto en la misma query: `CAST(cod_participante AS INTEGER)` revienta con error de runtime si alguna fila tiene un valor no numérico. Hoy solo escribe `strconv.Itoa`, pero nada en el schema lo garantiza — la columna es `TEXT` sin CHECK.

**Fix propuesto:** reemplazar el `MAX+1` por una secuencia de PostgreSQL por edición, o por un `INSERT ... SELECT` atómico que calcule el correlativo dentro de la misma sentencia. En cualquier caso agregar `UNIQUE (edicion_id, cod_participante)` en una migración nueva, que es lo que convierte un duplicado silencioso en un error visible. Si el formato debe seguir siendo texto, agregar un CHECK de formato numérico.

---

### AUD-015 · Medio · `MoverMuestra` hace tres escrituras sin transacción

**Archivo:** `backend/internal/competition/service.go:564-604`

`AsignarGrupoMuestra` seguido de hasta dos `recalcularCantRondas` (destino y origen), cada uno con su propio `GET` + `UPDATE`. Cinco round-trips, cero transacción.

**Qué se rompe en producción:** un fallo entre la asignación y el recálculo deja la muestra en el grupo nuevo con el `cant_rondas` viejo en uno o ambos grupos. `cant_rondas` es lo que determina cuántas rondas se catan; un grupo que pasó de 10 a 11 muestras y quedó marcado con 1 ronda se cata una sola vez y las muestras nunca llegan a la final. Es corrupción silenciosa: no hay error, el número simplemente queda mal y nadie lo nota hasta la jornada.

**Fix propuesto:** envolver las tres operaciones en una transacción con el mismo patrón de `AutoasignarGrupos`. El servicio ya tiene `s.sqlDB` inyectado, no hace falta cambiar la construcción.

---

### AUD-016 · Medio · `ResetPassword` y `SetPassword` no son atómicos

**Archivos:** `backend/internal/auth/handler.go:597-608` y `:700-711`

`UpdatePasswordHash` → `MarcarTokenUsado` → `RevokeAllTokensByUsuario`, tres escrituras sueltas.

**Qué se rompe en producción:** si falla `MarcarTokenUsado`, la contraseña ya cambió pero el token de recuperación sigue siendo válido hasta su expiración: quien tenga el link (reenviado, en un log, en el historial del navegador) puede volver a cambiar la contraseña. Si falla `RevokeAllTokensByUsuario`, las sesiones viejas sobreviven al cambio de contraseña, que es exactamente lo que ese paso existe para evitar. El usuario ve un 500 y una contraseña que en realidad sí cambió.

**Fix propuesto:** una transacción por handler. El orden importa menos que la atomicidad, pero conviene marcar el token como usado antes de cambiar la contraseña para que el caso peor sea "token quemado sin efecto" y no "token vivo después del cambio".

---

### AUD-017 · Medio · `Register` deja cuentas huérfanas que bloquean el email

**Archivo:** `backend/internal/auth/handler.go:481-493`

`CrearUsuario` y luego `crearYEnviarToken`. Si el segundo falla — y falla con `EMAIL_PROVIDER=ses`, que hoy es un stub que siempre devuelve error (`internal/email/ses.go:16-18`) — el usuario queda creado, sin verificar y sin mail enviado. El reintento devuelve `EMAIL_EN_USO`.

**Qué se rompe en producción:** el registro público es la puerta de entrada de las 157 cervecerías. Un fallo transitorio del proveedor de mail deja cuentas zombies que el usuario no puede recrear y el admin no puede reparar desde la aplicación.

**Fix propuesto:** transacción para la escritura de base, y en el camino de error borrar el usuario o dejarlo en un estado reintentables. Como mínimo: si `GetUsuarioByEmail` encuentra un usuario con `email_verificado = false` y sin sesiones, reenviar la verificación en lugar de devolver 409.

---

### AUD-018 · Medio · Carrera en el tope de muestras por cervecería

**Archivo:** `backend/internal/inscription/service.go:204-235`

`CountMuestrasCerveceria` y luego `CreateMuestra`, sin transacción ni bloqueo. Clásico TOCTOU.

**Qué se rompe en producción:** dos POST simultáneos con el contador en 2 y el máximo en 3 pasan ambos y dejan 4 muestras. No hay constraint que lo impida. Impacta la facturación (el precio es por muestra) y el armado de vuelos.

**Fix propuesto:** hacer el conteo y el insert en la misma transacción con `SELECT ... FOR UPDATE` sobre la fila de la cervecería, o mover la validación a un CHECK/trigger. La transacción de AUD-014 puede cubrir ambos casos de una vez.

---

### AUD-019 · Medio · La generación de códigos anónimos no existe, y es la operación que más necesita atomicidad

**Archivo:** ausente — no hay ruta en `cmd/server/main.go` ni queries en `db/queries/`

`POST /admin/ediciones/:id/codigos/generar` está documentado en *API — Endpoints* y en las Reglas de Negocio ("se generan manualmente por el admin en estado `pre-cata`, mediante acción explícita con confirmación", "una vez generados no pueden modificarse", "el admin no puede generar códigos si hay muestras activas sin grupo asignado"). No está implementado. La query de precondición `CountMuestrasSinGrupo` sí existe (`db/queries/grupos.sql:67-70`) y no la usa nadie.

**Qué se rompe en producción:** el módulo de cata no se puede operar. Y cuando se implemente, es la operación con el peor perfil de fallo del sistema: asigna N códigos aleatorios únicos sobre N muestras, con un `UNIQUE(edicion_id, cod_anonimo)` que va a rechazar colisiones. Sin transacción, un fallo a mitad de camino deja la mitad de las muestras con código y la otra mitad sin, en un estado que la propia regla declara irreversible ("los grupos quedan bloqueados de forma permanente").

**Fix propuesto:** implementarla en una única transacción, verificando `CountMuestrasSinGrupo == 0` y `estado = 'pre-cata'` dentro de la transacción, con reintento sobre colisión de código por muestra, y un chequeo previo de que ninguna muestra activa tenga ya `cod_anonimo`. El espacio de 4 dígitos son 10.000 valores para ~980 muestras, así que las colisiones son frecuentes y hay que manejarlas, no ignorarlas.

---

## Eje 6 — Manejo de errores

### AUD-020 · Alto · `Logout` no revoca el refresh token

**Archivo:** `backend/internal/auth/handler.go:142-150` (emisión) y `:312-333` (logout)

La cookie se emite con `cookie.Path = "/auth/refresh"` (línea 148). `Logout` está montado en `/auth/logout` (`main.go:101`) e intenta leerla:

```go
313:  cookie, err := c.Cookie("refresh_token")
314:  if err == nil {
        ... revocar ...
      }
```

El navegador **no envía** una cookie con `Path=/auth/refresh` a `/auth/logout`. `c.Cookie` devuelve `http.ErrNoCookie`, el bloque entero se saltea y no se revoca nada. El error se descarta silenciosamente: no hay `else`, no hay log. El `SetCookie` de limpieza sí usa el mismo path, así que borra la cookie del navegador y el logout *parece* funcionar.

Hay un segundo error ignorado en la línea 318: `_ = h.queries.RevokeRefreshToken(...)`, sin comentario justificativo, contra la convención explícita de `CLAUDE.md`.

**Qué se rompe en producción:** cerrar sesión no invalida la sesión. El refresh token sigue vivo y sin revocar en la base durante las 8 horas completas. Cualquiera que lo haya capturado — una máquina compartida, un proxy, un backup del perfil del navegador — mantiene el acceso aunque el usuario haya cerrado sesión explícitamente. Rompe también la revocación administrativa que el *Modelo de Autenticación* promete: el admin cree que puede cortar el acceso de un juez a mitad de la competencia, y el mecanismo depende de una tabla que el logout nunca actualiza.

**Fix propuesto:** emitir la cookie con un path que cubra ambos endpoints (`/auth`), o dejar `Path=/` y apoyarse en `SameSite=Strict`. Verificar que el path de emisión y el de borrado coincidan. Y no ignorar el resultado de `RevokeRefreshToken`: si falla, el logout debe devolver error, porque el usuario necesita saber que su sesión sigue viva.

---

### AUD-021 · Medio · `AutoasignarGrupos` devuelve un mensaje que dice lo contrario de lo que pasó

**Archivos:** `backend/internal/competition/service.go:467-469` y `handler.go:836-839`

```go
if len(estilos) == 0 {
    return 0, 0, TodasAsignadasError{}   // "todas las muestras ya tienen grupo asignado"
}
```

`ListEstilosConMuestras` devuelve vacío cuando **no hay muestras activas en la edición**, no cuando están todas asignadas. El handler lo traduce a 409 `TODAS_MUESTRAS_ASIGNADAS`.

**Qué se rompe en producción:** un admin que pasa a `pre-cata` una edición vacía y aprieta "autoagrupar" recibe "todas las muestras ya tienen grupo asignado" cuando la realidad es que no hay ninguna muestra. Es el mensaje exactamente opuesto y manda a diagnosticar en la dirección equivocada, en un momento del flujo donde el admin está verificando que todo esté armado.

**Fix propuesto:** distinguir los dos casos: si no hay muestras activas, devolver un error propio ("la edición no tiene muestras activas"); reservar `TODAS_MUESTRAS_ASIGNADAS` para cuando hay muestras y `CountMuestrasSinGrupo` es cero.

---

### AUD-022 · Medio · Errores de constraint devuelven 500

**Archivos:** `backend/internal/competition/handler.go:253-257` (`CreateEdicion`), `:614-621` (`CreateDescuento`), `backend/internal/styles/handler.go` (`Create`, vía el mismo patrón)

`CreateDescuento` inserta en `codigos_descuento`, que tiene un único por `(edicion_id, codigo)`. Una violación de unicidad llega al handler como `*pq.Error`, no matchea `isNotFound`, y cae en el 500 genérico.

**Qué se rompe en producción:** el admin que crea dos veces el mismo código de descuento recibe "Error al crear el código de descuento" con status 500. Es un error del usuario presentado como una falla del servidor; el frontend no puede distinguirlo de una caída real y no puede ofrecer una corrección. Además ensucia el monitoreo con 500 que no son incidentes.

**Fix propuesto:** inspeccionar el código de error de PostgreSQL (`23505` unique_violation, `23503` foreign_key_violation) con `errors.As` sobre `*pq.Error` y mapear a 409 con un código de error específico. Vale la pena un helper compartido, dado que el patrón se repite en los cuatro paquetes.

---

### AUD-023 · Bajo · Comparación directa contra `sql.ErrNoRows` en vez de `errors.Is`

**Archivo:** `backend/internal/auth/handler.go:166`, `:271`, `:472`, `:516`, `:545`, `:586`, `:641`, `:689`

Ocho ocurrencias de `if err == sql.ErrNoRows` y `else if err != sql.ErrNoRows`. El resto del backend usa `errors.Is` correctamente.

**Qué se rompe en producción:** hoy funciona porque sqlc devuelve el sentinel sin envolver. Deja de funcionar en silencio el día que se agregue una capa que envuelva el error, y el modo de falla es feo: en `Register:472`, un error de base envuelto haría que `err != sql.ErrNoRows` sea verdadero y se devuelva 500 — aceptable — pero en `Login:166` un no-encontrado envuelto pasaría de 401 a 500. Contradice la convención explícita de `CLAUDE.md`.

**Fix propuesto:** reemplazar las ocho por `errors.Is(err, sql.ErrNoRows)`.

---

### AUD-024 · Bajo · `DeleteMuestra` devuelve 200 con cuerpo en vez de 204

**Archivo:** `backend/internal/inscription/handler.go:560`

Devuelve `200` con `muestraCreadaResponse{ID: ...}` — el tipo cuyo nombre dice "creada". Los deletes de `competition` devuelven `204 NoContent` consistentemente (`handler.go:480`, `:593`, `:706`, `:954`).

**Fix propuesto:** unificar en 204, o documentar por qué este devuelve el ID.

---

### AUD-025 · Bajo · `failGrupoError` tiene un contrato de retorno frágil

**Archivo:** `backend/internal/competition/handler.go:826-844`

Devuelve `(handled bool, resp error)` porque `fail()` devuelve `nil` en el camino feliz y no se puede usar un `nil` como sentinel. El comentario explica el problema en cuatro líneas en vez de resolverlo.

**Fix propuesto:** que el helper devuelva `error` y use un sentinel propio (`errNoManejado`) para el caso no manejado, o que los callers hagan el type switch. Es cosmético pero se repite en cinco handlers.

---

### AUD-026 · Bajo · `toEvaluacionesJuezResponse` usa `interface{}` y un type switch

**Archivo:** `backend/internal/tasting/handler.go:464-505` y `service.go:160-179`

El servicio devuelve `interface{}` para poder retornar dos tipos de fila de sqlc, y el handler los desarma con un type switch que duplica 18 líneas idénticas. El caso `default` devuelve un error que se traduce a 500.

**Fix propuesto:** mapear a un struct común dentro del servicio, en dos funciones pequeñas, y devolver ese tipo. Elimina el `interface{}`, el type switch, la duplicación y el 500 imposible.

---

## Eje 7 — Validación de input

### AUD-027 · Alto · La evaluación no valida los campos obligatorios que la regla exige

**Archivos:** `backend/internal/tasting/service.go:82-84` y `:30-37`

La única validación es:

```go
if req.Avanza != nil && (req.ComentarioFinal == nil || *req.ComentarioFinal == "") {
    return ..., ErrComentarioFinalRequerido
}
```

`Puntajes` es `json.RawMessage` y se persiste tal cual, sin schema, sin rangos, sin verificar que existan. Las Reglas de Negocio dicen: *"Una evaluación no puede enviarse con campos obligatorios vacíos"* y *"Validación al enviar: todos los campos faltantes se marcan en rojo"*.

**Qué se rompe en producción:** el backend acepta `{"vuelo_id": ..., "muestra_id": ..., "avanza": true, "comentario_final": "x"}` sin ningún puntaje y lo cuenta como evaluación completada — porque `actualizarProgresoAsignacion` (`service.go:121-129`) cuenta las que tienen `avanza IS NOT NULL`. La asignación pasa a `completado` y el panel del admin muestra "3 de 3 jueces completaron" sobre evaluaciones vacías. La devolución al participante sale sin datos. Y como *"una evaluación enviada no puede ser editada por el juez"*, el dato se pierde de forma irrecuperable salvo corrección manual del admin. Toda la validación vive hoy en el frontend, que es donde no cuenta.

**Fix propuesto:** definir server-side el conjunto de puntajes obligatorios (Calidad Técnica, Mérito Estilístico, Fuerza Relativa, según el Nivel B de las devoluciones), validar presencia y rango antes del insert, y rechazar con 422 enumerando los faltantes — el patrón ya existe en `INFO_ADICIONAL_INCOMPLETA` (`inscription/handler.go:113-122`) y se puede replicar tal cual. El rango exacto de cada puntaje no está documentado en ningún lado: ver *Supuestos no documentados* #21.

---

### AUD-028 · Medio · Ningún campo de texto tiene límite de longitud

**Archivos:** `backend/internal/inscription/service.go:376-378` (solo verifica no vacío), `backend/internal/competition/handler.go:34-75` (todos los request structs), `backend/internal/tasting/service.go:30-37`

`nombre_comercial`, `comentarios_adicionales`, `comentario_final`, `comentarios`, `nombre` de grupo/edición/lugar/precio, `direccion`, `horarios`, `bos_flight`: todos `TEXT` en la base y `string` sin validar en Go. `info_adicional` y `puntajes` son JSONB de tamaño arbitrario. Echo no tiene configurado `BodyLimit`.

**Qué se rompe en producción:** un participante puede enviar un `comentarios_adicionales` de 50 MB y el backend lo guarda. En la jornada de cata, un `puntajes` grande se difunde además por WebSocket a todos los admins conectados. No hace falta mala intención: un copiar y pegar accidental de un documento entero alcanza para romper la generación de PDFs de devolución y para inflar la base.

**Fix propuesto:** un `middleware.BodyLimit("1M")` global en `main.go` como primera barrera, y validación explícita de longitud por campo en los servicios, con los máximos alineados a lo que la UI y los PDFs pueden renderizar.

---

### AUD-029 · Medio · Los importes se manejan como `float64`

**Archivos:** `backend/internal/competition/handler.go:47` y `:66`, `service.go:100`, `:129`, `:224`, `:252`

```go
Precio float64 `json:"precio"`
...
Precio: fmt.Sprintf("%.2f", req.Precio),
```

La columna es `NUMERIC(10,2)`, correcta. El transporte y la conversión pasan por punto flotante binario. Contradice la convención explícita del proyecto ("Dinero / decimales exactos: `NUMERIC`; evitar `MONEY`, `FLOAT`").

**Qué se rompe en producción:** `fmt.Sprintf("%.2f", ...)` redondea a la par más cercana en los casos límite, así que un precio termina ocasionalmente un centavo abajo de lo cargado. Con inscripciones pagas y ~980 muestras, es una diferencia chica pero recurrente y difícil de explicar. No hay validación de rango: `precio: -5000` se acepta, y `descuento_porcentaje: 500` también, sin ningún CHECK de 0–100.

**Fix propuesto:** recibir el precio como string decimal y validarlo con una librería decimal, o al menos como entero de centavos. Y agregar validación de rango: precio no negativo, porcentaje entre 0 y 100, en Go y con un CHECK en la base.

---

### AUD-030 · Medio · No se valida el formato del email en ningún punto de entrada

**Archivos:** `backend/internal/auth/handler.go:464` (`Register`), `:628` (`InvitarUsuario`), `:534-549` (`ForgotPassword`)

La única verificación es `req.Email == ""`.

**Qué se rompe en producción:** se crean cuentas con emails inválidos que jamás van a recibir la verificación, y el usuario queda bloqueado por AUD-017. En `InvitarUsuario`, un typo del admin crea un juez que nunca puede aceptar la invitación y cuyo email queda ocupado. Con el padrón de 157 cervecerías por cargar, cada dirección mal formada es una cuenta muerta.

**Fix propuesto:** validar con `net/mail.ParseAddress` en los tres puntos de entrada y normalizar a minúsculas antes de guardar y comparar — hoy `GetUsuarioByEmail` es sensible a mayúsculas, así que `Juan@x.com` y `juan@x.com` son dos cuentas distintas.

---

### AUD-031 · Medio · `max_muestras_por_cerveceria` y `anio` no tienen rango

**Archivo:** `backend/internal/competition/handler.go:38-40`, `service.go:42-56`

`MaxMuestrasPorCerveceria int32` y `Anio int32` se pasan directo al insert. La columna tiene `DEFAULT 3` pero ningún CHECK.

**Qué se rompe en producción:** `max_muestras_por_cerveceria: 0` cierra la inscripción sin que nadie entienda por qué — `CountMuestrasCerveceria >= 0` es siempre verdadero y toda carga devuelve `MAX_MUESTRAS_ALCANZADO`. Un valor negativo hace lo mismo. `anio: 0` o `anio: 99999` pasa sin objeción. Como el campo se edita desde el panel, un cero accidental rompe la inscripción de forma difícil de diagnosticar.

**Fix propuesto:** validar `max_muestras_por_cerveceria >= 1` y un rango razonable de año en el handler, más CHECKs en la base.

---

### AUD-032 · Medio · `validateMuestraInput` saltea la validación si el schema está vacío

**Archivo:** `backend/internal/inscription/service.go:391`

```go
if estilo.RequiereInfoAdicional && estilo.CamposInfoAdicional.Valid {
```

Si un estilo tiene `requiere_info_adicional = true` pero `campos_info_adicional` en NULL, la condición es falsa y no se valida nada.

**Qué se rompe en producción:** el estado es alcanzable: `UpdateEstilo` (`styles/service.go:169-175`) permite setear `requiere_info_adicional = true` conservando `campos_info_adicional` en NULL, porque copia el valor actual. Una muestra de ese estilo entra sin la información adicional que el estilo declara requerir, y llega a la mesa de cata incompleta — que es justamente lo que el flujo de Organizer Approval existe para prevenir.

**Fix propuesto:** tratar la combinación `requiere_info_adicional && !CamposInfoAdicional.Valid` como error de configuración del estilo y rechazar la carga con un mensaje claro, en lugar de dejar pasar. O impedir esa combinación en `UpdateEstilo`.

---

### AUD-033 · Bajo · La contraseña no tiene longitud máxima

**Archivos:** `backend/internal/auth/handler.go:464`, `:574`, `:677`

Solo `len(req.Password) < 8`. `bcrypt` trunca silenciosamente a 72 bytes.

**Qué se rompe en producción:** dos contraseñas que difieren solo después del byte 72 son la misma para el sistema. Además, sin límite superior, una contraseña de varios MB hace que `bcrypt.GenerateFromPassword` consuma CPU en el path no autenticado. Nótese que `len()` cuenta bytes, no caracteres: una contraseña de 5 caracteres con acentos pasa el mínimo de 8.

**Fix propuesto:** rechazar por encima de 72 bytes y contar caracteres con `utf8.RuneCountInString` para el mínimo.

---

### AUD-034 · Bajo · `UpdateCamposRequest` no limita la cantidad ni el tamaño de los campos

**Archivo:** `backend/internal/styles/service.go:182-209`

Valida `tipo` contra una lista blanca y `clave` contra un regex — bien. No valida la longitud de `label`, ni la cantidad de campos, ni claves duplicadas dentro del mismo array.

**Qué se rompe en producción:** dos campos con la misma `clave` producen un schema donde la validación de obligatoriedad se evalúa dos veces sobre el mismo valor y el frontend renderiza dos inputs que escriben en la misma clave. El segundo pisa al primero.

**Fix propuesto:** rechazar claves duplicadas, limitar el largo de `label` y la cantidad de campos.

---

## Eje 8 — Divergencia código vs documentación

### 8a — Reglas documentadas que el código no implementa

### AUD-035 · Alto · El snapshot de estilo nunca se puebla

**Archivos:** columnas creadas en `db/migrations/000022_lle24_schema.up.sql:37-40`; transición en `backend/internal/competition/service.go:311-313`

`estilo_codigo_snapshot` y `estilo_nombre_snapshot` existen en la tabla. **Ninguna query del repositorio las escribe ni las lee** — verificado sobre los siete archivos de `db/queries/`. La transición donde deberían poblarse es:

```go
311:  case desde == "inscripcion" && hacia == "pre-cata":
312:      // TODO: verificar muestras cuando exista el módulo de inscripción
313:      return db.EstadoEdicionEnumPreCata, nil
```

**Qué se rompe en producción:** el Esquema Conceptual justifica el snapshot con precisión — *"Hacerlo ahora evita el backfill: si se posterga hasta que existan devoluciones reales, hay que reconstruir el dato"* — y eso es exactamente lo que está pasando. Las guías de estilos renumeran entre versiones. Cuando World Beer Cup publique su próxima edición y se actualice el catálogo, todas las devoluciones históricas van a renderizar códigos y nombres que nunca se le comunicaron al participante. El dato original ya no existirá en ningún lado. Cada edición que cierre sin snapshot es una edición que no se puede reparar después.

**Fix propuesto:** poblar ambas columnas en la transición `inscripcion → pre-cata`, dentro de la misma transacción que el cambio de estado, con un `UPDATE muestras SET ... FROM estilos WHERE ...` masivo. Es una sola sentencia. Hacerlo antes de que cierre la primera inscripción real.

---

### AUD-036 · Alto · La corrección del admin escribe sobre el comentario que va al participante

**Archivos:** `backend/internal/tasting/service.go:212-257`, `db/queries/cata.sql:130-139`

`UpdateEvaluacionAdmin` actualiza `comentario_final` con lo que venga en el request. No existe ninguna columna `nota_interna_admin` en la migración 000016 ni en ninguna posterior.

Los dos documentos advierten sobre esto de forma casi literal. Reglas de Negocio: *"⚠️ No confundir la nota interna con el `comentario_final` del juez, que **sí** va al participante. Nombrarlas distinto en el código."* Esquema Conceptual: *"La corrección del admin incluye una **nota interna** que no se expone al participante. Nombrarla explícitamente distinta de `comentario_final`."*

**Qué se rompe en producción:** el admin usa el campo para anotar "se confundió tal juez" —el ejemplo textual del documento— y ese texto termina impreso en la devolución que recibe la cervecería, atribuido al jurado. Es el peor resultado posible del módulo de devoluciones: comentario interno sobre el desempeño de un juez, publicado al participante con el nombre del juez encima. Y el flujo documentado dice que el admin revisa las notas *"al cierre antes de enviar las devoluciones"*, o sea que las escribe con la expectativa explícita de que no se publiquen.

**Fix propuesto:** agregar `nota_interna_admin TEXT` a `evaluaciones` en una migración nueva, exponerla solo en los endpoints de admin, y quitar `comentario_final` del payload de corrección o mantenerlo como un campo separado y explícito. Excluir `nota_interna_admin` de cualquier query de devoluciones cuando se construya el módulo.

---

### AUD-037 · Alto · El orden de los vuelos del juez ignora el campo que lo define

**Archivos:** `db/queries/cata.sql:6-19`, columna creada en `db/migrations/000022_lle24_schema.up.sql:43`

`asignaciones_juez.orden` existe. `GetVuelosJuez` ordena por `g.orden, v.numero_ronda, v.orden` y nunca selecciona ni ordena por `aj.orden`. El struct de respuesta (`tasting/handler.go:51-59`) tampoco lo expone.

La regla está marcada como resuelta y confirmada: *"El orden lo asigna la organización, no lo elige el juez. Confirmado por Nicolás el 09/08/2026: 'El orden se lo asignamos nosotros.' Requiere un campo de orden en la asignación juez-vuelo."*

**Qué se rompe en producción:** el juez ve sus vuelos ordenados por grupo, no en la secuencia que la organización definió. En una jornada donde varias mesas comparten muestras físicas y el orden de servicio está coordinado logísticamente, los jueces catan en el orden equivocado. La columna se creó para esto y quedó sin conectar.

**Fix propuesto:** seleccionar `aj.orden`, ordenar por `aj.orden NULLS LAST` antes de los criterios actuales, y exponerlo en la respuesta. Falta además el endpoint de admin para setearlo, que tampoco existe.

---

### AUD-065 · Alto · El registro público crea usuarios que no pueden iniciar sesión

**Archivos:** `backend/internal/auth/handler.go:481-493` (`Register`), `:180-182` (`Login`), `backend/internal/inscription/service.go:134-160` (`InscribirCerveceria`)

`Register` escribe una fila en `usuarios` y envía el mail de verificación. No crea nada en `usuario_organizacion`. `Login` rechaza con 401 "sin organización asignada" cuando `GetRolesByUsuario` devuelve vacío:

```go
180:  if len(roles) == 0 {
181:      return echo.NewHTTPError(http.StatusUnauthorized, "sin organización asignada")
182:  }
```

El *Modelo de Autenticación* resuelve el hueco así: *"La entrada en `usuario_organizacion` se crea cuando se inscribe a una edición, no al registrarse."* Pero el endpoint que inscribe (`POST /cerveceria/ediciones/:id/inscribirse`) crea una fila en `cervecerias`, nunca en `usuario_organizacion`, y además cuelga del grupo `cerveceria` protegido por `requireBrewery` — que exige un token con `rol = "brewery"`, que solo se puede emitir si la fila de `usuario_organizacion` ya existiera. El flujo se muerde la cola: para inscribirse hay que estar logueado, para loguearse hay que estar inscripto, y la inscripción no crea lo que el login necesita.

Ningún endpoint del backend inserta en `usuario_organizacion` con rol `brewery`. El único `CrearUsuarioOrganizacion` que existe está en `InvitarUsuario` y está fijado a `db.RolEnumJudge` (`auth/handler.go:655-659`).

**Qué se rompe en producción:** el registro público es un requisito explícito y textual del cliente —*"entro, participante, quiero inscribirme, y ahí me aparece: iniciá sesión o generá tu cuenta"*— y es la puerta de entrada de las 157 cervecerías. Hoy una cervecería se registra, recibe el mail, verifica su dirección, y en el primer login recibe un 401 con un mensaje que no le dice nada y que no puede resolver por sí misma. El admin tampoco puede repararlo desde la aplicación: no hay endpoint para asignar una organización a un usuario existente. Con la apertura de inscripción prevista para el 01/02/2027, es un bloqueante de la primera entrega.

**Fix propuesto:** decidir primero la regla de negocio, que hoy no existe (ver *Supuestos no documentados* #1): a qué organización pertenece alguien que llega por el formulario público. Con eso resuelto, crear la fila de `usuario_organizacion` con rol `brewery` dentro de la misma transacción que el usuario, en `Register`. Si la organización se deriva de la edición a la que se inscribe, hace falta un camino de entrada distinto —una ruta pública que reciba el identificador de la edición o de la organización— porque el actual exige un token que todavía no puede existir.

---

### AUD-038 · Medio · La máquina de estados implementa 2 de 5 transiciones

**Archivo:** `backend/internal/competition/service.go:299-318`

Implementadas: `config → inscripcion` (con precondición) y `inscripcion → pre-cata` (sin precondición, con TODO). Faltan `pre-cata → cata`, `cata → devolucion` y `devolucion → cerrada`, con todas sus precondiciones documentadas.

Además, la precondición documentada de `inscripcion → pre-cata` es "al menos una muestra inscripta" y el código no la verifica pese a que `ListMuestrasEdicionAdmin` y `CountMuestrasSinGrupo` ya existen y el módulo de inscripción está construido — el TODO de la línea 312 quedó obsoleto.

**Qué se rompe en producción:** la edición no puede avanzar más allá de `pre-cata` desde la aplicación. Sin `pre-cata → cata` no arranca la jornada; sin `cata → devolucion` no se habilitan las devoluciones, que es la acción manual que las Reglas de Negocio ponen en manos del admin diez días después de la premiación. Se bloquean los módulos 5, 6 y 7 completos.

**Fix propuesto:** completar las tres transiciones con sus precondiciones ("códigos generados, vuelos armados, jueces asignados" para `cata`; "todas las evaluaciones completadas o admin confirma cierre" para `devolucion`; "códigos vinculados y medallas asignadas" para `cerrada`) y agregar la verificación de muestras que falta. Definir explícitamente si las transiciones hacia atrás son válidas — ver *Supuestos no documentados* #22.

---

### AUD-039 · Medio · La alerta de juez repetido en ronda siguiente no existe

**Archivos:** `db/queries/cata.sql:93-105`, `backend/internal/tasting/handler.go:394-428`

`GetIncongruenciasVuelo` detecta solo el desacuerdo en `avanza`. La documentación pide dos cosas de este endpoint: *"También incluye alertas de juez repetido en grupos de ≤10 muestras (mismo juez evaluando la misma muestra en más de una ronda). Cada alerta tiene un flag `revisada` que el admin puede marcar."* No hay detección de juez repetido ni columna `revisada` en ninguna tabla.

**Qué se rompe en producción:** en los grupos chicos —12 de los 59 de la última edición son de una sola ronda, y los de dos rondas con pocas muestras son el caso de riesgo— el mismo juez puede evaluar la misma cerveza dos veces sin que nadie lo advierta. La segunda evaluación no es independiente de la primera, y el resultado de la muestra queda sesgado sin registro. El admin no tiene manera de saber que pasó.

**Fix propuesto:** agregar una query que agrupe por `(juez_id, muestra_id)` con `COUNT(DISTINCT vuelo_id) > 1` restringida a grupos con `cant_rondas > 1` y ≤10 muestras, y una tabla o columna para el flag `revisada` con su endpoint de marcado.

---

### AUD-040 · Medio · Configuración de edición: faltan la guía de estilos y la cantidad de botellas

**Archivos:** `db/queries/ediciones.sql:1-4`, `:16-27`; `backend/internal/competition/handler.go:34-41`

`CreateEdicion` y `UpdateEdicion` no incluyen `guia_estilos_id` ni `cantidad_botellas_por_muestra`. Ambas columnas existen (migración 000022, líneas 33-35) y `guia_estilos_id` es nullable, así que toda edición se crea sin guía asignada.

Las Reglas de Negocio los listan entre los parámetros que el admin configura **antes de abrir la inscripción**, y la elección de guía es la conclusión central de la conversación del 09/08 ("La guía se elige en la configuración inicial de cada edición").

**Qué se rompe en producción:** no se puede crear la edición de Homebrewers, que es precisamente el caso que motivó el modelo de guías: distinta guía (BJCP) y distinta cantidad de botellas (4 en vez de 6). El sistema solo puede representar Cervecerías, y ni siquiera lo hace explícito. Encadena con AUD-041.

**Fix propuesto:** agregar ambos campos al request y a las queries, hacer `guia_estilos_id` obligatorio en la creación, y evaluar volverlo `NOT NULL` una vez que no haya ediciones sin guía.

---

### AUD-041 · Medio · El catálogo de estilos no filtra por la guía de la edición

**Archivos:** `db/queries/estilos.sql:1-5` (`ListEstilos`), `:75-77` de `inscripcion.sql` (`GetEstiloVisibleOrg`)

Ambas filtran por tenant (`org_id IS NULL OR org_id = $1`) pero no por `guia_id`. El Esquema Conceptual especifica la query exacta: `WHERE guia_id = $guia_de_la_edicion AND (org_id IS NULL OR org_id = $org_id_del_jwt)`.

**Qué se rompe en producción:** el desplegable de inscripción mezcla los catálogos de World Beer Cup y BJCP, con formatos de código incompatibles (`112A` contra `21A`) y estilos homónimos con criterios distintos. Una cervecería inscribe una muestra en un estilo BJCP dentro de una competencia que se juzga con WBC, y `GetEstiloVisibleOrg` lo valida como correcto porque solo mira el tenant. La muestra se agrupa con estilos de otra guía y se cata con la planilla equivocada. Hoy no explota porque solo hay una edición y la migración asignó todos los estilos a WBC, pero explota en el momento exacto en que se cree la edición de Homebrewers.

**Fix propuesto:** agregar `guia_id` como parámetro a `ListEstilos` y a `GetEstiloVisibleOrg`, resolviéndolo desde `ediciones.guia_estilos_id`. Depende de AUD-040.

---

### AUD-042 · Medio · Login no exige el email verificado

**Archivo:** `backend/internal/auth/handler.go:158-204`

`Login` valida la contraseña y los roles. No consulta `usuarios.email_verificado`, que la migración 000023 agregó y que `VerifyEmail` y `SetPassword` sí escriben.

El *Modelo de Autenticación* describe la secuencia sin ambigüedad: "3. Cervecería hace click en el link → `email_verificado = true`. 4. Cervecería puede iniciar sesión."

**Qué se rompe en producción:** la verificación de email es decorativa. Una cuenta registrada con una dirección ajena o con un typo opera normalmente, y el sistema pierde la garantía de que el mail de contacto de una cervecería es real — que es de lo que dependen las devoluciones, la confirmación de inscripción y las listas de mail que el admin exporta por estado de pago.

**Fix propuesto:** rechazar el login con un código específico (`EMAIL_NO_VERIFICADO`) cuando `email_verificado` es falso, ofreciendo el reenvío. Contemplar el padrón histórico precargado, que probablemente deba nacer verificado o con un flujo de primera contraseña — decisión de negocio, ver *Supuestos no documentados* #13.

---

### AUD-043 · Medio · Módulos documentados sin ninguna implementación

**Archivo:** `backend/cmd/server/main.go:114-181`

Endpoints de *API — Endpoints* que no están montados y no tienen queries de respaldo:

| Grupo | Endpoints faltantes | Consecuencia |
|---|---|---|
| Vuelos | `GET/POST/PUT/DELETE /ediciones/:id/vuelos`, `/vuelos/generar`, `/vuelos/:id/muestras` | Las tablas `vuelos` y `vuelo_muestras` solo se pueblan por seed. No se puede armar la cata. |
| Asignación de jueces | `GET/POST/DELETE /vuelos/:vuelo_id/jueces` | No se pueden asignar jueces. La restricción "un juez no puede evaluar muestras de su propia cervecería" no existe en ningún lado. |
| Códigos anónimos | `GET /codigos`, `POST /codigos/generar` | Ver AUD-019. |
| Devoluciones y cierre | `/vincular-codigos`, `/resultados`, `/medallas` (×3) | Módulo 6 completo. |
| Etiquetas y hojas de vuelo | `/etiquetas/botella`, `/etiquetas/copa` | Sin PDFs no hay jornada física. |
| Jueces (admin) | `GET /ediciones/:id/jueces` | Reconocido como pendiente en *Modelo de Autenticación*. |
| Cervecerías (admin) | `GET/POST/DELETE /ediciones/:id/cervecerias` | El admin no puede gestionar participantes. |
| Público | `GET /api/v1/public/estilos` | El catálogo requiere autenticación; el formulario de inscripción público no puede leerlo. |

**Qué se rompe en producción:** el backend cubre configuración de edición, estilos, inscripción y agrupación. Del pipeline de cata solo existen las lecturas del juez sobre datos que hay que insertar a mano. El sistema no puede llegar de `pre-cata` a una devolución entregada.

**Fix propuesto:** no es un fix, es planificación. Lo señalo porque cambia la lectura del resto de la auditoría: varios ejes tienen poca superficie auditable simplemente porque el código todavía no existe.

---

### 8b — Reglas que el código implementa distinto a como están documentadas

### AUD-044 · Alto · El schema impide que un usuario sea juez y participante en la misma organización

**Archivo:** `db/migrations/000003_create_usuario_organizacion.up.sql:8`

```sql
PRIMARY KEY (usuario_id, org_id)
```

Una sola fila por par usuario-organización, y por lo tanto **un solo rol**. Los dos documentos afirman lo contrario. Esquema Conceptual: *"Un mismo usuario puede tener rol juez Y rol participante en la misma edición."* Reglas de Negocio, en la tabla de roles: *"Juez: Puede ser también participante en la misma edición."* *API — Endpoints* lo repite: *"Un juez puede ser también participante en la misma edición — los roles no son excluyentes."*

El código hereda la limitación: `GetRolesByUsuario` devuelve una fila por organización y `Login` (`auth/handler.go:184-190`) trata `len(roles) == 1` como "una sola organización", cuando en realidad significa "un solo par organización-rol". Si el modelo permitiera dos roles en la misma org, ese login mostraría la pantalla de selección de organización con la misma organización repetida dos veces.

**Qué se rompe en producción:** un juez que quiere inscribir sus propias cervezas —escenario normal y explícitamente contemplado en el dominio— no puede. Hay que elegirle un rol. Si se le da `judge`, no puede inscribir muestras; si se le da `brewery`, no puede catar. Y la restricción de asignación más importante del sistema ("un juez no puede ser asignado a un vuelo que contenga muestras de su propia cervecería") pierde sentido, porque el sistema no puede saber que un juez tiene cervecería.

**Fix propuesto:** cambiar la PK a `(usuario_id, org_id, rol)` en una migración, y revisar los tres puntos que asumen un rol único: el conteo de `Login`, el `SelectOrg` que busca la primera coincidencia por `org_id` (`auth/handler.go:227-233`) y el `Refresh` que hace lo mismo (`:289-295`). Requiere además decidir cómo se elige el rol activo cuando hay dos en la misma organización — decisión de producto, no técnica.

---

### AUD-045 · Alto · La autoagrupación destruye el trabajo manual del admin y agrupa por nombre en vez de por código

**Archivos:** `backend/internal/competition/service.go:497-544`, `db/queries/grupos.sql:116-128`, `:130-133`

Dos desvíos en el mismo bucle:

**Reasignación destructiva.** `AsignarGrupoMuestrasByEstilo` hace `UPDATE muestras SET grupo_id = $3 WHERE edicion_id = $1 AND estilo_id = $2 AND activa = true` — sin mirar `asignacion_manual`. `DesasignarGrupoMuestrasByEstilo` además resetea `asignacion_manual = false`. El comentario de la query lo declara abiertamente: *"sin importar el grupo que tuvieran asignado previamente"*.

**Agrupación por nombre.** `GetGrupoByNombreEdicion` busca el grupo por `nombre` exacto y `CreateGrupo` lo nombra `estilo.EstiloNombre`. La regla, corregida el 09/08 contra datos reales, dice: *"Cada código de estilo completo, con letra incluida (`112A`, `41B`, `999C`), es una unidad independiente."* La identidad es el código, no el nombre.

**Qué se rompe en producción:** el flujo real del admin es autoagrupar y después trabajar la bandeja "sin grupo" a mano según afinidad estilística —el documento estima que la automatización resuelve dos tercios y que el resto es criterio humano, con 7 de 30 casos donde el admin mezcla estilos de ≥10 muestras a propósito. Volver a apretar "autoagrupar", por cualquier motivo, deshace todo ese trabajo sin advertencia y sin posibilidad de deshacer: las muestras que el admin movió vuelven a su grupo por estilo o a la bandeja. Sobre 59 grupos y 980 muestras, es horas de trabajo perdidas en un click.

La agrupación por nombre agrega un modo de falla más silencioso: dos códigos distintos con el mismo nombre —posible entre guías, o entre un estilo propio de la serie 999 y uno del catálogo— colapsan en un único grupo, y el segundo pisa el `cant_rondas` del primero (línea 529). También significa que renombrar un grupo desde `UpdateGrupo` lo vuelve invisible para la siguiente corrida, que va a crear un duplicado.

**Fix propuesto:** respetar `asignacion_manual = true` excluyendo esas muestras de ambos updates, y advertir en la respuesta cuántas se preservaron. Para la identidad del grupo, agregar una columna `estilo_id` o `estilo_codigo` a `grupos` y buscar por ahí en lugar de por nombre, dejando `nombre` como etiqueta editable. Ambos cambios son necesarios antes de que un admin real toque la pantalla.

---

### AUD-046 · Medio · El grupo "Varios" se identifica por un `ILIKE` sobre un nombre editable

**Archivos:** `db/queries/grupos.sql:135-138`, `backend/internal/competition/service.go:473-484`

```sql
SELECT * FROM grupos WHERE edicion_id = $1 AND nombre ILIKE 'varios%';
```

Todo grupo cuyo nombre empiece con "varios" se desasocia y **se elimina** al autoagrupar.

**Qué se rompe en producción:** el nombre del grupo lo escribe el admin y es editable desde `UpdateGrupo`. Un grupo legítimamente llamado "Varios Belgas" o "Varios lupulados" —agrupación por afinidad, exactamente el criterio que el documento describe como el real— se borra en la siguiente corrida de autoagrupación, y sus muestras vuelven a la bandeja. La limpieza de un artefacto histórico quedó implementada como una heurística sobre datos del usuario.

**Fix propuesto:** si hay que limpiar grupos comodín de corridas anteriores, marcarlos con una columna booleana (`es_comodin`) en lugar de inferirlo del nombre. Si el grupo "Varios" ya no se genera nunca —y no se genera, la lógica actual usa la bandeja— la limpieza es una migración de una sola vez, no código permanente.

---

### AUD-047 · Medio · Los prefijos de ruta no coinciden con la documentación

**Archivo:** `backend/cmd/server/main.go:99-181`

| Documentado | Implementado |
|---|---|
| `POST /api/v1/auth/login` (y refresh, logout, select-org) | `POST /auth/login`, sin el prefijo `/api/v1` |
| `GET /api/v1/juez/ediciones/:id/vuelos` | `:edicion_id` en vez de `:id` |
| `GET /api/v1/public/estilos` | No existe; el catálogo está bajo `/api/v1/estilos/catalogo`, autenticado |
| `PUT /cerveceria/.../muestras/:muestra_id` | `PATCH` |
| — | `POST /cerveceria/ediciones/:id/inscribirse`, `GET /ediciones/disponibles`, `/muestras-anteriores`, `DELETE /admin/estilos/:id`: existen y no están documentados |

**Qué se rompe en producción:** el documento de API es la referencia contra la que se escribe el frontend y se planifican los tickets. Con las rutas de auth desalineadas y cuatro endpoints reales sin documentar, el documento deja de servir para eso. La ausencia de `/public/estilos` es además funcional: el registro de cervecerías es de acceso público por requisito explícito del cliente, y el formulario necesita el catálogo antes de que exista un token.

**Fix propuesto:** decidir cuál es la fuente de verdad y alinear. Para las rutas de auth conviene mover el código bajo `/api/v1` antes de que haya clientes en producción. Los cuatro endpoints nuevos hay que documentarlos.

---

### AUD-048 · Medio · Dos formatos de respuesta conviven en la misma API

**Archivos:** `backend/internal/auth/handler.go` (todo el paquete) contra `competition/handler.go:210-219`, `tasting/handler.go:137-146`, `inscription/handler.go:102-111`, `styles/handler.go:86-95`

Los cuatro paquetes de negocio devuelven el envelope documentado `{"data": ..., "error": null}` y, en el error, `{"data": null, "error": {"code", "message"}}`. El paquete `auth` devuelve structs desnudos (`loginResponse`, `meResponse`) y usa `echo.NewHTTPError`, que serializa `{"message": "..."}` sin `code`.

**Qué se rompe en producción:** el cliente necesita dos ramas de parseo según el endpoint, y los errores de auth no traen código estable — el frontend tiene que discriminar por string en castellano. Códigos como `EMAIL_EN_USO` y `TOKEN_INVALIDO` se devuelven hoy en el campo `message` de `echo.NewHTTPError`, donde parecen mensajes para el usuario pero en realidad son códigos: el usuario final ve literalmente "EMAIL_EN_USO".

**Fix propuesto:** unificar `auth` con el envelope del resto. El helper ya está escrito cuatro veces; conviene extraerlo a un paquete compartido en el mismo movimiento.

---

### AUD-049 · Bajo · El login multi-organización no devuelve el nombre de la organización

**Archivo:** `backend/internal/auth/handler.go:192-199`

```go
items[i] = orgItem{
    ID:   r.OrgID.String(),
    Name: "",          // ← siempre vacío
    Role: string(r.Rol),
}
```

`GetRolesByUsuario` (`db/queries/auth.sql:12-15`) solo trae `org_id` y `rol`; no hace join con `organizaciones`.

**Qué se rompe en producción:** la pantalla de selección de organización muestra UUIDs o entradas en blanco. El usuario tiene que adivinar. Solo afecta a usuarios multi-org, que hoy no existen, pero es la funcionalidad completa de esa pantalla.

**Fix propuesto:** agregar el join con `organizaciones` en `GetRolesByUsuario` y devolver el nombre.

---

### AUD-050 · Bajo · Los nombres de rol de la documentación no son los del código

**Archivo:** `db/migrations/000003_create_usuario_organizacion.up.sql:1`

```sql
CREATE TYPE rol_enum AS ENUM ('admin', 'judge', 'brewery');
```

El Esquema Conceptual documenta el enum como `admin / juez / participante`. El código chequea `"judge"` (`tasting/handler.go:150`) y `"brewery"` (`inscription/handler.go:126`), mientras que las rutas y los paquetes usan castellano (`/api/v1/juez`, `/api/v1/cerveceria`, `requireJuez`). `InvitarUsuario` rechaza cualquier rol que no sea la cadena literal `"judge"` (`auth/handler.go:625`).

**Qué se rompe en producción:** nada funcional, pero el mismo concepto tiene tres nombres según dónde se lo mire, y el documento de esquema describe un enum que no existe. Ya generó una inconsistencia real: `CLAUDE.md` documenta los roles en inglés y el Esquema Conceptual en castellano.

**Fix propuesto:** elegir un idioma para los identificadores —el resto del schema es castellano— y corregir el documento en cualquier caso, porque hoy describe valores que la base rechazaría.

---

### AUD-051 · Bajo · El Esquema Conceptual declara pendiente un constraint que ya existe

**Archivo:** `db/migrations/000017_create_medallas.up.sql:9` — `UNIQUE(muestra_id)`

El documento dice: *"MEDALLA sin constraint de unicidad — pendiente. La regla 'una medalla por muestra por edición' no está enforced a nivel DB: falta `UNIQUE(muestra_id)`. Es el primer paso de LLE-27."* El constraint está desde la migración 000017.

**Qué se rompe en producción:** nada; el código está bien y el documento está desactualizado. Lo listo porque hace perder tiempo: alguien va a abrir LLE-27 y empezar por una tarea ya hecha.

**Fix propuesto:** actualizar el documento.

---

### 8c — Reglas que el código asume y que no están documentadas en ningún lado

Esta sección está desarrollada en el capítulo 4.

---

## Eje 9 — Concurrencia y performance

Contexto: 24-28 usuarios concurrentes durante la jornada, ~980 muestras, 59 grupos, 137 códigos de estilo.

### AUD-052 · Medio · El hub muta el mapa de salas bajo un lock de lectura

**Archivo:** `backend/pkg/websocket/hub.go:75-87`

```go
case msg := <-h.Broadcast:
    h.mu.RLock()                      // ← lock de LECTURA
    clients := h.rooms[msg.EdicionID]
    for client := range clients {
        select {
        case client.Send <- msg.Payload:
        default:
            close(client.Send)
            delete(clients, client)   // ← ESCRITURA sobre el mapa
        }
    }
    h.mu.RUnlock()
```

Hoy no produce una carrera real: `Run` es la única goroutine que toca `h.rooms`, y los tres casos del `select` están serializados, así que el `RLock` es decorativo y nadie escribe en paralelo.

**Qué se rompe en producción:** hoy nada, y por eso es Medio y no Alto. El riesgo es que la corrección depende de una propiedad no escrita en ningún lado —"solo `Run` toca el mapa"— mientras el código aparenta estar protegido por un mutex que en el camino de escritura está tomado en el modo equivocado. El primer método que agregue un lector externo (un `Stats()`, un healthcheck que cuente conexiones, un endpoint de debug) convierte esto en escritura concurrente sobre un mapa, que en Go no es un panic recuperable sino un `fatal error: concurrent map writes` que mata el proceso entero. En medio de la jornada de cata, eso es el backend caído para los 28 usuarios.

**Fix propuesto:** usar `h.mu.Lock()` en el caso `Broadcast`, o recolectar los clients muertos en un slice bajo `RLock` y eliminarlos después bajo `Lock`. Correr `go test -race` sobre el hub una vez que existan tests, como pide `CLAUDE.md`.

---

### AUD-053 · Medio · El WebSocket acepta conexiones desde cualquier origen

**Archivo:** `backend/internal/tasting/handler.go:26-32`

```go
CheckOrigin: func(r *http.Request) bool {
    return true
},
```

Mientras tanto el CORS de HTTP está correctamente restringido a `ALLOWED_ORIGIN` (`main.go:52-57`).

**Qué se rompe en producción:** cualquier página web puede abrir un WebSocket contra el backend. La autenticación por token en query param limita el daño —hace falta un token válido— pero ese token viaja en la URL, que es justamente donde es más fácil de capturar: queda en los logs de acceso del servidor, en los del proxy reverso y en el header `Referer` si la página del atacante lo provoca. La combinación de "cualquier origen" con "credencial en la URL" es la que convierte una fuga menor de logs en acceso al stream de cata en vivo.

**Fix propuesto:** validar el `Origin` contra `ALLOWED_ORIGIN`, reutilizando la misma variable de entorno que el CORS. Y evaluar mover el token del query param a un subprotocolo WebSocket (`Sec-WebSocket-Protocol`), que no queda en los logs.

---

### AUD-054 · Medio · El pool de conexiones a la base no está configurado

**Archivo:** `backend/cmd/server/main.go:35-44`

`sql.Open` sin `SetMaxOpenConns`, `SetMaxIdleConns` ni `SetConnMaxLifetime`. El default de `database/sql` es ilimitado.

**Qué se rompe en producción:** con 28 usuarios concurrentes y 5 queries secuenciales por guardado de evaluación, el pico de conexiones simultáneas puede superar el `max_connections` de PostgreSQL (100 por defecto). Cuando lo hace, la base rechaza conexiones nuevas y **todas** las requests fallan a la vez, incluidas las que no tienen nada que ver. En un VPS propio, sin pooler intermedio como PgBouncer, es el modo de falla más probable de la jornada. Y el escenario es concentrado por diseño: la jornada de cata es el único momento de carga real del sistema.

**Fix propuesto:** configurar `SetMaxOpenConns` con un valor holgadamente por debajo del `max_connections` del servidor, `SetMaxIdleConns` y `SetConnMaxLifetime`. Es una configuración de tres líneas que conviene tener antes del primer deploy.

---

### AUD-055 · Medio · El broadcast bloquea el handler de guardado de evaluación

**Archivos:** `backend/internal/tasting/handler.go:300` y `pkg/websocket/hub.go:46`

```go
h.hub.Broadcast <- websocket.Message{EdicionID: edicionID, Payload: payload}
```

Canal sin buffer (`make(chan Message)`), enviado de forma síncrona dentro del handler HTTP, después de la respuesta lógica pero antes del `return`.

**Qué se rompe en producción:** cada `POST /evaluaciones` espera a que la goroutine `Run` esté disponible. `Run` procesa un caso por vez, y el caso `Broadcast` itera sobre todos los clients de la sala escribiendo en sus canales. La latencia de guardar una evaluación queda acoplada a la cantidad de admins conectados al panel. Con pocos admins es despreciable; el problema es que es un acoplamiento innecesario entre el camino crítico del juez —el que tiene que ser rápido durante la jornada— y una funcionalidad que la propia documentación describe como secundaria (*"El 'tiempo real' es una funcionalidad disponible, no el flujo principal"*).

**Fix propuesto:** darle buffer al canal `Broadcast` y hacer el envío no bloqueante con `select`/`default`, descartando el evento si el hub está saturado. Perder un evento del panel es preferible a demorar el guardado de una evaluación.

---

### AUD-056 · Medio · `AutoasignarGrupos` hace ~400 round-trips dentro de una única transacción

**Archivo:** `backend/internal/competition/service.go:497-544`

El bucle recorre los códigos de estilo con muestras —137 en la última edición— y por cada uno ejecuta entre 2 y 3 queries (`GetGrupoByNombreEdicion`, `CreateGrupo` o `UpdateGrupoCantRondas`, `AsignarGrupoMuestrasByEstilo`). Todo dentro de la misma transacción abierta en la línea 444.

**Qué se rompe en producción:** es un N+1 clásico, aunque en una acción de admin ejecutada pocas veces, no en el camino caliente. Lo relevante no es el tiempo total sino que la transacción queda abierta durante los cientos de round-trips, tomando locks de escritura sobre `muestras` y `grupos`. Si coincide con cervecerías cargando muestras al filo del cierre de inscripción, esas cargas se bloquean. Con la latencia de red de un VPS puede ser algo más de un segundo de transacción abierta.

**Fix propuesto:** resolverlo en menos sentencias: un `UPDATE ... FROM (SELECT ...)` que asigne todas las muestras de todos los estilos elegibles de una vez, y un `INSERT ... SELECT` con `ON CONFLICT` para los grupos. Alternativamente, precalcular en memoria y hacer un solo update masivo por rama.

---

### AUD-057 · Bajo · Las salas vacías no se liberan por el camino del client lento

**Archivo:** `backend/pkg/websocket/hub.go:81-85`

El caso `Unregister` borra la sala cuando queda vacía (líneas 68-70). El camino del client lento dentro de `Broadcast` hace `delete(clients, client)` pero no verifica si la sala quedó vacía.

**Qué se rompe en producción:** una entrada de mapa vacía por edición, indefinidamente. Con un puñado de ediciones es memoria irrelevante. Lo anoto por consistencia: los dos caminos de eliminación deberían comportarse igual.

**Fix propuesto:** extraer la eliminación a un método común que aplique la misma limpieza.

---

### AUD-058 · Bajo · El servidor HTTP no tiene timeouts

**Archivo:** `backend/cmd/server/main.go:188` — `e.Start(":" + port)`

Sin `ReadTimeout`, `WriteTimeout` ni `IdleTimeout`, y sin apagado ordenado.

**Qué se rompe en producción:** una conexión lenta o abandonada retiene un goroutine y una conexión del pool sin límite. Sin apagado ordenado, cada deploy corta las requests en vuelo, incluidas las evaluaciones que un juez está guardando.

**Fix propuesto:** construir un `http.Server` con timeouts explícitos y usar `e.StartServer`, más un `Shutdown` con contexto sobre `SIGTERM`.

**Nota sobre índices:** revisé cada columna filtrada por las 60 queries del repositorio contra los índices de las 24 migraciones. **No encontré ninguna consulta que filtre, ordene o haga join por una columna sin índice.** Las FKs están indexadas manualmente en todas las tablas, `refresh_tokens.token_hash` y `tokens_uso_unico.token_hash` tienen índice además del único, y existe un índice parcial `idx_muestras_activa`. Es la parte más sólida del backend.

---

## Eje 10 — Configuración y secretos

### AUD-003 · Crítico · `JWT_SECRET` no se valida y su ausencia degrada silenciosamente a clave vacía

**Archivos:** `backend/internal/middleware/jwt.go:29-36` y `backend/internal/auth/handler.go:91`, `:121`

En ambos lugares:

```go
jwtSecret := os.Getenv("JWT_SECRET")
...
return []byte(jwtSecret), nil    // verificación
accessToken, err := token.SignedString([]byte(jwtSecret))   // firma
```

Si la variable no está definida, `os.Getenv` devuelve `""` y HMAC-SHA256 acepta perfectamente una clave vacía. El arranque valida `DATABASE_URL` (`main.go:30-34`) y las credenciales de Resend (`:75-78`), pero **no** `JWT_SECRET`. El servidor levanta y sirve tráfico con normalidad.

**Qué se rompe en producción:** con `JWT_SECRET` sin definir, cualquiera puede firmar un token con la clave vacía y ponerle el `org_id`, el `rol` y el `sub` que quiera. Es acceso de administrador a cualquier organización, sin credenciales, sin explotar ningún bug de lógica. No hay ninguna señal de que esto haya ocurrido: no hay warning en el log, el health check responde `ok` y el login funciona.

Lo que lo hace probable y no teórico: el deploy es a un VPS propio, todavía pendiente (LLE-25), y `.env` está gitignoreado, así que el archivo hay que recrearlo a mano en el servidor. Una variable olvidada en ese paso no produce ningún error visible. Es exactamente el tipo de fallo silencioso que aparece en el primer deploy.

Un segundo problema en el mismo lugar: `os.Getenv` se llama en cada request en vez de leerse una vez al arranque, así que la configuración de seguridad se resuelve en caliente y sin validar.

**Fix propuesto:** validar al arranque, junto a `DATABASE_URL`, que `JWT_SECRET` exista y tenga una longitud mínima razonable (32 bytes para HMAC-SHA256), y abortar si no. Leerlo una sola vez e inyectarlo como dependencia en el middleware y en el handler de auth en lugar de consultarlo por request — el proyecto ya inyecta `emailSender` y `frontendBaseURL` de esa forma. Y rechazar explícitamente el valor de ejemplo del `.env.example`, que hoy es una cadena legible y funcionaría igual de bien.

---

### AUD-059 · Medio · El sender de email por defecto escribe los tokens en el log

**Archivos:** `backend/internal/email/log.go:16-24` y `backend/cmd/server/main.go:82-83`

```go
slog.Info("email: send (log sender, no envío real)",
    "to", msg.To, "subject", msg.Subject, "html", msg.HTML)
```

`msg.HTML` es la plantilla renderizada, que contiene el link con el token en texto plano (`auth/handler.go:440`). `LogSender` es el default: `case "", "log":`. Con `EMAIL_PROVIDER` sin definir, el servidor arranca en este modo.

**Qué se rompe en producción:** los tokens de verificación de email, recuperación de contraseña e invitación quedan en texto plano en los logs. Un token de recuperación en el log es una toma de cuenta para cualquiera con acceso de lectura a los logs —agregador, backup, personal de infraestructura—, durante la hora completa de su validez. Encadena con AUD-003: si en el deploy se olvida `JWT_SECRET`, es plausible que también se olvide `EMAIL_PROVIDER`, y entonces el sistema no envía ningún mail *y* deja todos los tokens en el log.

**Fix propuesto:** loguear solo el destinatario y el asunto, nunca el cuerpo. Si hace falta el link para desarrollo local, loguearlo detrás de un flag explícito de debug. Y considerar que el default sin configuración sea un fallo de arranque, no un modo silencioso que aparenta funcionar.

---

### AUD-060 · Medio · `Secure` en la cookie está hardcodeado en `true`

**Archivos:** `backend/internal/auth/handler.go:146` y `:326`

`cookie.Secure = true` fijo, sin depender del entorno. La convención del proyecto dice `Secure: true` **(en prod)**.

**Qué se rompe en producción:** en producción está bien. El problema es el desarrollo local: el navegador no guarda una cookie `Secure` sobre `http://localhost`, así que el refresh token nunca se persiste y la sesión muere a los 15 minutos. Es probable que esto ya esté frenando la verificación end-to-end del login que `CLAUDE.md` lista como próxima tarea. El riesgo real es la reacción: alguien lo va a poner en `false` para trabajar y ese cambio se va a filtrar a producción, donde la cookie viaja en claro.

**Fix propuesto:** derivar `Secure` de una variable de entorno (`COOKIE_SECURE`, o inferirlo de si `ALLOWED_ORIGIN` es https) con `true` como default, para que el descuido sea seguro por omisión.

---

### AUD-061 · Medio · Los seeds traen credenciales conocidas y se pueden correr contra cualquier base

**Archivo:** `backend/db/seeds/auth_seed.sql:1-15`

Tres usuarios con hashes bcrypt de `admin123`, `judge123` y `brewery123`, con las contraseñas en un comentario en la línea 2, y UUIDs fijos y predecibles. No hay ninguna guarda que impida ejecutar el seed contra una base productiva.

**Qué se rompe en producción:** un seed corrido por error contra producción crea un administrador con contraseña pública. Los hashes están en el repositorio, así que la contraseña es conocida aunque el comentario se borre.

**Fix propuesto:** que los seeds verifiquen un marcador de entorno de desarrollo antes de insertar, o generar los hashes en tiempo de ejecución a partir de una variable de entorno. Como mínimo, un `WHERE` que impida la inserción si la base ya tiene organizaciones reales.

---

### AUD-062 · Bajo · Defaults de configuración silenciosos

**Archivo:** `backend/cmd/server/main.go:48-51`, `:90-93`, `:183-186`

`ALLOWED_ORIGIN`, `FRONTEND_BASE_URL` y `PORT` caen a valores de `localhost` sin ningún warning. `JWT_EXPIRY` y `REFRESH_TOKEN_EXPIRY` hacen lo mismo en `auth/handler.go:92-99`.

**Qué se rompe en producción:** con `FRONTEND_BASE_URL` sin definir, los mails de verificación y recuperación salen apuntando a `http://localhost:5173` y ningún usuario puede completar el flujo. Con `ALLOWED_ORIGIN` sin definir, el frontend productivo recibe errores de CORS. En los dos casos el servidor arranca informando que todo está bien.

**Fix propuesto:** los defaults de localhost son útiles en desarrollo; el problema es que son indistinguibles de una configuración deliberada. Loguear un `slog.Warn` explícito cuando se aplica un default, o exigir las tres variables cuando un `APP_ENV=production` esté presente.

---

### AUD-063 · Bajo · No hay headers de seguridad

**Archivo:** `backend/cmd/server/main.go:52-57`

El único middleware global es CORS. La convención del proyecto pide explícitamente "Headers de seguridad: configurar en middleware de Echo".

**Fix propuesto:** agregar `middleware.Secure()` de Echo, que cubre `X-Content-Type-Options`, `X-Frame-Options` y HSTS con la configuración por defecto.

---

## Eje 11 — Tests

### AUD-064 · Alto · No existe ningún test en el repositorio

**Verificación:** `find . -name '*_test.go'` → 0 resultados. No hay `testdata/`, ni tests de integración, ni configuración de CI.

5.542 líneas de Go y 668 de SQL sin una sola aserción automatizada. Las convenciones de `CLAUDE.md` describen con detalle cómo nombrar los tests (`TestLogin_InvalidCredentials`), cuándo usar `require` contra `assert` y que hay que correr `go test -race ./...` — sobre una base que no tiene tests.

**Qué se rompe en producción:** ninguno de los cuatro hallazgos críticos de esta auditoría habría sobrevivido a un test de aislamiento por tenant. Más allá de eso: el sistema tiene una única ventana de uso real al año, sin posibilidad de reintentar. Un bug que aparece durante la jornada de cata no se arregla con un hotfix, porque las 980 muestras ya se sirvieron.

**Áreas sin cobertura, ordenadas por riesgo:**

| # | Área | Por qué primero |
|---|---|---|
| 1 | **Aislamiento multi-tenant** | Un test parametrizado que, por cada endpoint, cree dos organizaciones y verifique que el token de A recibe 403/404 sobre los recursos de B. Habría detectado AUD-001 y AUD-002. Es el único test que evita el defecto que termina el proyecto. |
| 2 | **Anonimato del payload del juez** | Aserción sobre el JSON crudo de `GET /juez/.../muestras`: que no contenga `nombre_comercial`, ni `cuenta_premio_mejor_cerveceria`, ni `comentarios_adicionales`, ni ninguna clave de `info_adicional` marcada como no visible. Sobre el JSON, no sobre el struct. Habría detectado AUD-004. |
| 3 | **Autorización por rol** | Tabla de (endpoint × rol) contra el resultado esperado. Con la verificación manual en 48 handlers (AUD-011), es lo único que garantiza que un endpoint nuevo no salga abierto. |
| 4 | **Máquina de estados de la edición** | Table-driven sobre las 5 transiciones y sus precondiciones. Barato, y es la lógica que gobierna qué se puede hacer en cada momento del ciclo. |
| 5 | **Agrupación y cálculo de rondas** | `calcularCantRondas` es una función pura de tres ramas — el test más barato del repositorio. `AutoasignarGrupos` merece un test con los datos reales citados en la documentación (59 grupos: 12 de 1 ronda, 41 de 2, 6 de 3), que además fijaría el comportamiento frente al trabajo manual del admin (AUD-045). |
| 6 | **Concurrencia en inscripción** | Test con `-race` que dispare N cargas simultáneas y verifique que no hay `cod_participante` duplicado ni se supera el tope. Habría detectado AUD-014 y AUD-018. |
| 7 | **Ciclo de vida de los tokens de auth** | Un solo uso, expiración, revocación en cascada al resetear la contraseña, y que el logout efectivamente revoque. Habría detectado AUD-020. |
| 8 | **Hub de WebSockets** | `go test -race` con múltiples clients, un client lento y desconexiones concurrentes. Es el componente donde una carrera tira el proceso entero durante la jornada. |

**Fix propuesto:** empezar por el 1 y el 2, que son los que cubren los defectos que no admiten reparación posterior. Ambos necesitan una base de test con las migraciones aplicadas; una vez montada esa infraestructura, el resto es incremental.

---

## 4. Supuestos no documentados

Comportamientos que el código decide por sí mismo y que no aparecen en ninguno de los cinco documentos. Son los candidatos a pregunta para el cliente. Ninguno es necesariamente incorrecto: el problema es que nadie los validó, y varios son irreversibles una vez que hay datos reales.

**Sobre el registro y la identidad de la cervecería**

1. **No hay ninguna regla que diga a qué organización pertenece alguien que se registra desde el formulario público.** El código no la implementa (AUD-065: la cuenta queda sin organización y no puede loguearse), pero antes que un bug es un vacío de definición: en un SaaS multi-tenant con registro abierto, alguien tiene que decidir si la organización se deriva de la edición a la que el participante se inscribe, del dominio por el que entró, de una invitación previa, o si el registro público solo existe para el tenant Copa Argentina. **Pregunta: ¿a qué organización pertenece alguien que se registra desde el formulario público, y en qué momento exacto se le asigna el rol?** Es la pregunta de arquitectura más urgente de la lista: sin respuesta no se puede arreglar AUD-065, y sin AUD-065 arreglado no hay inscripción.

2. **El nombre comercial de la cervecería se inventa a partir del nombre de la persona.** `InscribirCerveceria` (`db/queries/inscripcion.sql:26`) hace `TRIM(CONCAT_WS(' ', u.nombre, u.apellido))`. Nunca se le pregunta a nadie cómo se llama la cervecería. **Pregunta: ¿la cervecería declara su nombre comercial al inscribirse, y es editable después?** El padrón histórico trae nombre de cervecería, así que el dato existe en el dominio.

3. **Un usuario tiene una cervecería distinta por edición**, vinculadas solo por `usuario_id`. Nada garantiza que el nombre comercial se mantenga entre ediciones ni que sean "la misma" cervecería a efectos de estadísticas históricas. **Pregunta: ¿la cervecería es una entidad persistente entre ediciones o una inscripción anual independiente?** Se relaciona con el pendiente ya abierto del mail compartido por dos cervecerías del padrón.

4. **El email se compara sensible a mayúsculas.** `GetUsuarioByEmail` usa igualdad exacta. `Juan@x.com` y `juan@x.com` son dos cuentas. **Pregunta: ¿se normaliza el mail al registrarse?** Con un padrón de 157 direcciones cargadas a mano, es relevante.

**Sobre el proceso de inscripción**

5. **`cod_participante` es un entero secuencial por edición, arrancando en 1, guardado como texto.** El formato no está especificado en ningún lado y el Esquema Conceptual ya marca todo el campo como "supuesto sin confirmar". **Pregunta: ¿qué formato tiene que tener, y lo ve la cervecería en algún momento?**

6. **Las muestras dadas de baja no cuentan contra el tope.** Ver AUD-008. **Pregunta: ¿el tope de 3 es sobre muestras vivas o sobre muestras inscriptas alguna vez?** Impacta la facturación si el precio es por muestra.

7. **La cervecería puede cargar `comentarios_adicionales` y `cuenta_premio_mejor_cerveceria` en cada muestra sin restricción.** El documento marca el primero como "solo para el organizador". **Pregunta: ¿la cervecería escribe ese campo o lo escribe el admin sobre la muestra?** Hoy lo escribe la cervecería y solo lo ve el admin.

8. **Existe un endpoint que muestra las muestras de ediciones anteriores para precargar** (`GET /cerveceria/ediciones/:id/muestras-anteriores`). No está documentado. **Pregunta: ¿es una funcionalidad pedida?** Es razonable, pero implica que la plataforma le recuerda a la cervecería lo que presentó otros años, y nadie lo validó.

9. **Editar una muestra resetea `aprobada = false` siempre**, incluso ante un cambio trivial como corregir una tilde. **Pregunta: ¿cualquier edición desaprueba, o solo las que tocan la información que el juez necesita?** El documento dice "cuando un participante edita una muestra ya aprobada, vuelve al estado no aprobada", sin distinguir.

**Sobre la agrupación**

10. **La autoagrupación es re-ejecutable y destruye el trabajo manual del admin.** Ver AUD-045. **Pregunta: ¿el admin puede volver a autoagrupar después de haber trabajado la bandeja a mano, y qué espera que pase con sus decisiones?** Si la respuesta es "que se preserven", el código hace lo contrario hoy.

11. **El grupo se nombra con el nombre del estilo y se identifica por ese nombre.** Ver AUD-045. **Pregunta: ¿el nombre del grupo es editable, y sigue siendo el mismo grupo después de renombrarlo?**

12. **Cualquier grupo cuyo nombre empiece con "varios" se elimina al autoagrupar.** Ver AUD-046. **Pregunta: ¿es un nombre reservado?** Hoy lo es de hecho, y nadie lo sabe.

**Sobre autenticación y acceso**

13. **Se puede iniciar sesión sin haber verificado el email.** Ver AUD-042. **Pregunta: ¿la verificación es un requisito para operar o solo una confirmación de contacto?** Afecta también a cómo entra el padrón histórico precargado: esas 157 cuentas no van a verificar su mail antes de que se les habilite el acceso.

14. **La contraseña mínima es de 8 bytes, sin ningún otro requisito.** **Pregunta: ¿hay una política de contraseñas que cumplir?**

15. **La invitación solo admite el rol `judge`** (`auth/handler.go:625`). No hay forma de invitar a otro admin desde la aplicación. **Pregunta: ¿cómo se da de alta un segundo administrador?**

16. **El admin no puede revocar sesiones desde la aplicación.** La tabla y la columna `revocado` existen y `RevokeAllTokensByUsuario` está implementada, pero ningún endpoint la expone. El *Modelo de Autenticación* describe la revocación como una capacidad del admin. **Pregunta: ¿hace falta la pantalla de revocación para la primera jornada?**

**Sobre la cata y la evaluación**

17. **`es_steward` existe en `asignaciones_juez`** desde la migración 000015 y no aparece en ninguna regla de negocio. **Pregunta: ¿qué es un steward en este sistema, qué ve y qué puede hacer?** Hoy el campo no cambia ningún comportamiento.

18. **`bos_flight` es texto libre en `grupos`.** El Best of Show no está descripto en ninguna regla. **Pregunta: ¿cómo funciona el BOS — quién lo arma, con qué criterio, en qué momento?**

19. **Los campos del schema builder tienen un flag `visible_jueces`** (`styles/service.go:59`) que nadie lee. **Pregunta: ¿el admin decide campo por campo qué ve el juez, o la regla es fija por estilo?** Es la decisión de la que depende el fix de AUD-004: sin ella, hay que elegir un default a ciegas para un campo de confidencialidad.

20. **La detección de estilos similares usa el umbral por defecto de pg_trgm (0.3) y devuelve como máximo 5 resultados**, sobre el catálogo completo incluyendo otras guías. **Pregunta: ¿es la sensibilidad correcta?** Demasiado laxa genera falsos positivos que el admin aprende a ignorar, y entonces la confirmación deja de atrapar los typos que motivaron la funcionalidad.

21. **No hay ninguna definición de qué contiene `puntajes`.** Es JSONB libre, sin schema, sin escala y sin campos obligatorios (AUD-027). Las devoluciones prometen "Calidad Técnica, Mérito Estilístico, Fuerza Relativa dentro del Vuelo (Hedonístico)" y las intensidades por sección en formato de barras. **Pregunta: ¿cuál es la estructura exacta de la planilla, con la escala de cada campo y cuáles son obligatorios?** Es insumo bloqueante tanto para la validación server-side como para el renderizado de las devoluciones, y hoy no está escrito en ningún lado.

22. **Las transiciones de estado hacia atrás no existen** (AUD-038): una vez en `pre-cata` no se puede volver a `inscripcion`. **Pregunta: ¿qué pasa si el admin cierra la inscripción por error, o si una cervecería necesita corregir una muestra después del cierre?** El documento dice que solo el admin puede dar de baja una muestra en `pre-cata`, pero no contempla la corrección.

**Sobre la operación multi-tenant**

23. **El CORS admite exactamente un origen** (`main.go:48-57`). La entidad ORGANIZACION tiene un campo `dominio` "para integración DNS opcional". **Pregunta: ¿cada organización va a tener su propio dominio?** Si la respuesta es sí, la configuración actual de CORS y de cookies no lo soporta y conviene saberlo antes del deploy.

24. **`cantidad_botellas_por_muestra` tiene default 6 y no es configurable** (AUD-040). Es el valor de Cervecerías; Homebrewers usa 4. **Pregunta: confirmar que se configura por edición y no por estilo** — el documento ya lo dice, pero el código fijó el default de una de las dos competencias como si fuera universal.

---

*Fin de la auditoría. 65 hallazgos: 4 críticos, 11 altos, 35 medios, 15 bajos. No se modificó ningún archivo del backend, no se crearon ni actualizaron tickets ni documentos en Linear.*
