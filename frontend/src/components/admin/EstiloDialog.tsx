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
import { Input } from "@/components/ui/input";
import { createEstilo, updateEstilo } from "@/api/estilos";
import type { Estilo } from "@/api/inscripcion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estilos: Estilo[];
  estiloExistente?: Estilo | null;
}

interface Similar {
  id: string;
  codigo: string;
  nombre: string;
}

export default function EstiloDialog({
  open,
  onOpenChange,
  estilos,
  estiloExistente,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!estiloExistente;

  const [codigo, setCodigo] = useState(estiloExistente?.codigo ?? "");
  const [nombre, setNombre] = useState(estiloExistente?.nombre ?? "");
  const [subestiloDe, setSubestiloDe] = useState<string>(
    estiloExistente?.subestilo_de ?? ""
  );
  const [requiereInfoAdicional, setRequiereInfoAdicional] = useState(
    estiloExistente?.requiere_info_adicional ?? false
  );

  const [codigoError, setCodigoError] = useState<string | null>(null);
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<Similar | null>(null);
  const [busquedaSubestilo, setBusquedaSubestilo] = useState("");
  const [subestiloOpen, setSubestiloOpen] = useState(false);

  function resetForm() {
    setCodigo("");
    setNombre("");
    setSubestiloDe("");
    setRequiereInfoAdicional(false);
    setCodigoError(null);
    setNombreError(null);
    setSimilar(null);
    setBusquedaSubestilo("");
    setSubestiloOpen(false);
  }

  const mutation = useMutation({
    mutationFn: (confirmarSimilitud: boolean) => {
      if (isEdit) {
        return updateEstilo(estiloExistente!.id, {
          nombre: nombre.trim(),
          subestilo_de: subestiloDe || null,
          requiere_info_adicional: requiereInfoAdicional,
        });
      }
      return createEstilo({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        subestilo_de: subestiloDe || null,
        requiere_info_adicional: requiereInfoAdicional,
        confirmar_similitud: confirmarSimilitud,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estilos-org"] });
      queryClient.invalidateQueries({ queryKey: ["estilos-catalogo"] });
      toast.success(isEdit ? "Estilo actualizado" : "Estilo creado");
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        const body = error.response?.data as
          | {
              error?: {
                code: string;
                message: string;
                similares?: Similar[];
              };
            }
          | undefined;
        const code = body?.error?.code;

        if (error.response?.status === 409 && code === "ESTILO_SIMILAR_ENCONTRADO") {
          setSimilar(body?.error?.similares?.[0] ?? null);
          return;
        }
        if (error.response?.status === 409 && code === "CODIGO_DUPLICADO") {
          toast.error("Ya existe un estilo con ese código en tu organización");
          return;
        }
      }
      toast.error("No se pudo guardar el estilo. Intentá de nuevo.");
    },
  });

  function handleSubmit() {
    setCodigoError(null);
    setNombreError(null);
    setSimilar(null);

    let hasError = false;
    if (!isEdit && !codigo.trim()) {
      setCodigoError("El código es obligatorio.");
      hasError = true;
    }
    if (!nombre.trim()) {
      setNombreError("El nombre es obligatorio.");
      hasError = true;
    }
    if (hasError) return;

    mutation.mutate(false);
  }

  function handleConfirmarSimilitud() {
    mutation.mutate(true);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  const opcionesSubestilo = estilos.filter((e) => e.id !== estiloExistente?.id);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar estilo" : "Crear estilo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {similar && (
            <div className="space-y-2 rounded-lg border border-warning-200 bg-warning-50 p-3">
              <p className="text-sm text-warning-800">
                Ya existe un estilo similar: <strong>"{similar.nombre}"</strong> ({similar.codigo}).
                ¿Estás seguro de que es un estilo distinto?
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSimilar(null)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleConfirmarSimilitud} disabled={mutation.isPending}>
                  Sí, crear de todas formas
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="codigo" className="text-sm font-medium text-neutral-700">
              Código <span className="text-red-500">*</span>
            </label>
            <Input
              id="codigo"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value);
                if (codigoError) setCodigoError(null);
              }}
              disabled={isEdit}
              aria-invalid={!!codigoError}
              placeholder="Ej: 999F"
            />
            {isEdit && (
              <p className="text-xs text-neutral-500">El código no se puede modificar.</p>
            )}
            {codigoError && <p className="text-xs text-red-500">{codigoError}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nombre" className="text-sm font-medium text-neutral-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (nombreError) setNombreError(null);
              }}
              aria-invalid={!!nombreError}
              placeholder="Ej: Dorada Pampeana"
            />
            {nombreError && <p className="text-xs text-red-500">{nombreError}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Subestilo de</label>
            <Input
              placeholder="Buscar estilo..."
              value={busquedaSubestilo || (subestiloDe ? (opcionesSubestilo.find(e => e.id === subestiloDe) ? `${opcionesSubestilo.find(e => e.id === subestiloDe)!.codigo} - ${opcionesSubestilo.find(e => e.id === subestiloDe)!.nombre}` : "") : "")}
              onChange={(e) => {
                setBusquedaSubestilo(e.target.value);
                if (!e.target.value) setSubestiloDe("");
              }}
              onFocus={() => { setSubestiloOpen(true); setBusquedaSubestilo(""); }}
              onBlur={() => setTimeout(() => setSubestiloOpen(false), 150)}
            />
            {subestiloOpen && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-md">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50"
                  onClick={() => { setSubestiloDe(""); setBusquedaSubestilo(""); setSubestiloOpen(false); }}
                >
                  Ninguno
                </button>
                {opcionesSubestilo
                  .filter(e =>
                    `${e.codigo} ${e.nombre}`.toLowerCase().includes(busquedaSubestilo.toLowerCase())
                  )
                  .slice(0, 20)
                  .map(e => (
                    <button
                      key={e.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                      onClick={() => {
                        setSubestiloDe(e.id);
                        setBusquedaSubestilo("");
                        setSubestiloOpen(false);
                      }}
                    >
                      <span className="font-mono text-xs text-neutral-500 mr-2">{e.codigo}</span>
                      {e.nombre}
                    </button>
                  ))
                }
                {opcionesSubestilo.filter(e =>
                  `${e.codigo} ${e.nombre}`.toLowerCase().includes(busquedaSubestilo.toLowerCase())
                ).length === 0 && (
                  <div className="px-3 py-2 text-sm text-neutral-400">Sin resultados</div>
                )}
              </div>
            )}
            {subestiloDe && !busquedaSubestilo && (
              <button
                type="button"
                className="text-xs text-neutral-400 hover:text-red-500"
                onClick={() => setSubestiloDe("")}
              >
                × Quitar subestilo
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={requiereInfoAdicional}
                onChange={(e) => setRequiereInfoAdicional(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              ¿Requiere info adicional?
            </label>
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
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending || !!similar}>
            {mutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
