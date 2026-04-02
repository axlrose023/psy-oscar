import { useState } from "react";
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

type TabFilter = "all" | TaskStatus;

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All Tasks" },
  { key: "created", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "under_review", label: "Under Review" },
  { key: "completed", label: "Completed" },
];

export default function TaskList() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const filtered =
    activeTab === "all"
      ? mockTasks
      : mockTasks.filter((t) => t.status === activeTab);

  const countFor = (key: TabFilter) =>
    key === "all"
      ? mockTasks.length
      : mockTasks.filter((t) => t.status === key).length;

  // Group by status for list view
  const grouped: Record<string, Task[]> = {};
  for (const task of filtered) {
    const label = STATUS_LABELS[task.status];
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(task);
  }

  return (
    <>
      <PageMeta title="Task List | АРМ Психолога" description="" />
      <PageBreadCrumb pageTitle="Task List" />

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

        {/* Task groups */}
        <div className="p-6">
          {Object.entries(grouped).map(([statusLabel, tasks]) => (
            <div key={statusLabel} className="mb-8 last:mb-0">
              {/* Group header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {statusLabel}
                  </h3>
                  <span
                    className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-medium ${
                      STATUS_COUNT_COLORS[
                        tasks[0]?.status ?? "created"
                      ]
                    }`}
                  >
                    {tasks.length}
                  </span>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <circle cx="4" cy="10" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="16" cy="10" r="1.5" />
                  </svg>
                </button>
              </div>

              {/* Task rows */}
              <div className="flex flex-col gap-3">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TaskRow({ task }: { task: Task }) {
  const isCompleted = task.status === "completed";

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-shadow hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Drag handle */}
      <div className="hidden cursor-grab text-gray-300 dark:text-gray-600 sm:block">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1" />
          <circle cx="11" cy="3" r="1" />
          <circle cx="5" cy="8" r="1" />
          <circle cx="11" cy="8" r="1" />
          <circle cx="5" cy="13" r="1" />
          <circle cx="11" cy="13" r="1" />
        </svg>
      </div>

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
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
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

      {/* Tag */}
      {task.tags[0] && (
        <span
          className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${
            PRIORITY_COLORS[task.priority]
          }`}
        >
          {task.tags[0]}
        </span>
      )}

      {/* Due date */}
      {task.dueDate && (
        <div className="hidden items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 md:flex">
          <CalenderIcon className="h-4 w-4" />
          {task.dueDate}
        </div>
      )}

      {/* Comments */}
      {task.commentsCount > 0 && (
        <div className="hidden items-center gap-1 text-sm text-gray-500 dark:text-gray-400 md:flex">
          <ChatIcon className="h-4 w-4" />
          {task.commentsCount}
        </div>
      )}

      {/* Subtasks */}
      {task.subtasksCount > 0 && (
        <div className="hidden items-center gap-1 text-sm text-gray-500 dark:text-gray-400 md:flex">
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

      {/* Assignee */}
      {task.assignee && (
        <img
          src={task.assignee.avatar}
          alt={task.assignee.name}
          className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
        />
      )}
    </div>
  );
}
