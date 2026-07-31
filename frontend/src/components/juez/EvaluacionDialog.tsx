import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createEvaluacion, type MuestraVuelo } from "@/api/cata";
import { useAuth } from "@/contexts/AuthContext";

type AvanzaOption = "avanza" | "no_avanza" | "sin_definir";

const PUNTAJE_FIELDS: Array<{
  key: "calidad_tecnica" | "merito_estilistico" | "caracter_hedonico";
  label: string;
}> = [
  { key: "calidad_tecnica", label: "Calidad Técnica" },
  { key: "merito_estilistico", label: "Mérito Estilístico" },
  { key: "caracter_hedonico", label: "Carácter Hedónico" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edicionId: string;
  vueloId: string;
  muestra: MuestraVuelo;
  juezEmail?: string;
}

export default function EvaluacionDialog({
  open,
  onOpenChange,
  edicionId,
  vueloId,
  muestra,
  juezEmail,
}: Props) {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const [puntajes, setPuntajes] = useState<Record<string, number>>({
    calidad_tecnica: 5,
    merito_estilistico: 5,
    caracter_hedonico: 5,
  });
  const [comentarios, setComentarios] = useState("");
  const [comentarioFinal, setComentarioFinal] = useState("");
  const [avanzaOption, setAvanzaOption] = useState<AvanzaOption>("sin_definir");
  const [comentarioFinalError, setComentarioFinalError] = useState<string | null>(null);

  function resetForm() {
    setPuntajes({ calidad_tecnica: 5, merito_estilistico: 5, caracter_hedonico: 5 });
    setComentarios("");
    setComentarioFinal("");
    setAvanzaOption("sin_definir");
    setComentarioFinalError(null);
  }

  const mutation = useMutation({
    mutationFn: () => {
      const avanza =
        avanzaOption === "avanza" ? true : avanzaOption === "no_avanza" ? false : null;
      return createEvaluacion(edicionId, {
        vuelo_id: vueloId,
        muestra_id: muestra.id,
        puntajes,
        comentarios: comentarios.trim() ? comentarios.trim() : null,
        comentario_final: comentarioFinal.trim() ? comentarioFinal.trim() : null,
        avanza,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluaciones-juez", edicionId] });
      toast.success("Evaluación enviada correctamente");
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        const body = error.response?.data as
          | { error?: { code: string; message: string } }
          | undefined;
        const code = body?.error?.code;
        const message = body?.error?.message;

        if (error.response?.status === 409 && code === "EVALUACION_DUPLICADA") {
          toast.error("Esta muestra ya fue evaluada");
          return;
        }
        if (error.response?.status === 422 && code === "COMENTARIO_FINAL_REQUERIDO") {
          setComentarioFinalError(
            message ?? "El comentario final es requerido para evaluaciones finales"
          );
          return;
        }
        if (error.response?.status === 403 && code === "SIN_ASIGNACION") {
          toast.error("No tenés asignación para este vuelo");
          return;
        }
      }
      toast.error("No se pudo enviar la evaluación. Intentá de nuevo.");
    },
  });

  function handleSubmit() {
    setComentarioFinalError(null);

    if (avanzaOption !== "sin_definir" && !comentarioFinal.trim()) {
      setComentarioFinalError(
        "El comentario final es obligatorio cuando definís si la muestra avanza o no."
      );
      return;
    }

    mutation.mutate();
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  const infoAdicionalEntries = muestra.info_adicional
    ? Object.entries(muestra.info_adicional)
    : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Evaluar muestra {muestra.cod_anonimo}</DialogTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
            <span>
              Juez: <span className="font-medium text-neutral-700">{juezEmail ?? role}</span>
            </span>
            <span>
              Código anónimo:{" "}
              <span className="font-medium text-neutral-700">{muestra.cod_anonimo}</span>
            </span>
            <span>
              Estilo:{" "}
              <span className="font-medium text-neutral-700">
                {muestra.estilo_codigo} — {muestra.estilo_nombre}
              </span>
            </span>
          </div>
          {infoAdicionalEntries.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
              {infoAdicionalEntries.map(([key, value]) => (
                <span key={key}>
                  {key}: <span className="font-medium text-neutral-700">{String(value)}</span>
                </span>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Puntajes: layout horizontal para minimizar scroll */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PUNTAJE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label
                  htmlFor={field.key}
                  className="text-sm font-medium text-neutral-700"
                >
                  {field.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={field.key}
                    type="range"
                    min={1}
                    max={10}
                    value={puntajes[field.key]}
                    onChange={(e) =>
                      setPuntajes((prev) => ({
                        ...prev,
                        [field.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <span className="w-6 text-right text-sm tabular-nums text-neutral-700">
                    {puntajes[field.key]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Comentarios */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="comentarios"
                className="text-sm font-medium text-neutral-700"
              >
                Comentarios
              </label>
              <textarea
                id="comentarios"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Notas de cata (opcional)"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="comentario-final"
                className="text-sm font-medium text-neutral-700"
              >
                Comentario Final{" "}
                {avanzaOption !== "sin_definir" && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <textarea
                id="comentario-final"
                value={comentarioFinal}
                onChange={(e) => {
                  setComentarioFinal(e.target.value);
                  if (comentarioFinalError) setComentarioFinalError(null);
                }}
                rows={3}
                aria-invalid={!!comentarioFinalError}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                placeholder="Requerido si definís que avanza o no avanza"
              />
              {comentarioFinalError && (
                <p className="text-xs text-red-500">{comentarioFinalError}</p>
              )}
            </div>
          </div>

          {/* Decisión: avanza */}
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
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Enviando..." : "Enviar evaluación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
