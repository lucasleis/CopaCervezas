import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="p-8">
      <button
        type="button"
        onClick={() => navigate("/mis-muestras")}
        className="mb-4 text-sm text-neutral-600 hover:text-neutral-900"
      >
        ← Volver
      </button>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-red-500">
          No se pudo cargar la competencia. Puede que ya no exista, ya no
          esté en inscripción, o que ya estés inscripto.
        </div>
      )}

      {!isLoading && !isError && detalle && (
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{detalle.nombre}</h1>
            <p className="text-sm text-neutral-500">
              Inscripción: {formatFecha(detalle.fecha_inicio_inscripcion)} —{" "}
              {formatFecha(detalle.fecha_fin_inscripcion)}
            </p>
            <p className="text-sm text-neutral-500">
              Evento: {formatFecha(detalle.fecha_evento)}
            </p>
            <p className="text-sm text-neutral-500">
              Máximo {detalle.max_muestras_por_cerveceria} muestras por cervecería
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">Precios</h2>
            {detalle.precios.length === 0 ? (
              <p className="text-sm text-neutral-500">No hay precios cargados.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-left text-neutral-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Nombre</th>
                      <th className="px-4 py-2 font-medium">Precio</th>
                      <th className="px-4 py-2 font-medium">Válido desde</th>
                      <th className="px-4 py-2 font-medium">Válido hasta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {detalle.precios.map((precio) => (
                      <tr key={precio.id}>
                        <td className="px-4 py-2 text-neutral-900">{precio.nombre}</td>
                        <td className="px-4 py-2 text-neutral-900">${precio.precio}</td>
                        <td className="px-4 py-2 text-neutral-500">
                          {formatFecha(precio.fecha_desde)}
                        </td>
                        <td className="px-4 py-2 text-neutral-500">
                          {formatFecha(precio.fecha_hasta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              Lugares de entrega
            </h2>
            {detalle.lugares.length === 0 ? (
              <p className="text-sm text-neutral-500">No hay lugares de entrega cargados.</p>
            ) : (
              <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
                {detalle.lugares.map((lugar) => (
                  <div key={lugar.id} className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{lugar.nombre}</p>
                    <p className="text-sm text-neutral-500">
                      {lugar.direccion}, {lugar.ciudad}, {lugar.provincia}
                    </p>
                    {lugar.horarios && (
                      <p className="text-sm text-neutral-500">{lugar.horarios}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              disabled={inscribirseMutation.isPending}
              onClick={() => inscribirseMutation.mutate()}
            >
              {inscribirseMutation.isPending ? "Inscribiendo..." : "Inscribirme"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
