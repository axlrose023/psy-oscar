import { useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorAlert from "../../components/common/ErrorAlert";
import Button from "../../components/ui/button/Button";
import { useModal } from "../../hooks/useModal";
import { getEvents } from "../../api/events";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import EventFormModal from "../../components/events/EventFormModal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import type { EventResponse, EventStatus } from "../../types/event";
import {
  EVENT_STATUS_LABELS,
  ACTIVITY_LABELS,
} from "../../types/event";

const STATUS_BADGE_COLOR: Record<EventStatus, "light" | "primary" | "success" | "warning" | "error"> = {
  draft: "light",
  planned: "primary",
  completed: "success",
  postponed: "warning",
  overdue: "error",
  cancelled: "light",
};

const STATUS_FILTERS: { key: "all" | EventStatus; label: string }[] = [
  { key: "all", label: "Усі" },
  { key: "planned", label: "Заплановані" },
  { key: "completed", label: "Виконані" },
  { key: "postponed", label: "Відкладені" },
  { key: "overdue", label: "Прострочені" },
  { key: "cancelled", label: "Скасовані" },
];

export default function EventsList() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const createModal = useModal();

  const { data, isLoading, error, refetch } = useApi(
    () =>
      getEvents({
        page,
        page_size: 20,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      }),
    [page, statusFilter],
  );

  return (
    <>
      <PageMeta title="Події | АРМ Психолога" description="" />
      <PageBreadCrumb pageTitle="Події" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {STATUS_FILTERS.map((f) => {
              const isActive = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    setStatusFilter(f.key);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                      : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <Button size="sm" onClick={createModal.openModal}>
            Додати подію
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3.33334V12.6667M3.33334 8H12.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-100 dark:border-gray-800">
                    <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Дата
                    </TableCell>
                    <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Вид діяльності
                    </TableCell>
                    <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Зміст
                    </TableCell>
                    <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Респондент
                    </TableCell>
                    <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Статус
                    </TableCell>
                    <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Психолог
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                  {data?.items.length === 0 && (
                    <TableRow>
                      <TableCell className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                        Подій не знайдено
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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

      {user && (
        <EventFormModal
          isOpen={createModal.isOpen}
          onClose={createModal.closeModal}
          onCreated={refetch}
          psychologistId={user.id}
        />
      )}
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function EventRow({ event }: { event: EventResponse }) {
  return (
    <TableRow className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
      <TableCell className="px-6 py-4 text-sm text-gray-800 dark:text-white/90 whitespace-nowrap">
        <Link to={`/events/${event.id}`} className="hover:text-brand-500 transition-colors">
          {formatDate(event.date)}
          {event.start_time && (
            <span className="ml-2 text-gray-400">
              {event.start_time.slice(0, 5)}
            </span>
          )}
        </Link>
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-gray-800 dark:text-white/90">
        {ACTIVITY_LABELS[event.activity_type]}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-[250px] truncate">
        {event.content || "—"}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
        {event.respondent_name || "—"}
      </TableCell>
      <TableCell className="px-6 py-4">
        <Badge size="sm" color={STATUS_BADGE_COLOR[event.status]}>
          {EVENT_STATUS_LABELS[event.status]}
        </Badge>
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
        {event.psychologist.username}
      </TableCell>
    </TableRow>
  );
}
