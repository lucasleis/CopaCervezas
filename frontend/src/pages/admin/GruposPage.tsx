import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEdicion } from "@/api/ediciones";
import {
  listGrupos,
  createGrupo,
  updateGrupo,
  deleteGrupo,
  autoasignarGrupos,
  listMuestrasSinGrupo,
  listMuestrasByGrupo,
  moverMuestra,
  type Grupo,
  type MuestraSinGrupo,
  type MuestraDeGrupo,
} from "@/api/grupos";

function errorCode(error: unknown): string | null {
  if (isAxiosError(error)) {
    const body = error.response?.data as
      | { error?: { code: string; message: string } | null }
      | undefined;
    return body?.error?.code ?? null;
  }
  return null;
}

function cantRondasLabel(n: number): string {
  return n === 1 ? "1 ronda" : `${n} rondas`;
}

function cantMuestrasLabel(n: number): string {
  return n === 1 ? "1 muestra" : `${n} muestras`;
}

// ─── Selector "mover a grupo" ──────────────────────────────────────────────

function MoverAGrupoSelect({
  label,
  grupos,
  excludeGrupoId,
  disabled,
  onMover,
}: {
  label: string;
  grupos: Grupo[];
  excludeGrupoId?: string;
  disabled?: boolean;
  onMover: (grupoId: string) => void;
}) {
  const opciones = grupos.filter((g) => g.id !== excludeGrupoId);
  return (
    <Select
      value=""
      onValueChange={(value) => {
        if (value) onMover(value);
      }}
      disabled={disabled || opciones.length === 0}
    >
      <SelectTrigger size="sm" className="w-full sm:w-56">
        <SelectValue placeholder={label}>
          {() => label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {opciones.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Card de grupo ──────────────────────────────────────────────────────────

function GrupoCard({
  grupo,
  grupos,
  edicionId,
  bloqueado,
}: {
  grupo: Grupo;
  grupos: Grupo[];
  edicionId: string;
  bloqueado: boolean;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editingNombre, setEditingNombre] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(grupo.nombre);

  const { data: muestras, isLoading: muestrasLoading } = useQuery({
    queryKey: ["muestras-grupo", edicionId, grupo.id],
    queryFn: () => listMuestrasByGrupo(edicionId, grupo.id),
    enabled: expanded,
  });

  const renameMutation = useMutation({
    mutationFn: (nombre: string) =>
      updateGrupo(edicionId, grupo.id, { nombre, bos_flight: grupo.bos_flight }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos", edicionId] });
    },
    onError: () => {
      toast.error("Error al renombrar el grupo.");
      setNombreDraft(grupo.nombre);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGrupo(edicionId, grupo.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos", edicionId] });
      toast.success("Grupo eliminado");
    },
    onError: (error) => {
      if (errorCode(error) === "GRUPO_CON_MUESTRAS") {
        toast.error("El grupo tiene muestras activas.");
      } else {
        toast.error("Error al eliminar el grupo.");
      }
    },
  });

  const moverMutation = useMutation({
    mutationFn: (params: { muestraId: string; grupoId: string }) =>
      moverMuestra(edicionId, params.muestraId, params.grupoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos", edicionId] });
      queryClient.invalidateQueries({ queryKey: ["muestras-sin-grupo", edicionId] });
      queryClient.invalidateQueries({ queryKey: ["muestras-grupo", edicionId] });
      toast.success("Muestra movida");
    },
    onError: () => toast.error("Error al mover la muestra."),
  });

  function commitNombre() {
    setEditingNombre(false);
    const trimmed = nombreDraft.trim();
    if (!trimmed || trimmed === grupo.nombre) {
      setNombreDraft(grupo.nombre);
      return;
    }
    renameMutation.mutate(trimmed);
  }

  function handleDelete() {
    if (window.confirm(`¿Eliminar el grupo "${grupo.nombre}"?`)) {
      deleteMutation.mutate();
    }
  }

  return (
    <Card padding="none">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="quiet"
            size="icon-xs"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Colapsar" : "Expandir"}
          >
            {expanded ? "▾" : "▸"}
          </Button>
          {editingNombre && !bloqueado ? (
            <Input
              type="text"
              autoFocus
              value={nombreDraft}
              onChange={(e) => setNombreDraft(e.target.value)}
              onBlur={commitNombre}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNombre();
                if (e.key === "Escape") {
                  setNombreDraft(grupo.nombre);
                  setEditingNombre(false);
                }
              }}
              className="h-8 w-48"
            />
          ) : (
            <button
              type="button"
              onClick={() => !bloqueado && setEditingNombre(true)}
              className="truncate text-sm font-semibold text-neutral-900 hover:underline disabled:no-underline"
              disabled={bloqueado}
            >
              {grupo.nombre}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">{cantRondasLabel(grupo.cant_rondas)}</Badge>
          <Badge variant="outline">{cantMuestrasLabel(grupo.cant_muestras)}</Badge>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-200 px-4 py-3">
          {muestrasLoading && (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          )}
          {!muestrasLoading && muestras?.length === 0 && (
            <EmptyState bare message="Este grupo no tiene muestras." />
          )}
          {!muestrasLoading && muestras && muestras.length > 0 && (
            <ul className="space-y-2">
              {muestras.map((m: MuestraDeGrupo) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-2 rounded-md border border-neutral-100 bg-neutral-50 p-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-500">
                      {m.estilo_codigo} · {m.estilo_nombre}
                    </p>
                    <p className="truncate text-sm text-neutral-900">{m.nombre_comercial}</p>
                  </div>
                  {!bloqueado && (
                    <MoverAGrupoSelect
                      label="Mover a grupo →"
                      grupos={grupos}
                      excludeGrupoId={grupo.id}
                      disabled={moverMutation.isPending}
                      onMover={(grupoId) =>
                        moverMutation.mutate({ muestraId: m.id, grupoId })
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!bloqueado && grupo.cant_muestras === 0 && (
        <div className="flex justify-end border-t border-neutral-200 px-4 py-2">
          <Button
            variant="destructive-outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            Eliminar grupo
          </Button>
        </div>
      )}
    </Card>
  );
}

// ─── Dialog "Nuevo grupo" ───────────────────────────────────────────────────

function NuevoGrupoDialog({
  open,
  onOpenChange,
  edicionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edicionId: string;
}) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [bosFlight, setBosFlight] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createGrupo(edicionId, { nombre: nombre.trim(), bos_flight: bosFlight.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos", edicionId] });
      close();
      toast.success("Grupo creado");
    },
    onError: () => setFormError("Error al crear el grupo."),
  });

  function close() {
    setNombre("");
    setBosFlight("");
    setFormError(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!nombre.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Nuevo grupo</DialogTitle>
        </DialogHeader>
        <form id="nuevo-grupo-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="g-nombre" className="text-sm font-medium text-neutral-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              id="g-nombre"
              type="text"
              placeholder="IPA"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="g-bos-flight" className="text-sm font-medium text-neutral-700">
              BOS Flight
            </label>
            <Input
              id="g-bos-flight"
              type="text"
              value={bosFlight}
              onChange={(e) => setBosFlight(e.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="nuevo-grupo-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Creando..." : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog "Confirmar auto-agrupar" ────────────────────────────────────────

function AutoagruparDialog({
  open,
  onOpenChange,
  edicionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edicionId: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => autoasignarGrupos(edicionId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["grupos", edicionId] });
      queryClient.invalidateQueries({ queryKey: ["muestras-sin-grupo", edicionId] });
      toast.success(`${result.grupos_creados} grupos creados, ${result.muestras_asignadas} muestras asignadas`);
      onOpenChange(false);
    },
    onError: (error) => {
      if (errorCode(error) === "TODAS_MUESTRAS_ASIGNADAS") {
        toast.success("Todas las muestras ya tienen grupo asignado.");
      } else {
        toast.error("Error al autoasignar grupos.");
      }
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Auto-agrupar muestras</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-neutral-600">
          Esta acción agrupará automáticamente todas las muestras sin grupo por estilo. Los
          grupos existentes no se modificarán. ¿Confirmás?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Agrupando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Panel de muestras sin grupo ────────────────────────────────────────────

function SinGrupoPanel({
  edicionId,
  grupos,
  bloqueado,
}: {
  edicionId: string;
  grupos: Grupo[];
  bloqueado: boolean;
}) {
  const queryClient = useQueryClient();

  const { data: muestras, isLoading } = useQuery({
    queryKey: ["muestras-sin-grupo", edicionId],
    queryFn: () => listMuestrasSinGrupo(edicionId),
  });

  const moverMutation = useMutation({
    mutationFn: (params: { muestraId: string; grupoId: string }) =>
      moverMuestra(edicionId, params.muestraId, params.grupoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos", edicionId] });
      queryClient.invalidateQueries({ queryKey: ["muestras-sin-grupo", edicionId] });
      queryClient.invalidateQueries({ queryKey: ["muestras-grupo", edicionId] });
      toast.success("Muestra asignada");
    },
    onError: () => toast.error("Error al asignar la muestra."),
  });

  return (
    <Card padding="none">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900">Sin grupo</h2>
        <Badge variant="outline">{muestras?.length ?? 0}</Badge>
      </div>
      <div className="p-4">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}
        {!isLoading && muestras?.length === 0 && (
          <p className="text-sm text-success-600">✓ Todas las muestras tienen grupo asignado.</p>
        )}
        {!isLoading && muestras && muestras.length > 0 && (
          <ul className="space-y-3">
            {muestras.map((m: MuestraSinGrupo) => (
              <li key={m.id} className="rounded-md border border-neutral-100 bg-neutral-50 p-2">
                <p className="truncate text-xs font-medium text-neutral-500">
                  {m.estilo_codigo} · {m.estilo_nombre}
                </p>
                <p className="truncate text-sm text-neutral-900">{m.nombre_comercial}</p>
                {!bloqueado && (
                  <div className="mt-2">
                    <MoverAGrupoSelect
                      label="Asignar a grupo →"
                      grupos={grupos}
                      disabled={moverMutation.isPending}
                      onMover={(grupoId) =>
                        moverMutation.mutate({ muestraId: m.id, grupoId })
                      }
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function GruposPage() {
  const { id } = useParams<{ id: string }>();
  const edicionId = id!;

  // Regla de bloqueo — se implementa en LLE-12. Por ahora siempre false.
  const bloqueado = false;

  const [nuevoGrupoOpen, setNuevoGrupoOpen] = useState(false);
  const [autoagruparOpen, setAutoagruparOpen] = useState(false);

  const { data: edicion, isLoading: edicionLoading } = useQuery({
    queryKey: ["edicion", edicionId],
    queryFn: () => getEdicion(edicionId),
    enabled: !!edicionId,
  });

  const { data: grupos, isLoading: gruposLoading } = useQuery({
    queryKey: ["grupos", edicionId],
    queryFn: () => listGrupos(edicionId),
    enabled: !!edicionId && edicion?.estado === "pre-cata",
  });

  if (edicionLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        backTo={`/admin/ediciones/${edicionId}`}
        backLabel="Edición"
        title="Agrupación de muestras"
      />

      {edicion && edicion.estado !== "pre-cata" ? (
        <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          Esta sección solo está disponible en estado pre-cata.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Grupos</h2>
              {!bloqueado && (
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={() => setAutoagruparOpen(true)}>
                    Auto-agrupar
                  </Button>
                  <Button size="sm" onClick={() => setNuevoGrupoOpen(true)}>
                    Nuevo grupo
                  </Button>
                </div>
              )}
            </div>

            {gruposLoading && (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}

            {!gruposLoading && grupos?.length === 0 && (
              <EmptyState message="No hay grupos creados. Usá Auto-agrupar o creá uno manualmente." />
            )}

            {!gruposLoading && grupos && grupos.length > 0 && (
              <div className="space-y-3">
                {grupos.map((g) => (
                  <GrupoCard
                    key={g.id}
                    grupo={g}
                    grupos={grupos}
                    edicionId={edicionId}
                    bloqueado={bloqueado}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <SinGrupoPanel edicionId={edicionId} grupos={grupos ?? []} bloqueado={bloqueado} />
          </div>
        </div>
      )}

      <NuevoGrupoDialog open={nuevoGrupoOpen} onOpenChange={setNuevoGrupoOpen} edicionId={edicionId} />
      <AutoagruparDialog open={autoagruparOpen} onOpenChange={setAutoagruparOpen} edicionId={edicionId} />
    </div>
  );
}
