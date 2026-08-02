import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Info, X } from "lucide-react";
import {
  getVuelosJuez,
  getMuestrasVuelo,
  getEvaluacionesJuez,
  type MuestraVuelo,
  type Evaluacion,
} from "@/api/cata";
import { getMe } from "@/api/auth";
import { useEdicionActivaJuez } from "@/hooks/useEdicionActivaJuez";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import EvaluacionForm from "@/components/juez/EvaluacionForm";

export default function VueloEvaluacionPage() {
  const { vuelo_id: vueloId } = useParams<{ vuelo_id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!vueloId) {
      navigate("/cata", { replace: true });
    }
  }, [vueloId, navigate]);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { edicionId, isLoading: edicionLoading, isError: edicionError } = useEdicionActivaJuez();

  const { data: vuelos } = useQuery({
    queryKey: ["vuelos-juez", edicionId],
    queryFn: () => getVuelosJuez(edicionId as string),
    enabled: !!edicionId,
  });
  const vuelo = vuelos?.find((v) => v.id === vueloId);

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

  function esEvaluada(muestra: MuestraVuelo) {
    const evaluacion = evaluacionPorMuestra.get(muestra.id);
    return evaluacion != null && evaluacion.avanza !== null;
  }

  const muestrasOrdenadas = useMemo(
    () => [...(muestras ?? [])].sort((a, b) => a.orden - b.orden),
    [muestras]
  );

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);

  useEffect(() => {
    if (activeTab !== null) return;
    if (muestrasOrdenadas.length === 0 || evaluaciones === undefined) return;
    const primeraPendiente = muestrasOrdenadas.find((m) => !esEvaluada(m));
    setActiveTab((primeraPendiente ?? muestrasOrdenadas[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muestrasOrdenadas, evaluaciones, activeTab]);

  function handleEvaluacionSuccess(muestraActualId: string) {
    const siguientePendiente = muestrasOrdenadas.find(
      (m) => m.id !== muestraActualId && !esEvaluada(m)
    );
    if (siguientePendiente) {
      setActiveTab(siguientePendiente.id);
    }
  }

  if (!vueloId) {
    return null;
  }

  const mostrarCompletado =
    muestrasOrdenadas.length > 0 && muestrasOrdenadas.every((m) => esEvaluada(m));

  return (
    <div className="p-8">
      {bannerVisible && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm text-primary-700">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            Para mejor experiencia, usá pantalla completa (F11)
          </span>
          <button
            type="button"
            onClick={() => setBannerVisible(false)}
            aria-label="Cerrar aviso"
            className="shrink-0 rounded p-0.5 text-primary-700 hover:bg-primary-100"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/cata")}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver
        </Button>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
          {vuelo ? `${vuelo.grupo_nombre} — Vuelo ${vuelo.orden}` : "Vuelo"}
        </h1>
        {vuelo && (
          <p className="text-sm text-neutral-500">
            Ronda {vuelo.numero_ronda} de {vuelo.cant_rondas}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-7 w-16 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-red-500">
          No se pudieron cargar las muestras de este vuelo.
        </div>
      )}

      {!isLoading && !isError && muestrasOrdenadas.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-neutral-500">
          Este vuelo no tiene muestras cargadas.
        </div>
      )}

      {!isLoading && !isError && muestrasOrdenadas.length > 0 && mostrarCompletado && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-16 text-center">
          <CheckCircle2 className="size-10 text-success-600" aria-hidden="true" />
          <p className="text-lg font-semibold text-neutral-900">Vuelo completado</p>
          <p className="text-sm text-neutral-500">
            Evaluaste todas las muestras de este vuelo.
          </p>
          <Button onClick={() => navigate("/cata")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver a mis vuelos
          </Button>
        </div>
      )}

      {!isLoading &&
        !isError &&
        muestrasOrdenadas.length > 0 &&
        !mostrarCompletado &&
        activeTab && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
            <TabsList>
              {muestrasOrdenadas.map((muestra) => {
                const completada = esEvaluada(muestra);
                return (
                  <TabsTab key={muestra.id} value={muestra.id}>
                    {completada && (
                      <CheckCircle2
                        className="size-3.5 text-success-600"
                        aria-hidden="true"
                      />
                    )}
                    {muestra.cod_anonimo ?? `Muestra ${muestra.orden}`}
                  </TabsTab>
                );
              })}
            </TabsList>
            {muestrasOrdenadas.map((muestra) => (
              <TabsPanel key={muestra.id} value={muestra.id} className="pt-4">
                {edicionId && (
                  <EvaluacionForm
                    edicionId={edicionId}
                    vueloId={vueloId}
                    muestra={muestra}
                    juezEmail={me?.email}
                    onSuccess={() => handleEvaluacionSuccess(muestra.id)}
                  />
                )}
              </TabsPanel>
            ))}
          </Tabs>
        )}
    </div>
  );
}
