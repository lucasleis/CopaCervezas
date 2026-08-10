import { Fragment, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
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

interface ColorDropdownOption<T extends string> {
  value: T;
  label: string;
  className: string;
  hoverClassName: string;
}

interface ColorDropdownProps<T extends string> {
  value: T;
  options: ColorDropdownOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

function ColorDropdown<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: ColorDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 rounded-md border border-neutral-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${
          current?.className ?? ""
        }`}
      >
        {current?.label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 min-w-full overflow-hidden rounded-md border border-neutral-200 bg-white shadow-md">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`block w-full cursor-pointer whitespace-nowrap px-2 py-1 text-left text-sm ${opt.className} ${opt.hoverClassName}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
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

  function handleChangeEstadoPago(muestra: MuestraAdmin, nuevoEstado: EstadoPago) {
    estadoPagoMutation.mutate({ cerveceriaId: muestra.cerveceria_id, estado: nuevoEstado });
  }

  function handleChangeAprobada(muestra: MuestraAdmin, aprobada: boolean) {
    aprobarMutation.mutate({ muestraId: muestra.id, aprobada });
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
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="px-4 py-3" colSpan={6}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))}
              </>
            )}

            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-red-500">
                  No se pudieron cargar las muestras.
                </td>
              </tr>
            )}

            {!isLoading && !isError && muestras?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-neutral-500">
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
                        <ColorDropdown
                          value={muestra.aprobada ? "true" : "false"}
                          options={[
                            { value: "false", label: "Pendiente", className: "bg-warning-100 text-warning-800", hoverClassName: "hover:bg-warning-200" },
                            { value: "true", label: "Aprobada", className: "bg-success-100 text-success-800", hoverClassName: "hover:bg-success-200" },
                          ]}
                          onChange={(v) => handleChangeAprobada(muestra, v === "true")}
                          disabled={aprobarMutation.isPending}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ColorDropdown
                          value={muestra.estado_pago}
                          options={[
                            { value: "pendiente", label: "Pendiente", className: "bg-neutral-100 text-neutral-600", hoverClassName: "hover:bg-neutral-200" },
                            { value: "pagado", label: "Pagado", className: "bg-success-100 text-success-800", hoverClassName: "hover:bg-success-200" },
                          ]}
                          onChange={(v) => handleChangeEstadoPago(muestra, v as EstadoPago)}
                          disabled={estadoPagoMutation.isPending}
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {muestra.activa ? "Sí" : "No"}
                      </td>
                    </tr>
                    {expanded && infoEntries.length > 0 && (
                      <tr className="border-b border-neutral-100 bg-neutral-50 last:border-0">
                        <td colSpan={6} className="px-4 py-2">
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
