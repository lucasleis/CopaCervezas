import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { listEstilosOrg, listEstilosCatalogo, deleteEstilo } from "@/api/estilos";
import type { Estilo } from "@/api/inscripcion";
import EstiloDialog from "@/components/admin/EstiloDialog";
import CamposDialog from "@/components/admin/CamposDialog";

// Fila de estilo reutilizable
function EstiloRow({
  estilo,
  isOrg,
  indentado,
  onEditar,
  onCampos,
  onEliminar,
}: {
  estilo: Estilo;
  isOrg: boolean;
  indentado: boolean;
  onEditar: (e: Estilo) => void;
  onCampos: (e: Estilo) => void;
  onEliminar: (e: Estilo) => void;
}) {
  return (
    <tr
      className={`border-b border-neutral-100 last:border-0 ${isOrg ? "cursor-pointer hover:bg-neutral-50" : ""} ${indentado ? "bg-neutral-50" : ""}`}
      onClick={() => isOrg && onEditar(estilo)}
    >
      <td className="px-4 py-2.5 font-mono text-xs font-medium text-neutral-400">
        {estilo.codigo}
      </td>
      <td className="px-4 py-2.5 text-neutral-900">
        {indentado ? (
          <span className="flex items-center gap-1.5 pl-6 text-sm font-medium text-neutral-900">
            <span className="text-neutral-300">↳</span>
            {estilo.nombre}
          </span>
        ) : (
          <span className="font-medium text-neutral-900">{estilo.nombre}</span>
        )}
      </td>
      <td className={`px-4 py-2.5 text-sm ${indentado ? "text-neutral-700" : "text-neutral-600"}`}>
        {estilo.requiere_info_adicional ? "Sí" : "No"}
      </td>
      <td className={`px-4 py-2.5 text-sm ${indentado ? "text-neutral-700" : "text-neutral-600"}`}>
        {estilo.campos_info_adicional?.length ?? 0}
      </td>
      <td className="px-4 py-2.5">
        {isOrg ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onCampos(estilo); }}>
              Campos
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); onEliminar(estilo); }}>
              Eliminar
            </Button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export default function EstilosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [estiloEditando, setEstiloEditando] = useState<Estilo | null>(null);
  const [camposDialogOpen, setCamposDialogOpen] = useState(false);
  const [estiloCampos, setEstiloCampos] = useState<Estilo | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [estiloAEliminar, setEstiloAEliminar] = useState<Estilo | null>(null);

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEstilo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estilos-org"] });
      queryClient.invalidateQueries({ queryKey: ["estilos-catalogo"] });
      toast.success("Estilo eliminado");
      setEstiloAEliminar(null);
    },
    onError: () => toast.error("No se pudo eliminar el estilo."),
  });

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

  const orgIds = new Set(estilosOrg?.map(e => e.id) ?? []);

  // Vista árbol: padres con sus hijos intercalados
  function buildTree(todos: Estilo[]): { estilo: Estilo; indentado: boolean }[] {
    const padres = todos.filter(e => !e.subestilo_de);
    const hijosPorPadre = new Map<string, Estilo[]>();
    for (const e of todos) {
      if (e.subestilo_de) {
        if (!hijosPorPadre.has(e.subestilo_de)) hijosPorPadre.set(e.subestilo_de, []);
        hijosPorPadre.get(e.subestilo_de)!.push(e);
      }
    }
    const result: { estilo: Estilo; indentado: boolean }[] = [];
    for (const padre of padres) {
      result.push({ estilo: padre, indentado: false });
      const hijos = hijosPorPadre.get(padre.id) ?? [];
      for (const hijo of hijos) {
        result.push({ estilo: hijo, indentado: true });
      }
    }
    // Agregar huérfanos (hijos cuyo padre no está en la lista)
    const enArbol = new Set(result.map(r => r.estilo.id));
    for (const e of todos) {
      if (!enArbol.has(e.id)) result.push({ estilo: e, indentado: false });
    }
    return result;
  }

  const hayBusqueda = busqueda.trim().length > 0;

  const filas = (() => {
    if (!hayBusqueda) return buildTree(estilos ?? []);
    const todos = estilos ?? [];
    const busquedaLower = busqueda.toLowerCase();
    // IDs que matchean directamente
    const matchIds = new Set(
      todos.filter(e => `${e.codigo} ${e.nombre}`.toLowerCase().includes(busquedaLower)).map(e => e.id)
    );
    // Agregar padres de los que matchean
    const idsPadres = new Set<string>();
    for (const e of todos) {
      if (matchIds.has(e.id) && e.subestilo_de) idsPadres.add(e.subestilo_de);
    }
    // Agregar hijos de los padres que matchean
    const idsHijos = new Set<string>();
    for (const e of todos) {
      if (e.subestilo_de && matchIds.has(e.subestilo_de)) idsHijos.add(e.id);
    }
    const idsVisibles = new Set([...matchIds, ...idsPadres, ...idsHijos]);
    return buildTree(todos.filter(e => idsVisibles.has(e.id)));
  })();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Estilos</h1>
        <Button onClick={handleCrear}>Crear estilo</Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por código o nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-600">Código</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-600">Nombre</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-600">Requiere info adicional</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-600">Campos definidos</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-7 w-24" /></td>
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

            {!isLoading && !isError && filas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-neutral-500">
                  {hayBusqueda ? "No se encontraron estilos." : "No hay estilos cargados."}
                </td>
              </tr>
            )}

            {!isLoading && !isError && filas.map(({ estilo, indentado }) => (
              <EstiloRow
                key={estilo.id}
                estilo={estilo}
                isOrg={orgIds.has(estilo.id)}
                indentado={indentado}
                onEditar={handleEditar}
                onCampos={handleCampos}
                onEliminar={setEstiloAEliminar}
              />
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

      <Dialog open={!!estiloAEliminar} onOpenChange={(open) => { if (!open) setEstiloAEliminar(null); }}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar estilo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-700 leading-relaxed">
            Vas a eliminar <span className="font-semibold">"{estiloAEliminar?.nombre}"</span> ({estiloAEliminar?.codigo}). Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstiloAEliminar(null)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
              onClick={() => estiloAEliminar && deleteMutation.mutate(estiloAEliminar.id)}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
