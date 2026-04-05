import { apiClient } from "./client";
import type { PaginatedResponse } from "../types/api";
import type { Task, TaskCommentResponse, TaskHistoryResponse } from "../types/task";

// ─── List / Detail ──────────────────────────────────────────────

export async function getTasks(
  params?: Record<string, unknown>,
): Promise<PaginatedResponse<Task>> {
  return apiClient.get("/tasks", params);
}

export async function getTask(id: string): Promise<Task> {
  return apiClient.get(`/tasks/${id}`);
}

// ─── Admin: CRUD ────────────────────────────────────────────────

export async function createTask(data: Record<string, unknown>): Promise<Task> {
  return apiClient.post("/tasks", data);
}

export async function updateTask(
  id: string,
  data: Record<string, unknown>,
): Promise<Task> {
  return apiClient.patch(`/tasks/${id}`, data);
}

export async function deleteTask(id: string): Promise<void> {
  return apiClient.del(`/tasks/${id}`);
}

// ─── Admin: assign / unassign ───────────────────────────────────

export async function assignTask(
  id: string,
  assignedToIds: string[],
): Promise<Task> {
  return apiClient.post(`/tasks/${id}/assign`, {
    assigned_to_ids: assignedToIds,
  });
}

export async function unassignTask(
  id: string,
  userIds: string[],
): Promise<Task> {
  return apiClient.post(`/tasks/${id}/unassign`, { user_ids: userIds });
}

// ─── Workflow ───────────────────────────────────────────────────

export async function startTask(id: string): Promise<Task> {
  return apiClient.post(`/tasks/${id}/start`);
}

export async function submitTask(id: string): Promise<Task> {
  return apiClient.post(`/tasks/${id}/submit`);
}

export async function requestRevision(
  id: string,
  comment: string,
): Promise<Task> {
  return apiClient.post(`/tasks/${id}/request-revision`, { comment });
}

export async function approveTask(id: string): Promise<Task> {
  return apiClient.post(`/tasks/${id}/approve`);
}


// ─── Comments ───────────────────────────────────────────────────

export async function getTaskComments(
  id: string,
): Promise<TaskCommentResponse[]> {
  return apiClient.get(`/tasks/${id}/comments`);
}

export async function addTaskComment(
  id: string,
  text: string,
): Promise<TaskCommentResponse> {
  return apiClient.post(`/tasks/${id}/comments`, { text });
}

// ─── History ────────────────────────────────────────────────────

export async function getTaskHistory(
  id: string,
): Promise<TaskHistoryResponse[]> {
  return apiClient.get(`/tasks/${id}/history`);
}
