import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorAlert from "../../components/common/ErrorAlert";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { useApi } from "../../hooks/useApi";
import {
  getEvent,
  getEventHistory,
  completeEvent,
  postponeEvent,
  cancelEvent,
  archiveEvent,
  deleteEvent,
  updateEvent,
} from "../../api/events";
import { useAuth } from "../../context/AuthContext";
import type {
  EventResponse,
  EventStatus,
  ActivityType,
  PersonnelCategory,
  EventUserResponse,
} from "../../types/event";
import {
  EVENT_STATUS_LABELS,
  ACTIVITY_LABELS,
  PERSONNEL_LABELS,
} from "../../types/event";

type TabKey = "details" | "history";

const STATUS_BADGE_COLOR: Record<EventStatus, "light" | "primary" | "success" | "warning" | "error"> = {
  draft: "light",
  planned: "primary",
  completed: "success",
  postponed: "warning",
  overdue: "error",
  cancelled: "light",
};

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  const {
    data: event,
    isLoading,
    error,
    refetch,
  } = useApi(() => getEvent(eventId!), [eventId]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;
  if (!event) return null;

  const title = ACTIVITY_LABELS[event.activity_type] + (event.content ? `: ${event.content}` : "");
  const canEdit = Boolean(
    user
      && (user.role === "admin" || user.id === event.psychologist.id)
      && !["completed", "cancelled"].includes(event.status),
  );

  return (
    <>
      <PageMeta title={`${title} | АРМ Психолога`} description="" />
      <PageBreadCrumb pageTitle="Деталі події" />

      {/* Header card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-3">
              {title}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Badge size="sm" color={STATUS_BADGE_COLOR[event.status]}>
                {EVENT_STATUS_LABELS[event.status]}
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(event.date)}
                {event.start_time && ` ${event.start_time.slice(0, 5)}`}
                {event.end_time && ` – ${event.end_time.slice(0, 5)}`}
              </span>
            </div>
          </div>

          <EventActions
            event={event}
            canEdit={canEdit}
            onRefresh={refetch}
            onDeleted={() => navigate("/events")}
          />
        </div>

        {/* Meta grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-200 pt-5 dark:border-gray-800">
          <MetaItem label="Вид діяльності" value={ACTIVITY_LABELS[event.activity_type]} />
          <MetaItem label="Психолог" value={<UserLink user={event.psychologist} />} />
          <MetaItem label="Автор" value={<UserLink user={event.created_by} />} />
          <MetaItem label="Респондент" value={event.respondent_name || "—"} />
          <MetaItem
            label="Категорія"
            value={event.personnel_category ? PERSONNEL_LABELS[event.personnel_category] : "—"}
          />
          <MetaItem label="Підрозділ" value={event.target_unit || "—"} />
          <MetaItem
            label="Кількість (план / факт)"
            value={`${event.planned_count ?? "—"} / ${event.actual_count ?? "—"}`}
          />
          <MetaItem label="Контрольований" value={event.is_controlled ? "Так" : "Ні"} />
          {event.is_controlled && (
            <MetaItem label="Джерело контролю" value={event.control_source || "—"} />
          )}
          {event.execution_deadline && (
            <MetaItem label="Термін виконання" value={formatDateTime(event.execution_deadline)} />
          )}
          {event.result && <MetaItem label="Результат" value={event.result} />}
          {event.status_reason && <MetaItem label="Причина" value={event.status_reason} />}
          <MetaItem label="Створено" value={formatDateTime(event.created_at)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          {(
            [
              { key: "details" as TabKey, label: "Деталі" },
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
          {activeTab === "details" && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {event.content ? (
                <p className="leading-relaxed">{event.content}</p>
              ) : (
                <p className="text-center text-gray-400 py-4">Деталі відсутні</p>
              )}
            </div>
          )}
          {activeTab === "history" && <HistoryTab eventId={eventId!} />}
        </div>
      </div>
    </>
  );
}

// ─── Actions ─────────────────────────────────────────────────────

function EventActions({
  event,
  canEdit,
  onRefresh,
  onDeleted,
}: {
  event: EventResponse;
  canEdit: boolean;
  onRefresh: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState("");
  const editModal = useModal();
  const completeModal = useModal();
  const postponeModal = useModal();
  const cancelModal = useModal();
  const deleteModal = useModal();
  const [result, setResult] = useState("");
  const [actualCount, setActualCount] = useState("");
  const [postponeReason, setPostponeReason] = useState("");
  const [postponeDate, setPostponeDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");

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

  const canComplete = ["planned", "draft", "overdue"].includes(event.status);
  const canPostpone = !["completed", "cancelled"].includes(event.status);
  const canCancel = !["completed", "cancelled"].includes(event.status);
  const canArchive = !event.is_archived && event.status !== "draft";
  const canDelete = event.status === "draft";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <Button size="sm" variant="outline" onClick={editModal.openModal}>
          Редагувати
        </Button>
      )}
      {canComplete && (
        <Button size="sm" onClick={completeModal.openModal}>
          Виконано
        </Button>
      )}
      {canPostpone && (
        <Button size="sm" variant="outline" onClick={postponeModal.openModal}>
          Відкласти
        </Button>
      )}
      {canCancel && (
        <Button size="sm" variant="outline" onClick={cancelModal.openModal}>
          Скасувати
        </Button>
      )}
      {canArchive && (
        <Button
          size="sm"
          variant="outline"
          disabled={loading === "archive"}
          onClick={() => handleAction(() => archiveEvent(event.id), "archive")}
        >
          Архівувати
        </Button>
      )}
      {canDelete && (
        <Button
          size="sm"
          variant="outline"
          disabled={loading === "delete"}
          onClick={deleteModal.openModal}
        >
          Видалити
        </Button>
      )}

      <EventEditModal
        event={event}
        isOpen={editModal.isOpen}
        onClose={editModal.closeModal}
        onSaved={onRefresh}
      />

      {/* Complete modal */}
      <Modal isOpen={completeModal.isOpen} onClose={completeModal.closeModal} className="max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Завершити подію
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Результат</label>
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Фактична кількість</label>
            <input
              type="number"
              value={actualCount}
              onChange={(e) => setActualCount(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={completeModal.closeModal}>Скасувати</Button>
          <Button
            size="sm"
            onClick={async () => {
              await handleAction(
                () => completeEvent(event.id, {
                  result: result || undefined,
                  actual_count: actualCount ? Number(actualCount) : undefined,
                }),
                "complete",
              );
              completeModal.closeModal();
            }}
          >
            Завершити
          </Button>
        </div>
      </Modal>

      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md p-6">
        <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">
          Видалити подію?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Чернетка буде видалена без можливості відновлення.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={deleteModal.closeModal}>
            Скасувати
          </Button>
          <Button
            size="sm"
            disabled={loading === "delete"}
            onClick={async () => {
              setLoading("delete");
              try {
                await deleteEvent(event.id);
                deleteModal.closeModal();
                onDeleted();
              } catch (err) {
                alert(err instanceof Error ? err.message : "Помилка");
              } finally {
                setLoading("");
              }
            }}
          >
            {loading === "delete" ? "Видалення..." : "Видалити"}
          </Button>
        </div>
      </Modal>

      {/* Postpone modal */}
      <Modal isOpen={postponeModal.isOpen} onClose={postponeModal.closeModal} className="max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Відкласти подію
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Причина</label>
            <textarea
              value={postponeReason}
              onChange={(e) => setPostponeReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Нова дата</label>
            <input
              type="date"
              value={postponeDate}
              onChange={(e) => setPostponeDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={postponeModal.closeModal}>Скасувати</Button>
          <Button
            size="sm"
            disabled={!postponeReason.trim()}
            onClick={async () => {
              await handleAction(
                () => postponeEvent(event.id, {
                  reason: postponeReason,
                  new_date: postponeDate || undefined,
                }),
                "postpone",
              );
              postponeModal.closeModal();
            }}
          >
            Відкласти
          </Button>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal isOpen={cancelModal.isOpen} onClose={cancelModal.closeModal} className="max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Скасувати подію
        </h3>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Причина</label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={cancelModal.closeModal}>Назад</Button>
          <Button
            size="sm"
            disabled={!cancelReason.trim()}
            onClick={async () => {
              await handleAction(() => cancelEvent(event.id, { reason: cancelReason }), "cancel");
              cancelModal.closeModal();
            }}
          >
            Підтвердити
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── History ─────────────────────────────────────────────────────

function HistoryTab({ eventId }: { eventId: string }) {
  const { data: history, isLoading, error, refetch } = useApi(
    () => getEventHistory(eventId),
    [eventId],
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
              {h.changed_by ? (
                <UserLink user={h.changed_by} />
              ) : (
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Система
                </span>
              )}
              <span className="text-xs text-gray-400">{formatDateTime(h.created_at)}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{h.event_type}</span>
              {h.description && ` — ${h.description}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function EventEditModal({
  event,
  isOpen,
  onClose,
  onSaved,
}: {
  event: EventResponse;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(event.date);
  const [startTime, setStartTime] = useState(event.start_time ?? "");
  const [endTime, setEndTime] = useState(event.end_time ?? "");
  const [activityType, setActivityType] = useState<ActivityType>(event.activity_type);
  const [content, setContent] = useState(event.content ?? "");
  const [respondentName, setRespondentName] = useState(event.respondent_name ?? "");
  const [personnelCategory, setPersonnelCategory] = useState<PersonnelCategory | "">(event.personnel_category ?? "");
  const [targetUnit, setTargetUnit] = useState(event.target_unit ?? "");
  const [plannedCount, setPlannedCount] = useState(event.planned_count?.toString() ?? "");
  const [isControlled, setIsControlled] = useState(event.is_controlled);
  const [controlSource, setControlSource] = useState(event.control_source ?? "");
  const [executionDeadline, setExecutionDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDate(event.date);
    setStartTime(event.start_time ?? "");
    setEndTime(event.end_time ?? "");
    setActivityType(event.activity_type);
    setContent(event.content ?? "");
    setRespondentName(event.respondent_name ?? "");
    setPersonnelCategory(event.personnel_category ?? "");
    setTargetUnit(event.target_unit ?? "");
    setPlannedCount(event.planned_count?.toString() ?? "");
    setIsControlled(event.is_controlled);
    setControlSource(event.control_source ?? "");
    setExecutionDeadline(toDateTimeLocalValue(event.execution_deadline));
    setError("");
  }, [event, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;

    setSaving(true);
    setError("");
    try {
      await updateEvent(event.id, {
        date,
        start_time: startTime || null,
        end_time: endTime || null,
        activity_type: activityType,
        content: content.trim() || null,
        respondent_name: respondentName.trim() || null,
        personnel_category: personnelCategory || null,
        target_unit: targetUnit.trim() || null,
        planned_count: plannedCount === "" ? null : Number(plannedCount),
        is_controlled: isControlled,
        control_source: isControlled ? controlSource.trim() || null : null,
        execution_deadline: executionDeadline ? new Date(executionDeadline).toISOString() : null,
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6 lg:p-8">
      <h3 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Редагувати подію
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-error-300 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Дата</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Початок</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Кінець</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Вид діяльності</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((key) => (
                <option key={key} value={key}>
                  {ACTIVITY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Категорія</label>
            <select
              value={personnelCategory}
              onChange={(e) => setPersonnelCategory(e.target.value as PersonnelCategory | "")}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            >
              <option value="">—</option>
              {(Object.keys(PERSONNEL_LABELS) as PersonnelCategory[]).map((key) => (
                <option key={key} value={key}>
                  {PERSONNEL_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Зміст</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Респондент</label>
            <input
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Підрозділ</label>
            <input
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Планова кількість</label>
            <input
              type="number"
              value={plannedCount}
              onChange={(e) => setPlannedCount(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Термін виконання</label>
            <input
              type="datetime-local"
              value={executionDeadline}
              onChange={(e) => setExecutionDeadline(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
          <input
            type="checkbox"
            checked={isControlled}
            onChange={(e) => setIsControlled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Контрольована подія
          </span>
        </label>
        {isControlled && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Джерело контролю</label>
            <input
              value={controlSource}
              onChange={(e) => setControlSource(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button size="sm" type="submit" disabled={saving}>
            {saving ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UserLink({ user }: { user: EventUserResponse }) {
  return (
    <Link
      to={`/users/${user.id}`}
      className="text-sm font-medium text-gray-800 transition-colors hover:text-brand-500 dark:text-white/90 dark:hover:text-brand-400"
    >
      {user.username}
    </Link>
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
