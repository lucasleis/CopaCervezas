import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getVuelosJuez, type VueloJuez, type EstadoVuelo } from "@/api/cata";
import { getMe } from "@/api/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useEdicionActivaJuez } from "@/hooks/useEdicionActivaJuez";
import { Skeleton } from "@/components/ui/skeleton";
import { FlightCard } from "@/components/ui/FlightCard";
import type { EstadoVuelo as EstadoVueloBadge } from "@/components/ui/StatusBadge";
import type { EdicionJuez } from "@/api/cata";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ESTADO_EDICION_LABEL: Record<EdicionJuez["estado"], string> = {
  "pre-cata": "Pre-cata",
  cata: "En cata",
};

function toEstadoBadge(estado: EstadoVuelo): EstadoVueloBadge {
  if (estado === "en_curso") return "en-curso";
  return estado;
}

const ESTADO_VUELO_LABEL: Record<EstadoVuelo, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completado: "Completado",
};

export default function CataPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const {
    ediciones,
    isLoading: edicionesLoading,
    isError: edicionesError,
  } = useEdicionActivaJuez();
  const [edicionSeleccionada, setEdicionSeleccionada] = useState<string | null>(null);

  // Si el juez solo tiene una edición disponible, saltamos la pantalla de
  // selección y la usamos directamente.
  const edicionUnica = ediciones.length === 1 ? ediciones[0].id : null;
  const edicionId = edicionSeleccionada ?? edicionUnica;

  const mostrarSelectorEdicion =
    !edicionesLoading && !edicionesError && ediciones.length > 1 && !edicionSeleccionada;

  const {
    data: vuelos,
    isLoading: vuelosLoading,
    isError: vuelosError,
  } = useQuery({
    queryKey: ["vuelos-juez", edicionId],
    queryFn: () => getVuelosJuez(edicionId as string),
    enabled: !!edicionId,
  });

  const isLoading = edicionesLoading || (!!edicionId && vuelosLoading);
  const isError = edicionesError || vuelosError;

  if (mostrarSelectorEdicion) {
    return (
      <div className="p-8">
        <PageHeader
          title="Mis competencias"
          subtitle={me?.email}
          actions={
            <Button type="button" variant="quiet" onClick={logout}>
              Cerrar sesión
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ediciones.map((ed) => (
            <Button
              key={ed.id}
              type="button"
              variant="outline"
              size="card"
              onClick={() => setEdicionSeleccionada(ed.id)}
            >
              <span className="text-base font-semibold text-neutral-900">{ed.nombre}</span>
              <span className="text-sm text-neutral-500">{ESTADO_EDICION_LABEL[ed.estado]}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Mis Vuelos"
        subtitle={me?.email}
        actions={
          <>
            {ediciones.length > 1 && (
              <Select
                value={edicionId ?? ""}
                onValueChange={(value) => setEdicionSeleccionada(value as string)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una edición">
                    {(value: string | null) =>
                      ediciones.find((ed) => ed.id === value)?.nombre ?? "Seleccioná una edición"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ediciones.map((ed) => (
                    <SelectItem key={ed.id} value={ed.id}>
                      {ed.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button type="button" variant="quiet" onClick={logout}>
              Cerrar sesión
            </Button>
          </>
        }
      />

      {!edicionesLoading && !edicionesError && ediciones.length === 0 && (
        <EmptyState message="No hay ninguna edición activa para catar en este momento." />
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} padding="sm" className="flex flex-col gap-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <EmptyState variant="error" message="No se pudieron cargar los vuelos asignados." />
      )}

      {!isLoading && !isError && vuelos?.length === 0 && (
        <EmptyState message="No tenés vuelos asignados todavía." />
      )}

      {!isLoading && !isError && vuelos && vuelos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vuelos.map((vuelo: VueloJuez) => {
            const completado = vuelo.mi_estado === "completado";
            return (
              <button
                key={vuelo.id}
                type="button"
                onClick={() => navigate(`/cata/${vuelo.id}`)}
                className={`text-left ${completado ? "opacity-60" : ""}`}
              >
                <FlightCard
                  numero={vuelo.orden}
                  categoria={vuelo.grupo_nombre}
                  meta={`Ronda ${vuelo.numero_ronda} de ${vuelo.cant_rondas} · Vuelo ${ESTADO_VUELO_LABEL[vuelo.estado]}`}
                  estado={toEstadoBadge(vuelo.mi_estado)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
