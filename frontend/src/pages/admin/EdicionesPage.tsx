import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    className: "bg-info-100 text-info-700",
  },
  "pre-cata": {
    label: "Pre-cata",
    className: "bg-warning-100 text-warning-700",
  },
  cata: {
    label: "Cata",
    className: "bg-primary-100 text-primary-700",
  },
  devolucion: {
    label: "Devolución",
    className: "bg-success-100 text-success-700",
  },
  cerrada: {
    label: "Cerrada",
    className: "bg-neutral-100 text-neutral-500",
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
      <PageHeader
        title="Ediciones"
        actions={
          <Button onClick={() => setModalOpen(true)}>Nueva edición</Button>
        }
      />

      {/* Tabla */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de cata</TableHead>
              <TableHead>Cierre de inscripción</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-7 w-14" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}

            {isError && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState bare variant="error" message="No se pudo cargar la lista de ediciones." />
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && ediciones?.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState bare message="No hay ediciones creadas todavía." />
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !isError &&
              ediciones?.map((edicion: Edicion) => (
                <TableRow key={edicion.id}>
                  <TableCell
                    className="cursor-pointer hover:text-primary font-medium"
                    onClick={() => navigate(`/admin/ediciones/${edicion.id}`)}
                  >
                    {edicion.nombre}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={edicion.estado} />
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {formatFecha(edicion.fecha_evento)}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {formatFecha(edicion.fecha_fin_inscripcion)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/admin/ediciones/${edicion.id}`)
                      }
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

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
