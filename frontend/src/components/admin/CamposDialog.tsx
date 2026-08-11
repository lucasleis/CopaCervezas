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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateEstiloCampos } from "@/api/estilos";
import type { CampoDefinicion, Estilo } from "@/api/inscripcion";

const TIPO_LABEL: Record<CampoDefinicion["tipo"], string> = {
  text: "Texto",
  textarea: "Texto largo",
  boolean: "Sí/No",
};

const CLAVE_REGEX = /^[a-z][a-z0-9_]*$/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estilo: Estilo;
}

export default function CamposDialog({ open, onOpenChange, estilo }: Props) {
  const queryClient = useQueryClient();

  const [campos, setCampos] = useState<CampoDefinicion[]>(
    estilo.campos_info_adicional ?? []
  );
  const [clave, setClave] = useState("");
  const [label, setLabel] = useState("");
  const [tipo, setTipo] = useState<CampoDefinicion["tipo"]>("text");
  const [obligatorio, setObligatorio] = useState(false);
  const [claveError, setClaveError] = useState<string | null>(null);
  const [claveTouched, setClaveTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [campoAEliminar, setCampoAEliminar] = useState<string | null>(null);

  function resetNuevoCampo() {
    setClave("");
    setLabel("");
    setTipo("text");
    setObligatorio(false);
    setClaveError(null);
    setClaveTouched(false);
  }

  function handleAgregarCampo() {
    setClaveTouched(true);
    setClaveError(null);
    if (!clave.trim() || !CLAVE_REGEX.test(clave.trim())) {
      setClaveError("Solo minúsculas, números y guiones bajos. Debe empezar con una letra. Ej: color_base");
      return;
    }
    if (!label.trim()) {
      setClaveError("El label es obligatorio.");
      return;
    }
    if (campos.some((c) => c.clave === clave.trim())) {
      setClaveError("Ya existe un campo con esa clave.");
      return;
    }
    setCampos((prev) => [
      ...prev,
      { clave: clave.trim(), label: label.trim(), tipo, obligatorio },
    ]);
    resetNuevoCampo();
  }

  function confirmarEliminarCampo() {
    if (campoAEliminar) {
      setCampos((prev) => prev.filter((c) => c.clave !== campoAEliminar));
    }
    setCampoAEliminar(null);
  }

  const mutation = useMutation({
    mutationFn: () => updateEstiloCampos(estilo.id, campos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estilos-org"] });
      queryClient.invalidateQueries({ queryKey: ["estilos-catalogo"] });
      toast.success("Campos guardados");
      onOpenChange(false);
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        const body = error.response?.data as
          | { error?: { code: string; message: string } }
          | undefined;
        const code = body?.error?.code;
        if (code === "TIPO_CAMPO_INVALIDO") {
          setFormError("Uno o más campos tienen un tipo inválido.");
          return;
        }
        if (code === "CLAVE_CAMPO_INVALIDA") {
          setFormError("Uno o más campos tienen una clave inválida.");
          return;
        }
      }
      toast.error("No se pudieron guardar los campos. Intentá de nuevo.");
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      setCampos(estilo.campos_info_adicional ?? []);
      resetNuevoCampo();
      setFormError(null);
      setCampoAEliminar(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Campos de {estilo.codigo} - {estilo.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {campos.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
                    <th className="px-3 py-2 font-medium text-neutral-600">Clave</th>
                    <th className="px-3 py-2 font-medium text-neutral-600">Label</th>
                    <th className="px-3 py-2 font-medium text-neutral-600">Tipo</th>
                    <th className="px-3 py-2 font-medium text-neutral-600">Obligatorio</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {campos.map((campo) => (
                    <tr key={campo.clave} className="border-b border-neutral-100 last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{campo.clave}</td>
                      <td className="px-3 py-2">{campo.label}</td>
                      <td className="px-3 py-2">{TIPO_LABEL[campo.tipo]}</td>
                      <td className="px-3 py-2">{campo.obligatorio ? "Sí" : "No"}</td>
                      <td className="px-3 py-2 text-right">
                        {campoAEliminar === campo.clave ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-neutral-600">¿Confirmar?</span>
                            <Button
                              size="sm"
                              variant="destructive-solid"
                              onClick={confirmarEliminarCampo}
                            >
                              Eliminar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCampoAEliminar(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive-outline"
                            onClick={() => { console.log("eliminar click", campo.clave); setCampoAEliminar(campo.clave); }}
                          >
                            Eliminar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {campos.length === 0 && (
            <p className="text-sm italic text-neutral-400">Este estilo todavía no tiene campos definidos.</p>
          )}

          <div className="space-y-3 border-t border-neutral-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Agregar campo</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700">Clave</label>
                <Input
                  value={clave}
                  onChange={(e) => {
                    setClave(e.target.value);
                    setClaveTouched(true);
                  }}
                  onBlur={() => setClaveTouched(true)}
                  placeholder="ej: variedades_lupulo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700">Label</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="ej: Variedades de lúpulo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700">Tipo</label>
                <Select value={tipo} onValueChange={(v) => setTipo((v as CampoDefinicion["tipo"]) ?? "text")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{TIPO_LABEL[tipo]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="textarea">Texto largo</SelectItem>
                    <SelectItem value="boolean">Sí/No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={obligatorio}
                    onChange={(e) => setObligatorio(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Obligatorio
                </label>
              </div>
            </div>
            {claveError && claveTouched && <p className="text-xs text-red-500">{claveError}</p>}
            <Button type="button" size="sm" variant="outline" onClick={handleAgregarCampo}>
              Agregar campo
            </Button>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}
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
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
