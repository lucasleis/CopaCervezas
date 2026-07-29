import apiClient from "./client";

export type EstadoEdicion =
  | "config"
  | "inscripcion"
  | "pre-cata"
  | "cata"
  | "devolucion"
  | "cerrada";

export interface Edicion {
  id: string;
  org_id: string;
  nombre: string;
  anio: number;
  estado: EstadoEdicion;
  fecha_inicio_inscripcion: string | null;
  fecha_fin_inscripcion: string | null;
  fecha_evento: string | null;
  max_muestras_por_cerveceria: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEdicionInput {
  nombre: string;
  anio: number;
  max_muestras_por_cerveceria: number;
  fecha_inicio_inscripcion?: string | null;
  fecha_fin_inscripcion?: string | null;
  fecha_evento?: string | null;
}

interface ApiResponse<T> {
  data: T;
  error: { code: string; message: string } | null;
}

export async function listEdiciones(): Promise<Edicion[]> {
  const response = await apiClient.get<ApiResponse<Edicion[]>>(
    "/api/v1/admin/ediciones"
  );
  return response.data.data;
}

export async function createEdicion(input: CreateEdicionInput): Promise<Edicion> {
  const response = await apiClient.post<ApiResponse<Edicion>>(
    "/api/v1/admin/ediciones",
    input
  );
  return response.data.data;
}
