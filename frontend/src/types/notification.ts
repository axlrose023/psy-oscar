export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  entity_type: "task" | "event" | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  unread_count: number;
}
