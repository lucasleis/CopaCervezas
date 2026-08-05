import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listEdiciones } from "@/api/ediciones";

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
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Dashboard</h1>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Ediciones en cata</h2>

        {isLoading && <p className="text-sm text-neutral-500">Cargando...</p>}

        {isError && (
          <p className="text-sm text-red-500">No se pudieron cargar las ediciones.</p>
        )}

        {!isLoading && !isError && edicionesEnCata.length === 0 && (
          <p className="text-sm text-neutral-500">No hay ediciones en curso actualmente.</p>
        )}

        {!isLoading && !isError && edicionesEnCata.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
                  <th className="px-4 py-3 font-medium text-neutral-600">Nombre</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">Fecha de cata</th>
                </tr>
              </thead>
              <tbody>
                {edicionesEnCata.map((edicion) => (
                  <tr
                    key={edicion.id}
                    className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                    onClick={() => navigate(`/admin/cata/${edicion.id}`)}
                  >
                    <td className="px-4 py-3 text-neutral-900">{edicion.nombre}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatFecha(edicion.fecha_evento)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
