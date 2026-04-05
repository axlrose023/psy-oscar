import { apiClient } from "./client";
import type { PaginatedResponse } from "../types/api";
import type {
  UserShort,
  UserDetail,
  UserFamilyMember,
  UserEducation,
  UserCourse,
  UserDiscipline,
  UserDocument,
} from "../types/user";

// ─── List / Detail ──────────────────────────────────────────────

export async function getUsers(
  params?: Record<string, unknown>,
): Promise<PaginatedResponse<UserShort>> {
  return apiClient.get("/users", params);
}

export async function getUser(id: string): Promise<UserDetail> {
  return apiClient.get(`/users/${id}`);
}

export async function getMe(): Promise<UserDetail> {
  return apiClient.get("/users/me");
}

// ─── Profile update ─────────────────────────────────────────────

export async function updateMe(
  data: Record<string, unknown>,
): Promise<UserDetail> {
  return apiClient.patch("/users/me", data);
}

export async function updateUser(
  id: string,
  data: Record<string, unknown>,
): Promise<UserDetail> {
  return apiClient.patch(`/users/${id}`, data);
}

export async function changePassword(data: {
  old_password: string;
  new_password: string;
}): Promise<void> {
  return apiClient.put("/users/me/password", data);
}

// ─── Admin: create user ─────────────────────────────────────────

export async function createUser(data: {
  username: string;
  password: string;
  role?: string;
}): Promise<UserShort> {
  return apiClient.post("/users", data);
}

// ─── /me related entities CRUD ──────────────────────────────────

type RelatedEntity = "family-members" | "education" | "courses" | "disciplines" | "documents";

export async function getMyRelated<T>(entity: RelatedEntity): Promise<T[]> {
  return apiClient.get(`/users/me/${entity}`);
}

export async function createMyRelated<T>(
  entity: RelatedEntity,
  data: Record<string, unknown>,
): Promise<T> {
  return apiClient.post(`/users/me/${entity}`, data);
}

export async function updateMyRelated<T>(
  entity: RelatedEntity,
  entryId: string,
  data: Record<string, unknown>,
): Promise<T> {
  return apiClient.patch(`/users/me/${entity}/${entryId}`, data);
}

export async function deleteMyRelated(
  entity: RelatedEntity,
  entryId: string,
): Promise<void> {
  return apiClient.del(`/users/me/${entity}/${entryId}`);
}

// ─── Admin: /users/{id} related entities CRUD ───────────────────

export async function createUserRelated<T>(
  userId: string,
  entity: RelatedEntity,
  data: Record<string, unknown>,
): Promise<T> {
  return apiClient.post(`/users/${userId}/${entity}`, data);
}

export async function updateUserRelated<T>(
  userId: string,
  entity: RelatedEntity,
  entryId: string,
  data: Record<string, unknown>,
): Promise<T> {
  return apiClient.patch(`/users/${userId}/${entity}/${entryId}`, data);
}

export async function deleteUserRelated(
  userId: string,
  entity: RelatedEntity,
  entryId: string,
): Promise<void> {
  return apiClient.del(`/users/${userId}/${entity}/${entryId}`);
}

// Re-export types for convenience
export type {
  UserShort,
  UserDetail,
  UserFamilyMember,
  UserEducation,
  UserCourse,
  UserDiscipline,
  UserDocument,
};
