import apiClient from "./client";

export type EstadoVuelo = "pendiente" | "en_curso" | "completado";

export interface VueloJuez {
  id: string;
  numero_ronda: number;
  orden: number;
  estado: EstadoVuelo;
  grupo_nombre: string;
  cant_rondas: number;
  mi_estado: EstadoVuelo;
}

export interface MuestraVuelo {
  id: string;
  cod_anonimo: string;
  info_adicional: Record<string, unknown> | null;
  estilo_codigo: string;
  estilo_nombre: string;
  orden: number;
}

export interface Evaluacion {
  id: string;
  muestra_id: string;
  vuelo_id: string;
  avanza: boolean | null;
  created_at: string;
  cod_anonimo: string;
  estilo_nombre: string;
}

export interface CreateEvaluacionInput {
  vuelo_id: string;
  muestra_id: string;
  puntajes: Record<string, unknown> | null;
  comentarios: string | null;
  comentario_final: string | null;
  avanza: boolean | null;
}

export interface AttrValorPuntaje {
  valor: string;
  inapropiado: boolean;
}

export interface PuntajesEvaluacion {
  apariencia: { observaciones: string };
  aroma: {
    malta: AttrValorPuntaje;
    lupulo: AttrValorPuntaje;
    fermentacion: AttrValorPuntaje;
    otros_ingredientes: AttrValorPuntaje;
    observaciones: string;
  };
  sabor: {
    malta: AttrValorPuntaje;
    lupulo: AttrValorPuntaje;
    amargor: AttrValorPuntaje;
    fermentacion: AttrValorPuntaje;
    balance: AttrValorPuntaje;
    observaciones: string;
  };
  sensacion_en_boca: {
    cuerpo: AttrValorPuntaje;
    carbonatacion: AttrValorPuntaje;
    cremosidad: AttrValorPuntaje;
    calentamiento: AttrValorPuntaje;
    astringencia: AttrValorPuntaje;
    observaciones: string;
  };
  general: {
    calidad_tecnica: string;
    merito_estilistico: string;
    fuerza_relativa: number | null;
  };
  devolucion: { observaciones: string };
}

export interface EvaluacionDetalle {
  id: string;
  muestra_id: string;
  vuelo_id: string;
  avanza: boolean | null;
  comentario_final: string | null;
  puntajes: PuntajesEvaluacion | null;
}

export type EstadoEdicionJuez = "pre-cata" | "cata";

export interface EdicionJuez {
  id: string;
  nombre: string;
  estado: EstadoEdicionJuez;
}

export interface ProgresoVuelo {
  vuelo_id: string;
  numero_ronda: number;
  orden: number;
  estado: EstadoVuelo;
  grupo_nombre: string;
  total_jueces: number;
  jueces_completados: number;
}

export interface Incongruencia {
  vuelo_id: string;
  muestra_id: string;
  cod_anonimo: string | null;
  avanza_true_count: number;
  avanza_false_count: number;
}

interface ApiResponse<T> {
  data: T;
  error: { code: string; message: string } | null;
}

export async function getEdicionesActivasJuez(): Promise<EdicionJuez[]> {
  const response = await apiClient.get<ApiResponse<EdicionJuez[]>>(
    "/api/v1/juez/ediciones"
  );
  return response.data.data;
}

export async function getVuelosJuez(edicionId: string): Promise<VueloJuez[]> {
  const response = await apiClient.get<ApiResponse<VueloJuez[]>>(
    `/api/v1/juez/ediciones/${edicionId}/vuelos`
  );
  return response.data.data;
}

export async function getMuestrasVuelo(
  edicionId: string,
  vueloId: string
): Promise<MuestraVuelo[]> {
  const response = await apiClient.get<ApiResponse<MuestraVuelo[]>>(
    `/api/v1/juez/ediciones/${edicionId}/vuelos/${vueloId}/muestras`
  );
  return response.data.data;
}

export async function createEvaluacion(
  edicionId: string,
  data: CreateEvaluacionInput
): Promise<{ id: string }> {
  const response = await apiClient.post<ApiResponse<{ id: string }>>(
    `/api/v1/juez/ediciones/${edicionId}/evaluaciones`,
    data
  );
  return response.data.data;
}

export async function getEvaluacionDetalle(evaluacionId: string): Promise<EvaluacionDetalle> {
  const response = await apiClient.get<ApiResponse<EvaluacionDetalle>>(
    `/api/v1/cata/evaluaciones/${evaluacionId}/detalle`
  );
  return response.data.data;
}

export async function getEvaluacionesJuez(
  edicionId: string,
  orderBy?: "grupo" | "codigo"
): Promise<Evaluacion[]> {
  const response = await apiClient.get<ApiResponse<Evaluacion[]>>(
    `/api/v1/juez/ediciones/${edicionId}/evaluaciones`,
    { params: orderBy ? { order_by: orderBy } : undefined }
  );
  return response.data.data;
}

export async function getEvaluacionesPorVuelo(vueloId: string): Promise<Evaluacion[]> {
  const response = await apiClient.get<ApiResponse<Evaluacion[]>>(
    `/api/v1/juez/vuelos/${vueloId}/evaluaciones`
  );
  return response.data.data;
}

// Admin

export async function getProgresoVuelosEdicion(edicionId: string): Promise<ProgresoVuelo[]> {
  const response = await apiClient.get<ApiResponse<ProgresoVuelo[]>>(
    `/api/v1/admin/ediciones/${edicionId}/cata/progreso`
  );
  return response.data.data;
}

export async function getIncongruenciasVuelo(edicionId: string): Promise<Incongruencia[]> {
  const response = await apiClient.get<ApiResponse<Incongruencia[]>>(
    `/api/v1/admin/ediciones/${edicionId}/cata/incongruencias`
  );
  return response.data.data;
}

export async function updateEvaluacionAdmin(
  edicionId: string,
  evaluacionId: string,
  data: Partial<CreateEvaluacionInput>
): Promise<{ id: string }> {
  const response = await apiClient.patch<ApiResponse<{ id: string }>>(
    `/api/v1/admin/ediciones/${edicionId}/evaluaciones/${evaluacionId}`,
    data
  );
  return response.data.data;
}
