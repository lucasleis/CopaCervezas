import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listEstilosOrg, listEstilosCatalogo } from "@/api/estilos";
import type { Estilo } from "@/api/inscripcion";
import EstiloDialog from "@/components/admin/EstiloDialog";
import CamposDialog from "@/components/admin/CamposDialog";

export default function EstilosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [estiloEditando, setEstiloEditando] = useState<Estilo | null>(null);
  const [camposDialogOpen, setCamposDialogOpen] = useState(false);
  const [estiloCampos, setEstiloCampos] = useState<Estilo | null>(null);

  const { data: estilosOrg } = useQuery({
    queryKey: ["estilos-org"],
    queryFn: listEstilosOrg,
  });

  const { data: estilos, isLoading, isError } = useQuery({
    queryKey: ["estilos-catalogo"],
    queryFn: listEstilosCatalogo,
  });

  function handleCrear() {
    setEstiloEditando(null);
    setDialogOpen(true);
  }

  function handleEditar(estilo: Estilo) {
    setEstiloEditando(estilo);
    setDialogOpen(true);
  }

  function handleCampos(estilo: Estilo) {
    setEstiloCampos(estilo);
    setCamposDialogOpen(true);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Estilos</h1>
        <Button onClick={handleCrear}>Crear estilo</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-4 py-3 font-medium text-neutral-600">Código</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Nombre</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Requiere info adicional</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Campos definidos</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-10" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-10" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-7 w-24" />
                    </td>
                  </tr>
                ))}
              </>
            )}

            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-red-500">
                  No se pudieron cargar los estilos.
                </td>
              </tr>
            )}

            {!isLoading && !isError && estilos?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-neutral-500">
                  Todavía no creaste ningún estilo propio.
                </td>
              </tr>
            )}

            {!isLoading &&
              !isError &&
              estilos?.map((estilo) => (
                <tr
                  key={estilo.id}
                  className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                  onClick={() => estilosOrg?.some(e => e.id === estilo.id) && handleEditar(estilo)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-neutral-900">
                    {estilo.codigo}
                  </td>
                  <td className="px-4 py-3 text-neutral-900">{estilo.nombre}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {estilo.requiere_info_adicional ? "Sí" : "No"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {estilo.campos_info_adicional?.length ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {estilosOrg?.some(e => e.id === estilo.id) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCampos(estilo);
                        }}
                      >
                        Campos
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <EstiloDialog
        key={estiloEditando?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEstiloEditando(null);
        }}
        estilos={estilos ?? []}
        estiloExistente={estiloEditando}
      />

      {estiloCampos && (
        <CamposDialog
          key={estiloCampos.id}
          open={camposDialogOpen}
          onOpenChange={(open) => {
            setCamposDialogOpen(open);
            if (!open) setEstiloCampos(null);
          }}
          estilo={estiloCampos}
        />
      )}
    </div>
  );
}
