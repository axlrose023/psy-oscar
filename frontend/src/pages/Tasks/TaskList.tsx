import { useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorAlert from "../../components/common/ErrorAlert";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { getTasks, createTask } from "../../api/tasks";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import type {
  Task,
  TaskStatus,
  TaskPriority,
} from "../../types/task";
import {
  STATUS_LABELS,
  STATUS_COUNT_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "../../types/task";
import { CalenderIcon } from "../../icons";

type TabFilter = "all" | TaskStatus;

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "Усі" },
  { key: "created", label: "Нові" },
  { key: "assigned", label: "Призначені" },
  { key: "in_progress", label: "В роботі" },
  { key: "under_review", label: "На перевірці" },
  { key: "completed", label: "Виконані" },
];

export default function TaskList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [page, setPage] = useState(1);
  const createModal = useModal();

  const statusFilter = activeTab === "all" ? undefined : activeTab;

  const { data, isLoading, error, refetch } = useApi(
    () =>
      getTasks({
        page,
        page_size: 50,
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
    [page, statusFilter],
  );

  const tasks = data?.items ?? [];

  // Group by status in fixed order
  const STATUS_ORDER: TaskStatus[] = ["created", "assigned", "in_progress", "under_review", "revision_requested", "completed"];
  const grouped: { status: TaskStatus; label: string; tasks: Task[] }[] = STATUS_ORDER
    .map((s) => ({ status: s, label: STATUS_LABELS[s], tasks: tasks.filter((t) => t.status === s) }))
    .filter((g) => g.tasks.length > 0);

  return (
    <>
      <PageMeta title="Задачі | АРМ Психолога" description="" />
      <PageBreadCrumb pageTitle="Задачі" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                      : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <Button size="sm" onClick={createModal.openModal}>
              Додати задачу
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.33334V12.6667M3.33334 8H12.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="p-6">
            <ErrorAlert message={error} onRetry={refetch} />
          </div>
        ) : (
          <>
            {/* Task groups */}
            <div className="p-6">
              {Object.entries(grouped).length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  Задач не знайдено
                </p>
              )}
              {grouped.map(({ status, label, tasks: groupTasks }) => (
                <div key={status} className="mb-8 last:mb-0">
                  {/* Group header */}
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                      {label}
                    </h3>
                    <span
                      className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-medium ${STATUS_COUNT_COLORS[status]}`}
                    >
                      {groupTasks.length}
                    </span>
                  </div>

                  {/* Task rows */}
                  <div className="flex flex-col gap-3">
                    {groupTasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Сторінка {data.page} з {data.total_pages} (всього {data.total})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.has_prev}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
                  >
                    Назад
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.has_next}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
                  >
                    Далі
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CreateTaskModal
        isOpen={createModal.isOpen}
        onClose={createModal.closeModal}
        onCreated={refetch}
      />
    </>
  );
}

// ─── Create Task Modal ───────────────────────────────────────────

function CreateTaskModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDeadline("");
      onClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка створення");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 lg:p-8">
      <h3 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Нова задача
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-error-300 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            ��азва <span className="text-error-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            placeholder="Введіть назву задачі"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Опис</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            placeholder="Опис задачі (необов'язково)"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Пріоритет</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            >
              {(["low", "medium", "high", "critical"] as TaskPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Дедлайн</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>Скасувати</Button>
          <Button size="sm" type="submit" disabled={saving || !title.trim()}>
            {saving ? "Створення..." : "Створити"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function TaskRow({ task }: { task: Task }) {
  const isCompleted = task.status === "completed";

  return (
    <Link to={`/tasks/${task.id}`} className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-shadow hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Checkbox */}
      <div className="flex-shrink-0">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] transition-colors ${
            isCompleted
              ? "border-brand-500 bg-brand-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
        >
          {isCompleted && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Title */}
      <span
        className={`flex-1 text-sm font-medium ${
          isCompleted
            ? "text-gray-400 line-through dark:text-gray-500"
            : "text-gray-800 dark:text-white/90"
        }`}
      >
        {task.title}
      </span>

      {/* Priority */}
      <span
        className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${
          PRIORITY_COLORS[task.priority]
        }`}
      >
        {PRIORITY_LABELS[task.priority]}
      </span>

      {/* Deadline */}
      {task.deadline && (
        <div className="hidden items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 md:flex">
          <CalenderIcon className="h-4 w-4" />
          {formatDate(task.deadline)}
        </div>
      )}

      {/* Assignee */}
      {task.assignees.length > 0 && (
        <div className="flex items-center gap-1">
          {task.assignees.slice(0, 2).map((a) => (
            <div
              key={a.user.id}
              className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
              title={a.user.username}
            >
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {a.user.username[0]?.toUpperCase()}
              </span>
            </div>
          ))}
          {task.assignees.length > 2 && (
            <span className="text-xs text-gray-400">+{task.assignees.length - 2}</span>
          )}
        </div>
      )}
    </Link>
  );
}
