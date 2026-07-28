import apiClient from "./client";
import { setAccessToken } from "./client";

export type Role = "admin" | "judge" | "brewery";

export interface LoginResponse {
  access_token: string;
  token_type: string;
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
  setAccessToken(response.data.access_token);
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
