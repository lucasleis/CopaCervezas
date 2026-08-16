import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listEdiciones, type Edicion, type EstadoEdicion } from "@/api/ediciones";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

const ESTADO_CONFIG: Record<EstadoEdicion, { label: string; className: string }> = {
  config:      { label: "Configuración", className: "bg-neutral-100 text-neutral-600" },
  inscripcion: { label: "Inscripción",   className: "bg-info-100 text-info-700" },
  "pre-cata":  { label: "Pre-cata",      className: "bg-warning-100 text-warning-700" },
  cata:        { label: "Cata",          className: "bg-primary-100 text-primary-700" },
  devolucion:  { label: "Devolución",    className: "bg-success-100 text-success-700" },
  cerrada:     { label: "Cerrada",       className: "bg-neutral-100 text-neutral-500" },
};

function EstadoBadge({ estado }: { estado: EstadoEdicion }) {
  const config = ESTADO_CONFIG[estado];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${config.className}`}>
      {config.label}
    </span>
  );
}

const URGENCIA: Record<EstadoEdicion, number> = {
  cata:        0,
  "pre-cata":  1,
  inscripcion: 2,
  config:      3,
  devolucion:  4,
  cerrada:     5,
};
const ESTADOS_RECIENTES: EstadoEdicion[] = ["devolucion", "cerrada"];

function accionEdicion(edicion: Edicion): { label: string; path: string } {
  if (edicion.estado === "cata") return { label: "Panel en vivo →", path: `/admin/cata/${edicion.id}` };
  if (edicion.estado === "pre-cata") return { label: "Gestionar grupos →", path: `/admin/ediciones/${edicion.id}/grupos` };
  return { label: "Ver edición →", path: `/admin/ediciones/${edicion.id}` };
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: ediciones, isLoading, isError } = useQuery({
    queryKey: ["ediciones"],
    queryFn: listEdiciones,
  });

  const activas = (ediciones ?? [])
    .filter((e) => ["config", "inscripcion", "pre-cata", "cata"].includes(e.estado))
    .sort((a, b) => URGENCIA[a.estado] - URGENCIA[b.estado]);
  const recientes = (ediciones ?? []).filter((e) => ESTADOS_RECIENTES.includes(e.estado));

  return (
    <PageContainer>
      <PageHeader title="Dashboard" />

      <div className="space-y-6">

        {/* Sección 1: Ediciones activas */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-base font-semibold text-neutral-900">Ediciones activas</h2>
          </div>

          {isLoading && (
            <div className="divide-y divide-neutral-100">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="px-6 py-4">
              <EmptyState bare variant="error" message="No se pudieron cargar las ediciones." />
            </div>
          )}

          {!isLoading && !isError && activas.length === 0 && (
            <div className="px-6 py-4">
              <EmptyState bare message="No hay ediciones activas." />
            </div>
          )}

          {!isLoading && !isError && activas.length > 0 && (
            <div className="divide-y divide-neutral-100">
              {activas.map((edicion) => {
                const accion = accionEdicion(edicion);
                return (
                  <div key={edicion.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-neutral-900">{edicion.nombre}</p>
                        <EstadoBadge estado={edicion.estado} />
                      </div>
                      <p className="text-sm text-neutral-500">
                        Cata: {formatFecha(edicion.fecha_evento)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => navigate(accion.path)}
                    >
                      {accion.label}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Sección 2: Ediciones recientes — solo si hay */}
        {!isLoading && !isError && recientes.length > 0 && (
          <Card padding="none">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h2 className="text-base font-semibold text-neutral-900">Ediciones recientes</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de cata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recientes.map((edicion) => (
                  <TableRow
                    key={edicion.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/ediciones/${edicion.id}`)}
                  >
                    <TableCell className="font-medium text-neutral-900">{edicion.nombre}</TableCell>
                    <TableCell><EstadoBadge estado={edicion.estado} /></TableCell>
                    <TableCell className="text-neutral-500">{formatFecha(edicion.fecha_evento)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

      </div>
    </PageContainer>
  );
}
