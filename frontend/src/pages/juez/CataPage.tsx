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
    edicionId: edicionActivaId,
    isLoading: edicionesLoading,
    isError: edicionesError,
  } = useEdicionActivaJuez();
  const [edicionSeleccionada, setEdicionSeleccionada] = useState<string | null>(null);
  const edicionId = edicionSeleccionada ?? edicionActivaId;

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

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Mis Vuelos
          </h1>
          {me && (
            <p className="text-sm text-neutral-500">{me.email}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {ediciones.length > 1 && (
            <select
              value={edicionId ?? ""}
              onChange={(e) => setEdicionSeleccionada(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {ediciones.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.nombre}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={logout}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {!edicionesLoading && !edicionesError && ediciones.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-neutral-500">
          No hay ninguna edición activa para catar en este momento.
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2.5 rounded-lg border border-neutral-200 p-4"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-red-500">
          No se pudieron cargar los vuelos asignados.
        </div>
      )}

      {!isLoading && !isError && vuelos?.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-12 text-center text-sm text-neutral-500">
          No tenés vuelos asignados todavía.
        </div>
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
