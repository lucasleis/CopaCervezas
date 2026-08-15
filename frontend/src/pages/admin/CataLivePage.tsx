import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getProgresoVuelosEdicion,
  getIncongruenciasVuelo,
  updateEvaluacionAdmin,
  type ProgresoVuelo,
} from "@/api/cata";
import { getAccessToken } from "@/api/client";

type AvanzaOption = "avanza" | "no_avanza" | "sin_definir";

interface EvaluacionCompletadaEvent {
  tipo: "evaluacion_completada";
  vuelo_id: string;
  muestra_id: string;
  juez_id: string;
  avanza: boolean | null;
  juez_completo_vuelo: boolean;
}

function wsUrl(edicionId: string): string {
  const base = import.meta.env.VITE_API_BASE_URL as string;
  const wsBase = base.replace(/^http/, "ws");
  const token = getAccessToken() ?? "";
  return `${wsBase}/api/v1/admin/ediciones/${edicionId}/cata/live?token=${encodeURIComponent(token)}`;
}

export default function CataLivePage() {
  const { edicion_id: edicionId } = useParams<{ edicion_id: string }>();

  const [progreso, setProgreso] = useState<ProgresoVuelo[]>([]);
  const [evaluacionId, setEvaluacionId] = useState<string | null>(null);

  const {
    data: progresoData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["progreso-vuelos", edicionId],
    queryFn: () => getProgresoVuelosEdicion(edicionId as string),
    enabled: !!edicionId,
  });

  useEffect(() => {
    if (progresoData) setProgreso(progresoData);
  }, [progresoData]);

  const { data: incongruencias, isLoading: incongruenciasLoading } = useQuery({
    queryKey: ["incongruencias", edicionId],
    queryFn: () => getIncongruenciasVuelo(edicionId as string),
    enabled: !!edicionId,
    refetchInterval: 30000,
  });

  // WebSocket: recibe eventos de evaluaciones completadas en tiempo real.
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!edicionId) return;

    const ws = new WebSocket(wsUrl(edicionId));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      let parsed: EvaluacionCompletadaEvent;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (parsed.tipo !== "evaluacion_completada") return;
      // El backend solo marca juez_completo_vuelo cuando la asignación del
      // juez para este vuelo pasó a 'completado' (evaluó todas sus muestras),
      // así que el contador ahora es exacto, no una aproximación.
      if (!parsed.juez_completo_vuelo) return;

      setProgreso((prev) =>
        prev.map((v) =>
          v.vuelo_id === parsed.vuelo_id
            ? {
                ...v,
                jueces_completados: Math.min(
                  v.jueces_completados + 1,
                  v.total_jueces
                ),
              }
            : v
        )
      );
    };

    ws.onerror = () => {
      // El navegador no expone detalle del error de WS; solo lo dejamos
      // pasar para no interrumpir el resto del panel.
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [edicionId]);

  const gruposOrdenados = useMemo(() => {
    const grupos = new Map<string, ProgresoVuelo[]>();
    progreso.forEach((v) => {
      const list = grupos.get(v.grupo_nombre) ?? [];
      list.push(v);
      grupos.set(v.grupo_nombre, list);
    });
    return Array.from(grupos.entries());
  }, [progreso]);

  return (
    <div className="p-8">
      <PageHeader
        backTo={`/admin/ediciones/${edicionId}`}
        backLabel="Edición"
        title="Panel de cata en vivo"
        subtitle="Progreso de los vuelos en tiempo real."
      />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState variant="error" message="No se pudo cargar el progreso de la cata." />
      )}

      {!isLoading && !isError && (
        <div className="space-y-6">
          {gruposOrdenados.map(([grupoNombre, vuelos]) => (
            <Card key={grupoNombre} padding="none" className="overflow-hidden">
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700">
                {grupoNombre}
              </div>
              <div className="divide-y divide-neutral-100">
                {vuelos.map((vuelo) => {
                  const completo = vuelo.jueces_completados === vuelo.total_jueces;
                  const pct =
                    vuelo.total_jueces > 0
                      ? Math.round((vuelo.jueces_completados / vuelo.total_jueces) * 100)
                      : 0;
                  return (
                    <div key={vuelo.vuelo_id} className="flex items-center gap-4 px-4 py-3">
                      <div className="w-32 shrink-0 text-sm text-neutral-600">
                        Ronda {vuelo.numero_ronda} · Vuelo {vuelo.orden}
                      </div>
                      <div className="w-28 shrink-0 text-xs uppercase tracking-wide text-neutral-500">
                        {vuelo.estado}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                          <div
                            className={`h-full rounded-full transition-all ${
                              completo ? "bg-success-500" : "bg-primary-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-24 shrink-0 text-right text-sm tabular-nums text-neutral-700">
                        {vuelo.jueces_completados} / {vuelo.total_jueces}
                        {completo && <span className="ml-1 text-success-600">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Incongruencias */}
      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">
          Incongruencias
        </h2>

        {incongruenciasLoading && <Skeleton className="h-16 w-full rounded-lg" />}

        {!incongruenciasLoading && incongruencias?.length === 0 && (
          <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-4 text-sm font-medium text-success-700">
            Sin incongruencias detectadas
          </div>
        )}

        {!incongruenciasLoading && incongruencias && incongruencias.length > 0 && (
          <Card padding="none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Vuelo</TableHead>
                  <TableHead>Avanza</TableHead>
                  <TableHead>No avanza</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incongruencias.map((inc) => (
                  <TableRow key={`${inc.vuelo_id}-${inc.muestra_id}`}>
                    <TableCell className="font-mono">{inc.cod_anonimo ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-neutral-500">
                      {inc.vuelo_id}
                    </TableCell>
                    <TableCell>{inc.avanza_true_count}</TableCell>
                    <TableCell>{inc.avanza_false_count}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEvaluacionId("")}
                      >
                        Corregir evaluación
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {evaluacionId !== null && edicionId && (
        <CorreccionDialog
          edicionId={edicionId}
          evaluacionIdInicial={evaluacionId}
          onOpenChange={(open) => {
            if (!open) setEvaluacionId(null);
          }}
        />
      )}
    </div>
  );
}

function CorreccionDialog({
  edicionId,
  evaluacionIdInicial,
  onOpenChange,
}: {
  edicionId: string;
  evaluacionIdInicial: string;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [evaluacionId, setEvaluacionId] = useState(evaluacionIdInicial);
  const [comentarioFinal, setComentarioFinal] = useState("");
  const [avanzaOption, setAvanzaOption] = useState<AvanzaOption>("sin_definir");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const avanza =
        avanzaOption === "avanza" ? true : avanzaOption === "no_avanza" ? false : null;
      return updateEvaluacionAdmin(edicionId, evaluacionId, {
        comentario_final: comentarioFinal.trim() ? comentarioFinal.trim() : null,
        avanza,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incongruencias", edicionId] });
      queryClient.invalidateQueries({ queryKey: ["progreso-vuelos", edicionId] });
      toast.success("Evaluación corregida");
      onOpenChange(false);
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 404) {
        setFormError("No se encontró esa evaluación para esta edición.");
        return;
      }
      toast.error("No se pudo corregir la evaluación. Intentá de nuevo.");
    },
  });

  function handleSubmit() {
    setFormError(null);
    if (!evaluacionId.trim()) {
      setFormError("Ingresá el ID de la evaluación.");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Corregir evaluación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="evaluacion-id" className="text-sm font-medium text-neutral-700">
              ID de la evaluación
            </label>
            <Input
              id="evaluacion-id"
              value={evaluacionId}
              onChange={(e) => setEvaluacionId(e.target.value)}
              placeholder="uuid de la evaluación"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="comentario-final-admin" className="text-sm font-medium text-neutral-700">
              Comentario Final
            </label>
            <Textarea
              id="comentario-final-admin"
              value={comentarioFinal}
              onChange={(e) => setComentarioFinal(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">Decisión</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={avanzaOption === "avanza" ? "default" : "outline"}
                onClick={() => setAvanzaOption("avanza")}
              >
                Avanza ✓
              </Button>
              <Button
                type="button"
                size="sm"
                variant={avanzaOption === "no_avanza" ? "default" : "outline"}
                onClick={() => setAvanzaOption("no_avanza")}
              >
                No avanza ✗
              </Button>
              <Button
                type="button"
                size="sm"
                variant={avanzaOption === "sin_definir" ? "default" : "outline"}
                onClick={() => setAvanzaOption("sin_definir")}
              >
                Sin definir
              </Button>
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : "Guardar corrección"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
