export type TaskStatus =
  | "created"
  | "assigned"
  | "in_progress"
  | "under_review"
  | "completed"
  | "revision_requested";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskAssignee {
  id: string;
  name: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: TaskAssignee;
  createdBy?: TaskAssignee;
  dueDate?: string;
  commentsCount: number;
  subtasksCount: number;
  tags: string[];
  createdAt: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  created: "To Do",
  assigned: "Assigned",
  in_progress: "In Progress",
  under_review: "Under Review",
  completed: "Completed",
  revision_requested: "Revision",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  created: "text-gray-500",
  assigned: "text-blue-light-500",
  in_progress: "text-warning-500",
  under_review: "text-theme-purple-500",
  completed: "text-success-500",
  revision_requested: "text-error-500",
};

export const STATUS_COUNT_COLORS: Record<TaskStatus, string> = {
  created: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  assigned: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-400",
  in_progress: "bg-warning-50 text-warning-500 dark:bg-warning-500/15 dark:text-warning-400",
  under_review: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
  completed: "bg-success-50 text-success-500 dark:bg-success-500/15 dark:text-success-400",
  revision_requested: "bg-error-50 text-error-500 dark:bg-error-500/15 dark:text-error-400",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  medium: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500",
  high: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
  critical: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
};
