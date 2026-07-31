import { Fragment, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMuestrasEdicionAdmin,
  aprobarMuestra,
  updateEstadoPagoCerveceria,
  type MuestraAdmin,
  type EstadoPago,
} from "@/api/inscripcion";

type FiltroPago = "todos" | EstadoPago;
type FiltroAprobacion = "todos" | "pendiente" | "aprobada";

function AprobadaBadge({ aprobada }: { aprobada: boolean }) {
  return aprobada ? (
    <span className="inline-flex items-center rounded-full bg-success-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success-700">
      ✓ Aprobada
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-warning-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warning-700">
      Pendiente
    </span>
  );
}

function EstadoPagoBadge({ estado }: { estado: EstadoPago }) {
  return estado === "pagado" ? (
    <span className="inline-flex items-center rounded-full bg-success-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success-700">
      Pagado
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-neutral-600">
      Pendiente
    </span>
  );
}

export default function InscriptosPage() {
  const { id: edicionId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [filtroPago, setFiltroPago] = useState<FiltroPago>("todos");
  const [filtroAprobacion, setFiltroAprobacion] = useState<FiltroAprobacion>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: muestras, isLoading, isError } = useQuery({
    queryKey: [
      "muestras-admin",
      edicionId,
      filtroPago === "todos" ? undefined : filtroPago,
      filtroAprobacion === "todos" ? undefined : filtroAprobacion === "aprobada",
    ],
    queryFn: () =>
      getMuestrasEdicionAdmin(edicionId as string, {
        estado_pago: filtroPago === "todos" ? undefined : filtroPago,
        aprobada: filtroAprobacion === "todos" ? undefined : filtroAprobacion === "aprobada",
      }),
    enabled: !!edicionId,
  });

  const aprobarMutation = useMutation({
    mutationFn: ({ muestraId, aprobada }: { muestraId: string; aprobada: boolean }) =>
      aprobarMuestra(edicionId as string, muestraId, aprobada),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["muestras-admin", edicionId] });
      toast.success("Estado de aprobación actualizado");
    },
    onError: () => toast.error("No se pudo actualizar la aprobación."),
  });

  const estadoPagoMutation = useMutation({
    mutationFn: ({ cerveceriaId, estado }: { cerveceriaId: string; estado: EstadoPago }) =>
      updateEstadoPagoCerveceria(cerveceriaId, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["muestras-admin", edicionId] });
      toast.success("Estado de pago actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el estado de pago."),
  });

  function handleExportarMails() {
    if (!muestras || muestras.length === 0) {
      toast.error("No hay muestras para exportar.");
      return;
    }
    const emails = Array.from(new Set(muestras.map((m) => m.cerveceria_email))).join(", ");
    navigator.clipboard
      .writeText(emails)
      .then(() => toast.success("Emails copiados"))
      .catch(() => toast.error("No se pudo copiar al portapapeles."));
  }

  function handleToggleEstadoPago(muestra: MuestraAdmin) {
    const nuevoEstado: EstadoPago = muestra.estado_pago === "pagado" ? "pendiente" : "pagado";
    estadoPagoMutation.mutate({ cerveceriaId: muestra.cerveceria_id, estado: nuevoEstado });
  }

  function handleToggleAprobada(muestra: MuestraAdmin) {
    aprobarMutation.mutate({ muestraId: muestra.id, aprobada: !muestra.aprobada });
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Inscriptos</h1>
        <Button variant="outline" onClick={handleExportarMails}>
          Exportar mails
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-neutral-500">Estado de pago:</span>
          {(["todos", "pendiente", "pagado"] as FiltroPago[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFiltroPago(opt)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                filtroPago === opt
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-neutral-500">Aprobación:</span>
          {(["todos", "pendiente", "aprobada"] as FiltroAprobacion[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFiltroAprobacion(opt)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                filtroAprobacion === opt
                  ? "bg-primary text-primary-foreground"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-4 py-3 font-medium text-neutral-600">Cervecería</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Estilo</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Nombre comercial</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Aprobada</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Estado pago</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Activa</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="px-4 py-3" colSpan={7}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))}
              </>
            )}

            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-red-500">
                  No se pudieron cargar las muestras.
                </td>
              </tr>
            )}

            {!isLoading && !isError && muestras?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500">
                  No hay muestras que coincidan con los filtros.
                </td>
              </tr>
            )}

            {!isLoading &&
              !isError &&
              muestras?.map((muestra) => {
                const expanded = expandedId === muestra.id;
                const infoEntries = muestra.info_adicional
                  ? Object.entries(muestra.info_adicional)
                  : [];
                return (
                  <Fragment key={muestra.id}>
                    <tr
                      className={`border-b border-neutral-100 last:border-0 ${!muestra.activa ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3 text-neutral-900">{muestra.cerveceria_nombre}</td>
                      <td className="px-4 py-3 text-neutral-600">{muestra.estilo_nombre}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-left text-neutral-900 hover:underline"
                          onClick={() => setExpandedId(expanded ? null : muestra.id)}
                        >
                          {muestra.nombre_comercial}
                          {infoEntries.length > 0 && (
                            <span className="ml-1 text-xs text-neutral-400">
                              {expanded ? "▲" : "▼"}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <AprobadaBadge aprobada={muestra.aprobada} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleEstadoPago(muestra)}
                          disabled={estadoPagoMutation.isPending}
                        >
                          <EstadoPagoBadge estado={muestra.estado_pago} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {muestra.activa ? "Sí" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant={muestra.aprobada ? "outline" : "default"}
                          disabled={aprobarMutation.isPending}
                          onClick={() => handleToggleAprobada(muestra)}
                        >
                          {muestra.aprobada ? "Rechazar" : "Aprobar"}
                        </Button>
                      </td>
                    </tr>
                    {expanded && infoEntries.length > 0 && (
                      <tr className="border-b border-neutral-100 bg-neutral-50 last:border-0">
                        <td colSpan={7} className="px-4 py-2">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
                            {infoEntries.map(([key, value]) => (
                              <span key={key}>
                                <span className="font-medium">{key}:</span> {String(value)}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
