import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, CircleDashed, CircleSlash, PlusCircle } from "lucide-react";
import { useEdicionActivaCerveceria } from "@/hooks/useEdicionActivaCerveceria";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
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
      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500">
        <CircleSlash className="size-3.5" aria-hidden="true" />
        Inactiva
      </span>
    );
  }
  if (muestra.aprobada) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2.5 py-1 text-xs font-semibold text-success-700">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Aprobada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2.5 py-1 text-xs font-semibold text-warning-700">
      <CircleDashed className="size-3.5" aria-hidden="true" />
      Pendiente
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
    <PageContainer variant="public">
      <PageHeader
        variant="public"
        backTo="/mis-muestras"
        backLabel="Volver"
        title={titulo}
        subtitle={!isLoading && !isError && `${activasCount} de ${MAX_MUESTRAS} muestras`}
        actions={
          <Button onClick={handleNuevaMuestra} className="shrink-0">
            <PlusCircle className="size-4" aria-hidden="true" />
            Inscribir cerveza
          </Button>
        }
      />

      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              padding="none"
              className="flex w-full items-center justify-between gap-4 rounded-xl p-5"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="flex shrink-0 gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <div role="alert" className="rounded-xl border border-danger-100 bg-danger-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-danger-700">No se pudieron cargar tus muestras</p>
          <p className="mt-1 text-sm text-neutral-600">Intentá de nuevo en unos instantes.</p>
        </div>
      )}

      {!isLoading && !isError && muestras?.length === 0 && (
        <EmptyState
          message="No tenés cervezas inscriptas todavía."
          action={
            <Button onClick={handleNuevaMuestra}>
              <PlusCircle className="size-4" aria-hidden="true" />
              Inscribir cerveza
            </Button>
          }
          className="rounded-xl border-dashed border-neutral-300 py-16"
        />
      )}

      {!isLoading && !isError && muestras && muestras.length > 0 && (
        <div className="flex flex-col gap-4">
          {muestras.map((muestra) => (
            <Card
              key={muestra.id}
              padding="none"
              className="flex w-full flex-col gap-4 rounded-xl p-5 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-neutral-900">{muestra.nombre_comercial}</p>
                  <EstadoBadge muestra={muestra} />
                </div>
                <p className="text-sm text-neutral-500">
                  {muestra.estilo_codigo} — {muestra.estilo_nombre}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
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
                  variant="destructive-outline"
                  disabled={!muestra.activa || deleteMutation.isPending}
                  onClick={() => handleDelete(muestra)}
                >
                  Eliminar
                </Button>
              </div>
            </Card>
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
    </PageContainer>
  );
}
