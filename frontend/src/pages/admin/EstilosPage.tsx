import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
    <TableRow
      className={`${isOrg ? "cursor-pointer" : ""} ${indentado ? "bg-neutral-50 hover:bg-neutral-50" : ""}`}
      onClick={() => isOrg && onEditar(estilo)}
    >
      <TableCell className="font-mono text-xs font-medium text-neutral-400">
        {estilo.codigo}
      </TableCell>
      <TableCell className="text-neutral-900">
        {indentado ? (
          <span className="flex items-center gap-1.5 pl-6 text-sm font-medium text-neutral-900">
            <span className="text-neutral-300">↳</span>
            {estilo.nombre}
          </span>
        ) : (
          <span className="font-medium text-neutral-900">{estilo.nombre}</span>
        )}
      </TableCell>
      <TableCell className={`text-sm ${indentado ? "text-neutral-700" : "text-neutral-600"}`}>
        {estilo.requiere_info_adicional ? "Sí" : "No"}
      </TableCell>
      <TableCell className={`text-sm ${indentado ? "text-neutral-700" : "text-neutral-600"}`}>
        {estilo.campos_info_adicional?.length ?? 0}
      </TableCell>
      <TableCell>
        {isOrg ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onCampos(estilo); }}>
              Campos
            </Button>
            <Button size="sm" variant="destructive-outline" onClick={(e) => { e.stopPropagation(); onEliminar(estilo); }}>
              Eliminar
            </Button>
          </div>
        ) : null}
      </TableCell>
    </TableRow>
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

  const estilosOrdenados = [...(estilos ?? [])].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })
  );

  const filas = (() => {
    if (!hayBusqueda) return buildTree(estilosOrdenados);
    const todos = estilosOrdenados;
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
      <PageHeader
        title="Estilos"
        actions={<Button onClick={handleCrear}>Crear estilo</Button>}
      />

      <div className="mb-4">
        <Input
          placeholder="Buscar por código o nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Requiere info adicional</TableHead>
              <TableHead>Campos definidos</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-24" /></TableCell>
                  </TableRow>
                ))}
              </>
            )}

            {isError && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState bare variant="error" message="No se pudieron cargar los estilos." />
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && filas.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    bare
                    message={hayBusqueda ? "No se encontraron estilos." : "No hay estilos cargados."}
                  />
                </TableCell>
              </TableRow>
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
          </TableBody>
        </Table>
      </Card>

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
              variant="destructive-solid"
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
