import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEdicionActivaCerveceria } from "@/hooks/useEdicionActivaCerveceria";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteMuestra,
  getEstilosCatalogo,
  getMuestrasCerveceria,
  type Muestra,
} from "@/api/inscripcion";
import MuestraDialog from "@/components/brewery/MuestraDialog";

// TODO: no hay endpoint que exponga max_muestras_por_cerveceria a la
// cervecería todavía — se hardcodea hasta que exista.
const MAX_MUESTRAS = 3;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export default function MisMuestrasEdicionPage() {
  const { edicion_id: edicionIdParam } = useParams<{ edicion_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [muestraEditando, setMuestraEditando] = useState<Muestra | null>(null);

  const edicionId =
    edicionIdParam && UUID_REGEX.test(edicionIdParam) ? edicionIdParam : null;

  useEffect(() => {
    if (!edicionId) {
      navigate("/mis-muestras", { replace: true });
    }
  }, [edicionId, navigate]);

  const { ediciones } = useEdicionActivaCerveceria();
  const edicionActual = ediciones.find((e) => e.id === edicionId);
  const titulo = edicionActual?.nombre ?? "Mis Muestras";

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

  const isLoading = muestrasLoading;
  const isError = muestrasError;
  const activasCount = muestras?.filter((m) => m.activa).length ?? 0;

  if (!edicionId) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/mis-muestras")}
            className="mb-1 text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-semibold text-neutral-900">{titulo}</h1>
          {!isLoading && !isError && (
            <p className="text-sm text-neutral-500">
              {activasCount} de {MAX_MUESTRAS} muestras
            </p>
          )}
        </div>
        <Button onClick={handleNuevaMuestra}>Inscribir cerveza</Button>
      </div>

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

      {!isLoading && !isError && muestras?.length === 0 && (
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
    </div>
  );
}
