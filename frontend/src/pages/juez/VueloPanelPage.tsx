import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getMuestrasVuelo,
  getEvaluacionesJuez,
  type MuestraVuelo,
  type Evaluacion,
} from "@/api/cata";
import { getMe } from "@/api/auth";
import { useEdicionActivaJuez } from "@/hooks/useEdicionActivaJuez";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";
import EvaluacionDialog from "@/components/juez/EvaluacionDialog";

export default function VueloPanelPage() {
  const { vuelo_id: vueloId } = useParams<{ vuelo_id: string }>();
  const [muestraSeleccionada, setMuestraSeleccionada] = useState<MuestraVuelo | null>(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { edicionId, isLoading: edicionLoading, isError: edicionError } = useEdicionActivaJuez();

  const {
    data: muestras,
    isLoading: muestrasLoading,
    isError: muestrasError,
  } = useQuery({
    queryKey: ["muestras-vuelo", edicionId, vueloId],
    queryFn: () => getMuestrasVuelo(edicionId as string, vueloId as string),
    enabled: !!vueloId && !!edicionId,
  });

  const { data: evaluaciones } = useQuery({
    queryKey: ["evaluaciones-juez", edicionId],
    queryFn: () => getEvaluacionesJuez(edicionId as string),
    enabled: !!edicionId,
  });

  const isLoading = edicionLoading || (!!edicionId && muestrasLoading);
  const isError = edicionError || muestrasError;

  const evaluacionPorMuestra = useMemo(() => {
    const map = new Map<string, Evaluacion>();
    evaluaciones?.forEach((ev) => map.set(ev.muestra_id, ev));
    return map;
  }, [evaluaciones]);

  const muestrasOrdenadas = useMemo(
    () => [...(muestras ?? [])].sort((a, b) => a.orden - b.orden),
    [muestras]
  );

  return (
    <div className="p-8">
      <PageHeader title="Muestras del vuelo" backTo="/cata" backLabel="Volver" />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding="sm" className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-7 w-24" />
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <EmptyState variant="error" message="No se pudieron cargar las muestras de este vuelo." />
      )}

      {!isLoading && !isError && muestrasOrdenadas.length === 0 && (
        <EmptyState message="Este vuelo no tiene muestras cargadas." />
      )}

      {!isLoading && !isError && muestrasOrdenadas.length > 0 && (
        <div className="space-y-3">
          {muestrasOrdenadas.map((muestra) => {
            const evaluacion = evaluacionPorMuestra.get(muestra.id);
            const evaluada = evaluacion != null && evaluacion.avanza !== null;
            const infoEntries = muestra.info_adicional
              ? Object.entries(muestra.info_adicional)
              : [];

            return (
              <Card
                key={muestra.id}
                padding="sm"
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-neutral-900">
                      {muestra.cod_anonimo}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {muestra.estilo_codigo} — {muestra.estilo_nombre}
                    </span>
                    {evaluada && (
                      <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success-700">
                        ✓ Evaluada
                      </span>
                    )}
                  </div>
                  {infoEntries.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                      {infoEntries.map(([key, value]) => (
                        <span key={key}>
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={evaluada ? "outline" : "default"}
                  disabled={evaluada}
                  onClick={() => setMuestraSeleccionada(muestra)}
                >
                  {evaluada ? "Ver evaluación" : "Evaluar"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {muestraSeleccionada && vueloId && edicionId && (
        <EvaluacionDialog
          open={!!muestraSeleccionada}
          onOpenChange={(open) => {
            if (!open) setMuestraSeleccionada(null);
          }}
          edicionId={edicionId}
          vueloId={vueloId}
          muestra={muestraSeleccionada}
          juezEmail={me?.email}
        />
      )}
    </div>
  );
}
