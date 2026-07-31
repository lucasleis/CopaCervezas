import { useMemo, useState } from "react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createMuestra,
  updateMuestra,
  type CreateMuestraInput,
  type Estilo,
  type Muestra,
} from "@/api/inscripcion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edicionId: string;
  estilos: Estilo[];
  muestraExistente?: Muestra | null;
}

type CampoValue = string | boolean;

function initialCamposValues(
  estilo: Estilo | undefined,
  infoAdicional: Record<string, unknown> | null | undefined
): Record<string, CampoValue> {
  if (!estilo?.campos_info_adicional) return {};
  const values: Record<string, CampoValue> = {};
  for (const campo of estilo.campos_info_adicional) {
    const raw = infoAdicional?.[campo.clave];
    values[campo.clave] = campo.tipo === "boolean" ? Boolean(raw) : (raw as string) ?? "";
  }
  return values;
}

export default function MuestraDialog({
  open,
  onOpenChange,
  edicionId,
  estilos,
  muestraExistente,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!muestraExistente;

  // Solo estilos "hoja" (sin hijos) se pueden inscribir directamente.
  const estilosHoja = useMemo(() => {
    const padresConHijos = new Set(
      estilos.filter((e) => e.subestilo_de).map((e) => e.subestilo_de as string)
    );
    return estilos.filter((e) => !padresConHijos.has(e.id));
  }, [estilos]);

  const estilosPropios = useMemo(
    () => estilosHoja.filter((e) => e.org_id !== null),
    [estilosHoja]
  );
  const estilosBjcp = useMemo(
    () => estilosHoja.filter((e) => e.org_id === null),
    [estilosHoja]
  );

  const estiloInicial = muestraExistente
    ? estilos.find((e) => e.codigo === muestraExistente.estilo_codigo)
    : undefined;

  const [selectedEstiloId, setSelectedEstiloId] = useState<string>(estiloInicial?.id ?? "");
  const [nombreComercial, setNombreComercial] = useState(
    muestraExistente?.nombre_comercial ?? ""
  );
  const [cuentaPremio, setCuentaPremio] = useState(
    muestraExistente?.cuenta_premio_mejor_cerveceria ?? false
  );
  const [comentariosAdicionales, setComentariosAdicionales] = useState(
    muestraExistente?.comentarios_adicionales ?? ""
  );
  const [camposValues, setCamposValues] = useState<Record<string, CampoValue>>(
    initialCamposValues(estiloInicial, muestraExistente?.info_adicional)
  );

  const [nombreComercialError, setNombreComercialError] = useState<string | null>(null);
  const [camposErrors, setCamposErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const selectedEstilo = estilosHoja.find((e) => e.id === selectedEstiloId);
  const camposDinamicos = selectedEstilo?.campos_info_adicional ?? [];

  function resetForm() {
    setSelectedEstiloId("");
    setNombreComercial("");
    setCuentaPremio(false);
    setComentariosAdicionales("");
    setCamposValues({});
    setNombreComercialError(null);
    setCamposErrors({});
    setFormError(null);
  }

  function handleEstiloChange(newId: string | null) {
    setSelectedEstiloId(newId ?? "");
    setCamposValues({});
    setCamposErrors({});
  }

  const mutation = useMutation({
    mutationFn: () => {
      const infoAdicional: Record<string, unknown> = {};
      for (const campo of camposDinamicos) {
        infoAdicional[campo.clave] = camposValues[campo.clave] ?? (campo.tipo === "boolean" ? false : "");
      }
      const input: CreateMuestraInput = {
        estilo_id: selectedEstiloId,
        nombre_comercial: nombreComercial.trim(),
        info_adicional: camposDinamicos.length > 0 ? infoAdicional : null,
        cuenta_premio_mejor_cerveceria: cuentaPremio,
        comentarios_adicionales: comentariosAdicionales.trim() ? comentariosAdicionales.trim() : null,
      };
      return isEdit
        ? updateMuestra(edicionId, muestraExistente!.id, input)
        : createMuestra(edicionId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["muestras-cerveceria", edicionId] });
      toast.success(isEdit ? "Muestra actualizada" : "Muestra inscripta correctamente");
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        const body = error.response?.data as
          | { error?: { code: string; message: string; faltantes?: string[] } }
          | undefined;
        const code = body?.error?.code;
        const message = body?.error?.message;

        if (error.response?.status === 422 && code === "MAX_MUESTRAS_ALCANZADO") {
          toast.error(message ?? "Se alcanzó el máximo de muestras permitidas");
          return;
        }
        if (error.response?.status === 422 && code === "INFO_ADICIONAL_INCOMPLETA") {
          const faltantes = body?.error?.faltantes ?? [];
          const errors: Record<string, string> = {};
          faltantes.forEach((clave) => {
            errors[clave] = "Este campo es obligatorio";
          });
          setCamposErrors(errors);
          return;
        }
        if (error.response?.status === 403 && code === "EDICION_NO_EN_INSCRIPCION") {
          toast.error("La inscripción no está abierta");
          return;
        }
        if (error.response?.status === 422 && code === "NOMBRE_COMERCIAL_REQUERIDO") {
          setNombreComercialError(message ?? "El nombre comercial es requerido");
          return;
        }
        if (error.response?.status === 422 && code === "ESTILO_NO_VALIDO") {
          setFormError(message ?? "El estilo seleccionado no es válido");
          return;
        }
      }
      toast.error("No se pudo guardar la muestra. Intentá de nuevo.");
    },
  });

  function handleSubmit() {
    setNombreComercialError(null);
    setCamposErrors({});
    setFormError(null);

    let hasError = false;

    if (!selectedEstiloId) {
      setFormError("Seleccioná un estilo.");
      hasError = true;
    }
    if (!nombreComercial.trim()) {
      setNombreComercialError("El nombre comercial es obligatorio.");
      hasError = true;
    }

    const errors: Record<string, string> = {};
    for (const campo of camposDinamicos) {
      if (!campo.obligatorio || campo.tipo === "boolean") continue;
      const value = camposValues[campo.clave];
      if (!value || (typeof value === "string" && !value.trim())) {
        errors[campo.clave] = "Este campo es obligatorio";
      }
    }
    if (Object.keys(errors).length > 0) {
      setCamposErrors(errors);
      hasError = true;
    }

    if (hasError) return;
    mutation.mutate();
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar muestra" : "Inscribir cerveza"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Estilo <span className="text-red-500">*</span>
            </label>
            <Select value={selectedEstiloId} onValueChange={handleEstiloChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná un estilo">
                  {(value: string | null) => {
                    const found = estilosHoja.find((e) => e.id === value);
                    return found ? `${found.codigo} - ${found.nombre}` : "Seleccioná un estilo";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {estilosPropios.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Estilos propios</SelectLabel>
                    {estilosPropios.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.codigo} - {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {estilosBjcp.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Catálogo BJCP</SelectLabel>
                    {estilosBjcp.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.codigo} - {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nombre-comercial" className="text-sm font-medium text-neutral-700">
              Nombre comercial <span className="text-red-500">*</span>
            </label>
            <Input
              id="nombre-comercial"
              value={nombreComercial}
              onChange={(e) => {
                setNombreComercial(e.target.value);
                if (nombreComercialError) setNombreComercialError(null);
              }}
              aria-invalid={!!nombreComercialError}
              placeholder="Ej: Mi IPA Premium"
            />
            {nombreComercialError && (
              <p className="text-xs text-red-500">{nombreComercialError}</p>
            )}
          </div>

          {camposDinamicos.length > 0 && (
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-medium text-neutral-500">
                Campos específicos del estilo
              </p>
              {camposDinamicos.map((campo) => (
                <div key={campo.clave} className="space-y-1.5">
                  {campo.tipo === "boolean" ? (
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                      <input
                        type="checkbox"
                        checked={Boolean(camposValues[campo.clave])}
                        onChange={(e) =>
                          setCamposValues((prev) => ({
                            ...prev,
                            [campo.clave]: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                      {campo.label}
                    </label>
                  ) : (
                    <>
                      <label className="text-sm font-medium text-neutral-700">
                        {campo.label}{" "}
                        {campo.obligatorio && <span className="text-red-500">*</span>}
                      </label>
                      {campo.tipo === "textarea" ? (
                        <textarea
                          value={(camposValues[campo.clave] as string) ?? ""}
                          onChange={(e) => {
                            setCamposValues((prev) => ({
                              ...prev,
                              [campo.clave]: e.target.value,
                            }));
                            if (camposErrors[campo.clave]) {
                              setCamposErrors((prev) => {
                                const { [campo.clave]: _removed, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          rows={2}
                          aria-invalid={!!camposErrors[campo.clave]}
                          className="w-full rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                        />
                      ) : (
                        <Input
                          value={(camposValues[campo.clave] as string) ?? ""}
                          onChange={(e) => {
                            setCamposValues((prev) => ({
                              ...prev,
                              [campo.clave]: e.target.value,
                            }));
                            if (camposErrors[campo.clave]) {
                              setCamposErrors((prev) => {
                                const { [campo.clave]: _removed, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          aria-invalid={!!camposErrors[campo.clave]}
                          className="bg-white"
                        />
                      )}
                      {camposErrors[campo.clave] && (
                        <p className="text-xs text-red-500">{camposErrors[campo.clave]}</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={cuentaPremio}
                onChange={(e) => setCuentaPremio(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              ¿Cuenta para el Premio a Mejor Cervecería?
            </label>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="comentarios-adicionales"
              className="text-sm font-medium text-neutral-700"
            >
              Comentarios adicionales
            </label>
            <p className="text-xs text-neutral-500">Solo visible para el organizador</p>
            <textarea
              id="comentarios-adicionales"
              value={comentariosAdicionales}
              onChange={(e) => setComentariosAdicionales(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
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
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Inscribir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
