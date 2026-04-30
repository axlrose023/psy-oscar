import { useCallback, useState, useEffect } from "react";
import { events as eventsApi, users } from "../api/index.js";
import { ACTIVITY_TYPES, PERSONNEL_CATEGORIES } from "../data.js";
import { StatusBadge } from "./StatusBadge.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";

const EVENT_HISTORY_LABELS = {
  created: "Створення",
  updated: "Оновлення",
  completed: "Виконано",
  postponed: "Перенесено",
  cancelled: "Скасовано",
  archived: "Архівовано",
  overdue: "Прострочено",
};

const EVENT_HISTORY_DESCRIPTIONS = {
  "Event created": "Захід створено",
  "Event updated": "Захід оновлено",
  "Event completed": "Захід виконано",
  "Event archived": "Захід архівовано",
  "Automatically marked as overdue": "Автоматично позначено як прострочений",
};

function formatEventHistoryDescription(h) {
  const desc = h.description || "";
  if (!desc) return "";
  if (EVENT_HISTORY_DESCRIPTIONS[desc]) return EVENT_HISTORY_DESCRIPTIONS[desc];
  if (desc.startsWith("Postponed: ")) return `Захід перенесено: ${desc.slice("Postponed: ".length)}`;
  if (desc.startsWith("Cancelled: ")) return `Захід скасовано: ${desc.slice("Cancelled: ".length)}`;
  return desc;
}

export default function EventForm({ eventId, onClose, onSaved, openHistory, linkedTaskId, isAdmin, currentUser }) {
  const isNew = !eventId;

  const [loading, setLoading]   = useState(isNew ? false : true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [history, setHistory]   = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [psychologists, setPsychologists] = useState([]);

  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime]   = useState("");
  const [endTime, setEndTime]       = useState("");
  const [activity, setActivity]     = useState("aid");
  const [content, setContent]       = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [category, setCategory]     = useState("officer");
  const [planned, setPlanned]       = useState("");
  const [isControlled, setIsControlled] = useState(false);
  const [controlSource, setControlSource] = useState("");
  const [deadline, setDeadline]     = useState("");
  const [status, setStatus]         = useState("draft");
  const [psychologistIds, setPsychologistIds] = useState(currentUser?.id ? [currentUser.id] : []);
  const [actionDialog, setActionDialog] = useState(null);
  const [actionForm, setActionForm] = useState({});

  useEffect(() => {
    if (!isAdmin) return;
    const timer = window.setTimeout(() => {
      users.list({ role: "psychologist", page_size: 200 })
        .then((res) => setPsychologists(res.items || []))
        .catch(() => setPsychologists([]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin, currentUser?.id]);

  const loadHistory = useCallback(async () => {
    try {
      const h = await eventsApi.history(eventId);
      setHistory(h);
      setHistoryOpen(true);
    } catch (err) {
      setError("Помилка завантаження журналу: " + err.message);
    }
  }, [eventId]);

  useEffect(() => {
    if (isNew) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      eventsApi.get(eventId)
        .then((e) => {
          setEventData(e);
          setDate(e.date || "");
          setStartTime(e.start_time ? e.start_time.slice(0, 5) : "");
          setEndTime(e.end_time ? e.end_time.slice(0, 5) : "");
          setActivity(e.activity_type || "aid");
          setContent(e.content || "");
          setTargetUnit(e.target_unit || "");
          setRespondentName(e.respondent_name || "");
          setCategory(e.personnel_category || "officer");
          setPlanned(e.planned_count ?? "");
          setIsControlled(e.is_controlled || false);
          setControlSource(e.control_source || "");
          setDeadline(e.execution_deadline ? e.execution_deadline.slice(0, 16) : "");
          setStatus(e.status || "draft");
          setPsychologistIds(
            e.assignees?.length
              ? e.assignees.map((a) => a.user.id)
              : [e.psychologist?.id || currentUser?.id].filter(Boolean)
          );
        })
        .catch((err) => setError("Не вдалося завантажити захід: " + err.message))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [eventId, isNew, currentUser?.id]);

  useEffect(() => {
    if (!openHistory || isNew || loading) return;
    const timer = window.setTimeout(() => loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [openHistory, isNew, loading, loadHistory]);

  const isReadOnly = eventData && (eventData.is_archived || status === "completed" || status === "cancelled");
  const isFinal    = status === "completed" || status === "cancelled";
  const isActive   = status === "planned" || status === "overdue" || status === "postponed";

  async function save(publishStatus) {
    if (!date)     { setError("Вкажіть дату"); return; }
    if (!activity) { setError("Оберіть вид заходу"); return; }
    if (isControlled && !controlSource.trim()) { setError("Вкажіть нормативну підставу"); return; }
    if (isControlled && !deadline)             { setError("Вкажіть строк виконання"); return; }
    setSaving(true);
    setError(null);
    const body = {
      date,
      start_time: startTime || null,
      end_time: endTime || null,
      activity_type: activity,
      content: content || null,
      target_unit: targetUnit || null,
      respondent_name: respondentName || null,
      personnel_category: category || null,
      planned_count: planned !== "" ? Number(planned) : null,
      is_controlled: isControlled,
      control_source: isControlled ? controlSource : null,
      execution_deadline: isControlled && deadline ? deadline + ":00Z" : null,
      psychologist_ids: isAdmin ? psychologistIds : undefined,
    };
    try {
      if (isNew) {
        await eventsApi.create({ ...body, status: publishStatus || "draft", task_id: linkedTaskId || null });
      } else {
        const patch = { ...body };
        if (publishStatus) patch.status = publishStatus;
        await eventsApi.update(eventId, patch);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  function openAction(type) {
    setError(null);
    setActionForm({});
    setActionDialog(type);
  }

  function setActionField(field, value) {
    setActionForm((prev) => ({ ...prev, [field]: value }));
  }

  async function runAction() {
    if (!eventId || !actionDialog) return;
    setSaving(true);
    setError(null);
    const type = actionDialog;
    try {
      if (type === "postpone" && !actionForm.reason?.trim()) {
        setError("Вкажіть причину перенесення"); setSaving(false); return;
      }
      if (type === "cancel" && !actionForm.reason?.trim()) {
        setError("Вкажіть причину скасування"); setSaving(false); return;
      }
      setActionDialog(null);
      if (type === "complete") {
        await eventsApi.complete(eventId, {
          result: actionForm.result || undefined,
          actual_count: actionForm.actualCount ? Number(actionForm.actualCount) : undefined,
        });
      } else if (type === "postpone") {
        await eventsApi.postpone(eventId, { reason: actionForm.reason.trim(), new_date: actionForm.newDate || undefined });
      } else if (type === "cancel") {
        await eventsApi.cancel(eventId, { reason: actionForm.reason.trim() });
      } else if (type === "archive") {
        await eventsApi.archive(eventId);
      } else if (type === "delete") {
        await eventsApi.delete(eventId);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const actType = ACTIVITY_TYPES.find((a) => a.value === activity);
  const displayId = isNew ? "НОВИЙ ЗАХІД" : (eventData?.id?.slice(0, 8) || eventId?.slice(0, 8) || "…");

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">

        {/* ── HEAD ── */}
        <div className="drawer-head">
          <div className="ef-head-left">
            <span className="ef-head-title">{isNew ? "Новий захід" : "Захід"}</span>
            <span className="ef-head-id">{displayId}</span>
          </div>
          <div className="ef-head-right">
            {!isNew && <StatusBadge status={status} />}
            <button className="drawer-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="drawer-body">
          {loading && <div className="ef-loading">Завантаження…</div>}

          {error && (
            <div className="ef-error">{error}</div>
          )}

          {!loading && (
            <>
              {isReadOnly && (
                <div className="ef-readonly-notice">
                  Захід завершено або архівовано — редагування недоступне
                </div>
              )}

              {/* ── БЛОК 1: Час і тип ── */}
              <div className="ef-block">
                <div className="ef-block-label">Час і тип заходу</div>
                <div className="ef-row-time">
                  <label className="field ef-date-field">
                    <span className="field-label">Дата <span className="req">*</span></span>
                    <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isReadOnly} />
                  </label>
                  <label className="field">
                    <span className="field-label">Початок</span>
                    <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isReadOnly} />
                  </label>
                  <label className="field">
                    <span className="field-label">Кінець</span>
                    <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={isReadOnly} />
                  </label>
                </div>

                {isAdmin && (
                  <label className="field" style={{ marginTop: 10 }}>
                    <span className="field-label">Відповідальні психологи</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, maxHeight: 160, overflowY: "auto" }}>
                      {[
                        ...(currentUser?.id ? [currentUser] : []),
                        ...psychologists.filter((p) => p.id !== currentUser?.id),
                      ].map((p) => {
                        const on = psychologistIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            className={"checkbox" + (on ? " on" : "") + (isReadOnly ? " disabled" : "")}
                            onClick={() => {
                              if (isReadOnly) return;
                              setPsychologistIds((prev) => (
                                prev.includes(p.id)
                                  ? (prev.length > 1 ? prev.filter((id) => id !== p.id) : prev)
                                  : [...prev, p.id]
                              ));
                            }}
                          >
                            <span className="checkbox-mark">{on ? "✓" : ""}</span>
                            <div className="checkbox-content">
                              <div className="checkbox-title">{[p.last_name, p.first_name, p.patronymic].filter(Boolean).join(" ") || p.username}</div>
                              <div className="checkbox-desc">{p.username}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </label>
                )}

                <div className="field" style={{ marginTop: 10 }}>
                  <span className="field-label">Вид заходу <span className="req">*</span></span>
                  <div className="activity-grid" style={{ marginTop: 4 }}>
                    {ACTIVITY_TYPES.map((a) => (
                      <div key={a.value}
                        className={"activity-cell" + (activity === a.value ? " on" : "") + (isReadOnly ? " disabled" : "")}
                        onClick={() => !isReadOnly && setActivity(a.value)}
                      >
                        <div className="activity-code">{a.code}</div>
                        <div className="activity-name">{a.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="hint">→ {actType?.full}</div>
                </div>
              </div>

              {/* ── БЛОК 2: Зміст ── */}
              <div className="ef-block">
                <div className="ef-block-label">Зміст і об'єкт</div>
                <label className="field">
                  <span className="field-label">Зміст заходу</span>
                  <textarea className="textarea" rows={3} value={content} onChange={(e) => setContent(e.target.value)} disabled={isReadOnly} />
                </label>
                <div className="row-2" style={{ marginTop: 8 }}>
                  <label className="field">
                    <span className="field-label">Підрозділ / місце</span>
                    <input className="input" value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)} disabled={isReadOnly} />
                  </label>
                  <label className="field">
                    <span className="field-label">ПІБ респондента</span>
                    <input className="input" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} disabled={isReadOnly} />
                  </label>
                </div>
                <label className="field" style={{ marginTop: 8, maxWidth: 120 }}>
                  <span className="field-label">К-сть (план)</span>
                  <input className="input" type="number" min="0" value={planned} onChange={(e) => setPlanned(e.target.value)} disabled={isReadOnly} />
                </label>
                <div className="field" style={{ marginTop: 10 }}>
                  <span className="field-label">Категорія особового складу</span>
                  <div className="radio-group" style={{ marginTop: 4, gridTemplateColumns: "repeat(2, 1fr)" }}>
                    {PERSONNEL_CATEGORIES.map((c) => (
                      <div key={c.value}
                        className={"radio" + (category === c.value ? " on" : "") + (isReadOnly ? " disabled" : "")}
                        onClick={() => !isReadOnly && setCategory(c.value)}
                      >
                        <span className="radio-dot" />
                        <span>{c.label}</span>
                        <span className="meta">{c.short}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── БЛОК 3: Контроль ── */}
              <div className="ef-block">
                <div
                  className={"ef-control-toggle" + (isControlled ? " on" : "") + (isReadOnly ? " disabled" : "")}
                  onClick={() => !isReadOnly && setIsControlled(!isControlled)}
                >
                  <span className={"ef-control-mark" + (isControlled ? " on" : "")}>{isControlled ? "✓" : ""}</span>
                  <div>
                    <div className="ef-control-title">Контрольний захід</div>
                    <div className="ef-control-sub">Підлягає обов'язковому контролю</div>
                  </div>
                </div>
                {isControlled && (
                  <div className="ef-control-fields">
                    <div className="row-2-1">
                      <label className="field">
                        <span className="field-label">Нормативна підстава <span className="req">*</span></span>
                        <input className="input" value={controlSource} onChange={(e) => setControlSource(e.target.value)} disabled={isReadOnly} />
                      </label>
                      <label className="field">
                        <span className="field-label">Строк виконання <span className="req">*</span></span>
                        <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={isReadOnly} />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* ── ЖУРНАЛ ЗМІН (collapsible) ── */}
              {!isNew && (
                <div className="ef-history-block">
                  <button
                    type="button"
                    className="ef-history-toggle"
                    onClick={() => {
                      if (!historyOpen) loadHistory();
                      else setHistoryOpen(false);
                    }}
                  >
                    <span>Журнал змін</span>
                    <span className="ef-history-chevron">{historyOpen ? "▴" : "▾"}</span>
                  </button>
                  {historyOpen && history !== null && (
                    <div className="ef-history-body">
                      {history.length === 0 && (
                        <div className="ef-history-empty">Немає записів</div>
                      )}
                      {history.map((h) => (
                        <div key={h.id} className="ef-history-row">
                          <span className="ef-history-time">{h.created_at?.slice(0, 16).replace("T", " ")}</span>
                          <span className="ef-history-type">{EVENT_HISTORY_LABELS[h.event_type] || h.event_type}</span>
                          <span className="ef-history-desc">{formatEventHistoryDescription(h)}</span>
                          <span className="ef-history-who">{h.changed_by?.username || "система"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!loading && (
          <div className="ef-footer">
            {!isNew && eventData && (
              <div className="ef-footer-meta">
                автор <b>{eventData.created_by?.username || "—"}</b>
              </div>
            )}
            <div className="ef-footer-actions">

              {/* Нова форма */}
              {isNew && (
                <>
                  <button className="btn ghost" onClick={onClose} disabled={saving}>Скасувати</button>
                  <button className="btn" onClick={() => save("draft")} disabled={saving}>
                    {saving ? "…" : "Зберегти як чернетку"}
                  </button>
                  <button className="btn primary" onClick={() => save("planned")} disabled={saving}>
                    {saving ? "…" : "Запланувати ▸"}
                  </button>
                </>
              )}

              {/* Чернетка */}
              {!isNew && status === "draft" && !eventData?.is_archived && (
                <>
                  <button className="btn danger small" onClick={() => openAction("delete")} disabled={saving}>Видалити</button>
                  <div style={{ flex: 1 }} />
                  <button className="btn ghost" onClick={onClose} disabled={saving}>Закрити</button>
                  <button className="btn" onClick={() => save()} disabled={saving}>{saving ? "…" : "Зберегти"}</button>
                  <button className="btn primary" onClick={() => save("planned")} disabled={saving}>{saving ? "…" : "Запланувати ▸"}</button>
                </>
              )}

              {/* Активний (planned / overdue / postponed) */}
              {!isNew && isActive && !eventData?.is_archived && (
                <>
                  <button className="btn ghost small" onClick={() => openAction("postpone")} disabled={saving}>Перенести</button>
                  <button className="btn danger small" onClick={() => openAction("cancel")} disabled={saving}>Скасувати</button>
                  <div style={{ flex: 1 }} />
                  <button className="btn ghost" onClick={onClose} disabled={saving}>Закрити</button>
                  <button className="btn" onClick={() => save()} disabled={saving}>{saving ? "…" : "Зберегти"}</button>
                  <button className="btn primary" onClick={() => openAction("complete")} disabled={saving}>✓ Виконано</button>
                </>
              )}

              {/* Завершений / скасований */}
              {!isNew && isFinal && !eventData?.is_archived && (
                <>
                  <button className="btn ghost small" onClick={() => openAction("archive")} disabled={saving}>Архівувати</button>
                  <div style={{ flex: 1 }} />
                  <button className="btn ghost" onClick={onClose} disabled={saving}>Закрити</button>
                </>
              )}

              {/* Архів або read-only без кнопок */}
              {!isNew && eventData?.is_archived && (
                <>
                  <div style={{ flex: 1 }} />
                  <button className="btn ghost" onClick={onClose}>Закрити</button>
                </>
              )}

            </div>
          </div>
        )}
      </aside>

      {/* ── ДІАЛОГИ ── */}
      {actionDialog === "complete" && (
        <ConfirmDialog
          title="Позначити захід виконаним"
          confirmText="✓ Виконано"
          disabled={saving}
          onCancel={() => setActionDialog(null)}
          onConfirm={runAction}
        >
          <label className="field">
            <span className="field-label">Результат (необов'язково)</span>
            <textarea className="textarea" rows={3} value={actionForm.result || ""} onChange={(e) => setActionField("result", e.target.value)} placeholder="Опишіть результат заходу…" />
          </label>
          <label className="field" style={{ marginTop: 8 }}>
            <span className="field-label">Фактична к-сть осіб</span>
            <input className="input" type="number" min="0" style={{ maxWidth: 120 }} value={actionForm.actualCount || ""} onChange={(e) => setActionField("actualCount", e.target.value)} />
          </label>
        </ConfirmDialog>
      )}
      {actionDialog === "postpone" && (
        <ConfirmDialog
          title="Перенести захід"
          confirmText="Перенести"
          disabled={saving || !actionForm.reason?.trim()}
          onCancel={() => setActionDialog(null)}
          onConfirm={runAction}
        >
          <label className="field">
            <span className="field-label">Причина <span className="req">*</span></span>
            <textarea className="textarea" rows={3} value={actionForm.reason || ""} onChange={(e) => setActionField("reason", e.target.value)} />
          </label>
          <label className="field" style={{ marginTop: 8 }}>
            <span className="field-label">Нова дата (необов'язково)</span>
            <input className="input" type="date" value={actionForm.newDate || ""} onChange={(e) => setActionField("newDate", e.target.value)} />
          </label>
        </ConfirmDialog>
      )}
      {actionDialog === "cancel" && (
        <ConfirmDialog
          title="Скасувати захід?"
          confirmText="Скасувати"
          danger
          disabled={saving || !actionForm.reason?.trim()}
          onCancel={() => setActionDialog(null)}
          onConfirm={runAction}
        >
          <label className="field">
            <span className="field-label">Причина <span className="req">*</span></span>
            <textarea className="textarea" rows={3} value={actionForm.reason || ""} onChange={(e) => setActionField("reason", e.target.value)} />
          </label>
        </ConfirmDialog>
      )}
      {actionDialog === "archive" && (
        <ConfirmDialog
          title="Архівувати захід?"
          message="Запис буде приховано з активного журналу планування."
          confirmText="Архівувати"
          disabled={saving}
          onCancel={() => setActionDialog(null)}
          onConfirm={runAction}
        />
      )}
      {actionDialog === "delete" && (
        <ConfirmDialog
          title="Видалити чернетку?"
          message="Цю дію не можна буде скасувати."
          confirmText="Видалити"
          danger
          disabled={saving}
          onCancel={() => setActionDialog(null)}
          onConfirm={runAction}
        />
      )}
    </>
  );
}
