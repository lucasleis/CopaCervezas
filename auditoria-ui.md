# Auditoría de consistencia visual — Frontend

**Fecha:** 2026-08-10 · **Rama:** `claude/frontend-visual-audit-431zjv` · **Commit base:** `4f98021`

## Alcance y método

- **Ruta auditada:** `frontend/src/` — 40 archivos `.tsx` (7.681 líneas incl. `index.css`).
  > ⚠️ `CLAUDE.md` documenta el frontend en `src/` en la raíz del repo. **Ese directorio no existe**: el frontend
  > vive en `frontend/src/`. Las rutas de este reporte son relativas a `frontend/src/`.
- **Excluido:** `backend/`, `node_modules/`, `dist/`, `*.timestamp-*.mjs`, archivos generados.
- **Conteo:** extracción programática de literales de string en los `.tsx`, descartando los valores de
  atributos que no son clases (`id`, `htmlFor`, `type`, `name`, `placeholder`, `to`, `href`, `value`, …) para
  no contaminar el conteo con cosas como `id="p-nombre"` o `type="text"`. Se capturan tanto `className="…"`
  como los mapas de clases en objetos (`className:` dentro de `ACCENT`, `ESTADO_*`, `cva()`).
  Total: **265 valores utilitarios distintos** en **2.487 apariciones** clasificadas.
- **Nota de lectura:** las apariciones son *ocurrencias en el código fuente*, no en runtime. Un valor dentro de
  un `cva()` de `ui/` cuenta 1 aunque se renderice en toda la app; por eso las clases de `ui/` aparecen
  sistemáticamente como "outliers" y están marcadas como tal más abajo.

---

## 1. Inventario de clases Tailwind

### Spacing

| Valor | Apariciones |
|---|---|
| `px-4` | 100 |
| `py-3` | 56 |
| `gap-2` | 40 |
| `py-2` | 34 |
| `gap-4` | 28 |
| `px-3` | 20 |
| `py-12` | 19 |
| `p-8` | 17 |
| `px-2.5` | 17 |
| `gap-1.5` | 16 |
| `py-1` | 12 |
| `gap-1` | 11 |
| `mb-6` | 11 |
| `mt-1` | 11 |
| `py-1.5` | 9 |
| `p-4` | 8 |
| `px-2` | 8 |
| `px-6` | 8 |
| `py-4` | 8 |
| `gap-3` | 6 |
| `p-6` | 6 |
| `py-0.5` | 6 |
| `py-2.5` | 6 |
| `gap-x-4` | 5 |
| `gap-y-1` | 5 |
| `mb-3` | 5 |
| `mb-4` | 4 |
| `mt-4` | 4 |
| `mb-1` | 3 |
| `mb-8` | 3 |
| `mt-2` | 3 |
| `p-2` | 3 |
| `px-1.5` | 3 |
| `px-8` | 3 |
| `py-8` | 3 |
| `gap-2.5` | 2 |
| `m-0` | 2 |
| `mb-2` | 2 |
| `ml-1` | 2 |
| `mt-6` | 2 |
| `mx-auto` | 2 |
| `p-1` | 2 |
| `p-3` | 2 |
| `p-5` | 2 |
| `pt-2` | 2 |
| `pt-4` | 2 |
| `px-1` | 2 |
| `py-10` | 2 |
| `py-16` | 2 |
| `-mb-4` | 1 |
| `-mx-1` | 1 |
| `-mx-4` | 1 |
| `gap-6` | 1 |
| `gap-8` | 1 |
| `gap-x-3` | 1 |
| `gap-y-0.5` | 1 |
| `gap-y-2` | 1 |
| `mr-2` | 1 |
| `mt-0.5` | 1 |
| `mt-10` | 1 |
| `my-1` | 1 |
| `p-0.5` | 1 |
| `p-2.5` | 1 |
| `pb-1.5` | 1 |
| `pl-1.5` | 1 |
| `pl-2.5` | 1 |
| `pl-6` | 1 |
| `pl-[22px]` | 1 |
| `pr-2` | 1 |
| `pr-8` | 1 |

_70 valores distintos, 550 apariciones._

### Tipografía — tamaño (`text-*`)

| Valor | Apariciones |
|---|---|
| `text-sm` | 185 |
| `text-xs` | 51 |
| `text-2xl` | 14 |
| `text-base` | 12 |
| `text-[11px]` | 7 |
| `text-lg` | 6 |
| `text-3xl` | 3 |
| `text-[0.8rem]` | 1 |
| `text-[12.5px]` | 1 |
| `text-[15px]` | 1 |

_10 valores distintos, 281 apariciones._

### Tipografía — `font-` / `leading-` / `tracking-`

| Valor | Apariciones |
|---|---|
| `font-medium` | 118 |
| `font-semibold` | 52 |
| `tracking-wide` | 15 |
| `font-bold` | 13 |
| `font-mono` | 8 |
| `leading-relaxed` | 6 |
| `leading-none` | 3 |
| `tracking-tight` | 2 |
| `leading-tight` | 1 |

_9 valores distintos, 218 apariciones._

### Tipografía — alineación (`text-*`)

| Valor | Apariciones |
|---|---|
| `text-center` | 25 |
| `text-left` | 15 |
| `text-right` | 3 |

_3 valores distintos, 43 apariciones._

### Dimensiones

| Valor | Apariciones |
|---|---|
| `w-full` | 53 |
| `size-4` | 20 |
| `h-4` | 19 |
| `w-24` | 10 |
| `h-8` | 8 |
| `h-7` | 7 |
| `w-[132px]` | 7 |
| `h-14` | 6 |
| `h-5` | 6 |
| `w-4` | 5 |
| `h-16` | 4 |
| `h-6` | 4 |
| `h-auto` | 4 |
| `size-3.5` | 4 |
| `h-3` | 3 |
| `h-9` | 3 |
| `h-screen` | 3 |
| `w-20` | 3 |
| `w-40` | 3 |
| `w-48` | 3 |
| `w-fit` | 3 |
| `h-48` | 2 |
| `w-10` | 2 |
| `w-16` | 2 |
| `w-28` | 2 |
| `w-32` | 2 |
| `w-56` | 2 |
| `w-64` | 2 |
| `h-1.5` | 1 |
| `h-10` | 1 |
| `h-2` | 1 |
| `h-3.5` | 1 |
| `h-32` | 1 |
| `h-40` | 1 |
| `h-64` | 1 |
| `h-full` | 1 |
| `h-px` | 1 |
| `size-10` | 1 |
| `size-3` | 1 |
| `size-6` | 1 |
| `size-7` | 1 |
| `size-8` | 1 |
| `size-9` | 1 |
| `w-(--anchor-width)` | 1 |
| `w-1.5` | 1 |
| `w-12` | 1 |
| `w-14` | 1 |
| `w-3.5` | 1 |
| `w-36` | 1 |
| `w-6` | 1 |
| `w-72` | 1 |
| `w-[240px]` | 1 |
| `w-[5px]` | 1 |

_53 valores distintos, 217 apariciones._

### Radios (`rounded-*`)

| Valor | Apariciones |
|---|---|
| `rounded-lg` | 67 |
| `rounded-full` | 15 |
| `rounded-md` | 14 |
| `rounded` | 7 |
| `rounded-xl` | 5 |
| `rounded-[min(var(--radius-md),10px)]` | 2 |
| `rounded-[min(var(--radius-md),12px)]` | 2 |
| `rounded-4xl` | 1 |
| `rounded-[4px]` | 1 |
| `rounded-b-xl` | 1 |

_10 valores distintos, 115 apariciones._

### Bordes — ancho / lado / estilo

| Valor | Apariciones |
|---|---|
| `border` | 73 |
| `border-b` | 27 |
| `border-t` | 9 |
| `border-0` | 8 |
| `border-dashed` | 1 |
| `border-r` | 1 |

_6 valores distintos, 119 apariciones._

### Sombras

| Valor | Apariciones |
|---|---|
| `shadow-sm` | 5 |
| `shadow-md` | 4 |
| `shadow-xl` | 1 |

_3 valores distintos, 10 apariciones._

### Color — `bg-*`

| Valor | Apariciones |
|---|---|
| `bg-white` | 54 |
| `bg-neutral-50` | 21 |
| `bg-neutral-100` | 15 |
| `bg-transparent` | 9 |
| `bg-muted` | 7 |
| `bg-red-600` | 6 |
| `bg-red-700` | 6 |
| `bg-muted/50` | 5 |
| `bg-destructive/20` | 4 |
| `bg-green-100` | 4 |
| `bg-danger-50` | 3 |
| `bg-gray-100` | 3 |
| `bg-secondary` | 3 |
| `bg-success-100` | 3 |
| `bg-yellow-100` | 3 |
| `bg-blue-100` | 2 |
| `bg-danger-600` | 2 |
| `bg-destructive/10` | 2 |
| `bg-green-200` | 2 |
| `bg-orange-100` | 2 |
| `bg-primary` | 2 |
| `bg-primary-50` | 2 |
| `bg-primary-500` | 2 |
| `bg-primary/80` | 2 |
| `bg-purple-100` | 2 |
| `bg-success-50` | 2 |
| `bg-warning-100` | 2 |
| `bg-warning-50` | 2 |
| `bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` | 1 |
| `bg-amber-50` | 1 |
| `bg-background` | 1 |
| `bg-black/50` | 1 |
| `bg-border` | 1 |
| `bg-clip-padding` | 1 |
| `bg-destructive/30` | 1 |
| `bg-gray-200` | 1 |
| `bg-input/30` | 1 |
| `bg-input/50` | 1 |
| `bg-neutral-200` | 1 |
| `bg-neutral-400` | 1 |
| `bg-neutral-800` | 1 |
| `bg-primary-100` | 1 |
| `bg-secondary/80` | 1 |
| `bg-success-300` | 1 |
| `bg-warning-500` | 1 |
| `bg-yellow-200` | 1 |

_46 valores distintos, 190 apariciones._

### Color — `text-*`

| Valor | Apariciones |
|---|---|
| `text-neutral-600` | 65 |
| `text-neutral-700` | 65 |
| `text-neutral-900` | 65 |
| `text-neutral-500` | 59 |
| `text-red-500` | 50 |
| `text-neutral-400` | 14 |
| `text-white` | 10 |
| `text-foreground` | 8 |
| `text-muted-foreground` | 8 |
| `text-destructive` | 5 |
| `text-red-600` | 5 |
| `text-success-700` | 4 |
| `text-neutral-300` | 3 |
| `text-primary` | 3 |
| `text-secondary-foreground` | 3 |
| `text-success-600` | 3 |
| `text-blue-700` | 2 |
| `text-danger-700` | 2 |
| `text-green-700` | 2 |
| `text-green-800` | 2 |
| `text-orange-700` | 2 |
| `text-primary-700` | 2 |
| `text-primary-foreground` | 2 |
| `text-purple-700` | 2 |
| `text-red-700` | 2 |
| `text-warning-700` | 2 |
| `text-yellow-700` | 2 |
| `text-amber-800` | 1 |
| `text-danger-600` | 1 |
| `text-gray-600` | 1 |
| `text-gray-700` | 1 |
| `text-gray-800` | 1 |
| `text-green-600` | 1 |
| `text-warning-800` | 1 |
| `text-yellow-800` | 1 |

_35 valores distintos, 400 apariciones._

### Color — `border-*`

| Valor | Apariciones |
|---|---|
| `border-neutral-200` | 65 |
| `border-neutral-100` | 18 |
| `border-input` | 12 |
| `border-ring` | 10 |
| `border-neutral-300` | 9 |
| `border-destructive` | 7 |
| `border-border` | 2 |
| `border-danger-100` | 2 |
| `border-gray-300` | 2 |
| `border-primary-200` | 2 |
| `border-success-200` | 2 |
| `border-transparent` | 2 |
| `border-warning-200` | 2 |
| `border-amber-200` | 1 |
| `border-danger-200` | 1 |
| `border-destructive/40` | 1 |
| `border-destructive/50` | 1 |
| `border-neutral-400` | 1 |
| `border-red-500` | 1 |

_19 valores distintos, 141 apariciones._

---

## 2. Outliers (≤ 2 apariciones)

**143 valores** aparecen 2 veces o menos — el **54 %** del vocabulario visual se usa casi una sola vez.

Convenciones de esta sección:
- ⚠️**arb.** marca un **valor arbitrario entre corchetes**.
- Los valores que sólo aparecen dentro de `components/ui/*.tsx` son parte de la definición de un componente
  (`cva()`), no una desviación de página: **no borrar, son el token**. Están señalados por su ruta.

### Colores hardcodeados en hex / rgb / hsl dentro del JSX

**Ninguno.** El grep de `#rrggbb`, `rgb(`, `rgba(` y `hsl(` sobre los `.tsx` no devolvió resultados: todo el
color pasa por clases Tailwind. El único `style={{…}}` inline del proyecto es
`pages/admin/CataLivePage.tsx:182` — `style={{ width: `${pct}%` }}` — que es un ancho calculado en runtime y
es un uso legítimo.

### Valores arbitrarios entre corchetes (vista consolidada)

| Valor | Apar. | Ubicación | Veredicto |
|---|---|---|---|
| `text-[11px]` | 7 | `components/EstadoEdicion.tsx:69`, `ui/StatusBadge.tsx:13,61`, `ui/toggle-group.tsx:21`, `pages/admin/EdicionDetailPage.tsx:644` | **Normalizar.** Es de facto el 6.º tamaño de texto de la app. Debería ser un token (`text-2xs`) en `@theme`. |
| `w-[132px]` | 7 | `pages/admin/EdicionDetailPage.tsx:128,259,453,659` (+3) | **Normalizar.** Ancho de columna de tabla repetido; `w-32` (128px) o un token de grilla. |
| `min-h-[2.5rem]` | 2 | `components/juez/EvaluacionForm.tsx:147,229` | Reemplazable por `min-h-10`. |
| `rounded-[min(var(--radius-md),10px)]` | 2 | `ui/button.tsx:26,31` | Definición shadcn — dejar. |
| `rounded-[min(var(--radius-md),12px)]` | 2 | `ui/button.tsx:27,33` | Definición shadcn — dejar. |
| `text-[0.8rem]` | 1 | `ui/button.tsx:27` | Definición shadcn, pero **mezcla unidades** (rem) con el resto de arbitrarios en px. |
| `text-[12.5px]` | 1 | `ui/FlightCard.tsx:63` | **Eliminar.** Tamaño único en todo el proyecto, sin justificación. |
| `text-[15px]` | 1 | `ui/FlightCard.tsx:62` | **Eliminar.** Cae entre `text-sm` (14px) y `text-base` (16px). |
| `pl-[22px]` | 1 | `ui/FlightCard.tsx:47` | Compensa la franja de `w-[5px]`; sobreviviría como `pl-6`. |
| `w-[5px]` | 1 | `ui/FlightCard.tsx:53` | Franja de acento; `w-1.5` (6px) sería equivalente visual. |
| `rounded-[4px]` | 1 | `ui/checkbox.tsx:11` | **Normalizar** a `rounded` (4px) — es exactamente el mismo valor escrito de dos formas. |
| `w-[240px]` | 1 | `components/Sidebar.tsx:24` | Ancho de sidebar; candidato a token `--sidebar-width`. |
| `grid-cols-[30%_20%_20%_15%_15%]` | 1 | `pages/admin/EdicionDetailPage.tsx:59` | Grilla de tabla ad-hoc (ver §3, tabla en `div`s). |
| `max-w-[calc(100%-2rem)]` | 1 | `ui/dialog.tsx:54` | Definición shadcn — dejar. |
| `bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` | 1 | `ui/button.tsx:16` | Definición shadcn — dejar. |
| `focus-visible:ring-[3px]` | 1 | `ui/badge.tsx:8` | Inconsistente con `ring-3` que usa `button.tsx:8` — **mismo valor, dos sintaxis**. |

### Listado completo de outliers por familia

#### Spacing

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `-mb-4` | 1 | components/ui/dialog.tsx:103 |
| `-mx-1` | 1 | components/ui/select.tsx:144 |
| `-mx-4` | 1 | components/ui/dialog.tsx:103 |
| `gap-6` | 1 | pages/admin/GruposPage.tsx:552 |
| `gap-8` | 1 | pages/brewery/CompetenciaDetallePage.tsx:118 |
| `gap-x-3` | 1 | pages/juez/VueloPanelPage.tsx:125 |
| `gap-y-0.5` | 1 | pages/juez/VueloPanelPage.tsx:125 |
| `gap-y-2` | 1 | pages/brewery/CompetenciaDetallePage.tsx:118 |
| `mr-2` | 1 | components/admin/EstiloDialog.tsx:253 |
| `mt-0.5` | 1 | pages/brewery/CompetenciaDetallePage.tsx:196 |
| `mt-10` | 1 | pages/admin/CataLivePage.tsx:200 |
| `my-1` | 1 | components/ui/select.tsx:144 |
| `p-0.5` | 1 | pages/juez/VueloEvaluacionPage.tsx:113 |
| `p-2.5` | 1 | components/juez/EvaluacionForm.tsx:91 |
| `pb-1.5` | 1 | components/admin/CamposDialog.tsx:234 |
| `pl-1.5` | 1 | components/ui/select.tsx:118 |
| `pl-2.5` | 1 | components/ui/select.tsx:42 |
| `pl-6` | 1 | pages/admin/EstilosPage.tsx:45 |
| `pl-[22px]` ⚠️**arb.** | 1 | components/ui/FlightCard.tsx:47 |
| `pr-2` | 1 | components/ui/select.tsx:42 |
| `pr-8` | 1 | components/ui/select.tsx:118 |
| `gap-2.5` | 2 | components/ui/FlightCard.tsx:47; pages/juez/CataPage.tsx:143 |
| `m-0` | 2 | components/ui/FlightCard.tsx:62; components/ui/FlightCard.tsx:63 |
| `mb-2` | 2 | pages/admin/EdicionDetailPage.tsx:771; pages/admin/GruposPage.tsx:538 |
| `ml-1` | 2 | pages/admin/CataLivePage.tsx:188; pages/admin/InscriptosPage.tsx:259 |
| `mt-6` | 2 | pages/LoginPage.tsx:49; pages/SelectOrgPage.tsx:53 |
| `mx-auto` | 2 | pages/brewery/CompetenciaDetallePage.tsx:75; pages/brewery/MisMuestrasEdicionPage.tsx:123 |
| `p-1` | 2 | components/ui/select.tsx:13; components/ui/tabs.tsx:20 |
| `p-3` | 2 | components/admin/EstiloDialog.tsx:166; components/brewery/MuestraDialog.tsx:288 |
| `p-5` | 2 | pages/brewery/MisMuestrasEdicionPage.tsx:153; pages/brewery/MisMuestrasEdicionPage.tsx:193 |
| `pt-2` | 2 | components/juez/EvaluacionForm.tsx:705; pages/brewery/CompetenciaDetallePage.tsx:214 |
| `pt-4` | 2 | components/admin/CamposDialog.tsx:198; pages/juez/VueloEvaluacionPage.tsx:195 |
| `px-1` | 2 | components/juez/EvaluacionForm.tsx:567; components/juez/EvaluacionForm.tsx:646 |
| `py-10` | 2 | pages/brewery/CompetenciaDetallePage.tsx:75; pages/brewery/MisMuestrasEdicionPage.tsx:123 |
| `py-16` | 2 | pages/brewery/MisMuestrasEdicionPage.tsx:179; pages/juez/VueloEvaluacionPage.tsx:159 |

#### Tipografía — tamaño

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `text-[0.8rem]` ⚠️**arb.** | 1 | components/ui/button.tsx:27 |
| `text-[12.5px]` ⚠️**arb.** | 1 | components/ui/FlightCard.tsx:63 |
| `text-[15px]` ⚠️**arb.** | 1 | components/ui/FlightCard.tsx:62 |

#### Tipografía — font/leading/tracking

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `leading-tight` | 1 | components/juez/EvaluacionForm.tsx:76 |
| `tracking-tight` | 2 | pages/brewery/CompetenciaDetallePage.tsx:115; pages/brewery/MisMuestrasEdicionPage.tsx:135 |

#### Dimensiones

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `h-1.5` | 1 | components/ui/StatusBadge.tsx:59 |
| `h-10` | 1 | components/ui/table.tsx:71 |
| `h-2` | 1 | pages/admin/CataLivePage.tsx:177 |
| `h-3.5` | 1 | pages/admin/InscriptosPage.tsx:65 |
| `h-32` | 1 | pages/brewery/CompetenciaDetallePage.tsx:93 |
| `h-40` | 1 | pages/brewery/CompetenciaDetallePage.tsx:92 |
| `h-64` | 1 | pages/juez/VueloEvaluacionPage.tsx:142 |
| `h-full` | 1 | pages/admin/CataLivePage.tsx:179 |
| `h-px` | 1 | components/ui/select.tsx:144 |
| `size-10` | 1 | pages/juez/VueloEvaluacionPage.tsx:160 |
| `size-3` | 1 | components/ui/checkbox.tsx:20 |
| `size-6` | 1 | components/ui/button.tsx:31 |
| `size-7` | 1 | components/ui/button.tsx:33 |
| `size-8` | 1 | components/ui/button.tsx:29 |
| `size-9` | 1 | components/ui/button.tsx:34 |
| `w-(--anchor-width)` | 1 | components/ui/select.tsx:84 |
| `w-1.5` | 1 | components/ui/StatusBadge.tsx:59 |
| `w-12` | 1 | pages/admin/EstilosPage.tsx:208 |
| `w-14` | 1 | pages/admin/EdicionesPage.tsx:191 |
| `w-3.5` | 1 | pages/admin/InscriptosPage.tsx:65 |
| `w-36` | 1 | pages/brewery/MisMuestrasEdicionPage.tsx:160 |
| `w-6` | 1 | components/juez/EvaluacionDialog.tsx:190 |
| `w-72` | 1 | pages/brewery/CompetenciaDetallePage.tsx:88 |
| `w-[240px]` ⚠️**arb.** | 1 | components/Sidebar.tsx:24 |
| `w-[5px]` ⚠️**arb.** | 1 | components/ui/FlightCard.tsx:53 |
| `h-48` | 2 | pages/admin/EdicionDetailPage.tsx:751; pages/admin/GruposPage.tsx:529 |
| `w-10` | 2 | pages/admin/EstilosPage.tsx:210; pages/admin/EstilosPage.tsx:211 |
| `w-16` | 2 | pages/brewery/MisMuestrasEdicionPage.tsx:158; pages/juez/VueloEvaluacionPage.tsx:139 |
| `w-28` | 2 | pages/admin/CataLivePage.tsx:173; pages/juez/CataPage.tsx:147 |
| `w-32` | 2 | pages/admin/CataLivePage.tsx:170; pages/brewery/MisMuestrasEdicionPage.tsx:157 |
| `w-56` | 2 | pages/admin/GruposPage.tsx:82; pages/brewery/CompetenciaDetallePage.tsx:89 |
| `w-64` | 2 | pages/admin/EdicionDetailPage.tsx:750; pages/admin/GruposPage.tsx:528 |

#### Radios

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `rounded-4xl` | 1 | components/ui/badge.tsx:8 |
| `rounded-[4px]` ⚠️**arb.** | 1 | components/ui/checkbox.tsx:11 |
| `rounded-b-xl` | 1 | components/ui/dialog.tsx:103 |
| `rounded-[min(var(--radius-md),10px)]` ⚠️**arb.** | 2 | components/ui/button.tsx:26; components/ui/button.tsx:31 |
| `rounded-[min(var(--radius-md),12px)]` ⚠️**arb.** | 2 | components/ui/button.tsx:27; components/ui/button.tsx:33 |

#### Bordes (ancho/lado/estilo)

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `border-dashed` | 1 | pages/brewery/MisMuestrasEdicionPage.tsx:179 |
| `border-r` | 1 | components/Sidebar.tsx:24 |

#### Sombras

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `shadow-xl` | 1 | components/ui/dialog.tsx:54 |

#### Color — bg

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` ⚠️**arb.** | 1 | components/ui/button.tsx:16 |
| `bg-amber-50` | 1 | pages/admin/GruposPage.tsx:548 |
| `bg-background` | 1 | components/ui/button.tsx:14 |
| `bg-black/50` | 1 | components/ui/dialog.tsx:32 |
| `bg-border` | 1 | components/ui/select.tsx:144 |
| `bg-clip-padding` | 1 | components/ui/button.tsx:8 |
| `bg-destructive/30` | 1 | components/ui/button.tsx:20 |
| `bg-gray-200` | 1 | pages/admin/InscriptosPage.tsx:280 |
| `bg-input/30` | 1 | components/ui/button.tsx:14 |
| `bg-input/50` | 1 | components/ui/button.tsx:14 |
| `bg-neutral-200` | 1 | pages/admin/CataLivePage.tsx:177 |
| `bg-neutral-400` | 1 | components/ui/FlightCard.tsx:9 |
| `bg-neutral-800` | 1 | components/juez/EvaluacionForm.tsx:88 |
| `bg-primary-100` | 1 | pages/juez/VueloEvaluacionPage.tsx:113 |
| `bg-secondary/80` | 1 | components/ui/badge.tsx:14 |
| `bg-success-300` | 1 | components/ui/FlightCard.tsx:19 |
| `bg-warning-500` | 1 | components/ui/FlightCard.tsx:24 |
| `bg-yellow-200` | 1 | pages/admin/InscriptosPage.tsx:269 |
| `bg-blue-100` | 2 | components/EstadoEdicion.tsx:17; pages/admin/EdicionesPage.tsx:34 |
| `bg-danger-600` | 2 | components/ui/FlightCard.tsx:29; components/ui/StatusBadge.tsx:21 |
| `bg-destructive/10` | 2 | components/ui/badge.tsx:16; components/ui/button.tsx:20 |
| `bg-green-200` | 2 | pages/admin/InscriptosPage.tsx:270; pages/admin/InscriptosPage.tsx:281 |
| `bg-orange-100` | 2 | components/EstadoEdicion.tsx:19; pages/admin/EdicionesPage.tsx:42 |
| `bg-primary` | 2 | components/ui/badge.tsx:12; components/ui/button.tsx:12 |
| `bg-primary-50` | 2 | components/ui/FlightCard.tsx:12; pages/juez/VueloEvaluacionPage.tsx:104 |
| `bg-primary-500` | 2 | components/ui/FlightCard.tsx:14; components/ui/StatusBadge.tsx:18 |
| `bg-primary/80` | 2 | components/ui/badge.tsx:12; components/ui/button.tsx:12 |
| `bg-purple-100` | 2 | components/EstadoEdicion.tsx:20; pages/admin/EdicionesPage.tsx:46 |
| `bg-success-50` | 2 | components/ui/FlightCard.tsx:17; pages/admin/CataLivePage.tsx:208 |
| `bg-warning-100` | 2 | components/ui/StatusBadge.tsx:20; pages/brewery/MisMuestrasEdicionPage.tsx:42 |
| `bg-warning-50` | 2 | components/admin/EstiloDialog.tsx:166; components/ui/FlightCard.tsx:22 |

#### Color — text

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `text-amber-800` | 1 | pages/admin/GruposPage.tsx:548 |
| `text-danger-600` | 1 | components/juez/EvaluacionForm.tsx:117 |
| `text-gray-600` | 1 | pages/admin/InscriptosPage.tsx:280 |
| `text-gray-700` | 1 | pages/admin/GruposPage.tsx:538 |
| `text-gray-800` | 1 | pages/admin/EdicionDetailPage.tsx:771 |
| `text-green-600` | 1 | pages/admin/GruposPage.tsx:469 |
| `text-warning-800` | 1 | components/admin/EstiloDialog.tsx:167 |
| `text-yellow-800` | 1 | pages/admin/InscriptosPage.tsx:269 |
| `text-blue-700` | 2 | components/EstadoEdicion.tsx:17; pages/admin/EdicionesPage.tsx:34 |
| `text-danger-700` | 2 | pages/brewery/CompetenciaDetallePage.tsx:102; pages/brewery/MisMuestrasEdicionPage.tsx:173 |
| `text-green-700` | 2 | components/EstadoEdicion.tsx:21; pages/admin/EdicionesPage.tsx:50 |
| `text-green-800` | 2 | pages/admin/InscriptosPage.tsx:270; pages/admin/InscriptosPage.tsx:281 |
| `text-orange-700` | 2 | components/EstadoEdicion.tsx:19; pages/admin/EdicionesPage.tsx:42 |
| `text-primary-700` | 2 | pages/juez/VueloEvaluacionPage.tsx:104; pages/juez/VueloEvaluacionPage.tsx:113 |
| `text-primary-foreground` | 2 | components/ui/badge.tsx:12; components/ui/button.tsx:12 |
| `text-purple-700` | 2 | components/EstadoEdicion.tsx:20; pages/admin/EdicionesPage.tsx:46 |
| `text-red-700` | 2 | components/admin/CamposDialog.tsx:180; pages/admin/EstilosPage.tsx:65 |
| `text-warning-700` | 2 | components/ui/StatusBadge.tsx:20; pages/brewery/MisMuestrasEdicionPage.tsx:42 |
| `text-yellow-700` | 2 | components/EstadoEdicion.tsx:18; pages/admin/EdicionesPage.tsx:38 |

#### Color — border

| Valor | Apar. | Ubicación (archivo:línea) |
|---|---|---|
| `border-amber-200` | 1 | pages/admin/GruposPage.tsx:548 |
| `border-danger-200` | 1 | components/ui/FlightCard.tsx:28 |
| `border-destructive/40` | 1 | components/ui/button.tsx:20 |
| `border-destructive/50` | 1 | components/ui/button.tsx:8 |
| `border-neutral-400` | 1 | pages/SelectOrgPage.tsx:60 |
| `border-red-500` | 1 | components/juez/EvaluacionForm.tsx:148 |
| `border-border` | 2 | components/ui/badge.tsx:18; components/ui/button.tsx:14 |
| `border-danger-100` | 2 | pages/brewery/CompetenciaDetallePage.tsx:100; pages/brewery/MisMuestrasEdicionPage.tsx:172 |
| `border-gray-300` | 2 | pages/admin/EdicionDetailPage.tsx:771; pages/admin/GruposPage.tsx:538 |
| `border-primary-200` | 2 | components/ui/FlightCard.tsx:13; pages/juez/VueloEvaluacionPage.tsx:104 |
| `border-success-200` | 2 | components/ui/FlightCard.tsx:18; pages/admin/CataLivePage.tsx:208 |
| `border-transparent` | 2 | components/ui/badge.tsx:8; components/ui/button.tsx:8 |
| `border-warning-200` | 2 | components/admin/EstiloDialog.tsx:166; components/ui/FlightCard.tsx:23 |
---

## 3. Escapes de shadcn

Disponibles en `src/components/ui/`: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Label`, `Table`,
`Dialog`, `Badge`, `Tabs`, `ToggleGroup`, `Skeleton`, `Sonner`, `StatusBadge`, `FlightCard`.
**No existe un componente `Card`** — ver el apartado correspondiente más abajo.

### 3.1 `<button>` nativo existiendo `Button` — 21 casos

| Archivo:línea | Clases | Hipótesis de por qué se esquivó |
|---|---|---|
| `pages/admin/EdicionDetailPage.tsx:770` | `flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-gray-300 rounded-md bg-white text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer mb-2` | **El caso más grave.** Reimplementa `variant="outline"` a mano y encima con la paleta `gray-*` de Tailwind por defecto, que no existe en `@theme`. Faltaría: nada — `<Button variant="outline" size="sm">` cubre el caso. |
| `pages/admin/GruposPage.tsx:537` | `flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 font-semibold hover:bg-gray-100 transition-colors cursor-pointer mb-2` | Copia-pega del anterior con `text-gray-700` en vez de `800` y el orden de clases distinto: **dos "botones volver" que quieren ser el mismo y difieren en un tono**. |
| `pages/brewery/CompetenciaDetallePage.tsx:76` | `mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900` | Botón "volver" tipo link sin caja. `variant="link"` existe pero es `text-primary` + `underline`; faltaría un `variant="quiet"`/`muted`. |
| `pages/brewery/MisMuestrasEdicionPage.tsx:124` | idéntico al anterior | Mismo patrón — consistente entre sí, inconsistente con los dos de admin. |
| `pages/SelectOrgPage.tsx:55` | `w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50` | Es una **card clickeable**, no un botón. `Button` fuerza `h-8`/`h-9` y `justify-center`; faltaría un `size="auto"` + `align="start"`. |
| `pages/juez/CataPage.tsx:82` | `flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 text-left hover:border-neutral-300 hover:shadow-sm` | Misma necesidad: card clickeable multi-línea. Nótese que **difiere del de `SelectOrgPage`** en radio de hover (`border-neutral-300` vs `400`) y en `hover:shadow-sm`. |
| `pages/juez/CataPage.tsx:170` | `text-left ${completado ? "opacity-60" : ""}` | Wrapper clickeable sobre un `FlightCard`. Legítimo que no sea `Button`, pero sin `type="button"` explícito. |
| `pages/juez/CataPage.tsx:71` y `:122` | `text-sm text-neutral-600 hover:text-neutral-900` | Otro "volver"/link. **Tercera variante de link-button** en la app. |
| `pages/admin/InscriptosPage.tsx:56` | `flex items-center gap-1.5 rounded-md border border-neutral-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${current?.className}` | Trigger de un dropdown propio, con color inyectado por estado. `Button` no acepta que la variante venga de datos; faltaría poder pasar `className` de color sin pelear con la variante. |
| `pages/admin/InscriptosPage.tsx:70` | `block w-full cursor-pointer whitespace-nowrap px-2 py-1 text-left text-sm ${opt.className}` | Ítem del dropdown propio. Existe `Select` — se esquivó todo el componente (ver 3.3). |
| `pages/admin/InscriptosPage.tsx:163` y `:180` | `rounded-full px-3 py-1 text-xs font-medium capitalize` + `bg-primary text-primary-foreground` / `bg-neutral-100 text-neutral-600 hover:bg-neutral-200` | **Chips de filtro**. Existe `ToggleGroup` (usado en `EvaluacionForm`) y `Badge`; faltaría un `Badge` clickeable o `ToggleGroup variant="pill"`. |
| `pages/admin/InscriptosPage.tsx:252` | `text-left text-neutral-900 hover:underline` | Link en celda de tabla. |
| `pages/admin/GruposPage.tsx:206` | `truncate text-sm font-semibold text-neutral-900 hover:underline disabled:no-underline` | Idem, con `truncate`. `variant="link"` daría `text-primary`, que no es el color que se quería. |
| `pages/admin/GruposPage.tsx:181` | `shrink-0 text-neutral-400 hover:text-neutral-600` | Botón de icono sin caja. `size="icon-xs"` existe pero arrastra `hover:bg-muted`. |
| `pages/juez/VueloEvaluacionPage.tsx:109` | `shrink-0 rounded p-0.5 text-primary-700 hover:bg-primary-100` | Cerrar banner. Faltaría `variant="ghost"` teñido por contexto. |
| `components/Sidebar.tsx:43` | `flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:text-red-600 transition-colors` | Botón de logout full-width. `Button` no tiene `w-full` + `justify-start`; y el `hover:text-red-600` usa la paleta Tailwind, no `danger-*`. |
| `components/admin/EstiloDialog.tsx:234` | `w-full px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50` | Opción de un combobox artesanal. |
| `components/admin/EstiloDialog.tsx:243` | `w-full px-3 py-2 text-left text-sm hover:bg-neutral-50` | Idem. |
| `components/admin/EstiloDialog.tsx:264` | `text-xs text-neutral-400 hover:text-red-500` | Botón "quitar" inline. |

**Patrón dominante:** los 21 escapes se explican con **tres variantes faltantes** en `Button`:
`link` en tono neutro (7 casos), un tamaño *auto* con `text-left` para cards clickeables (3 casos), y
`ghost` de icono sin fondo hover (4 casos).

### 3.2 `<input>` nativo existiendo `Input` — 6 casos

| Archivo:línea | Clases | Hipótesis |
|---|---|---|
| `components/admin/CamposDialog.tsx:236` | `h-4 w-4 rounded border-input` | `type="checkbox"`. **Existe `Checkbox`** (usado en `EvaluacionForm.tsx`) y no se usó. |
| `components/admin/EstiloDialog.tsx:276` | `h-4 w-4 rounded border-input` | Idem. |
| `components/brewery/MuestraDialog.tsx:296` | `h-4 w-4 rounded border-input` | Idem. |
| `components/brewery/MuestraDialog.tsx:365` | `h-4 w-4 rounded border-input` | Idem. |
| `pages/admin/EdicionDetailPage.tsx:711` | `h-4 w-4 rounded border-neutral-300` | Idem — y encima con **otro color de borde** (`neutral-300` vs `input`) que los otros cuatro. |
| `components/juez/EvaluacionDialog.tsx:176` | `w-full` | `type="range"` presumiblemente; no hay `Slider` en `ui/`. Caso legítimo. |

Los 5 checkboxes nativos son el escape más claramente injustificado del proyecto: `Checkbox` existe,
resuelve exactamente esto, y aquí se reimplementa a mano 5 veces con 2 estilos distintos.

### 3.3 `<select>` nativo existiendo `Select` — 1 caso

| Archivo:línea | Clases | Hipótesis |
|---|---|---|
| `pages/juez/CataPage.tsx:110` | `h-8 rounded-lg border border-input bg-transparent px-2 text-sm` | Replica a mano el trigger de `ui/select.tsx:42` — que usa `border-neutral-300` y `bg-white`, o sea que **ni siquiera coincide**. Probablemente se evitó la API controlada de Base UI (`value`/`onValueChange`) por un `<select>` simple. |

Aparte, `pages/admin/InscriptosPage.tsx:44-90` implementa un **dropdown completo desde cero** (estado
`useState`, `useEffect` con `mousedown` para click-outside, `<button>` trigger + lista de `<button>`s),
duplicando lo que `Select` ya hace. Motivo probable: `Select` no permite pintar cada opción con su propio
color de estado (`bg-yellow-100`, `bg-green-100`).

### 3.4 `<textarea>` nativo existiendo `Textarea` — 5 casos

| Archivo:línea | Clases | Hipótesis |
|---|---|---|
| `components/brewery/MuestraDialog.tsx:316` | `w-full rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 …` | **Copia literal del `cva` de `ui/textarea.tsx` salvo `bg-white` en vez de `bg-transparent`.** |
| `components/brewery/MuestraDialog.tsx:383` | idem pero `bg-transparent` | Copia literal — no hay diferencia alguna con el componente. |
| `components/juez/EvaluacionDialog.tsx:207` | idem `bg-transparent` | Copia literal. |
| `components/juez/EvaluacionDialog.tsx:226` | idem + `aria-invalid:*` | Copia literal. |
| `pages/admin/CataLivePage.tsx:339` | idem `bg-transparent` | Copia literal. |

`Textarea` tiene **un solo importador** (`EvaluacionForm.tsx`) mientras 5 sitios lo copian y pegan a mano.
Ninguno de los 5 necesita una prop que el componente no tenga: es duplicación pura.

### 3.5 `<table>` nativa existiendo `Table` — 6 casos

| Archivo:línea | Clases de la `<table>` | Clases de `<th>` | Hipótesis |
|---|---|---|---|
| `pages/admin/EdicionesPage.tsx:157` | `w-full text-sm` | `px-4 py-3 font-medium text-neutral-600` | — |
| `pages/admin/EstilosPage.tsx:193` | `w-full text-sm` | `px-4 py-3 …` | — |
| `pages/admin/InscriptosPage.tsx:197` | `w-full text-sm` | `px-4 py-3 …` | — |
| `pages/admin/DashboardPage.tsx:43` | `w-full text-sm` | `px-4 py-3 …` | — |
| `pages/admin/CataLivePage.tsx:215` | `w-full text-sm` | `px-4 **py-2** font-medium text-neutral-600` | Mismo header con **otro padding vertical**. |
| `components/admin/CamposDialog.tsx:140` | `w-full text-sm` | `px-3 py-2 font-medium text-neutral-600` | Tabla dentro de un diálogo → padding reducido a mano. Faltaría `Table size="sm"`. |

`ui/table.tsx` tiene **un solo importador**: `pages/brewery/CompetenciaDetallePage.tsx`. Es decir, **6 de las 7
tablas de la app no usan el componente Table**. El header `bg-neutral-50 border-b border-neutral-200
text-left` se repite idéntico en las 6.

Caso aparte: `pages/admin/EdicionDetailPage.tsx:59-61` construye una **tabla con `div`s y CSS grid**
(`grid grid-cols-[30%_20%_20%_15%_15%] items-center` + `px-4 py-3 text-xs font-bold uppercase tracking-wide`),
una séptima variante de tabla con **tipografía de header completamente distinta** a las otras seis
(`text-xs font-bold uppercase` vs `text-sm font-medium`).

### 3.6 `div`s con clases de card

**No existe `Card` en `src/components/ui/`.** No es un escape del componente sino la ausencia de él, pero el
patrón está lo bastante consolidado como para justificarlo:

- **38 elementos** combinan `rounded-lg` + `border` + `bg-white`.
- La firma exacta `rounded-lg border border-neutral-200 bg-white` aparece **35 veces**, con estas variantes
  de padding: sin padding (contenedor de tabla, 6×), `p-6` (6×), `p-4` (1×), `px-4 py-12` (estado vacío, 5×).
- Sub-patrón de **estado vacío/error**: `rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center
  text-sm text-{neutral-500|red-500}` — `py-12` aparece **19 veces** repartido en 10 páginas. Es el candidato
  más rentable a componente (`<EmptyState>` / `<ErrorState>`), porque además el color de error oscila entre
  `text-red-500` (paleta Tailwind) y `text-destructive` (token del proyecto).

---

## 4. Componentes shadcn — inventario y uso

**Ningún componente de `src/components/ui/` está huérfano**: los 16 tienen al menos un importador.
El problema no es código muerto sino **adopción**: 5 componentes tienen 1 solo importador mientras su
funcionalidad se reimplementa a mano en otros lados (columna "Escapes").

| Componente | Importadores | ¿Usado? | Escapes que lo evitan |
|---|---|---|---|
| `button.tsx` | 21 | ✅ | **21** `<button>` nativos (§3.1) |
| `skeleton.tsx` | 12 | ✅ | — |
| `dialog.tsx` | 11 | ✅ | — |
| `input.tsx` | 9 | ✅ | 6 `<input>` nativos (§3.2) |
| `select.tsx` | 3 | ✅ | 1 `<select>` nativo + 1 dropdown artesanal (§3.3) |
| `StatusBadge.tsx` | 2 (`FlightCard`, `CataPage`) | ✅ | Compite con `EstadoEdicion.tsx` y los mapas de color de `EdicionesPage`/`InscriptosPage` |
| `FlightCard.tsx` | 1 (`CataPage`) | ✅ | — |
| `badge.tsx` | 1 (`GruposPage`) | ✅ | Chips de `InscriptosPage:163,180` |
| `checkbox.tsx` | 1 (`EvaluacionForm`) | ✅ | **5** `<input type="checkbox">` nativos |
| `label.tsx` | 1 (`EvaluacionForm`) | ✅ | **45** `<label>` nativos, 36 con clases a mano en 5 variantes (ver nota) |
| `table.tsx` | 1 (`CompetenciaDetallePage`) | ✅ | **6** `<table>` nativas + 1 grid-tabla |
| `tabs.tsx` | 1 (`VueloEvaluacionPage`) | ✅ | — |
| `textarea.tsx` | 1 (`EvaluacionForm`) | ✅ | **5** `<textarea>` nativos con el `cva` copiado |
| `toggle-group.tsx` | 1 (`EvaluacionForm`) | ✅ | Chips de filtro de `InscriptosPage` |
| `sonner.tsx` | 1 (`main.tsx`) | ✅ | — |

> **Sobre `Label`:** hay 45 `<label>` nativos. Los que llevan clase se reparten en 5 firmas distintas:
> `text-sm font-medium text-neutral-700` (×27, la dominante), `text-xs font-medium text-neutral-700` (×3),
> `flex items-center gap-2 text-sm font-medium text-neutral-700` (×3),
> `flex items-center gap-2 text-xs font-medium text-neutral-700` (×1),
> `mb-1 text-sm font-medium text-neutral-700` (×1) y `text-sm font-medium text-neutral-600` (×1, en
> `LoginPage` — único lugar con `neutral-600`). Los 9 restantes van sin clase.
>
> Dato que resume la sección: `EvaluacionForm.tsx` es el **único** archivo que importa `checkbox`, `label`,
> `textarea` y `toggle-group`. Si se lo excluye, cuatro componentes del design system quedan sin uso en el
> resto de la aplicación.

**Falta en `ui/`:** `Card`, `EmptyState`, `Label` con adopción real, `Slider` (`EvaluacionDialog.tsx:176`).

---

## 5. Estructura de páginas

15 páginas en `src/pages/`. La tabla muestra cuánto varía la misma estructura entre ellas.

| Página | Wrapper más externo (clases exactas) | Título de página | Botón de volver | Botones de acción principales |
|---|---|---|---|---|
| `LoginPage.tsx` | `flex min-h-screen items-center justify-center bg-neutral-100` → `w-full max-w-sm rounded-lg bg-white p-8 shadow-sm` | `<h1 class="text-2xl font-semibold text-neutral-900">` | — | `<Button type="submit" variant="default" className="w-full">` dentro del form |
| `SelectOrgPage.tsx` | `flex min-h-screen items-center justify-center bg-neutral-100` → `w-full max-w-sm rounded-lg bg-white p-8 shadow-sm` | `<h1 class="text-2xl font-semibold text-neutral-900">` | — | `<button>` nativo por org (`w-full … px-4 py-3 text-left`) — no usa `Button` |
| `admin/DashboardPage.tsx` | `p-8` | `<h1 class="mb-6 text-2xl font-semibold text-neutral-900">` (margen **en el h1**) | — | ninguno |
| `admin/EdicionesPage.tsx` | `p-8` | `<h1 class="text-2xl font-semibold text-neutral-900">` dentro de `div.mb-6.flex.items-center.justify-between` | — | `<Button>` a la derecha del header (sin `variant`, default) |
| `admin/EstilosPage.tsx` | `p-8` | idem `EdicionesPage` | — | `<Button>` a la derecha del header (sin `variant`) |
| `admin/InscriptosPage.tsx` | `p-8` | idem `EdicionesPage` | — | `<Button variant="outline">` a la derecha del header |
| `admin/CataLivePage.tsx` | `p-8` | `<h1>` dentro de `div.mb-6` **sin** `flex justify-between`, con `<p class="text-sm text-neutral-500">` de subtítulo | — | ninguno en el header |
| `admin/EdicionDetailPage.tsx` | `p-8 space-y-6` | `<h1>` dentro de `div.flex.items-center.gap-3` junto al `<EstadoEdicion>` | `<button>` **nativo**: `flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-gray-300 rounded-md bg-white text-gray-800 hover:bg-gray-100 … mb-2` + `<ArrowLeft size={16}/>`, texto "Ediciones" | dispersos por sección, dentro de cards |
| `admin/GruposPage.tsx` | `p-8 space-y-6` | `<h1 class="text-2xl font-semibold text-neutral-900">` (hermano del botón) | `<button>` **nativo**, casi idéntico al anterior pero `text-gray-700` y orden de clases distinto | dispersos |
| `brewery/MisMuestrasPage.tsx` | `p-8` | `<h1>` dentro de `div.mb-6` (sin flex) | — | ninguno en el header |
| `brewery/MisMuestrasEdicionPage.tsx` | `min-h-full bg-white` → **`mx-auto max-w-4xl px-6 py-10 sm:px-8`** | `<h1 class="text-3xl font-semibold tracking-tight text-neutral-900">` — **otro tamaño y con `tracking`** | `<button>` nativo tipo link: `mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 … hover:text-neutral-900` + `<ArrowLeft className="size-4"/>`, texto "Volver" | header con `flex flex-col gap-4 sm:flex-row sm:justify-between` |
| `brewery/CompetenciaDetallePage.tsx` | `min-h-full bg-white` → **`mx-auto max-w-3xl px-6 py-10 sm:px-8`** (`max-w-3xl`, no `4xl`) | `<h1 class="text-3xl font-semibold tracking-tight text-neutral-900">` dentro de `<header class="space-y-3">` | `<button>` nativo idéntico al de `MisMuestrasEdicionPage` | `<Button className="w-full max-w-xs">` al final del contenido |
| `juez/CataPage.tsx` | `p-8` | `<h1 class="text-2xl font-semibold text-neutral-900">` en `div.mb-6.flex.items-center.justify-between` | `<button>` nativo: `text-sm text-neutral-600 hover:text-neutral-900` (líneas 71 y 122) — **tercera implementación de "volver"** | `<select>` nativo + `Button` en el bloque derecho |
| `juez/VueloPanelPage.tsx` | `p-8` | `<h1 class="mt-2 text-2xl font-semibold text-neutral-900">` (margen **en el h1**, debajo del botón) | `<Button variant="ghost" size="sm">` con el carácter **`←` literal** en vez de `<ArrowLeft>` | — |
| `juez/VueloEvaluacionPage.tsx` | `p-8` | `<h1 class="mt-2 text-2xl font-semibold text-neutral-900">` | `<Button variant="ghost" size="sm">` + `<ArrowLeft className="size-4"/>` + "Volver" | segundo "Volver a mis vuelos" al pie (línea 166) |

### Divergencias que salen de la tabla

1. **Dos sistemas de layout de página coexisten.** 11 páginas usan `p-8` a sangre (ancho completo del `main`);
   las 2 de brewery-detalle usan `min-h-full bg-white` + contenedor centrado `mx-auto max-w-{3,4}xl px-6 py-10
   sm:px-8`. Y entre esas dos, el `max-w` no coincide (`3xl` vs `4xl`) sin razón de contenido aparente.
2. **Cuatro implementaciones distintas del botón "volver"**, ninguna compartida:
   `<button>` con caja gris (admin ×2, y difieren entre sí) · `<button>` link neutro (brewery ×2) ·
   `<button>` link chico (juez/CataPage ×2) · `<Button variant="ghost" size="sm">` (juez ×2, y uno usa `←`
   literal y el otro `<ArrowLeft>`).
3. **Dos tamaños de `<h1>`:** `text-2xl` en 13 páginas, `text-3xl tracking-tight` en las 2 de brewery-detalle.
4. **El margen inferior del header se aplica en tres lugares distintos:** en el wrapper (`div.mb-6`), en el
   propio `<h1>` (`mb-6`, Dashboard), o vía `space-y-6` del contenedor (EdicionDetail, Grupos).
5. **Los botones de acción principal viven en el header** en 4 páginas y **dispersos dentro del contenido** en
   las de detalle — sin una zona de acciones definida.
6. Ninguna página declara `variant` explícito para la acción primaria; se apoyan en el `defaultVariants` de
   `Button`, salvo `LoginPage` que escribe `variant="default"` redundante.

---

## 6. Tokens en `index.css`

El bloque `@theme` (`src/index.css:3-65`) define **48 tokens**. Uso real en `.tsx`/`.ts`
(como sufijo de utilidad `bg-*`/`text-*`/`border-*`/`ring-*` o vía `var(--color-*)`):

### 6.1 Escala de color

| Token | Usos | Estado |
|---|---|---|
| `--color-neutral-200` | 71 | ✅ |
| `--color-neutral-600` | 68 | ✅ |
| `--color-neutral-700` | 67 | ✅ |
| `--color-neutral-900` | 66 | ✅ |
| `--color-neutral-500` | 60 | ✅ |
| `--color-neutral-100` | 40 | ✅ |
| `--color-neutral-50` | 23 | ✅ |
| `--color-neutral-400` | 16 | ✅ |
| `--color-neutral-300` | 12 | ✅ |
| `--color-primary-500` | 7 | ✅ |
| `--color-success-700` | 4 | ✅ |
| `--color-success-100` / `--color-success-500` / `--color-danger-50` / `--color-danger-600` | 3 c/u | ✅ |
| `--color-primary-50` / `--color-primary-200` / `--color-primary-700` / `--color-success-50` / `--color-warning-50` / `--color-warning-100` / `--color-warning-700` / `--color-danger-100` / `--color-danger-500` / `--color-danger-700` | 2 c/u | ✅ marginal |
| `--color-primary-100` / `--color-warning-500` / `--color-neutral-800` | 1 c/u | ⚠️ marginal |
| `--color-primary-300` | 0 | ❌ **huérfano** |
| `--color-primary-400` | 0 directo | ⚠️ **usado sólo indirecto**: `--color-ring: var(--color-primary-400)` |
| `--color-primary-600` | 0 | ❌ **huérfano** |
| `--color-primary-800` | 0 | ❌ **huérfano** |
| `--color-primary-900` | 0 | ❌ **huérfano** |
| `--color-info-50` | 0 | ❌ **huérfano** |
| `--color-info-100` | 0 | ❌ **huérfano** |
| `--color-info-500` | 0 | ❌ **huérfano** |
| `--color-info-700` | 0 | ❌ **huérfano** |

**8 tokens huérfanos** (`primary-300/600/800/900` + toda la rampa `info-*`) y 1 usado sólo por indirección.
La familia `info` está definida entera y no se usa ni una vez.

### 6.2 Tokens semánticos

| Token | Usos | Estado |
|---|---|---|
| `--color-destructive` | 34 | ✅ |
| `--color-ring` | 23 | ✅ |
| `--color-input` | 14 | ✅ |
| `--color-muted` | 13 | ✅ |
| `--color-primary` | 11 | ✅ |
| `--color-foreground` | 10 | ✅ |
| `--color-muted-foreground` | 8 | ✅ |
| `--color-secondary` | 4 · `--color-primary-foreground` | 4 | ✅ |
| `--color-secondary-foreground` | 3 · `--color-border` | 3 | ✅ |
| `--color-background` | 1 | ⚠️ marginal (sólo `button.tsx:14`) |

### 6.3 Tokens de shadcn sin mapeo en `@theme`

| Token referenciado | Dónde | Situación |
|---|---|---|
| `--popover` | `ui/sonner.tsx:18` (`"--normal-bg": "var(--popover)"`) | ❌ **No definido ni en `@theme` ni en `:root`.** Resuelve a vacío → el fondo de los toasts queda sin color explícito. **Bug real.** |
| `--popover-foreground` | `ui/sonner.tsx:19` | ❌ **No definido en ningún lado.** Mismo problema para el texto del toast. |
| `--radius-md` | `ui/button.tsx:26,27,31,33`, `ui/select.tsx:42` | ⚠️ No lo define el proyecto. Lo aporta el theme por defecto de Tailwind v4, así que funciona — pero el proyecto define `--radius: 0.5rem` en `:root` y **nunca lo usa para los botones**, con lo cual el radio del design system y el de los componentes están desacoplados. |
| `--radius` | definido en `:root:81`, consumido sólo por `ui/sonner.tsx:21` | ⚠️ Definido para shadcn pero prácticamente huérfano: 1 solo consumidor. |
| `--anchor-width`, `--available-height`, `--transform-origin` | `ui/select.tsx`, `ui/dialog.tsx` | ✅ Variables de runtime de Base UI, correctas. |

**Duplicación estructural:** el bloque `:root` (líneas 68-82) redefine 12 tokens que `@theme` ya define
(`background`, `foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`,
`muted-foreground`, `border`, `input`, `ring`, `destructive`). Hoy los valores coinciden, pero son dos fuentes
de verdad que hay que mantener sincronizadas a mano — y `--background` ya divergió: `@theme` lo define como
`var(--color-neutral-50)` (`#f7f9fb`) y `:root` como `#ffffff`.

### 6.4 Uso de paleta Tailwind por defecto (fuera del design system)

Aparte de los tokens, hay **~30 apariciones** de colores de la paleta Tailwind que no existen en `@theme` y
que pisan la identidad definida:

- `text-red-500` (**50 apariciones**: 22 son el asterisco de campo obligatorio y el resto mensajes de error
  y estados vacíos; todas deberían ser `text-destructive`, que ya existe y se usa 34 veces en paralelo),
  `text-red-600` (5), `text-red-700` (2), `bg-red-600` (6), `bg-red-700` (6), `border-red-500` (1).
- `bg-gray-100` (2), `border-gray-300` (2), `text-gray-600/700/800` (3) — en los dos botones "volver" de admin.
- `bg-green-100/200` (6), `text-green-600/700/800` (5), `bg-yellow-100/200` (4), `text-yellow-700/800` (3),
  `bg-blue-100` (2), `text-blue-700` (2), `bg-purple-100` (2), `text-purple-700` (2), `bg-orange-100` (2),
  `text-orange-700` (2), `bg-amber-50` (1), `text-amber-800` (1), `border-amber-200` (1) — todos en los mapas
  de color de estado de `EstadoEdicion.tsx`, `EdicionesPage.tsx` e `InscriptosPage.tsx`.

Es decir: los estados de edición se pintan con `green/yellow/blue/purple` de Tailwind mientras `success-*`,
`warning-*`, `info-*` y `primary-*` están definidos y sin usar. **`info-*` está huérfano precisamente porque
su rol lo cumple `bg-blue-100`.**

---

## 7. Conclusión

**Los 3 focos de inconsistencia más grandes, por volumen:**

1. **Componentes esquivados (39 escapes).** 21 `<button>` nativos, 6 `<table>` + 1 grid-tabla, 5 `<textarea>`
   que copian literal el `cva` del componente, 5 checkboxes nativos y 1 `<select>` + 1 dropdown artesanal.
   `Table`, `Textarea`, `Checkbox` y `Label` tienen **un solo importador cada uno** — el design system existe
   pero no se adopta.
2. **Dos paletas en paralelo.** 8 tokens de `@theme` huérfanos (`primary-300/600/800/900`, toda la rampa
   `info-*`) conviviendo con ~30 usos de la paleta Tailwind por defecto (`red`, `gray`, `green`, `yellow`,
   `blue`, `purple`, `orange`, `amber`) que cumplen exactamente el rol que esos tokens tenían asignado.
   `text-red-500` solo aparece 50 veces mientras `text-destructive` aparece 34.
3. **Estructura de página sin plantilla.** 70 valores de spacing distintos para 550 usos, 4 implementaciones
   del botón "volver", 2 sistemas de layout (`p-8` vs `mx-auto max-w-*`), 2 tamaños de `<h1>` y el margen del
   header aplicado en 3 lugares distintos.

**Escala mínima propuesta** (cubre ≥ 90 % de los usos actuales):

- **Botones — 3 tamaños:** `sm` (h-7), `default` (h-8), `lg` (h-9) ya existen; agregar `variant="quiet"`
  (link neutro) y `size="card"` (auto + `text-left`) elimina 10 de los 21 escapes.
- **Texto — 5 tamaños:** `xs`, `sm`, `base`, `lg`, `2xl` cubren 266/279 usos (95 %). Agregar `2xs` (11px) como
  token absorbe `text-[11px]` y permite borrar `text-[12.5px]`, `text-[15px]`, `text-[0.8rem]`, `text-3xl`.
- **Spacing — 9 valores:** `1`, `2`, `3`, `4`, `6`, `8` cubren 453/550 usos (82 %) y con `12` (estados vacíos)
  llegan a 86 %; para pasar el 90 % hacen falta los medios pasos `1.5` y `2.5` → **9 valores = 96 %**
  (`1, 1.5, 2, 2.5, 3, 4, 6, 8, 12`). Los 21 usos restantes (`0.5`, `5`, `10`, `16`, `-mx-*`, `pl-[22px]`)
  quedan confinados a `ui/` o son eliminables.
- **Radius — 4 valores:** `rounded` (4px), `rounded-lg`, `rounded-full` cubren 89/115 (77 %); sumando
  `rounded-md` llegan a 103/115 (**90 %**). `rounded-xl`, `rounded-4xl`, `rounded-b-xl` y `rounded-[4px]` son eliminables.
- **Sombras — 2:** `shadow-sm` y `shadow-md` (9 de 10 usos).
