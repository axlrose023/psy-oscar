import { apiClient } from "./client";
import type { Notification, NotificationListResponse } from "../types/notification";

export async function getNotifications(): Promise<NotificationListResponse> {
  return apiClient.get<NotificationListResponse>("/notifications");
}

export async function markNotificationRead(id: number): Promise<Notification> {
  return apiClient.patch<Notification>(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  return apiClient.post<void>("/notifications/read-all");
}
