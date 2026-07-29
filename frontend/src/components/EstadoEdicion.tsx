import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { cambiarEstado, type Edicion, type EstadoEdicion as EstadoEdicionType } from "@/api/ediciones";

const ESTADO_CONFIG: Record<EstadoEdicionType, { label: string; className: string }> = {
  config: { label: "Configuración", className: "bg-neutral-100 text-neutral-600" },
  inscripcion: { label: "Inscripción", className: "bg-blue-100 text-blue-700" },
  "pre-cata": { label: "Pre-cata", className: "bg-yellow-100 text-yellow-700" },
  cata: { label: "Cata", className: "bg-orange-100 text-orange-700" },
  devolucion: { label: "Devolución", className: "bg-purple-100 text-purple-700" },
  cerrada: { label: "Cerrada", className: "bg-green-100 text-green-700" },
};

const TRANSICIONES: Partial<Record<EstadoEdicionType, { destino: EstadoEdicionType; label: string }>> = {
  config: { destino: "inscripcion", label: "Abrir inscripción" },
  inscripcion: { destino: "pre-cata", label: "Cerrar inscripción" },
};

interface Props {
  edicion: Edicion;
}

export default function EstadoEdicion({ edicion }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (destino: EstadoEdicionType) => cambiarEstado(edicion.id, destino),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edicion", edicion.id] });
      toast.success("Estado actualizado");
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 422) {
        const body = error.response.data as { error?: { code: string; message: string } };
        const code = body?.error?.code;
        const message = body?.error?.message;
        if (code === "PRECONDICION_NO_CUMPLIDA" && message) {
          toast.warning(message);
          return;
        }
      }
      toast.error("No se pudo cambiar el estado. Intentá de nuevo.");
    },
  });

  const config = ESTADO_CONFIG[edicion.estado] ?? {
    label: edicion.estado,
    className: "bg-neutral-100 text-neutral-600",
  };

  const transicion = TRANSICIONES[edicion.estado];

  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${config.className}`}
      >
        {config.label}
      </span>
      {transicion && (
        <Button
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(transicion.destino)}
        >
          {mutation.isPending ? "Cambiando..." : transicion.label}
        </Button>
      )}
    </div>
  );
}
