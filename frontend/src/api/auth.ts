import { apiClient, tokenStore } from "./client";
import type { LoginRequest, TokenPairResponse } from "../types/auth";

export async function login(data: LoginRequest): Promise<TokenPairResponse> {
  const res = await apiClient.post<TokenPairResponse>("/auth/login", data);
  tokenStore.setTokens(res.access_token, res.refresh_token);
  return res;
}

export async function refreshToken(token: string): Promise<TokenPairResponse> {
  return apiClient.post<TokenPairResponse>("/auth/refresh", {
    refresh_token: token,
  });
}
