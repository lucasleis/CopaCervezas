import { useQuery } from "@tanstack/react-query";
import { getEdicionesActivasJuez, type EdicionJuez } from "@/api/cata";

interface UseEdicionActivaJuezResult {
  ediciones: EdicionJuez[];
  edicionId: string | null;
  isLoading: boolean;
  isError: boolean;
}

// Resuelve la edición activa del juez (estado 'cata' o 'pre-cata' en su org).
// Si hay una sola, se usa automáticamente. Si hay varias, por ahora se toma
// la primera — el selector explícito se agrega cuando haga falta.
export function useEdicionActivaJuez(): UseEdicionActivaJuezResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ediciones-activas-juez"],
    queryFn: getEdicionesActivasJuez,
  });

  return {
    ediciones: data ?? [],
    edicionId: data && data.length > 0 ? data[0].id : null,
    isLoading,
    isError,
  };
}
