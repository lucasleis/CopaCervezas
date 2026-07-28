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
