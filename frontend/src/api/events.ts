import { apiClient } from "./client";
import type { PaginatedResponse } from "../types/api";
import type {
  EventResponse,
  EventHistoryResponse,
  CreateEventRequest,
  UpdateEventRequest,
} from "../types/event";

// ─── List / Detail ──────────────────────────────────────────────

export async function getEvents(
  params?: Record<string, unknown>,
): Promise<PaginatedResponse<EventResponse>> {
  return apiClient.get("/events", params);
}

export async function getEvent(id: string): Promise<EventResponse> {
  return apiClient.get(`/events/${id}`);
}

// ─── CRUD ───────────────────────────────────────────────────────

export async function createEvent(
  data: CreateEventRequest,
): Promise<EventResponse> {
  return apiClient.post("/events", data);
}

export async function updateEvent(
  id: string,
  data: UpdateEventRequest,
): Promise<EventResponse> {
  return apiClient.patch(`/events/${id}`, data);
}

export async function deleteEvent(id: string): Promise<void> {
  return apiClient.del(`/events/${id}`);
}

// ─── Workflow ───────────────────────────────────────────────────

export async function completeEvent(
  id: string,
  data?: { result?: string; actual_count?: number },
): Promise<EventResponse> {
  return apiClient.post(`/events/${id}/complete`, data ?? {});
}

export async function postponeEvent(
  id: string,
  data: { reason: string; new_date?: string },
): Promise<EventResponse> {
  return apiClient.post(`/events/${id}/postpone`, data);
}

export async function cancelEvent(
  id: string,
  data: { reason: string },
): Promise<EventResponse> {
  return apiClient.post(`/events/${id}/cancel`, data);
}

export async function archiveEvent(id: string): Promise<EventResponse> {
  return apiClient.post(`/events/${id}/archive`);
}

// ─── History ────────────────────────────────────────────────────

export async function getEventHistory(
  id: string,
): Promise<EventHistoryResponse[]> {
  return apiClient.get(`/events/${id}/history`);
}
