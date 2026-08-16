import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, MapPin, PackageCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
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
      navigate(`/mis-muestras/${edicionId}`, {
        replace: true,
        state: { max_muestras: detalle?.max_muestras_por_cerveceria ?? 3 },
      });
    },
    onError: () => {
      toast.error("No se pudo completar la inscripción. Intentá de nuevo.");
    },
  });

  if (!edicionId) {
    return null;
  }

  return (
    <PageContainer variant="public">
      <PageHeader
        variant="public"
        backTo="/mis-muestras"
        backLabel="Volver"
        title={isLoading ? <Skeleton className="h-9 w-72" /> : (detalle?.nombre ?? "Competencia")}
      />

      {isLoading && (
        <div className="space-y-10">
          <div className="space-y-3">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}

      {isError && (
        <Alert
          variant="danger"
          title="No se pudo cargar esta competencia"
          description="Puede que ya no exista, ya no esté en período de inscripción, o que ya estés inscripto."
        />
      )}

      {!isLoading && !isError && detalle && (
        <div className="space-y-10">
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

          {detalle.precios.length > 0 && (
            <section aria-labelledby="precios-heading">
              <h2
                id="precios-heading"
                className="mb-3 text-lg font-semibold text-neutral-900"
              >
                Precios
              </h2>
              <Card padding="none">
                <Table>
                  <TableHeader>
                    <TableRow>
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
              </Card>
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
              <Card padding="none">
                <ul className="divide-y divide-neutral-200">
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
              </Card>
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
    </PageContainer>
  );
}
