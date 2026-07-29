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

export type UpdateEdicionInput = CreateEdicionInput;

export interface Precio {
  id: string;
  edicion_id: string;
  nombre: string;
  precio: string;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePrecioInput {
  nombre: string;
  precio: number;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
}

export interface Lugar {
  id: string;
  edicion_id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  horarios: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLugarInput {
  nombre: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  horarios?: string | null;
}

export interface Descuento {
  id: string;
  edicion_id: string;
  codigo: string;
  descuento_porcentaje: string;
  max_usos: number | null;
  usos_actuales: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDescuentoInput {
  codigo: string;
  descuento_porcentaje: number;
  max_usos?: number | null;
}

export interface UpdateDescuentoInput extends CreateDescuentoInput {
  activo: boolean;
}

interface ApiResponse<T> {
  data: T;
  error: { code: string; message: string } | null;
}

// Ediciones

export async function listEdiciones(): Promise<Edicion[]> {
  const response = await apiClient.get<ApiResponse<Edicion[]>>(
    "/api/v1/admin/ediciones"
  );
  return response.data.data;
}

export async function getEdicion(id: string): Promise<Edicion> {
  const response = await apiClient.get<ApiResponse<Edicion>>(
    `/api/v1/admin/ediciones/${id}`
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

export async function updateEdicion(
  id: string,
  input: UpdateEdicionInput
): Promise<Edicion> {
  const response = await apiClient.put<ApiResponse<Edicion>>(
    `/api/v1/admin/ediciones/${id}`,
    input
  );
  return response.data.data;
}

export interface CambiarEstadoResponse {
  id: string;
  estado: EstadoEdicion;
}

export async function cambiarEstado(
  id: string,
  estado: EstadoEdicion
): Promise<CambiarEstadoResponse> {
  const response = await apiClient.patch<ApiResponse<CambiarEstadoResponse>>(
    `/api/v1/admin/ediciones/${id}/estado`,
    { estado }
  );
  return response.data.data;
}

// Precios

export async function listPrecios(edicionId: string): Promise<Precio[]> {
  const response = await apiClient.get<ApiResponse<Precio[]>>(
    `/api/v1/admin/ediciones/${edicionId}/precios`
  );
  return response.data.data;
}

export async function createPrecio(
  edicionId: string,
  input: CreatePrecioInput
): Promise<Precio> {
  const response = await apiClient.post<ApiResponse<Precio>>(
    `/api/v1/admin/ediciones/${edicionId}/precios`,
    input
  );
  return response.data.data;
}

export async function updatePrecio(
  edicionId: string,
  precioId: string,
  input: CreatePrecioInput
): Promise<Precio> {
  const response = await apiClient.put<ApiResponse<Precio>>(
    `/api/v1/admin/ediciones/${edicionId}/precios/${precioId}`,
    input
  );
  return response.data.data;
}

export async function deletePrecio(
  edicionId: string,
  precioId: string
): Promise<void> {
  await apiClient.delete(
    `/api/v1/admin/ediciones/${edicionId}/precios/${precioId}`
  );
}

// Lugares

export async function listLugares(edicionId: string): Promise<Lugar[]> {
  const response = await apiClient.get<ApiResponse<Lugar[]>>(
    `/api/v1/admin/ediciones/${edicionId}/lugares`
  );
  return response.data.data;
}

export async function createLugar(
  edicionId: string,
  input: CreateLugarInput
): Promise<Lugar> {
  const response = await apiClient.post<ApiResponse<Lugar>>(
    `/api/v1/admin/ediciones/${edicionId}/lugares`,
    input
  );
  return response.data.data;
}

export async function updateLugar(
  edicionId: string,
  lugarId: string,
  input: CreateLugarInput
): Promise<Lugar> {
  const response = await apiClient.put<ApiResponse<Lugar>>(
    `/api/v1/admin/ediciones/${edicionId}/lugares/${lugarId}`,
    input
  );
  return response.data.data;
}

export async function deleteLugar(
  edicionId: string,
  lugarId: string
): Promise<void> {
  await apiClient.delete(
    `/api/v1/admin/ediciones/${edicionId}/lugares/${lugarId}`
  );
}

// Descuentos

export async function listDescuentos(edicionId: string): Promise<Descuento[]> {
  const response = await apiClient.get<ApiResponse<Descuento[]>>(
    `/api/v1/admin/ediciones/${edicionId}/descuentos`
  );
  return response.data.data;
}

export async function createDescuento(
  edicionId: string,
  input: CreateDescuentoInput
): Promise<Descuento> {
  const response = await apiClient.post<ApiResponse<Descuento>>(
    `/api/v1/admin/ediciones/${edicionId}/descuentos`,
    input
  );
  return response.data.data;
}

export async function updateDescuento(
  edicionId: string,
  descuentoId: string,
  input: UpdateDescuentoInput
): Promise<Descuento> {
  const response = await apiClient.put<ApiResponse<Descuento>>(
    `/api/v1/admin/ediciones/${edicionId}/descuentos/${descuentoId}`,
    input
  );
  return response.data.data;
}

export async function deleteDescuento(
  edicionId: string,
  descuentoId: string
): Promise<void> {
  await apiClient.delete(
    `/api/v1/admin/ediciones/${edicionId}/descuentos/${descuentoId}`
  );
}
