export type TaskStatus =
  | "created"
  | "assigned"
  | "in_progress"
  | "under_review"
  | "revision_requested"
  | "completed";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskUserResponse {
  id: string;
  username: string;
}

export interface TaskAssigneeResponse {
  user: TaskUserResponse;
  assigned_at: string;
}

export interface SubtaskResponse {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  completed_at: string | null;
  created_by: TaskUserResponse;
  assignees: TaskAssigneeResponse[];
  parent_task_id: string | null;
  subtasks: SubtaskResponse[];
  created_at: string;
  updated_at: string;
}

export interface TaskCommentResponse {
  id: number;
  text: string;
  created_at: string;
  author: TaskUserResponse;
}

export interface TaskHistoryResponse {
  id: number;
  event: string;
  description: string | null;
  created_at: string;
  changed_by: TaskUserResponse;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  created: "To Do",
  assigned: "Призначено",
  in_progress: "В роботі",
  under_review: "На перевірці",
  revision_requested: "На доопрацювання",
  completed: "Виконано",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  created: "text-gray-500",
  assigned: "text-blue-light-500",
  in_progress: "text-warning-500",
  under_review: "text-brand-500",
  revision_requested: "text-error-500",
  completed: "text-success-500",
};

export const STATUS_COUNT_COLORS: Record<TaskStatus, string> = {
  created: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  assigned: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-400",
  in_progress: "bg-warning-50 text-warning-500 dark:bg-warning-500/15 dark:text-warning-400",
  under_review: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
  revision_requested: "bg-error-50 text-error-500 dark:bg-error-500/15 dark:text-error-400",
  completed: "bg-success-50 text-success-500 dark:bg-success-500/15 dark:text-success-400",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низький",
  medium: "Середній",
  high: "Високий",
  critical: "Критичний",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  medium: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500",
  high: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
  critical: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
};
