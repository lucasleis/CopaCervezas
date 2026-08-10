import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listEdiciones } from "@/api/ediciones";
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

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: ediciones, isLoading, isError } = useQuery({
    queryKey: ["ediciones"],
    queryFn: listEdiciones,
  });

  const edicionesEnCata = (ediciones ?? []).filter((e) => e.estado === "cata");

  return (
    <div className="p-8">
      <PageHeader title="Dashboard" />

      <Card padding="md">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Ediciones en cata</h2>

        {isLoading && <p className="text-sm text-neutral-500">Cargando...</p>}

        {isError && (
          <EmptyState bare variant="error" message="No se pudieron cargar las ediciones." />
        )}

        {!isLoading && !isError && edicionesEnCata.length === 0 && (
          <EmptyState bare message="No hay ediciones en curso actualmente." />
        )}

        {!isLoading && !isError && edicionesEnCata.length > 0 && (
          <Card padding="none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha de cata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {edicionesEnCata.map((edicion) => (
                  <TableRow
                    key={edicion.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/cata/${edicion.id}`)}
                  >
                    <TableCell className="text-neutral-900">{edicion.nombre}</TableCell>
                    <TableCell className="text-neutral-600">
                      {formatFecha(edicion.fecha_evento)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </Card>
    </div>
  );
}
