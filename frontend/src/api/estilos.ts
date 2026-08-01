import apiClient from "./client";
import type { CampoDefinicion, Estilo } from "./inscripcion";

export interface CreateEstiloInput {
  codigo: string;
  nombre: string;
  subestilo_de: string | null;
  requiere_info_adicional: boolean;
  confirmar_similitud: boolean;
}

export interface UpdateEstiloInput {
  nombre?: string;
  subestilo_de?: string | null;
  requiere_info_adicional?: boolean;
}

export interface EstiloCreado {
  id: string;
  codigo: string;
  nombre: string;
}

export interface EstiloCamposActualizado {
  id: string;
  campos_info_adicional: CampoDefinicion[];
}

interface ApiResponse<T> {
  data: T;
  error: {
    code: string;
    message: string;
    similares?: { id: string; codigo: string; nombre: string }[];
  } | null;
}

export async function listEstilosOrg(): Promise<Estilo[]> {
  const response = await apiClient.get<ApiResponse<Estilo[]>>("/api/v1/admin/estilos");
  return response.data.data;
}

export async function createEstilo(data: CreateEstiloInput): Promise<EstiloCreado> {
  const response = await apiClient.post<ApiResponse<EstiloCreado>>(
    "/api/v1/admin/estilos",
    data
  );
  return response.data.data;
}

export async function updateEstilo(
  id: string,
  data: UpdateEstiloInput
): Promise<EstiloCreado> {
  const response = await apiClient.patch<ApiResponse<EstiloCreado>>(
    `/api/v1/admin/estilos/${id}`,
    data
  );
  return response.data.data;
}

export async function updateEstiloCampos(
  id: string,
  campos: CampoDefinicion[]
): Promise<EstiloCamposActualizado> {
  const response = await apiClient.put<ApiResponse<EstiloCamposActualizado>>(
    `/api/v1/admin/estilos/${id}/campos`,
    { campos }
  );
  return response.data.data;
}

export async function listEstilosCatalogo(): Promise<Estilo[]> {
  const response = await apiClient.get<ApiResponse<Estilo[]>>("/api/v1/estilos/catalogo");
  return response.data.data;
}

export async function deleteEstilo(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/estilos/${id}`);
}
