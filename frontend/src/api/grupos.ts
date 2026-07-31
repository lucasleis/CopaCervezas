import apiClient from "./client";

export interface Grupo {
  id: string;
  edicion_id: string;
  nombre: string;
  cant_rondas: number;
  orden: number;
  bos_flight: string | null;
  cant_muestras: number;
  created_at: string;
  updated_at: string;
}

export interface MuestraSinGrupo {
  id: string;
  nombre_comercial: string;
  cod_participante: string | null;
  estilo_id: string;
  estilo_codigo: string;
  estilo_nombre: string;
}

export interface MuestraDeGrupo {
  id: string;
  nombre_comercial: string;
  cod_participante: string | null;
  cod_anonimo: string | null;
  asignacion_manual: boolean;
  estilo_id: string;
  estilo_codigo: string;
  estilo_nombre: string;
}

export interface AutoasignarResult {
  grupos_creados: number;
  muestras_asignadas: number;
}

export interface CreateGrupoInput {
  nombre: string;
  bos_flight?: string | null;
}

export type UpdateGrupoInput = CreateGrupoInput;

interface ApiResponse<T> {
  data: T;
  error: { code: string; message: string } | null;
}

// Grupos

export async function listGrupos(edicionId: string): Promise<Grupo[]> {
  const response = await apiClient.get<ApiResponse<Grupo[]>>(
    `/api/v1/admin/ediciones/${edicionId}/grupos`
  );
  return response.data.data;
}

export async function createGrupo(
  edicionId: string,
  input: CreateGrupoInput
): Promise<Grupo> {
  const response = await apiClient.post<ApiResponse<Grupo>>(
    `/api/v1/admin/ediciones/${edicionId}/grupos`,
    input
  );
  return response.data.data;
}

export async function updateGrupo(
  edicionId: string,
  grupoId: string,
  input: UpdateGrupoInput
): Promise<Grupo> {
  const response = await apiClient.put<ApiResponse<Grupo>>(
    `/api/v1/admin/ediciones/${edicionId}/grupos/${grupoId}`,
    input
  );
  return response.data.data;
}

export async function deleteGrupo(
  edicionId: string,
  grupoId: string
): Promise<void> {
  await apiClient.delete(
    `/api/v1/admin/ediciones/${edicionId}/grupos/${grupoId}`
  );
}

export async function autoasignarGrupos(
  edicionId: string
): Promise<AutoasignarResult> {
  const response = await apiClient.post<ApiResponse<AutoasignarResult>>(
    `/api/v1/admin/ediciones/${edicionId}/grupos/autoasignar`
  );
  return response.data.data;
}

// Muestras

export async function listMuestrasSinGrupo(
  edicionId: string
): Promise<MuestraSinGrupo[]> {
  const response = await apiClient.get<ApiResponse<MuestraSinGrupo[]>>(
    `/api/v1/admin/ediciones/${edicionId}/muestras/sin-grupo`
  );
  return response.data.data;
}

export async function listMuestrasByGrupo(
  edicionId: string,
  grupoId: string
): Promise<MuestraDeGrupo[]> {
  const response = await apiClient.get<ApiResponse<MuestraDeGrupo[]>>(
    `/api/v1/admin/ediciones/${edicionId}/grupos/${grupoId}/muestras`
  );
  return response.data.data;
}

export async function moverMuestra(
  edicionId: string,
  muestraId: string,
  grupoId: string
): Promise<void> {
  await apiClient.patch(
    `/api/v1/admin/ediciones/${edicionId}/muestras/${muestraId}/grupo`,
    { grupo_id: grupoId }
  );
}
