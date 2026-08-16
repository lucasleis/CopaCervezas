import { useQuery } from "@tanstack/react-query";
import { getEdicionesCerveceria, type EdicionCerveceria } from "@/api/inscripcion";

interface UseEdicionActivaCerveceriaResult {
  ediciones: EdicionCerveceria[];
  edicionId: string | null;
  isLoading: boolean;
  isError: boolean;
}

// Resuelve la edición activa de la cervecería (estado 'inscripcion' en su org).
// Si hay una sola, se usa automáticamente. Si hay varias, por ahora se toma
// la primera — mismo criterio que useEdicionActivaJuez.
export function useEdicionActivaCerveceria(): UseEdicionActivaCerveceriaResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ediciones-cerveceria"],
    queryFn: getEdicionesCerveceria,
  });

  // data === [] es un estado válido (sin edición activa), no un error.
  // isError de react-query solo se activa en fallos reales de la request
  // (red, 5xx, etc.), así que se propaga tal cual.
  return {
    ediciones: data ?? [],
    edicionId: data && data.length > 0 ? data[0].id : null,
    isLoading,
    isError,
  };
}
