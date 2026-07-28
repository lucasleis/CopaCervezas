import apiClient from "./client";

export interface MeResponse {
  id: string;
  email: string;
  role: "admin" | "judge" | "brewery";
}

export async function login(email: string, password: string): Promise<void> {
  await apiClient.post("/auth/login", { email, password }); // TODO: confirm path with Go/Echo backend
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout"); // TODO: confirm path with Go/Echo backend
}

export async function getMe(): Promise<MeResponse> {
  const response = await apiClient.get<MeResponse>("/auth/me"); // TODO: confirm path with Go/Echo backend
  return response.data;
}
