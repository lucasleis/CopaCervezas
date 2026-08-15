import apiClient from "./client";

export interface Muestra {
  id: string;
  estilo_nombre: string;
  estilo_codigo: string;
  nombre_comercial: string;
  info_adicional: Record<string, unknown> | null;
  cuenta_premio_mejor_cerveceria: boolean;
  comentarios_adicionales: string | null;
  aprobada: boolean;
  activa: boolean;
  created_at: string;
}

export interface CreateMuestraInput {
  estilo_id: string;
  nombre_comercial: string;
  info_adicional: Record<string, unknown> | null;
  cuenta_premio_mejor_cerveceria: boolean;
  comentarios_adicionales: string | null;
}

export interface CampoDefinicion {
  clave: string;
  label: string;
  tipo: "text" | "textarea" | "boolean";
  obligatorio: boolean;
  visible_jueces: boolean;
}

export type CamposSchema = CampoDefinicion[];

export interface Estilo {
  id: string;
  org_id: string | null;
  codigo: string;
  nombre: string;
  subestilo_de: string | null;
  requiere_info_adicional: boolean;
  campos_info_adicional: CamposSchema | null;
}

export interface EdicionCerveceria {
  id: string;
  nombre: string;
  estado: string;
}

export interface EdicionDisponible {
  id: string;
  nombre: string;
  fecha_inicio_inscripcion: string | null;
  fecha_fin_inscripcion: string | null;
  fecha_evento: string | null;
}

export interface PrecioInscripcion {
  id: string;
  nombre: string;
  precio: string;
  fecha_desde: string | null;
  fecha_hasta: string | null;
}

export interface LugarEntrega {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  horarios: string | null;
}

export interface EdicionDisponibleDetalle {
  id: string;
  nombre: string;
  anio: number;
  fecha_inicio_inscripcion: string | null;
  fecha_fin_inscripcion: string | null;
  fecha_evento: string | null;
  max_muestras_por_cerveceria: number;
  precios: PrecioInscripcion[];
  lugares: LugarEntrega[];
}

export type EstadoPago = "pendiente" | "pagado";

export interface MuestraAdmin {
  id: string;
  cerveceria_id: string;
  cerveceria_nombre: string;
  cerveceria_email: string;
  estilo_nombre: string;
  nombre_comercial: string;
  info_adicional: Record<string, unknown> | null;
  aprobada: boolean;
  activa: boolean;
  estado_pago: EstadoPago;
  cod_participante: string | null;
}

export interface MuestrasAdminFilters {
  estado_pago?: EstadoPago;
  aprobada?: boolean;
}

interface ApiResponse<T> {
  data: T;
  error: { code: string; message: string } | null;
}

export async function getEdicionesActivasCerveceria(): Promise<EdicionCerveceria[]> {
  const response = await apiClient.get<ApiResponse<EdicionCerveceria[]>>(
    "/api/v1/cerveceria/ediciones"
  );
  return response.data.data;
}

export async function getEdicionesDisponiblesCerveceria(): Promise<EdicionDisponible[]> {
  const response = await apiClient.get<ApiResponse<EdicionDisponible[]>>(
    "/api/v1/cerveceria/ediciones/disponibles"
  );
  return response.data.data;
}

export async function getEdicionDisponibleDetalle(
  edicionId: string
): Promise<EdicionDisponibleDetalle> {
  const response = await apiClient.get<ApiResponse<EdicionDisponibleDetalle>>(
    `/api/v1/cerveceria/ediciones/disponibles/${edicionId}`
  );
  return response.data.data;
}

export async function inscribirseEdicion(edicionId: string): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `/api/v1/cerveceria/ediciones/${edicionId}/inscribirse`
  );
  return response.data.data;
}

export async function getMuestrasCerveceria(edicionId: string): Promise<Muestra[]> {
  const response = await apiClient.get<ApiResponse<Muestra[]>>(
    `/api/v1/cerveceria/ediciones/${edicionId}/muestras`
  );
  return response.data.data;
}

export async function createMuestra(
  edicionId: string,
  data: CreateMuestraInput
): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `/api/v1/cerveceria/ediciones/${edicionId}/muestras`,
    data
  );
  return response.data.data;
}

export async function updateMuestra(
  edicionId: string,
  muestraId: string,
  data: CreateMuestraInput
): Promise<{ id: string }> {
  const response = await apiClient.patch<ApiResponse<{ id: string }>>(
    `/api/v1/cerveceria/ediciones/${edicionId}/muestras/${muestraId}`,
    data
  );
  return response.data.data;
}

export async function deleteMuestra(
  edicionId: string,
  muestraId: string
): Promise<{ id: string }> {
  const response = await apiClient.delete<ApiResponse<{ id: string }>>(
    `/api/v1/cerveceria/ediciones/${edicionId}/muestras/${muestraId}`
  );
  return response.data.data;
}

export async function getEstilosCatalogo(): Promise<Estilo[]> {
  const response = await apiClient.get<ApiResponse<Estilo[]>>(
    "/api/v1/estilos/catalogo"
  );
  return response.data.data;
}

// Admin

export async function getMuestrasEdicionAdmin(
  edicionId: string,
  filters?: MuestrasAdminFilters
): Promise<MuestraAdmin[]> {
  const params: Record<string, string> = {};
  if (filters?.estado_pago) params.estado_pago = filters.estado_pago;
  if (filters?.aprobada !== undefined) params.aprobada = String(filters.aprobada);
  const response = await apiClient.get<ApiResponse<MuestraAdmin[]>>(
    `/api/v1/admin/ediciones/${edicionId}/inscripcion/muestras`,
    { params }
  );
  return response.data.data;
}

export async function aprobarMuestra(
  edicionId: string,
  muestraId: string,
  aprobada: boolean
): Promise<{ id: string; aprobada: boolean }> {
  const response = await apiClient.patch<ApiResponse<{ id: string; aprobada: boolean }>>(
    `/api/v1/admin/ediciones/${edicionId}/muestras/${muestraId}/aprobar`,
    { aprobada }
  );
  return response.data.data;
}

export async function updateEstadoPagoCerveceria(
  cerveceriaId: string,
  estadoPago: EstadoPago
): Promise<{ id: string; estado_pago: EstadoPago }> {
  const response = await apiClient.patch<ApiResponse<{ id: string; estado_pago: EstadoPago }>>(
    `/api/v1/admin/cervecerias/${cerveceriaId}/estado-pago`,
    { estado_pago: estadoPago }
  );
  return response.data.data;
}
