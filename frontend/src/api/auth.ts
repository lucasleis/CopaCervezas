import apiClient from "./client";
import { setAccessToken } from "./client";

export type Role = "admin" | "judge" | "brewery";

export interface OrgOption {
  id: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  access_token?: string;
  token_type?: string;
  requires_org_selection?: boolean;
  orgs?: OrgOption[];
}

export interface MeResponse {
  id: string;
  email: string;
  role: Role;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", {
    email,
    password,
  });
  if (response.data.access_token) {
    setAccessToken(response.data.access_token);
  }
  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
  setAccessToken(null);
}

export async function getMe(): Promise<MeResponse> {
  const response = await apiClient.get<MeResponse>("/auth/me");
  return response.data;
}

export async function selectOrg(orgId: string): Promise<void> {
  const response = await apiClient.post<{ access_token: string; token_type: string }>(
    "/auth/select-org",
    { org_id: orgId }
  );
  setAccessToken(response.data.access_token);
}

export interface MessageResponse {
  message: string;
}

export async function register(data: {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
}): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/register", data);
  return response.data;
}

export async function verifyEmail(token: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/verify-email", { token });
  return response.data;
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/forgot-password", { email });
  return response.data;
}

export async function resetPassword(data: {
  token: string;
  password: string;
}): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/reset-password", data);
  return response.data;
}

export async function setPassword(data: {
  token: string;
  password: string;
}): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/auth/set-password", data);
  return response.data;
}

export async function invitarJuez(data: {
  email: string;
  nombre: string;
  apellido: string;
}): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>("/api/v1/admin/usuarios/invitar", {
    ...data,
    rol: "judge",
  });
  return response.data;
}
