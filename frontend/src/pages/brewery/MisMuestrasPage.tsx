import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEdicionActivaCerveceria } from "@/hooks/useEdicionActivaCerveceria";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteMuestra,
  getEdicionesDisponiblesCerveceria,
  getEstilosCatalogo,
  getMuestrasCerveceria,
  inscribirseEdicion,
  type Muestra,
} from "@/api/inscripcion";
import MuestraDialog from "@/components/brewery/MuestraDialog";

// TODO: no hay endpoint que exponga max_muestras_por_cerveceria a la
// cervecería todavía — se hardcodea hasta que exista.
const MAX_MUESTRAS = 3;

function EstadoBadge({ muestra }: { muestra: Muestra }) {
  if (!muestra.activa) {
    return (
      <span className="inline-flex items-center rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-neutral-600">
        Inactiva
      </span>
    );
  }
  if (muestra.aprobada) {
    return (
      <span className="inline-flex items-center rounded-full bg-success-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success-700">
        ✓ Aprobada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-warning-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warning-700">
      Pendiente de aprobación
    </span>
  );
}

export default function MisMuestrasPage() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [muestraEditando, setMuestraEditando] = useState<Muestra | null>(null);

  const {
    ediciones,
    edicionId,
    isLoading: edicionLoading,
    isError: edicionError,
  } = useEdicionActivaCerveceria();

  const edicionActiva = ediciones.find((e) => e.id === edicionId);
  const titulo = edicionActiva?.nombre ?? "Mis Muestras";

  const {
    data: edicionesDisponibles,
    isLoading: disponiblesLoading,
  } = useQuery({
    queryKey: ["ediciones-disponibles-cerveceria"],
    queryFn: getEdicionesDisponiblesCerveceria,
    enabled: !edicionLoading && !edicionError && !edicionId,
  });

  const inscribirseMutation = useMutation({
    mutationFn: (edicionId: string) => inscribirseEdicion(edicionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ediciones-activas-cerveceria"] });
      queryClient.invalidateQueries({ queryKey: ["ediciones-disponibles-cerveceria"] });
    },
    onError: () => {
      toast.error("No se pudo completar la inscripción. Intentá de nuevo.");
    },
  });

  function handleInscribirme(edicionId: string) {
    inscribirseMutation.mutate(edicionId);
  }

  const {
    data: muestras,
    isLoading: muestrasLoading,
    isError: muestrasError,
  } = useQuery({
    queryKey: ["muestras-cerveceria", edicionId],
    queryFn: () => getMuestrasCerveceria(edicionId as string),
    enabled: !!edicionId,
  });

  const { data: estilos } = useQuery({
    queryKey: ["estilos-catalogo"],
    queryFn: getEstilosCatalogo,
    enabled: !!edicionId,
  });

  const deleteMutation = useMutation({
    mutationFn: (muestraId: string) => deleteMuestra(edicionId as string, muestraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["muestras-cerveceria", edicionId] });
      toast.success("Muestra eliminada");
    },
    onError: () => {
      toast.error("No se pudo eliminar la muestra. Intentá de nuevo.");
    },
  });

  function handleDelete(muestra: Muestra) {
    if (!window.confirm(`¿Eliminar "${muestra.nombre_comercial}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    deleteMutation.mutate(muestra.id);
  }

  function handleEditar(muestra: Muestra) {
    setMuestraEditando(muestra);
    setDialogOpen(true);
  }

  function handleNuevaMuestra() {
    setMuestraEditando(null);
    setDialogOpen(true);
  }

  const isLoading = edicionLoading || (!!edicionId && muestrasLoading);
  const isError = edicionError || muestrasError;
  const activasCount = muestras?.filter((m) => m.activa).length ?? 0;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{titulo}</h1>
          {!isLoading && !isError && (
            <p className="text-sm text-neutral-500">
              {activasCount} de {MAX_MUESTRAS} muestras
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleNuevaMuestra} disabled={!edicionId}>
            Inscribir cerveza
          </Button>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {!edicionLoading && !edicionError && !edicionId && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">
            Competencias disponibles
          </h2>
          {disponiblesLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          )}
          {!disponiblesLoading && (edicionesDisponibles?.length ?? 0) === 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-neutral-500">
              No hay ninguna edición con inscripción abierta en este momento.
            </div>
          )}
          {!disponiblesLoading && edicionesDisponibles && edicionesDisponibles.length > 0 && (
            <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
              {edicionesDisponibles.map((edicion) => (
                <div
                  key={edicion.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <p className="font-medium text-neutral-900">{edicion.nombre}</p>
                  <Button
                    size="sm"
                    disabled={inscribirseMutation.isPending}
                    onClick={() => handleInscribirme(edicion.id)}
                  >
                    {inscribirseMutation.isPending && inscribirseMutation.variables === edicion.id
                      ? "Inscribiendo..."
                      : "Inscribirme"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 rounded-lg border border-neutral-200 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-red-500">
          No se pudieron cargar tus muestras.
        </div>
      )}

      {!isLoading && !isError && edicionId && muestras?.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-neutral-500">
          No tenés cervezas inscriptas todavía.
        </div>
      )}

      {!isLoading && !isError && muestras && muestras.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {muestras.map((muestra) => (
            <div
              key={muestra.id}
              className="flex flex-col gap-2.5 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-neutral-900">{muestra.nombre_comercial}</p>
                <EstadoBadge muestra={muestra} />
              </div>
              <p className="text-sm text-neutral-500">
                {muestra.estilo_codigo} — {muestra.estilo_nombre}
              </p>
              <div className="mt-auto flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!muestra.activa}
                  onClick={() => handleEditar(muestra)}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!muestra.activa || deleteMutation.isPending}
                  onClick={() => handleDelete(muestra)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {edicionId && (
        <MuestraDialog
          key={muestraEditando?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setMuestraEditando(null);
          }}
          edicionId={edicionId}
          estilos={estilos ?? []}
          muestraExistente={muestraEditando}
        />
      )}
    </div>
  );
}
