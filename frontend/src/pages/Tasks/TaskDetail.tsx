import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorAlert from "../../components/common/ErrorAlert";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import EventFormModal from "../../components/events/EventFormModal";
import {
  getTask,
  getTaskComments,
  getTaskHistory,
  addTaskComment,
  startTask,
  submitTask,
  requestRevision,
  approveTask,
  assignTask,
  unassignTask,
  updateTask,
} from "../../api/tasks";
import { getUsers } from "../../api/users";
import type {
  Task,
  TaskStatus,
  TaskCommentResponse,
  TaskPriority,
  TaskUserResponse,
} from "../../types/task";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
} from "../../types/task";
import { CalenderIcon } from "../../icons";

type TabKey = "details" | "comments" | "history";

const STATUS_BADGE_COLOR: Record<TaskStatus, "light" | "primary" | "success" | "warning" | "error" | "info"> = {
  created: "light",
  assigned: "info",
  in_progress: "warning",
  under_review: "primary",
  revision_requested: "error",
  completed: "success",
};

const PRIORITY_BADGE_COLOR: Record<string, "light" | "primary" | "success" | "warning" | "error" | "info"> = {
  low: "success",
  medium: "info",
  high: "warning",
  critical: "error",
};

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  const {
    data: task,
    isLoading,
    error,
    refetch,
  } = useApi(() => getTask(taskId!), [taskId]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;
  if (!task) return null;

  const isAdmin = user?.role === "admin";
  const isAssigned = task.assignees.some((a) => a.user.id === user?.id);

  return (
    <>
      <PageMeta title={`${task.title} | АРМ Психолога`} description="" />
      <PageBreadCrumb pageTitle={task.title} />

      {/* Header card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-3">
              {task.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Badge size="sm" color={STATUS_BADGE_COLOR[task.status]}>
                {STATUS_LABELS[task.status]}
              </Badge>
              <Badge size="sm" color={PRIORITY_BADGE_COLOR[task.priority]}>
                {PRIORITY_LABELS[task.priority]}
              </Badge>
              {task.deadline && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <CalenderIcon className="h-4 w-4" />
                  {formatDate(task.deadline)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <TaskActions
            task={task}
            isAdmin={isAdmin}
            isAssigned={isAssigned}
            onRefresh={refetch}
            psychologistId={user?.id}
          />
        </div>

        {task.description && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Meta info */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-gray-200 pt-5 dark:border-gray-800">
          <MetaItem label="Автор" value={<UserLink user={task.created_by} />} />
          <MetaItem
            label="Виконавці"
            value={
              task.assignees.length > 0
                ? <UserLinks users={task.assignees.map((a) => a.user)} />
                : "Не призначено"
            }
          />
          <MetaItem label="Створено" value={formatDateTime(task.created_at)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 px-6 py-4 no-scrollbar dark:border-gray-800">
          {(
            [
              { key: "details" as TabKey, label: `Підзадачі${task.subtasks.length > 0 ? ` (${task.subtasks.length})` : ""}` },
              { key: "comments" as TabKey, label: "Коментарі" },
              { key: "history" as TabKey, label: "Історія" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "details" && <SubtasksList task={task} />}
          {activeTab === "comments" && <CommentsTab taskId={taskId!} />}
          {activeTab === "history" && <HistoryTab taskId={taskId!} />}
        </div>
      </div>
    </>
  );
}

// ─── Actions ─────────────────────────────────────────────────────

function TaskActions({
  task,
  isAdmin,
  isAssigned,
  onRefresh,
  psychologistId,
}: {
  task: Task;
  isAdmin: boolean;
  isAssigned: boolean;
  onRefresh: () => void;
  psychologistId?: string;
}) {
  const [loading, setLoading] = useState("");
  const revisionModal = useModal();
  const assignModal = useModal();
  const eventModal = useModal();
  const editModal = useModal();
  const [revisionComment, setRevisionComment] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const currentAssigneeIds = task.assignees.map((a) => a.user.id);

  const { data: usersData, isLoading: usersLoading, error: usersError } = useApi(
    () => (assignModal.isOpen ? getUsers({ page: 1, page_size: 500 }) : Promise.resolve(null)),
    [assignModal.isOpen],
  );

  const assignableUsers = (usersData?.items ?? [])
    .filter((u) => u.role !== "respondent")
    .filter((u) => u.username.toLowerCase().includes(userSearch.toLowerCase()))
    .sort((a, b) => a.username.localeCompare(b.username, "uk"));

  const hasAssignmentChanges =
    selectedUserIds.length !== currentAssigneeIds.length
    || selectedUserIds.some((id) => !currentAssigneeIds.includes(id));

  useEffect(() => {
    if (!assignModal.isOpen) return;
    setUserSearch("");
    setSelectedUserIds(currentAssigneeIds);
  }, [assignModal.isOpen, task.id, task.assignees]);

  async function handleAction(action: () => Promise<unknown>, key: string) {
    setLoading(key);
    try {
      await action();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Помилка");
    } finally {
      setLoading("");
    }
  }

  async function handleSaveAssignees() {
    const idsToAdd = selectedUserIds.filter((id) => !currentAssigneeIds.includes(id));
    const idsToRemove = currentAssigneeIds.filter((id) => !selectedUserIds.includes(id));

    setLoading("assign");
    try {
      if (idsToRemove.length > 0) {
        await unassignTask(task.id, idsToRemove);
      }
      if (idsToAdd.length > 0) {
        await assignTask(task.id, idsToAdd);
      }
      assignModal.closeModal();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Помилка");
    } finally {
      setLoading("");
    }
  }

  const actions: { label: string; key: string; action: () => Promise<unknown>; color: "primary" | "outline" }[] = [];

  // Psychologist actions
  if (isAssigned && (task.status === "assigned" || task.status === "revision_requested")) {
    actions.push({
      label: "Почати роботу",
      key: "start",
      action: () => startTask(task.id),
      color: "primary",
    });
  }
  if (isAssigned && task.status === "in_progress") {
    actions.push({
      label: "На перевірку",
      key: "submit",
      action: () => submitTask(task.id),
      color: "primary",
    });
  }

  // Admin actions
  if (isAdmin && task.status === "under_review") {
    actions.push({
      label: "Затвердити",
      key: "approve",
      action: () => approveTask(task.id),
      color: "primary",
    });
    actions.push({
      label: "На доопрацювання",
      key: "revision",
      action: async () => revisionModal.openModal(),
      color: "outline",
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isAdmin && task.status !== "completed" && (
        <Button size="sm" variant="outline" onClick={editModal.openModal}>
          Редагувати
        </Button>
      )}

      {actions.map((a) => (
        <Button
          key={a.key}
          size="sm"
          variant={a.color}
          disabled={loading === a.key}
          onClick={() => handleAction(a.action, a.key)}
        >
          {loading === a.key ? "..." : a.label}
        </Button>
      ))}

      {isAdmin && task.status !== "completed" && (
        <Button
          size="sm"
          variant="outline"
          onClick={assignModal.openModal}
        >
          {task.assignees.length > 0 ? "Керувати виконавцями" : "Призначити"}
        </Button>
      )}

      {psychologistId && (isAdmin || isAssigned) && (
        <Button size="sm" variant="outline" onClick={eventModal.openModal}>
          Додати подію
        </Button>
      )}

      {/* Revision modal */}
      <Modal isOpen={revisionModal.isOpen} onClose={revisionModal.closeModal} className="max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Повернути на доопрацювання
        </h3>
        <textarea
          value={revisionComment}
          onChange={(e) => setRevisionComment(e.target.value)}
          placeholder="Коментар..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={revisionModal.closeModal}>
            Скасувати
          </Button>
          <Button
            size="sm"
            disabled={!revisionComment.trim()}
            onClick={async () => {
              await handleAction(() => requestRevision(task.id, revisionComment), "revision");
              setRevisionComment("");
              revisionModal.closeModal();
            }}
          >
            Відправити
          </Button>
        </div>
      </Modal>

      <TaskEditModal
        task={task}
        isOpen={editModal.isOpen}
        onClose={editModal.closeModal}
        onSaved={onRefresh}
      />

      {/* Assign modal */}
      <Modal isOpen={assignModal.isOpen} onClose={assignModal.closeModal} className="max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          {task.assignees.length > 0 ? "Керувати виконавцями" : "Призначити виконавців"}
        </h3>
        <div className="mb-3">
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Пошук користувача"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-2">
          {usersLoading && (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          )}
          {usersError && (
            <div className="rounded-lg border border-error-300 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {usersError}
            </div>
          )}
          {!usersLoading && !usersError && assignableUsers.map((u) => {
            const isSelected = selectedUserIds.includes(u.id);
            return (
              <label
                key={u.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  isSelected ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    setSelectedUserIds((prev) =>
                      prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-800 dark:text-white/90">
                  {u.username}
                </span>
                {currentAssigneeIds.includes(u.id) && (
                  <span className="text-xs text-gray-400">(поточний виконавець)</span>
                )}
              </label>
            );
          })}
          {!usersLoading && !usersError && assignableUsers.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              Користувачів не знайдено
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={assignModal.closeModal}>
            Скасувати
          </Button>
          <Button
            size="sm"
            disabled={!hasAssignmentChanges || loading === "assign"}
            onClick={handleSaveAssignees}
          >
            {loading === "assign" ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
      </Modal>

      {psychologistId && (
        <EventFormModal
          isOpen={eventModal.isOpen}
          onClose={eventModal.closeModal}
          onCreated={onRefresh}
          psychologistId={psychologistId}
          linkedTaskId={task.id}
          linkedTaskLabel={task.title}
        />
      )}
    </div>
  );
}

// ─── Subtasks ────────────────────────────────────────────────────

function SubtasksList({ task }: { task: Task }) {
  if (task.subtasks.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
        Підзадач немає
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {task.subtasks.map((sub) => (
        <Link
          key={sub.id}
          to={`/tasks/${sub.id}`}
          className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
        >
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] ${
              sub.status === "completed"
                ? "border-brand-500 bg-brand-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            {sub.status === "completed" && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span
            className={`flex-1 text-sm ${
              sub.status === "completed"
                ? "text-gray-400 line-through"
                : "text-gray-800 dark:text-white/90"
            }`}
          >
            {sub.title}
          </span>
          <Badge size="sm" color={STATUS_BADGE_COLOR[sub.status]}>
            {STATUS_LABELS[sub.status]}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

// ─── Comments ────────────────────────────────────────────────────

function CommentsTab({ taskId }: { taskId: string }) {
  const { data: comments, isLoading, error, refetch } = useApi(
    () => getTaskComments(taskId),
    [taskId],
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addTaskComment(taskId, text.trim());
      setText("");
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Помилка");
    } finally {
      setSending(false);
    }
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;

  return (
    <div>
      {/* Comment input */}
      <div className="mb-6 flex gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написати коментар..."
          rows={2}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 placeholder:text-gray-400 dark:placeholder:text-white/30"
        />
        <Button size="sm" disabled={sending || !text.trim()} onClick={handleSend}>
          {sending ? "..." : "Надіслати"}
        </Button>
      </div>

      {/* Comments list */}
      {(!comments || comments.length === 0) ? (
        <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
          Коментарів немає
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentCard key={c.id} comment={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentCard({ comment }: { comment: TaskCommentResponse }) {
  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {comment.author.username[0]?.toUpperCase()}
            </span>
          </div>
          <UserLink user={comment.author} />
        </div>
        <span className="text-xs text-gray-400">{formatDateTime(comment.created_at)}</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {comment.text}
      </p>
    </div>
  );
}

// ─── History ─────────────────────────────────────────────────────

function HistoryTab({ taskId }: { taskId: string }) {
  const { data: history, isLoading, error, refetch } = useApi(
    () => getTaskHistory(taskId),
    [taskId],
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;

  if (!history || history.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
        Історії немає
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((h) => (
        <div key={h.id} className="flex gap-3">
          <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <UserLink user={h.changed_by} />
              <span className="text-xs text-gray-400">{formatDateTime(h.created_at)}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{h.event}</span>
              {h.description && ` — ${h.description}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function TaskEditModal({
  task,
  isOpen,
  onClose,
  onSaved,
}: {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setDeadline(toDateTimeLocalValue(task.deadline));
    setError("");
  }, [isOpen, task]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError("");
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      onClose();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка оновлення");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 lg:p-8">
      <h3 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Редагувати задачу
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-error-300 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Назва <span className="text-error-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Опис</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
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
              {(["low", "medium", "high", "critical"] as TaskPriority[]).map((level) => (
                <option key={level} value={level}>
                  {PRIORITY_LABELS[level]}
                </option>
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
          <Button size="sm" variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button size="sm" type="submit" disabled={saving || !title.trim()}>
            {saving ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UserLink({ user }: { user: TaskUserResponse }) {
  return (
    <Link
      to={`/users/${user.id}`}
      className="text-sm font-medium text-gray-800 transition-colors hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
    >
      {user.username}
    </Link>
  );
}

function UserLinks({ users }: { users: TaskUserResponse[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {users.map((user) => (
        <UserLink key={user.id} user={user} />
      ))}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">{label}</p>
      <div className="mt-1 text-sm text-gray-800 dark:text-white/90">{value}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return "";

  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}
