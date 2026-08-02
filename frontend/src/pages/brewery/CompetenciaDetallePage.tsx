import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, MapPin, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getEdicionDisponibleDetalle,
  inscribirseEdicion,
} from "@/api/inscripcion";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function CompetenciaDetallePage() {
  const { edicion_id: edicionIdParam } = useParams<{ edicion_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const edicionId =
    edicionIdParam && UUID_REGEX.test(edicionIdParam) ? edicionIdParam : null;

  useEffect(() => {
    if (!edicionId) {
      navigate("/mis-muestras", { replace: true });
    }
  }, [edicionId, navigate]);

  const {
    data: detalle,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["edicion-disponible-detalle", edicionId],
    queryFn: () => getEdicionDisponibleDetalle(edicionId as string),
    enabled: !!edicionId,
  });

  const inscribirseMutation = useMutation({
    mutationFn: () => inscribirseEdicion(edicionId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ediciones-activas-cerveceria"] });
      queryClient.invalidateQueries({ queryKey: ["ediciones-disponibles-cerveceria"] });
      navigate("/mis-muestras");
    },
    onError: () => {
      toast.error("No se pudo completar la inscripción. Intentá de nuevo.");
    },
  });

  if (!edicionId) {
    return null;
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <button
          type="button"
          onClick={() => navigate("/mis-muestras")}
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver
        </button>

        {isLoading && (
          <div className="space-y-10">
            <div className="space-y-3">
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        )}

        {isError && (
          <div
            role="alert"
            className="rounded-lg border border-danger-100 bg-danger-50 px-6 py-12 text-center"
          >
            <p className="text-sm font-medium text-danger-700">
              No se pudo cargar esta competencia
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Puede que ya no exista, ya no esté en período de inscripción, o
              que ya estés inscripto.
            </p>
          </div>
        )}

        {!isLoading && !isError && detalle && (
          <div className="space-y-10">
            <header className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
                {detalle.nombre}
              </h1>
              <dl className="grid grid-cols-1 gap-1.5 text-sm text-neutral-500 md:grid-cols-3 md:gap-8 md:gap-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  <dt className="sr-only">Período de inscripción</dt>
                  <dd>
                    Inscripción: {formatFecha(detalle.fecha_inicio_inscripcion)} —{" "}
                    {formatFecha(detalle.fecha_fin_inscripcion)}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  <dt className="sr-only">Fecha del evento</dt>
                  <dd>Evento: {formatFecha(detalle.fecha_evento)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  <dt className="sr-only">Máximo de muestras</dt>
                  <dd>
                    Máximo {detalle.max_muestras_por_cerveceria} muestras por
                    cervecería
                  </dd>
                </div>
              </dl>
            </header>

            {detalle.precios.length > 0 && (
              <section aria-labelledby="precios-heading">
                <h2
                  id="precios-heading"
                  className="mb-3 text-lg font-semibold text-neutral-900"
                >
                  Precios
                </h2>
                <div className="overflow-hidden rounded-lg border border-neutral-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                        <TableHead>Nombre</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Válido desde</TableHead>
                        <TableHead>Válido hasta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalle.precios.map((precio) => (
                        <TableRow key={precio.id}>
                          <TableCell className="font-medium text-neutral-900">
                            {precio.nombre}
                          </TableCell>
                          <TableCell className="font-medium tabular-nums text-neutral-900">
                            ${precio.precio}
                          </TableCell>
                          <TableCell className="text-neutral-500">
                            {formatFecha(precio.fecha_desde)}
                          </TableCell>
                          <TableCell className="text-neutral-500">
                            {formatFecha(precio.fecha_hasta)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}

            {detalle.lugares.length > 0 && (
              <section aria-labelledby="lugares-heading">
                <h2
                  id="lugares-heading"
                  className="mb-3 text-lg font-semibold text-neutral-900"
                >
                  Lugares de entrega
                </h2>
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
                  {detalle.lugares.map((lugar) => (
                    <li key={lugar.id} className="flex gap-3 px-4 py-4">
                      <MapPin
                        className="mt-0.5 size-4 shrink-0 text-neutral-400"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900">{lugar.nombre}</p>
                        <p className="text-sm text-neutral-500">
                          {lugar.direccion}, {lugar.ciudad}, {lugar.provincia}
                        </p>
                        {lugar.horarios && (
                          <p className="text-sm text-neutral-500">{lugar.horarios}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                className="w-full max-w-xs"
                disabled={inscribirseMutation.isPending}
                onClick={() => inscribirseMutation.mutate()}
              >
                {inscribirseMutation.isPending ? "Inscribiendo..." : "Inscribirme"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
