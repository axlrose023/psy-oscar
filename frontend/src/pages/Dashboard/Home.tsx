import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Badge from "../../components/ui/badge/Badge";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { getTasks } from "../../api/tasks";
import { getEvents } from "../../api/events";
import { getUsers } from "../../api/users";
import type { TaskStatus } from "../../types/task";
import {
  STATUS_LABELS,
  STATUS_COUNT_COLORS,
} from "../../types/task";
import type { Task } from "../../types/task";
import {
  EVENT_STATUS_LABELS,
  ACTIVITY_LABELS,
} from "../../types/event";
import type { EventResponse, EventStatus } from "../../types/event";
import { CalenderIcon, GroupIcon, ListIcon, TaskIcon } from "../../icons";

const EVENT_BADGE_COLOR: Record<EventStatus, "light" | "primary" | "success" | "warning" | "error"> = {
  draft: "light",
  planned: "primary",
  completed: "success",
  postponed: "warning",
  overdue: "error",
  cancelled: "light",
};

const STATUS_BAR_COLORS: Record<TaskStatus, string> = {
  created: "bg-gray-400",
  assigned: "bg-blue-light-500",
  in_progress: "bg-warning-500",
  under_review: "bg-brand-500",
  revision_requested: "bg-error-500",
  completed: "bg-success-500",
};

export default function Home() {
  const { user } = useAuth();

  const { data: tasksData, isLoading: tasksLoading } = useApi(
    () => getTasks({ page: 1, page_size: 200 }),
    [],
  );
  const { data: eventsData, isLoading: eventsLoading } = useApi(
    () => getEvents({ page: 1, page_size: 10 }),
    [],
  );
  const { data: usersData } = useApi(
    () => getUsers({ page: 1, page_size: 1 }),
    [],
  );

  const tasks = tasksData?.items ?? [];
  const events = eventsData?.items ?? [];

  // Compute stats
  const tasksByStatus: Record<string, number> = {};
  for (const t of tasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
  }

  const completedCount = tasksByStatus["completed"] ?? 0;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const fullName = user
    ? [user.last_name, user.first_name].filter(Boolean).join(" ") || user.username
    : "";

  return (
    <>
      <PageMeta title="Головна | АРМ Психолога" description="" />

      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Вітаємо, {fullName}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Ваша панель керування
        </p>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <MetricCard
          icon={<TaskIcon className="h-6 w-6" />}
          label="Усього задач"
          value={String(tasks.length)}
          color="brand"
          link="/tasks/list"
        />
        <MetricCard
          icon={<ListIcon className="h-6 w-6" />}
          label="В роботі"
          value={String(tasksByStatus["in_progress"] ?? 0)}
          color="warning"
          link="/tasks/list"
        />
        <MetricCard
          icon={<CalenderIcon className="h-6 w-6" />}
          label="Подій"
          value={String(eventsData?.total ?? 0)}
          color="success"
          link="/events"
        />
        <MetricCard
          icon={<GroupIcon className="h-6 w-6" />}
          label="Користувачів"
          value={String(usersData?.total ?? 0)}
          color="primary"
          link="/users"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* My tasks */}
        <div className="col-span-12 xl:col-span-7">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Мої задачі
              </h3>
              <Link to="/tasks/list" className="text-sm text-brand-500 hover:text-brand-600 transition-colors">
                Усі задачі →
              </Link>
            </div>
            <div className="p-4">
              {tasksLoading ? (
                <LoadingSpinner />
              ) : tasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Задач немає</p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 8).map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 xl:col-span-5 space-y-6">
          {/* Task breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              Прогрес задач
            </h3>

            {tasksLoading ? (
              <LoadingSpinner />
            ) : tasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Немає даних</p>
            ) : (
              <>
                {/* Completion ring */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative h-24 w-24 flex-shrink-0">
                    <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        className="stroke-gray-200 dark:stroke-gray-700"
                        cx="18" cy="18" r="15.5"
                        fill="none" strokeWidth="3"
                      />
                      <circle
                        className="stroke-success-500 transition-all duration-500"
                        cx="18" cy="18" r="15.5"
                        fill="none" strokeWidth="3"
                        strokeDasharray={`${completionRate} ${100 - completionRate}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-800 dark:text-white/90">{completionRate}%</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p><span className="font-medium text-gray-800 dark:text-white/90">{completedCount}</span> з {tasks.length} виконано</p>
                    <p className="mt-1">{tasksByStatus["in_progress"] ?? 0} в роботі</p>
                    <p>{tasksByStatus["under_review"] ?? 0} на перевірці</p>
                  </div>
                </div>

                {/* Status bars */}
                <div className="space-y-3">
                  {(["created", "assigned", "in_progress", "under_review", "revision_requested", "completed"] as TaskStatus[]).map((s) => {
                    const count = tasksByStatus[s] ?? 0;
                    if (count === 0) return null;
                    const pct = Math.round((count / tasks.length) * 100);
                    return (
                      <div key={s}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{STATUS_LABELS[s]}</span>
                          <span className="text-xs font-medium text-gray-800 dark:text-white/90">{count}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${STATUS_BAR_COLORS[s]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Recent events */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Останні події
              </h3>
              <Link to="/events" className="text-sm text-brand-500 hover:text-brand-600 transition-colors">
                Усі події →
              </Link>
            </div>
            <div className="p-4">
              {eventsLoading ? (
                <LoadingSpinner />
              ) : events.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Подій немає</p>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 5).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Швидкі дії</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickLink to="/tasks/kanban" icon={<TaskIcon className="h-5 w-5" />} label="Kanban дошка" />
              <QuickLink to="/calendar" icon={<CalenderIcon className="h-5 w-5" />} label="Календар" />
              <QuickLink to="/events" icon={<ListIcon className="h-5 w-5" />} label="Журнал подій" />
              <QuickLink to="/profile" icon={<GroupIcon className="h-5 w-5" />} label="Мій профіль" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  color,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "brand" | "warning" | "success" | "primary";
  link: string;
}) {
  const colorMap = {
    brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/10",
    warning: "bg-warning-50 text-warning-500 dark:bg-warning-500/10",
    success: "bg-success-50 text-success-500 dark:bg-success-500/10",
    primary: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/10",
  };

  return (
    <Link
      to={link}
      className="rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </Link>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-medium text-gray-700 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-800 dark:text-gray-400 dark:hover:border-brand-800 dark:hover:bg-brand-500/5 dark:hover:text-brand-400"
    >
      <span className="text-gray-400 group-hover:text-brand-500">{icon}</span>
      {label}
    </Link>
  );
}

function TaskRow({ task }: { task: Task }) {
  const isCompleted = task.status === "completed";
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
    >
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] flex-shrink-0 ${
          isCompleted ? "border-brand-500 bg-brand-500" : "border-gray-300 dark:border-gray-600"
        }`}
      >
        {isCompleted && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={`flex-1 text-sm truncate ${isCompleted ? "text-gray-400 line-through" : "text-gray-800 dark:text-white/90"}`}>
        {task.title}
      </span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COUNT_COLORS[task.status]}`}>
        {STATUS_LABELS[task.status]}
      </span>
    </Link>
  );
}

function EventCard({ event }: { event: EventResponse }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition-shadow hover:shadow-theme-sm dark:border-gray-800"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
          {ACTIVITY_LABELS[event.activity_type]}
          {event.content && `: ${event.content}`}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          {new Date(event.date).toLocaleDateString("uk-UA")}
          {event.start_time && ` ${event.start_time.slice(0, 5)}`}
          {event.respondent_name && ` · ${event.respondent_name}`}
        </p>
      </div>
      <Badge size="sm" color={EVENT_BADGE_COLOR[event.status]}>
        {EVENT_STATUS_LABELS[event.status]}
      </Badge>
    </Link>
  );
}
