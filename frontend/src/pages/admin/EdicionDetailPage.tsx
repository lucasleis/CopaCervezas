import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import {
  getEdicion,
  updateEdicion,
  listPrecios,
  createPrecio,
  updatePrecio,
  deletePrecio,
  listLugares,
  createLugar,
  updateLugar,
  deleteLugar,
  listDescuentos,
  createDescuento,
  updateDescuento,
  deleteDescuento,
  type Edicion,
  type Precio,
  type Lugar,
  type Descuento,
} from "@/api/ediciones";
import EstadoEdicion from "@/components/EstadoEdicion";

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dateInputToISO(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// ─── Layout compartido ────────────────────────────────────────────────────────
// Todas las secciones usan el mismo grid de 4 columnas:
// [nombre/código 30%] [col2 20%] [col3 20%] [col4 15%] [acciones 15%]
// Esto garantiza que "Acciones" siempre quede en la misma posición horizontal.

const ROW_GRID = "grid grid-cols-[30%_20%_20%_15%_15%] items-center";
const HEADER_CELL = "px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-700 border-b border-neutral-200";
const DATA_CELL = "px-4 py-3 text-sm";

// ─── Sección 1: Datos generales ───────────────────────────────────────────────

function DatosGeneralesSection({ edicion }: { edicion: Edicion }) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(edicion.nombre);
  const [fechaCata, setFechaCata] = useState(isoToDateInput(edicion.fecha_evento));
  const [fechaInicio, setFechaInicio] = useState(isoToDateInput(edicion.fecha_inicio_inscripcion));
  const [fechaCierre, setFechaCierre] = useState(isoToDateInput(edicion.fecha_fin_inscripcion));
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof updateEdicion>[1]) =>
      updateEdicion(edicion.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edicion", edicion.id] });
      toast.success("Edición actualizada");
    },
    onError: () => {
      setFormError("Ocurrió un error al guardar. Intentá de nuevo.");
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!nombre.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    mutation.mutate({
      nombre: nombre.trim(),
      anio: fechaCata ? new Date(fechaCata).getFullYear() : edicion.anio,
      max_muestras_por_cerveceria: edicion.max_muestras_por_cerveceria,
      fecha_evento: dateInputToISO(fechaCata),
      fecha_inicio_inscripcion: dateInputToISO(fechaInicio),
      fecha_fin_inscripcion: dateInputToISO(fechaCierre),
    });
  }

  return (
    <Card padding="md">
      <h2 className="mb-4 text-base font-semibold text-neutral-900">Datos generales</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="nombre" className="text-sm font-medium text-neutral-700">
            Nombre <span className="text-red-500">*</span>
          </label>
          <Input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="fecha-cata" className="text-sm font-medium text-neutral-700">Fecha de cata</label>
            <Input id="fecha-cata" type="date" value={fechaCata} onChange={(e) => setFechaCata(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fecha-inicio" className="text-sm font-medium text-neutral-700">Inicio de inscripción</label>
            <Input id="fecha-inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fecha-cierre" className="text-sm font-medium text-neutral-700">Cierre de inscripción</label>
            <Input id="fecha-cierre" type="date" value={fechaCierre} onChange={(e) => setFechaCierre(e.target.value)} />
          </div>
        </div>
        {formError && <p className="text-sm text-red-500">{formError}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending} className="w-[132px]">
            {mutation.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Sección 2: Precios ───────────────────────────────────────────────────────

function PreciosSection({ edicionId }: { edicionId: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Precio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Precio | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pNombre, setPNombre] = useState("");
  const [pPrecio, setPPrecio] = useState("");
  const [pDesde, setPDesde] = useState("");
  const [pHasta, setPHasta] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: precios, isLoading } = useQuery({
    queryKey: ["precios", edicionId],
    queryFn: () => listPrecios(edicionId),
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createPrecio>[1]) => createPrecio(edicionId, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["precios", edicionId] }); closeModal(); toast.success("Precio creado"); },
    onError: () => setFormError("Error al crear el precio."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updatePrecio>[2] }) =>
      updatePrecio(edicionId, id, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["precios", edicionId] }); closeModal(); toast.success("Precio actualizado"); },
    onError: () => setFormError("Error al actualizar el precio."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePrecio(edicionId, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["precios", edicionId] }); toast.success("Precio eliminado"); },
    onError: () => toast.error("Error al eliminar el precio."),
  });

  function openCreate() {
    setEditing(null);
    setPNombre(""); setPPrecio(""); setPDesde(""); setPHasta("");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(p: Precio) {
    setEditing(p);
    setPNombre(p.nombre);
    setPPrecio(p.precio);
    setPDesde(isoToDateInput(p.fecha_desde));
    setPHasta(isoToDateInput(p.fecha_hasta));
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }

  function handleDelete(p: Precio) {
    setDeleteTarget(p);
    setDeleteConfirmOpen(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const precio = parseFloat(pPrecio);
    if (!pNombre.trim()) { setFormError("El nombre es obligatorio."); return; }
    if (isNaN(precio) || precio < 0) { setFormError("El precio debe ser un número válido."); return; }
    const input = { nombre: pNombre.trim(), precio, fecha_desde: dateInputToISO(pDesde), fecha_hasta: dateInputToISO(pHasta) };
    if (editing) {
      updateMutation.mutate({ id: editing.id, input });
    } else {
      createMutation.mutate(input);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card padding="none">
      <div className="flex items-center border-b border-neutral-200 px-6 py-4">
        <h2 className="text-base font-semibold text-neutral-900">Precios de inscripción</h2>
      </div>

      {/* Header */}
      <div className={`${ROW_GRID} border-b border-neutral-100 bg-neutral-50`}>
        <span className={HEADER_CELL}>Nombre</span>
        <span className={HEADER_CELL}>Precio</span>
        <span className={HEADER_CELL}>Válido desde</span>
        <span className={HEADER_CELL}>Válido hasta</span>
        <span className={HEADER_CELL}>Acciones</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-neutral-100">
        {isLoading && [1, 2].map((i) => (
          <div key={i} className={ROW_GRID}>
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className={DATA_CELL}><Skeleton className="h-4 w-24" /></div>
            ))}
          </div>
        ))}
        {!isLoading && precios?.length === 0 && (
          <EmptyState bare message="No hay precios configurados." />
        )}
        {!isLoading && precios?.map((p) => (
          <div key={p.id} className={ROW_GRID}>
            <span className={`${DATA_CELL} font-medium text-neutral-900`}>{p.nombre}</span>
            <span className={`${DATA_CELL} text-neutral-600`}>${p.precio}</span>
            <span className={`${DATA_CELL} text-neutral-600`}>{formatFecha(p.fecha_desde)}</span>
            <span className={`${DATA_CELL} text-neutral-600`}>{formatFecha(p.fecha_hasta)}</span>
            <div className={`${DATA_CELL} flex gap-2`}>
              <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Editar</Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(p)}>Eliminar</Button>
            </div>
          </div>
        ))}
      </div>

      <div className={`${ROW_GRID} border-t border-neutral-100`}>
        <span className="col-span-4" />
        <div className="px-4 py-3">
          <Button size="sm" onClick={openCreate} className="w-[132px]">+ Agregar precio</Button>
        </div>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar precio?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-700 leading-relaxed">
            Vas a eliminar el precio <span className="font-semibold">"{deleteTarget?.nombre}"</span>. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteConfirmOpen(false);
                setDeleteTarget(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar precio" : "Agregar precio"}</DialogTitle>
          </DialogHeader>
          <form id="precio-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="p-nombre" className="text-sm font-medium text-neutral-700">Nombre <span className="text-red-500">*</span></label>
              <Input id="p-nombre" type="text" placeholder="Early bird" value={pNombre} onChange={(e) => setPNombre(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="p-precio" className="text-sm font-medium text-neutral-700">Precio <span className="text-red-500">*</span></label>
              <Input id="p-precio" type="number" min="0" step="0.01" placeholder="5000" value={pPrecio} onChange={(e) => setPPrecio(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="p-desde" className="text-sm font-medium text-neutral-700">Válido desde</label>
                <Input id="p-desde" type="date" value={pDesde} onChange={(e) => setPDesde(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="p-hasta" className="text-sm font-medium text-neutral-700">Válido hasta</label>
                <Input id="p-hasta" type="date" value={pHasta} onChange={(e) => setPHasta(e.target.value)} />
              </div>
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isPending}>Cancelar</Button>
            <Button type="submit" form="precio-form" disabled={isPending}>
              {isPending ? "Guardando..." : editing ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Sección 3: Lugares ───────────────────────────────────────────────────────

function LugaresSection({ edicionId }: { edicionId: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lugar | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lugar | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lNombre, setLNombre] = useState("");
  const [lDireccion, setLDireccion] = useState("");
  const [lCiudad, setLCiudad] = useState("");
  const [lProvincia, setLProvincia] = useState("");
  const [lHorarios, setLHorarios] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: lugares, isLoading } = useQuery({
    queryKey: ["lugares", edicionId],
    queryFn: () => listLugares(edicionId),
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createLugar>[1]) => createLugar(edicionId, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lugares", edicionId] }); closeModal(); toast.success("Lugar creado"); },
    onError: () => setFormError("Error al crear el lugar."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateLugar>[2] }) =>
      updateLugar(edicionId, id, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lugares", edicionId] }); closeModal(); toast.success("Lugar actualizado"); },
    onError: () => setFormError("Error al actualizar el lugar."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLugar(edicionId, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lugares", edicionId] }); toast.success("Lugar eliminado"); },
    onError: () => toast.error("Error al eliminar el lugar."),
  });

  function openCreate() {
    setEditing(null);
    setLNombre(""); setLDireccion(""); setLCiudad(""); setLProvincia(""); setLHorarios("");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(l: Lugar) {
    setEditing(l);
    setLNombre(l.nombre); setLDireccion(l.direccion); setLCiudad(l.ciudad);
    setLProvincia(l.provincia); setLHorarios(l.horarios ?? "");
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }

  function handleDelete(l: Lugar) {
    setDeleteTarget(l);
    setDeleteConfirmOpen(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!lNombre.trim()) { setFormError("El nombre es obligatorio."); return; }
    if (!lDireccion.trim()) { setFormError("La dirección es obligatoria."); return; }
    if (!lCiudad.trim()) { setFormError("La ciudad es obligatoria."); return; }
    if (!lProvincia.trim()) { setFormError("La provincia es obligatoria."); return; }
    const input = {
      nombre: lNombre.trim(), direccion: lDireccion.trim(),
      ciudad: lCiudad.trim(), provincia: lProvincia.trim(),
      horarios: lHorarios.trim() || null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, input });
    } else {
      createMutation.mutate(input);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card padding="none">
      <div className="flex items-center border-b border-neutral-200 px-6 py-4">
        <h2 className="text-base font-semibold text-neutral-900">Lugares de entrega</h2>
      </div>

      {/* Header */}
      <div className={`${ROW_GRID} border-b border-neutral-100 bg-neutral-50`}>
        <span className={HEADER_CELL}>Nombre</span>
        <span className={HEADER_CELL}>Dirección</span>
        <span className={HEADER_CELL}>Ciudad</span>
        <span className={HEADER_CELL}>Provincia</span>
        <span className={HEADER_CELL}>Acciones</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-neutral-100">
        {isLoading && [1, 2].map((i) => (
          <div key={i} className={ROW_GRID}>
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className={DATA_CELL}><Skeleton className="h-4 w-24" /></div>
            ))}
          </div>
        ))}
        {!isLoading && lugares?.length === 0 && (
          <EmptyState bare message="No hay lugares configurados." />
        )}
        {!isLoading && lugares?.map((l) => (
          <div key={l.id} className={ROW_GRID}>
            <span className={`${DATA_CELL} font-medium text-neutral-900`}>{l.nombre}</span>
            <span className={`${DATA_CELL} text-neutral-600`}>{l.direccion}</span>
            <span className={`${DATA_CELL} text-neutral-600`}>{l.ciudad}</span>
            <span className={`${DATA_CELL} text-neutral-600`}>{l.provincia}</span>
            <div className={`${DATA_CELL} flex gap-2`}>
              <Button variant="outline" size="sm" onClick={() => openEdit(l)}>Editar</Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(l)}>Eliminar</Button>
            </div>
          </div>
        ))}
      </div>

      <div className={`${ROW_GRID} border-t border-neutral-100`}>
        <span className="col-span-4" />
        <div className="px-4 py-3">
          <Button size="sm" onClick={openCreate} className="w-[132px]">+ Agregar lugar</Button>
        </div>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar lugar?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-700 leading-relaxed">
            Vas a eliminar el lugar <span className="font-semibold">"{deleteTarget?.nombre}"</span>. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteConfirmOpen(false);
                setDeleteTarget(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lugar" : "Agregar lugar"}</DialogTitle>
          </DialogHeader>
          <form id="lugar-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="l-nombre" className="text-sm font-medium text-neutral-700">Nombre <span className="text-red-500">*</span></label>
              <Input id="l-nombre" type="text" placeholder="Sede central" value={lNombre} onChange={(e) => setLNombre(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="l-direccion" className="text-sm font-medium text-neutral-700">Dirección <span className="text-red-500">*</span></label>
              <Input id="l-direccion" type="text" placeholder="Av. Corrientes 1234" value={lDireccion} onChange={(e) => setLDireccion(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="l-ciudad" className="text-sm font-medium text-neutral-700">Ciudad <span className="text-red-500">*</span></label>
                <Input id="l-ciudad" type="text" placeholder="Buenos Aires" value={lCiudad} onChange={(e) => setLCiudad(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="l-provincia" className="text-sm font-medium text-neutral-700">Provincia <span className="text-red-500">*</span></label>
                <Input id="l-provincia" type="text" placeholder="CABA" value={lProvincia} onChange={(e) => setLProvincia(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="l-horarios" className="text-sm font-medium text-neutral-700">Horarios</label>
              <Input id="l-horarios" type="text" placeholder="Lun–Vie 9–18hs" value={lHorarios} onChange={(e) => setLHorarios(e.target.value)} />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isPending}>Cancelar</Button>
            <Button type="submit" form="lugar-form" disabled={isPending}>
              {isPending ? "Guardando..." : editing ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Sección 4: Descuentos ────────────────────────────────────────────────────

function DescuentosSection({ edicionId }: { edicionId: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Descuento | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Descuento | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dCodigo, setDCodigo] = useState("");
  const [dPorcentaje, setDPorcentaje] = useState("");
  const [dMaxUsos, setDMaxUsos] = useState("");
  const [dActivo, setDActivo] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: descuentos, isLoading } = useQuery({
    queryKey: ["descuentos", edicionId],
    queryFn: () => listDescuentos(edicionId),
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createDescuento>[1]) => createDescuento(edicionId, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["descuentos", edicionId] }); closeModal(); toast.success("Código creado"); },
    onError: () => setFormError("Error al crear el código."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateDescuento>[2] }) =>
      updateDescuento(edicionId, id, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["descuentos", edicionId] }); closeModal(); toast.success("Código actualizado"); },
    onError: () => setFormError("Error al actualizar el código."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDescuento(edicionId, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["descuentos", edicionId] }); toast.success("Código eliminado"); },
    onError: () => toast.error("Error al eliminar el código."),
  });

  function openCreate() {
    setEditing(null);
    setDCodigo(""); setDPorcentaje(""); setDMaxUsos(""); setDActivo(true);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(d: Descuento) {
    setEditing(d);
    setDCodigo(d.codigo);
    setDPorcentaje(d.descuento_porcentaje);
    setDMaxUsos(d.max_usos !== null ? String(d.max_usos) : "");
    setDActivo(d.activo);
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }

  function handleDelete(d: Descuento) {
    setDeleteTarget(d);
    setDeleteConfirmOpen(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const porcentaje = parseFloat(dPorcentaje);
    if (!dCodigo.trim()) { setFormError("El código es obligatorio."); return; }
    if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) { setFormError("El descuento debe ser entre 1 y 100."); return; }
    const maxUsos = dMaxUsos.trim() ? parseInt(dMaxUsos, 10) : null;
    const input = {
      codigo: dCodigo.trim().toUpperCase(),
      descuento_porcentaje: porcentaje,
      max_usos: maxUsos,
      activo: dActivo,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, input });
    } else {
      createMutation.mutate(input);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card padding="none">
      <div className="flex items-center border-b border-neutral-200 px-6 py-4">
        <h2 className="text-base font-semibold text-neutral-900">Códigos de descuento</h2>
      </div>

      {/* Header */}
      <div className={`${ROW_GRID} border-b border-neutral-100 bg-neutral-50`}>
        <span className={HEADER_CELL}>Código</span>
        <span className={HEADER_CELL}>Descuento</span>
        <span className={HEADER_CELL}>Usos</span>
        <span className={HEADER_CELL}>Estado</span>
        <span className={HEADER_CELL}>Acciones</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-neutral-100">
        {isLoading && [1, 2].map((i) => (
          <div key={i} className={ROW_GRID}>
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className={DATA_CELL}><Skeleton className="h-4 w-24" /></div>
            ))}
          </div>
        ))}
        {!isLoading && descuentos?.length === 0 && (
          <EmptyState bare message="No hay códigos de descuento." />
        )}
        {!isLoading && descuentos?.map((d) => (
          <div key={d.id} className={ROW_GRID}>
            <span className={`${DATA_CELL} font-mono font-medium text-neutral-900`}>{d.codigo}</span>
            <span className={`${DATA_CELL} text-neutral-600`}>{d.descuento_porcentaje}%</span>
            <span className={`${DATA_CELL} text-neutral-600`}>
              {d.usos_actuales}{d.max_usos !== null ? ` / ${d.max_usos}` : ""}
            </span>
            <div className={DATA_CELL}>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${d.activo ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                {d.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className={`${DATA_CELL} flex gap-2`}>
              <Button variant="outline" size="sm" onClick={() => openEdit(d)}>Editar</Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(d)}>Eliminar</Button>
            </div>
          </div>
        ))}
      </div>

      <div className={`${ROW_GRID} border-t border-neutral-100`}>
        <span className="col-span-4" />
        <div className="px-4 py-3">
          <Button size="sm" onClick={openCreate} className="w-[132px]">+ Agregar código</Button>
        </div>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar código?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-700 leading-relaxed">
            Vas a eliminar el código <span className="font-semibold">"{deleteTarget?.codigo}"</span>. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteConfirmOpen(false);
                setDeleteTarget(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar código" : "Agregar código"}</DialogTitle>
          </DialogHeader>
          <form id="descuento-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="d-codigo" className="text-sm font-medium text-neutral-700">Código <span className="text-red-500">*</span></label>
              <Input id="d-codigo" type="text" placeholder="PROMO20" value={dCodigo} onChange={(e) => setDCodigo(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="d-porcentaje" className="text-sm font-medium text-neutral-700">Descuento % <span className="text-red-500">*</span></label>
                <Input id="d-porcentaje" type="number" min="1" max="100" step="0.01" placeholder="20" value={dPorcentaje} onChange={(e) => setDPorcentaje(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="d-max-usos" className="text-sm font-medium text-neutral-700">Máx. usos</label>
                <Input id="d-max-usos" type="number" min="1" step="1" placeholder="Sin límite" value={dMaxUsos} onChange={(e) => setDMaxUsos(e.target.value)} />
              </div>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="d-activo"
                  checked={dActivo}
                  onCheckedChange={(checked) => setDActivo(checked)}
                />
                <label htmlFor="d-activo" className="text-sm font-medium text-neutral-700">Activo</label>
              </div>
            )}
            {formError && <p className="text-sm text-red-500">{formError}</p>}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isPending}>Cancelar</Button>
            <Button type="submit" form="descuento-form" disabled={isPending}>
              {isPending ? "Guardando..." : editing ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EdicionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: edicion, isLoading, isError } = useQuery({
    queryKey: ["edicion", id],
    queryFn: () => getEdicion(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !edicion) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-500">No se pudo cargar la edición.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/ediciones")}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        backTo="/admin/ediciones"
        backLabel="Ediciones"
        title={
          <span className="flex items-center gap-3">
            {edicion.nombre}
            <EstadoEdicion edicion={edicion} />
          </span>
        }
      />

      <DatosGeneralesSection edicion={edicion} />
      <PreciosSection edicionId={edicion.id} />
      <LugaresSection edicionId={edicion.id} />
      <DescuentosSection edicionId={edicion.id} />

      {["pre-cata", "cata", "devolucion", "cerrada"].includes(edicion.estado) && (
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Agrupación de muestras</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Agrupá los estilos en grupos de premiación antes de la jornada de cata.
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => navigate(`/admin/ediciones/${edicion.id}/grupos`)}
              className="w-[132px]"
            >
              Gestionar grupos →
            </Button>
          </div>
        </Card>
      )}

      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Inscriptos</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Revisá y gestioná las muestras recibidas de las cervecerías participantes.
            </p>
          </div>
          <Button
            variant="default"
            onClick={() => navigate(`/admin/ediciones/${edicion.id}/inscripcion`)}
            className="w-[132px]"
          >
            Ver inscriptos →
          </Button>
        </div>
      </Card>

      {edicion.estado === "cata" && (
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Panel de cata en vivo</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Seguí el progreso de evaluaciones en tiempo real.
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => navigate(`/admin/cata/${edicion.id}`)}
              className="w-[132px]"
            >
              Abrir panel →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
