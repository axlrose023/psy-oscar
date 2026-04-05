import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorAlert from "../../components/common/ErrorAlert";
import { getTasks, updateTask } from "../../api/tasks";
import { useApi } from "../../hooks/useApi";
import type { Task, TaskStatus } from "../../types/task";
import {
  STATUS_LABELS,
  STATUS_COUNT_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "../../types/task";
import { CalenderIcon } from "../../icons";

const ITEM_TYPE = "TASK";

// "assigned" and "revision_requested" are merged into "created" (To Do) visually
const COLUMNS: TaskStatus[] = [
  "created",
  "in_progress",
  "under_review",
  "completed",
];

const COLUMN_LABELS: Record<string, string> = {
  created: "До виконання",
  in_progress: "В роботі",
  under_review: "На перевірці",
  completed: "Виконано",
};

export default function TaskKanban() {
  const { data, isLoading, error, refetch } = useApi(
    () => getTasks({ page: 1, page_size: 200 }),
    [],
  );

  // Local override for optimistic drag-drop
  const [overrides, setOverrides] = useState<Record<string, TaskStatus>>({});
  const [moveError, setMoveError] = useState<string | null>(null);

  const tasks = (data?.items ?? []).map((t) => {
    const s = overrides[t.id] ?? t.status;
    // assigned and revision_requested are displayed in the "created" (To Do) column
    const displayStatus: TaskStatus =
      s === "assigned" || s === "revision_requested" ? "created" : s;
    return { ...t, status: displayStatus };
  });

  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      // Optimistic update
      setOverrides((prev) => ({ ...prev, [taskId]: newStatus }));

      try {
        await updateTask(taskId, { status: newStatus });
        // Clear override before refetch so real data from server wins
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        refetch();
      } catch (err) {
        // Revert optimistic update on error
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        setMoveError(err instanceof Error ? err.message : "Не вдалося змінити статус");
        setTimeout(() => setMoveError(null), 4000);
      }
    },
    [refetch],
  );

  return (
    <>
      <PageMeta title="Kanban | АРМ Психолога" description="" />
      <PageBreadCrumb pageTitle="Kanban" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Kanban
          </h2>
        </div>

        {/* Move error toast */}
        {moveError && (
          <div className="mx-6 mt-4 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {moveError}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="p-6">
            <ErrorAlert message={error} onRetry={refetch} />
          </div>
        ) : (
          <DndProvider backend={HTML5Backend}>
            <div className="overflow-x-auto p-6 custom-scrollbar">
              <div
                className="flex gap-6"
                style={{ minWidth: COLUMNS.length * 320 }}
              >
                {COLUMNS.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    tasks={tasks.filter((t) => t.status === status)}
                    onDrop={moveTask}
                  />
                ))}
              </div>
            </div>
          </DndProvider>
        )}
      </div>
    </>
  );
}

// ─── Column ──────────────────────────────────────────────────────

function KanbanColumn({
  status,
  tasks,
  onDrop,
}: {
  status: TaskStatus;
  tasks: Task[];
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const canAcceptDrop = true; // all columns accept drops; backend actions are mapped in moveTask

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    canDrop: () => canAcceptDrop,
    drop: (item: { id: string }) => onDrop(item.id, status),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <div
      ref={drop as unknown as React.Ref<HTMLDivElement>}
      className={`w-[300px] flex-shrink-0 rounded-xl transition-colors ${
        isOver ? "bg-brand-25 dark:bg-brand-500/5" : ""
      }`}
    >
      {/* Column header */}
      <div className="mb-4 flex items-center gap-2.5">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          {COLUMN_LABELS[status] ?? STATUS_LABELS[status]}
        </h3>
        <span
          className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-medium ${STATUS_COUNT_COLORS[status]}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:text-gray-500">
            Немає задач
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function KanbanCard({ task }: { task: Task }) {
  const navigate = useNavigate();
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { id: task.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      onMouseDown={(e) => { mouseDownPos.current = { x: e.clientX, y: e.clientY }; }}
      onMouseUp={(e) => {
        if (!mouseDownPos.current) return;
        const dx = Math.abs(e.clientX - mouseDownPos.current.x);
        const dy = Math.abs(e.clientY - mouseDownPos.current.y);
        mouseDownPos.current = null;
        if (dx < 5 && dy < 5) navigate(`/tasks/${task.id}`);
      }}
      onMouseLeave={() => { mouseDownPos.current = null; }}
      className={`cursor-grab rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] ${
        isDragging ? "opacity-50 shadow-theme-md cursor-grabbing" : ""
      }`}
    >
      {/* Title + assignee */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-gray-800 dark:text-white/90 leading-snug">
          {task.title}
        </h4>
        {task.assignees.length > 0 && (
          <div
            className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            title={task.assignees[0].user.username}
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {task.assignees[0].user.username[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            PRIORITY_COLORS[task.priority]
          }`}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {task.deadline && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <CalenderIcon className="h-4 w-4" />
            {formatDate(task.deadline)}
          </div>
        )}

        {task.subtasks.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
            {task.subtasks.length}
          </div>
        )}
      </div>
    </div>
  );
}
