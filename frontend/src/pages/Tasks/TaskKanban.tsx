import { useState, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { mockTasks } from "../../data/mockTasks";
import {
  Task,
  TaskStatus,
  STATUS_LABELS,
  STATUS_COUNT_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "../../types/task";
import { CalenderIcon, ChatIcon } from "../../icons";

const ITEM_TYPE = "TASK";

const COLUMNS: TaskStatus[] = [
  "created",
  "assigned",
  "in_progress",
  "under_review",
  "completed",
];

// ─── Tabs (same style as list view) ──────────────────────────────

type TabFilter = "all" | TaskStatus;

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All Tasks" },
  { key: "created", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

// ─── Main page ───────────────────────────────────────────────────

export default function TaskKanban() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const moveTask = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    },
    []
  );

  const visibleColumns =
    activeTab === "all"
      ? COLUMNS
      : COLUMNS.filter((c) => c === activeTab);

  const countFor = (key: TabFilter) =>
    key === "all"
      ? tasks.length
      : tasks.filter((t) => t.status === key).length;

  return (
    <>
      <PageMeta title="Kanban | АРМ Психолога" description="" />
      <PageBreadCrumb pageTitle="Kanban" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const count = countFor(tab.key);
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                      : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium ${
                      isActive
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Add button */}
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
            Add New Task
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 3.33334V12.6667M3.33334 8H12.6667"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Board */}
        <DndProvider backend={HTML5Backend}>
          <div className="overflow-x-auto p-6 custom-scrollbar">
            <div className="flex gap-6" style={{ minWidth: visibleColumns.length * 320 }}>
              {visibleColumns.map((status) => (
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
  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {STATUS_LABELS[status]}
          </h3>
          <span
            className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-medium ${STATUS_COUNT_COLORS[status]}`}
          >
            {tasks.length}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="16" cy="10" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────

function KanbanCard({ task }: { task: Task }) {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { id: task.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={`cursor-grab rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] ${
        isDragging ? "opacity-50 shadow-theme-md" : ""
      }`}
    >
      {/* Title + avatar */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-gray-800 dark:text-white/90 leading-snug">
          {task.title}
        </h4>
        {task.assignee && (
          <img
            src={task.assignee.avatar}
            alt={task.assignee.name}
            className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
          />
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
        {task.dueDate && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <CalenderIcon className="h-4 w-4" />
            {task.dueDate}
          </div>
        )}

        {task.commentsCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <ChatIcon className="h-4 w-4" />
            {task.commentsCount}
          </div>
        )}

        {task.subtasksCount > 0 && (
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
            {task.subtasksCount}
          </div>
        )}
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="mt-3 flex gap-2">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
