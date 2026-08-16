import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import {
  getEdicionesCerveceria,
  getEdicionesDisponiblesCerveceria,
  type EdicionCerveceria,
} from "@/api/inscripcion";

function estadoEnCursoLabel(estado: string): string {
  if (estado === "pre-cata") return "En preparación";
  if (estado === "cata") return "Cata en curso";
  return estado;
}

export default function MisMuestrasPage() {
  const navigate = useNavigate();

  const {
    data: ediciones,
    isLoading: edicionesLoading,
    isError: edicionesError,
  } = useQuery({
    queryKey: ["ediciones-cerveceria"],
    queryFn: getEdicionesCerveceria,
  });

  const {
    data: edicionesDisponibles,
    isLoading: disponiblesLoading,
    isError: disponiblesError,
  } = useQuery({
    queryKey: ["ediciones-disponibles-cerveceria"],
    queryFn: getEdicionesDisponiblesCerveceria,
  });

  function handleVerMuestras(edicionId: string) {
    navigate(`/mis-muestras/${edicionId}`);
  }

  function handleVerCompetencia(edicionId: string) {
    navigate(`/mis-muestras/competencia/${edicionId}`);
  }

  const isLoading = edicionesLoading || disponiblesLoading;
  const isError = edicionesError || disponiblesError;

  const edicionesActivas: EdicionCerveceria[] =
    ediciones?.filter((e) => e.estado === "inscripcion") ?? [];
  const edicionesEnCurso: EdicionCerveceria[] =
    ediciones?.filter((e) => e.estado === "pre-cata" || e.estado === "cata") ?? [];
  const edicionesFinalizadas: EdicionCerveceria[] =
    ediciones?.filter((e) => e.estado === "devolucion" || e.estado === "cerrada") ?? [];

  const noHayNada =
    !isLoading &&
    !isError &&
    edicionesActivas.length === 0 &&
    (edicionesDisponibles?.length ?? 0) === 0 &&
    edicionesEnCurso.length === 0 &&
    edicionesFinalizadas.length === 0;

  return (
    <PageContainer variant="public">
      <PageHeader variant="public" title="Mis Muestras" />

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && <EmptyState variant="error" message="No se pudieron cargar tus competencias." />}

      {!isLoading && !isError && noHayNada && (
        <EmptyState message="No hay competencias disponibles en este momento." />
      )}

      {!isLoading && !isError && !noHayNada && (
        <div className="space-y-8">
          {edicionesActivas.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Mis competencias
              </h2>
              <Card padding="none" className="divide-y divide-neutral-200">
                {edicionesActivas.map((edicion) => (
                  <div
                    key={edicion.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <p className="font-medium text-neutral-900">{edicion.nombre}</p>
                    <Button size="sm" onClick={() => handleVerMuestras(edicion.id)}>
                      Ver muestras
                    </Button>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {(edicionesDisponibles?.length ?? 0) > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Competencias disponibles
              </h2>
              <Card padding="none" className="divide-y divide-neutral-200">
                {edicionesDisponibles!.map((edicion) => (
                  <div
                    key={edicion.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <p className="font-medium text-neutral-900">{edicion.nombre}</p>
                    <Button size="sm" onClick={() => handleVerCompetencia(edicion.id)}>
                      Ver competencia
                    </Button>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {edicionesEnCurso.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                En curso
              </h2>
              <Card padding="none" className="divide-y divide-neutral-200">
                {edicionesEnCurso.map((edicion) => (
                  <div
                    key={edicion.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <p className="font-medium text-neutral-900">{edicion.nombre}</p>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      edicion.estado === "cata"
                        ? "bg-primary-100 text-primary-700"
                        : "bg-warning-100 text-warning-700"
                    )}>
                      {estadoEnCursoLabel(edicion.estado)}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {edicionesFinalizadas.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Finalizadas
              </h2>
              <Card padding="none" className="divide-y divide-neutral-200">
                {edicionesFinalizadas.map((edicion) => (
                  <div
                    key={edicion.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <p className="font-medium text-neutral-900">{edicion.nombre}</p>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-neutral-100 text-neutral-500">
                      Finalizada
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
