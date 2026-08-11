import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEdicionActivaCerveceria } from "@/hooks/useEdicionActivaCerveceria";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { getEdicionesDisponiblesCerveceria } from "@/api/inscripcion";

export default function MisMuestrasPage() {
  const navigate = useNavigate();

  const {
    ediciones,
    isLoading: edicionesLoading,
    isError: edicionesError,
  } = useEdicionActivaCerveceria();

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
  const noHayNada =
    !isLoading &&
    !isError &&
    ediciones.length === 0 &&
    (edicionesDisponibles?.length ?? 0) === 0;

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
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              Mis competencias
            </h2>
            {ediciones.length === 0 && (
              <EmptyState message="No estás inscripto en ninguna competencia activa." />
            )}
            {ediciones.length > 0 && (
              <Card padding="none" className="divide-y divide-neutral-200">
                {ediciones.map((edicion) => (
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
            )}
          </div>

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
        </div>
      )}
    </PageContainer>
  );
}
