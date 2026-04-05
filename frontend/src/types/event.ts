// ─── Enums ──────────────────────────────────────────────────────

export type EventStatus =
  | "draft"
  | "planned"
  | "completed"
  | "postponed"
  | "overdue"
  | "cancelled";

export type ActivityType =
  | "ppv"
  | "ppsp"
  | "adaptation"
  | "screening"
  | "spd"
  | "aid"
  | "recovery"
  | "other";

export type PersonnelCategory =
  | "officer"
  | "contract"
  | "employee"
  | "family";

// ─── Labels ─────────────────────────────────────────────────────

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Чернетка",
  planned: "Заплановано",
  completed: "Виконано",
  postponed: "Відкладено",
  overdue: "Прострочено",
  cancelled: "Скасовано",
};

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  planned: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  completed: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  postponed: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
  overdue: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

export const EVENT_STATUS_CALENDAR_COLORS: Record<EventStatus, string> = {
  draft: "#6b7280",
  planned: "#465fff",
  completed: "#22c55e",
  postponed: "#f59e0b",
  overdue: "#ef4444",
  cancelled: "#9ca3af",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  ppv: "ППВ",
  ppsp: "ППсП",
  adaptation: "Адаптація",
  screening: "Скринінг",
  spd: "СПД",
  aid: "Допомога",
  recovery: "Відновлення",
  other: "Інше",
};

export const PERSONNEL_LABELS: Record<PersonnelCategory, string> = {
  officer: "Офіцер",
  contract: "Контрактник",
  employee: "Працівник",
  family: "Член сім'ї",
};

// ─── Response types ─────────────────────────────────────────────

export interface EventUserResponse {
  id: string;
  username: string;
}

export interface EventResponse {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  activity_type: ActivityType;
  content: string | null;
  target_unit: string | null;
  respondent_id: string | null;
  respondent_name: string | null;
  personnel_category: PersonnelCategory | null;
  planned_count: number | null;
  actual_count: number | null;
  is_controlled: boolean;
  control_source: string | null;
  execution_deadline: string | null;
  status: EventStatus;
  result: string | null;
  status_reason: string | null;
  psychologist: EventUserResponse;
  created_by: EventUserResponse;
  task_id: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventHistoryResponse {
  id: number;
  event_type: string;
  description: string | null;
  created_at: string;
  changed_by: EventUserResponse | null;
}

// ─── Request types ──────────────────────────────────────────────

export interface CreateEventRequest {
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  activity_type: ActivityType;
  content?: string | null;
  target_unit?: string | null;
  respondent_id?: string | null;
  respondent_name?: string | null;
  personnel_category?: PersonnelCategory | null;
  planned_count?: number | null;
  actual_count?: number | null;
  is_controlled?: boolean;
  control_source?: string | null;
  execution_deadline?: string | null;
  status?: EventStatus;
  result?: string | null;
  psychologist_id: string;
  task_id?: string | null;
}

export interface UpdateEventRequest {
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  activity_type?: ActivityType | null;
  content?: string | null;
  target_unit?: string | null;
  respondent_id?: string | null;
  respondent_name?: string | null;
  personnel_category?: PersonnelCategory | null;
  planned_count?: number | null;
  actual_count?: number | null;
  is_controlled?: boolean | null;
  control_source?: string | null;
  execution_deadline?: string | null;
  result?: string | null;
}
