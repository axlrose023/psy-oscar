import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventInput,
  DatesSetArg,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import { useAuth } from "../context/AuthContext";
import { getEvents, createEvent } from "../api/events";
import { ACTIVITY_LABELS, EVENT_STATUS_CALENDAR_COLORS } from "../types/event";
import type { EventResponse, ActivityType, EventStatus } from "../types/event";

const CALENDAR_VISIBLE_STATUSES: EventStatus[] = ["planned", "postponed"];

function buildCalendarTooltip(event: EventResponse): string {
  const parts: string[] = [];

  if (event.start_time) {
    const timeRange = event.end_time
      ? `${event.start_time.slice(0, 5)}-${event.end_time.slice(0, 5)}`
      : event.start_time.slice(0, 5);
    parts.push(timeRange);
  }

  parts.push(ACTIVITY_LABELS[event.activity_type]);

  if (event.respondent_name) {
    parts.push(event.respondent_name);
  }

  if (event.content) {
    parts.push(event.content);
  }

  return parts.join(" • ");
}

function mapToCalendarEvents(events: EventResponse[]): EventInput[] {
  return events
    .filter((e) => CALENDAR_VISIBLE_STATUSES.includes(e.status))
    .map((e) => {
      const title = ACTIVITY_LABELS[e.activity_type];

      let start = e.date;
      let end: string | undefined;

      if (e.start_time) {
        start = `${e.date}T${e.start_time}`;
      }
      if (e.end_time) {
        end = `${e.date}T${e.end_time}`;
      }

      return {
        id: e.id,
        title,
        start,
        end,
        classNames: ["calendar-event", `calendar-event--${e.status}`],
        allDay: !e.start_time,
        extendedProps: {
          eventId: e.id,
          tooltipText: buildCalendarTooltip(e),
          statusColor: EVENT_STATUS_CALENDAR_COLORS[e.status],
        },
      };
    });
}

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventInput[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const createModal = useModal();
  const lastDatesArg = useRef<DatesSetArg | null>(null);

  const fetchEvents = useCallback(async (arg: DatesSetArg) => {
    lastDatesArg.current = arg;
    try {
      const data = await getEvents({
        page: 1,
        page_size: 500,
        date__gte: arg.startStr.split("T")[0],
        date__lte: arg.endStr.split("T")[0],
      });
      setEvents(mapToCalendarEvents(data.items));
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Не вдалося завантажити події");
    }
  }, []);

  const handleDateSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      setSelectedDate(selectInfo.startStr.split("T")[0]);
      createModal.openModal();
    },
    [createModal],
  );

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const eventId = clickInfo.event.extendedProps.eventId;
      if (eventId) navigate(`/events/${eventId}`);
    },
    [navigate],
  );

  const handleCreated = useCallback(() => {
    if (lastDatesArg.current) fetchEvents(lastDatesArg.current);
  }, [fetchEvents]);

  return (
    <>
      <PageMeta title="Календар | АРМ Психолога" description="" />
      {fetchError && (
        <div className="mb-4 rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          Помилка завантаження подій: {fetchError}
        </div>
      )}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="custom-calendar">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            events={events}
            datesSet={fetchEvents}
            fixedWeekCount={false}
            showNonCurrentDates={false}
            height="auto"
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            locale="uk"
            eventContent={renderEventContent}
          />
        </div>
      </div>

      {user && (
        <QuickCreateEventModal
          isOpen={createModal.isOpen}
          onClose={createModal.closeModal}
          onCreated={handleCreated}
          psychologistId={user.id}
          defaultDate={selectedDate}
        />
      )}
    </>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  return (
    <div
      className="calendar-month-event"
      title={eventInfo.event.extendedProps.tooltipText as string | undefined}
    >
      <span
        className="calendar-month-event__dot"
        style={{
          backgroundColor: eventInfo.event.extendedProps.statusColor as string,
        }}
      />
      {eventInfo.timeText && (
        <span className="calendar-month-event__time">{eventInfo.timeText}</span>
      )}
      <span className="calendar-month-event__title">
        {eventInfo.event.title}
      </span>
    </div>
  );
};

// ─── Quick Create Event Modal ────────────────────────────────────

function QuickCreateEventModal({
  isOpen,
  onClose,
  onCreated,
  psychologistId,
  defaultDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  psychologistId: string;
  defaultDate: string;
}) {
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("ppv");
  const [content, setContent] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync defaultDate when modal opens
  if (isOpen && date !== defaultDate && defaultDate) {
    setDate(defaultDate);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    setError("");
    try {
      await createEvent({
        date,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        activity_type: activityType,
        content: content.trim() || undefined,
        respondent_name: respondentName.trim() || undefined,
        status: "planned",
        psychologist_id: psychologistId,
      });
      setStartTime("");
      setEndTime("");
      setContent("");
      setRespondentName("");
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
        Нова подія
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-error-300 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Вид діяльності</label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as ActivityType)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((k) => (
              <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Зміст</label>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Опис події"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Респондент</label>
          <input
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            placeholder="ПІБ"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>Скасувати</Button>
          <Button size="sm" type="submit" disabled={saving || !date}>
            {saving ? "Створення..." : "Створити"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default Calendar;
