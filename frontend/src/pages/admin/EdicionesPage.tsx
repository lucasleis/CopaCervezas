import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listEdiciones,
  createEdicion,
  type Edicion,
  type EstadoEdicion,
} from "@/api/ediciones";

// Badge de estado específico para ediciones
const ESTADO_CONFIG: Record<
  EstadoEdicion,
  { label: string; className: string }
> = {
  config: {
    label: "Configuración",
    className: "bg-neutral-100 text-neutral-600",
  },
  inscripcion: {
    label: "Inscripción",
    className: "bg-blue-100 text-blue-700",
  },
  "pre-cata": {
    label: "Pre-cata",
    className: "bg-yellow-100 text-yellow-700",
  },
  cata: {
    label: "Cata",
    className: "bg-orange-100 text-orange-700",
  },
  devolucion: {
    label: "Devolución",
    className: "bg-purple-100 text-purple-700",
  },
  cerrada: {
    label: "Cerrada",
    className: "bg-green-100 text-green-700",
  },
};

function EstadoBadge({ estado }: { estado: EstadoEdicion }) {
  const config = ESTADO_CONFIG[estado] ?? {
    label: estado,
    className: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Convierte "YYYY-MM-DD" a ISO string para el backend; null si vacío
function dateInputToISO(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export default function EdicionesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [nombre, setNombre] = useState("");
  const [fechaCata, setFechaCata] = useState("");
  const [fechaInicioInscripcion, setFechaInicioInscripcion] = useState("");
  const [fechaCierreInscripcion, setFechaCierreInscripcion] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: ediciones, isLoading, isError } = useQuery({
    queryKey: ["ediciones"],
    queryFn: listEdiciones,
  });

  const mutation = useMutation({
    mutationFn: createEdicion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ediciones"] });
      setModalOpen(false);
      resetForm();
      toast.success("Edición creada correctamente");
    },
    onError: () => {
      setFormError("Ocurrió un error al crear la edición. Intentá de nuevo.");
    },
  });

  function resetForm() {
    setNombre("");
    setFechaCata("");
    setFechaInicioInscripcion("");
    setFechaCierreInscripcion("");
    setFormError(null);
  }

  function handleOpenChange(open: boolean) {
    setModalOpen(open);
    if (!open) resetForm();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!nombre.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    mutation.mutate({
      nombre: nombre.trim(),
      anio: fechaCata
        ? new Date(fechaCata).getFullYear()
        : new Date().getFullYear(),
      max_muestras_por_cerveceria: 3,
      fecha_evento: dateInputToISO(fechaCata),
      fecha_inicio_inscripcion: dateInputToISO(fechaInicioInscripcion),
      fecha_fin_inscripcion: dateInputToISO(fechaCierreInscripcion),
    });
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Ediciones</h1>
        <Button onClick={() => setModalOpen(true)}>Nueva edición</Button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-4 py-3 font-medium text-neutral-600">Nombre</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Estado</th>
              <th className="px-4 py-3 font-medium text-neutral-600">
                Fecha de cata
              </th>
              <th className="px-4 py-3 font-medium text-neutral-600">
                Cierre de inscripción
              </th>
              <th className="px-4 py-3 font-medium text-neutral-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-7 w-14" />
                    </td>
                  </tr>
                ))}
              </>
            )}

            {isError && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-red-500"
                >
                  No se pudo cargar la lista de ediciones.
                </td>
              </tr>
            )}

            {!isLoading && !isError && ediciones?.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-neutral-500"
                >
                  No hay ediciones creadas todavía.
                </td>
              </tr>
            )}

            {!isLoading &&
              !isError &&
              ediciones?.map((edicion: Edicion) => (
                <tr
                  key={edicion.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td
                    className="px-4 py-3 cursor-pointer hover:text-primary font-medium"
                    onClick={() => navigate(`/admin/ediciones/${edicion.id}`)}
                  >
                    {edicion.nombre}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={edicion.estado} />
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatFecha(edicion.fecha_evento)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatFecha(edicion.fecha_fin_inscripcion)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/admin/ediciones/${edicion.id}`)
                      }
                    >
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal de creación */}
      <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Nueva edición</DialogTitle>
          </DialogHeader>

          <form id="crear-edicion-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="nombre"
                className="text-sm font-medium text-neutral-700"
              >
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                id="nombre"
                type="text"
                placeholder="Copa Argentina de Cervezas 2028"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="fecha-cata"
                className="text-sm font-medium text-neutral-700"
              >
                Fecha de cata
              </label>
              <Input
                id="fecha-cata"
                type="date"
                value={fechaCata}
                onChange={(e) => setFechaCata(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="fecha-inicio-inscripcion"
                className="text-sm font-medium text-neutral-700"
              >
                Inicio de inscripción
              </label>
              <Input
                id="fecha-inicio-inscripcion"
                type="date"
                value={fechaInicioInscripcion}
                onChange={(e) => setFechaInicioInscripcion(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="fecha-cierre-inscripcion"
                className="text-sm font-medium text-neutral-700"
              >
                Cierre de inscripción
              </label>
              <Input
                id="fecha-cierre-inscripcion"
                type="date"
                value={fechaCierreInscripcion}
                onChange={(e) => setFechaCierreInscripcion(e.target.value)}
              />
            </div>

            {formError && (
              <p className="text-sm text-red-500">{formError}</p>
            )}
          </form>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="crear-edicion-form"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creando..." : "Crear edición"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
