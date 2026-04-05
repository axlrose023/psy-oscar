import { useEffect, useState } from "react";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { createEvent } from "../../api/events";
import { ACTIVITY_LABELS, PERSONNEL_LABELS } from "../../types/event";
import type { ActivityType, PersonnelCategory, EventStatus } from "../../types/event";

const DEFAULT_STATUS: EventStatus = "planned";

export interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  psychologistId: string;
  initialDate?: string;
  linkedTaskId?: string | null;
  linkedTaskLabel?: string;
}

export default function EventFormModal({
  isOpen,
  onClose,
  onCreated,
  psychologistId,
  initialDate = "",
  linkedTaskId,
  linkedTaskLabel,
}: EventFormModalProps) {
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("ppv");
  const [content, setContent] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [personnelCategory, setPersonnelCategory] = useState<PersonnelCategory | "">("");
  const [targetUnit, setTargetUnit] = useState("");
  const [plannedCount, setPlannedCount] = useState("");
  const [status, setStatus] = useState<EventStatus>(DEFAULT_STATUS);
  const [linkTask, setLinkTask] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setDate(initialDate);
    setStartTime("");
    setEndTime("");
    setActivityType("ppv");
    setContent("");
    setRespondentName("");
    setPersonnelCategory("");
    setTargetUnit("");
    setPlannedCount("");
    setStatus(DEFAULT_STATUS);
    setLinkTask(Boolean(linkedTaskId));
    setError("");
    setSaving(false);
  }, [isOpen, initialDate, linkedTaskId]);

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
        personnel_category: personnelCategory || undefined,
        target_unit: targetUnit.trim() || undefined,
        planned_count: plannedCount ? Number(plannedCount) : undefined,
        status,
        psychologist_id: psychologistId,
        task_id: linkTask && linkedTaskId ? linkedTaskId : undefined,
      });
      onClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка створення");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6 lg:p-8">
      <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
        {linkedTaskId ? "Нова подія до задачі" : "Нова подія"}
      </h3>
      {linkedTaskLabel && (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {linkedTaskId ? `Задача: ${linkedTaskLabel}` : linkedTaskLabel}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-error-300 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Дата <span className="text-error-500">*</span>
            </label>
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
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Вид діяльності <span className="text-error-500">*</span>
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            >
              <option value="draft">Чернетка</option>
              <option value="planned">Заплановано</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Зміст</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            placeholder="Опис події"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Респондент</label>
            <input
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
              placeholder="ПІБ"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Категорія</label>
            <select
              value={personnelCategory}
              onChange={(e) => setPersonnelCategory(e.target.value as PersonnelCategory | "")}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            >
              <option value="">—</option>
              {(Object.keys(PERSONNEL_LABELS) as PersonnelCategory[]).map((k) => (
                <option key={k} value={k}>
                  {PERSONNEL_LABELS[k]}
                </option>
              ))}
            </select>
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Планова кількість</label>
          <input
            type="number"
            value={plannedCount}
            onChange={(e) => setPlannedCount(e.target.value)}
            className="h-11 w-full max-w-[200px] rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
        </div>

        {linkedTaskId && (
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
            <input
              type="checkbox"
              checked={linkTask}
              onChange={(e) => setLinkTask(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              <span className="block font-medium text-gray-800 dark:text-white/90">
                Прив'язати до задачі
              </span>
              <span className="block text-gray-500 dark:text-gray-400">
                Якщо вимкнути, подія буде створена без зв'язку з поточною задачею.
              </span>
            </span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button size="sm" type="submit" disabled={saving || !date}>
            {saving ? "Створення..." : "Створити"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
