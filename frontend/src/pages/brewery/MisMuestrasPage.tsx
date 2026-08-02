import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEdicionActivaCerveceria } from "@/hooks/useEdicionActivaCerveceria";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Mis Muestras</h1>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-red-500">
          No se pudieron cargar tus competencias.
        </div>
      )}

      {!isLoading && !isError && noHayNada && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-neutral-500">
          No hay competencias disponibles en este momento.
        </div>
      )}

      {!isLoading && !isError && !noHayNada && (
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              Mis competencias
            </h2>
            {ediciones.length === 0 && (
              <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-neutral-500">
                No estás inscripto en ninguna competencia activa.
              </div>
            )}
            {ediciones.length > 0 && (
              <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
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
              </div>
            )}
          </div>

          {(edicionesDisponibles?.length ?? 0) > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-neutral-900">
                Competencias disponibles
              </h2>
              <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
