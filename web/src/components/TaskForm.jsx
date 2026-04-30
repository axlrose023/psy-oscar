import { useState, useEffect } from "react";
import { tasks as tasksApi, events as eventsApi, users } from "../api/index.js";
import { TaskStatusBadge, PriorityBadge } from "./StatusBadge.jsx";
import { StatusBadge } from "./StatusBadge.jsx";
import { TASK_PRIORITIES } from "../data.js";
import ConfirmDialog from "./ConfirmDialog.jsx";

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("uk-UA") + " " + d.toLocaleTimeString("uk-UA", { hour:"2-digit", minute:"2-digit" });
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uk-UA");
}
function toDatetimeLocal(iso) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function SectionHead({ num, title, action }) {
  return (
    <div className="form-section-head" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span className="form-section-num">{num}</span>
        <span className="form-section-title">{title}</span>
      </div>
      {action}
    </div>
  );
}

function CommentItem({ c }) {
  return (
    <div style={{ padding:"8px 12px", background:"var(--bg-head, #F5F3EE)", borderRadius:6, fontSize:13 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <b style={{ fontSize:12 }}>{c.author?.username || "—"}</b>
        <span style={{ color:"var(--text-faint)", fontSize:11 }}>{fmtDateTime(c.created_at)}</span>
      </div>
      <div style={{ whiteSpace:"pre-wrap" }}>{c.text}</div>
    </div>
  );
}

function HistoryItem({ h }) {
  const icons = { created:"✦", assigned:"→", unassigned:"←", started:"▶", submitted:"↑", approved:"✓", revision_requested:"↺", completed:"★", updated:"✎" };
  return (
    <div style={{ display:"flex", gap:10, fontSize:12, padding:"6px 0", borderBottom:"1px solid var(--border, #E2DDD6)" }}>
      <span style={{ minWidth:16, textAlign:"center", color:"var(--accent, #5B6A4A)" }}>{icons[h.event] || "·"}</span>
      <div style={{ flex:1 }}>
        <span style={{ color:"var(--text-faint)" }}>{fmtDateTime(h.created_at)}</span>{" · "}
        <b>{h.changed_by?.username || "—"}</b>
        {h.description && <span style={{ color:"var(--text-body)" }}> — {h.description}</span>}
      </div>
    </div>
  );
}

function EventRow({ ev, onOpen }) {
  return (
    <div onClick={() => onOpen && onOpen(ev.id)}
         style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px", borderRadius:6,
                  cursor:onOpen?"pointer":"default", background:"var(--bg-head, #F5F3EE)", fontSize:13 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:500 }}>{ev.activity_type || ev.content || "—"}</div>
        <div style={{ fontSize:11, color:"var(--text-faint)", marginTop:2 }}>
          {fmtDate(ev.date)}{ev.start_time ? " · " + ev.start_time.slice(0,5) : ""}
        </div>
      </div>
      <StatusBadge status={ev.status} />
    </div>
  );
}

export default function TaskForm({ taskId, onClose, onSaved, onOpenEvent, onNewSubtask, currentUser, initialParentTaskId }) {
  const isNew   = !taskId;
  const isAdmin = currentUser?.role === "admin";

  const [task, setTask]           = useState(null);
  const [loading, setLoading]     = useState(!isNew);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const [title, setTitle]         = useState("");
  const [desc, setDesc]           = useState("");
  const [priority, setPriority]   = useState("medium");
  const [deadline, setDeadline]   = useState("");
  const [parentId, setParentId]   = useState(initialParentTaskId || "");

  const [psychologists, setPsychologists] = useState([]);
  const [selectedIds, setSelectedIds]     = useState([]);
  const [psyLoading, setPsyLoading]       = useState(false);

  const [comments, setComments]       = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  const [history, setHistory]           = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory]   = useState(false);

  const [linkedEvents, setLinkedEvents]   = useState(null);
  const [eventsLoading] = useState(false);
  const [addEventMode, setAddEventMode]   = useState(null); // null | "pick" | "new"
  const [allEvents, setAllEvents]         = useState(null);
  const [allEventsLoading, setAllEventsLoading] = useState(false);
  const [eventSearch, setEventSearch]     = useState("");

  const [showRevision, setShowRevision]   = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      tasksApi.get(taskId)
        .then((t) => {
          setTask(t);
          setTitle(t.title || "");
          setDesc(t.description || "");
          setPriority(t.priority || "medium");
          setDeadline(toDatetimeLocal(t.deadline));
          setParentId(t.parent_task_id || "");
          setSelectedIds(t.assignees?.map(a => a.user.id) || []);
          return tasksApi.comments(taskId);
        })
        .then((c) => {
          setComments(c || []);
          return eventsApi.list({ task_id: taskId, page_size: 50 });
        })
        .then((r) => setLinkedEvents(r.items || []))
        .catch((err) => setError("Не вдалося завантажити: " + err.message))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [taskId, isNew]);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = window.setTimeout(() => {
      setPsyLoading(true);
      users.list({ role: "psychologist", page_size: 200 })
        .then((r) => setPsychologists(r.items || []))
        .catch(() => {})
        .finally(() => setPsyLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin]);

  function toggleHistory() {
    if (showHistory) { setShowHistory(false); return; }
    if (history !== null) { setShowHistory(true); return; }
    setHistoryLoading(true);
    tasksApi.history(taskId)
      .then((h) => { setHistory(h || []); setShowHistory(true); })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }

  async function handleCreate() {
    if (!title.trim()) { setError("Назва обов'язкова"); return; }
    setSaving(true); setError(null);
    try {
      await tasksApi.create({
        title: title.trim(), description: desc.trim() || null, priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        assigned_to_ids: selectedIds.length ? selectedIds : null,
        parent_task_id: parentId || null,
      });
      if (window.__tasksReload) window.__tasksReload();
      onSaved?.();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdate() {
    if (!title.trim()) { setError("Назва обов'язкова"); return; }
    setSaving(true); setError(null);
    try {
      const updated = await tasksApi.update(taskId, {
        title: title.trim(), description: desc.trim() || null, priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      setTask(updated);
      if (window.__tasksReload) window.__tasksReload();
      onSaved?.();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleAction(action) {
    setSaving(true); setError(null);
    try {
      let updated;
      if (action === "assign") {
        if (!selectedIds.length) { setError("Оберіть виконавців"); setSaving(false); return; }
        updated = await tasksApi.assign(taskId, { assigned_to_ids: selectedIds });
      } else if (action === "unassign") {
        const ids = task.assignees?.map(a => a.user.id) || [];
        if (!ids.length) { setSaving(false); return; }
        updated = await tasksApi.unassign(taskId, { user_ids: ids });
      } else if (action === "start")   { updated = await tasksApi.start(taskId); }
      else if (action === "submit")    { updated = await tasksApi.submit(taskId); }
      else if (action === "approve")   { updated = await tasksApi.approve(taskId); }
      else if (action === "delete")    {
        await tasksApi.delete(taskId);
        if (window.__tasksReload) window.__tasksReload();
        onSaved?.(); return;
      }
      if (updated) { setTask(updated); setSelectedIds(updated.assignees?.map(a => a.user.id) || []); }
      if (window.__tasksReload) window.__tasksReload();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleRequestRevision() {
    if (!revisionComment.trim()) return;
    setSaving(true); setError(null);
    try {
      const updated = await tasksApi.requestRevision(taskId, revisionComment.trim());
      setTask(updated); setShowRevision(false); setRevisionComment("");
      if (window.__tasksReload) window.__tasksReload();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    setCommentSaving(true);
    try {
      const c = await tasksApi.addComment(taskId, commentText.trim());
      setComments(prev => [...(prev || []), c]);
      setCommentText("");
    } catch (e) { setError(e.message); }
    finally { setCommentSaving(false); }
  }

  function toggleAssignee(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const status      = task?.status || "created";
  const isCompleted = status === "completed";
  const isReadOnly  = isCompleted;
  const subtasks    = task?.subtasks || [];

  return (
    <div className="scrim" onClick={onClose}>
      <div className="drawer" style={{ width:680 }} onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <div className="drawer-title-block">
            <div className="drawer-title">{isNew ? "Нова задача" : "Задача"}</div>
            {!isNew && task && <div className="drawer-id" style={{ fontSize:11, color:"var(--text-faint)", marginTop:2 }}>#{task.id?.slice(0,8)}</div>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {task && <TaskStatusBadge status={task.status} />}
            <button className="drawer-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="drawer-body">
          {loading && <div style={{ textAlign:"center", padding:"40px 0", color:"var(--text-faint)", fontSize:13 }}>Завантаження…</div>}
          {error && <div style={{ background:"#fff0f0", border:"1px solid #f5c2c2", borderRadius:6, padding:"10px 14px", fontSize:13, color:"#b00", marginBottom:8 }}>{error}</div>}

          {!loading && (
            <>
              {/* 1. Основне */}
              <div className="form-section">
                <SectionHead num="1" title="Основне" />
                <label className="field"><span className="field-label">Назва задачі <span className="req">*</span></span>
                  <input className="input" placeholder="Коротка назва завдання…" value={title} disabled={isReadOnly} onChange={e => setTitle(e.target.value)} />
                </label>
                <label className="field"><span className="field-label">Опис</span>
                  <textarea className="textarea input" rows={3} value={desc} disabled={isReadOnly} onChange={e => setDesc(e.target.value)} />
                </label>
              </div>

              {/* 2. Параметри */}
              <div className="form-section">
                <SectionHead num="2" title="Параметри" />
                <div className="row-2">
                  <label className="field"><span className="field-label">Пріоритет</span>
                    <select className="select" value={priority} disabled={isReadOnly} onChange={e => setPriority(e.target.value)}>
                      {TASK_PRIORITIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label className="field"><span className="field-label">Дедлайн</span>
                    <input className="input" type="datetime-local" value={deadline} disabled={isReadOnly} onChange={e => setDeadline(e.target.value)} />
                  </label>
                </div>
                <div style={{ marginTop:4 }}><PriorityBadge priority={priority} /></div>
                {isNew && parentId && (
                  <div className="subtask-parent-note">Підзадача для задачі #{parentId.slice(0, 8)}</div>
                )}
              </div>

              {/* 3. Виконавці (admin) */}
              {isAdmin && (
                <div className="form-section">
                  <SectionHead num="3" title="Виконавці"
                    action={!isNew && task && status === "created" && selectedIds.length > 0 && (
                      <button className="btn primary small" disabled={saving} onClick={() => handleAction("assign")}>Призначити</button>
                    )}
                  />
                  {psyLoading ? <div style={{ fontSize:12, color:"var(--text-faint)" }}>Завантаження…</div>
                   : psychologists.length === 0 ? <div style={{ fontSize:12, color:"var(--text-faint)" }}>Немає психологів</div>
                   : (
                    <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:200, overflowY:"auto" }}>
                      {psychologists.map(p => {
                        const on = selectedIds.includes(p.id);
                        const isAssigned = task?.assignees?.some(a => a.user.id === p.id);
                        return (
                          <div key={p.id} className={`checkbox ${on ? "on" : ""}`}
                               onClick={() => !isReadOnly && toggleAssignee(p.id)}
                               style={{ cursor:isReadOnly?"default":"pointer" }}>
                            <span className="checkbox-mark">{on ? "✓" : ""}</span>
                            <div className="checkbox-content">
                              <div className="checkbox-title">{p.username}</div>
                              <div className="checkbox-desc">{isAssigned ? "призначено" : "психолог"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!isNew && task && status !== "created" && task.assignees?.length > 0 && !isReadOnly && (
                    <button className="btn ghost small" style={{ marginTop:8 }} disabled={saving} onClick={() => handleAction("unassign")}>Зняти всіх виконавців</button>
                  )}
                </div>
              )}

              {/* 4. Підзадачі */}
              {!isNew && (
                <div className="form-section">
                  <SectionHead num="4" title={`Підзадачі (${subtasks.length})`}
                    action={<button className="btn ghost small" type="button" onClick={() => onNewSubtask?.(taskId)}>+ Підзадача</button>}
                  />
                  {subtasks.length === 0
                    ? <div style={{ fontSize:12, color:"var(--text-faint)" }}>Підзадач немає</div>
                    : (
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {subtasks.map(s => (
                          <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 10px", background:"var(--bg-head, #F5F3EE)", borderRadius:6, fontSize:13, cursor:"pointer" }}
                               onClick={() => { onClose(); setTimeout(() => window.__openTask?.(s.id), 50); }}>
                            <TaskStatusBadge status={s.status} />
                            <span style={{ flex:1 }}>{s.title}</span>
                            <PriorityBadge priority={s.priority} />
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
              )}

              {/* 5. Пов'язані заходи */}
              {!isNew && (
                <div className="form-section">
                  <SectionHead num="5" title="Пов'язані заходи"
                    action={!isReadOnly && addEventMode === null && (
                      <button className="btn ghost small" onClick={() => setAddEventMode("choose")}>+ Захід</button>
                    )}
                  />
                  {eventsLoading && <div style={{ fontSize:12, color:"var(--text-faint)" }}>Завантаження…</div>}
                  {!eventsLoading && linkedEvents !== null && (
                    linkedEvents.length === 0
                      ? <div style={{ fontSize:12, color:"var(--text-faint)" }}>Прив'язаних заходів немає</div>
                      : <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          {linkedEvents.map(ev => <EventRow key={ev.id} ev={ev} onOpen={onOpenEvent ? (id) => onOpenEvent(id) : null} />)}
                        </div>
                  )}

                  {addEventMode === "choose" && (
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <button className="btn ghost small" onClick={() => {
                        setAddEventMode("pick");
                        if (allEvents === null) {
                          setAllEventsLoading(true);
                          eventsApi.list({ page_size: 200 })
                            .then(r => setAllEvents(r.items || []))
                            .catch(() => setAllEvents([]))
                            .finally(() => setAllEventsLoading(false));
                        }
                      }}>Існуючий захід</button>
                      <button className="btn primary small" onClick={() => {
                        setAddEventMode(null);
                        onOpenEvent?.(null, taskId);
                      }}>Новий захід</button>
                      <button className="btn ghost small" style={{ marginLeft:"auto" }} onClick={() => setAddEventMode(null)}>Скасувати</button>
                    </div>
                  )}

                  {addEventMode === "pick" && (
                    <div style={{ marginTop:8 }}>
                      <input className="input" placeholder="Пошук заходу…" value={eventSearch}
                        onChange={e => setEventSearch(e.target.value)}
                        style={{ marginBottom:6 }} autoFocus />
                      {allEventsLoading && <div style={{ fontSize:12, color:"var(--text-faint)" }}>Завантаження…</div>}
                      {!allEventsLoading && allEvents !== null && (
                        <div style={{ maxHeight:180, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
                          {allEvents
                            .filter(ev => !linkedEvents?.some(le => le.id === ev.id))
                            .filter(ev => {
                              if (!eventSearch.trim()) return true;
                              const q = eventSearch.toLowerCase();
                              return (ev.content || "").toLowerCase().includes(q) ||
                                     (ev.activity_type || "").toLowerCase().includes(q);
                            })
                            .slice(0, 30)
                            .map(ev => (
                              <div key={ev.id}
                                style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px", borderRadius:6,
                                         cursor:"pointer", background:"var(--bg-head, #F5F3EE)", fontSize:13 }}
                                onClick={async () => {
                                  try {
                                    const updated = await eventsApi.update(ev.id, { task_id: taskId });
                                    setLinkedEvents(prev => [...(prev || []), updated]);
                                  } catch (err) {
                                    setError("Не вдалося прив'язати захід: " + err.message);
                                  }
                                  setAddEventMode(null);
                                  setEventSearch("");
                                }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontWeight:500 }}>{ev.content || ev.activity_type || "—"}</div>
                                  <div style={{ fontSize:11, color:"var(--text-faint)" }}>
                                    {ev.date ? ev.date.split("-").reverse().join(".") : "—"}
                                    {ev.activity_type ? " · " + ev.activity_type : ""}
                                  </div>
                                </div>
                                <StatusBadge status={ev.status} />
                              </div>
                            ))
                          }
                          {allEvents.filter(ev => !linkedEvents?.some(le => le.id === ev.id)).length === 0 && (
                            <div style={{ fontSize:12, color:"var(--text-faint)" }}>Немає доступних заходів</div>
                          )}
                        </div>
                      )}
                      <button className="btn ghost small" style={{ marginTop:8 }} onClick={() => { setAddEventMode(null); setEventSearch(""); }}>Скасувати</button>
                    </div>
                  )}
                </div>
              )}

              {/* 6. Коментарі */}
              {!isNew && (
                <div className="form-section">
                  <SectionHead num="6" title={`Коментарі (${comments?.length ?? "…"})`} />
                  <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:220, overflowY:"auto", marginBottom:8 }}>
                    {comments === null && <div style={{ fontSize:12, color:"var(--text-faint)" }}>Завантаження…</div>}
                    {comments?.length === 0 && <div style={{ fontSize:12, color:"var(--text-faint)" }}>Коментарів поки немає</div>}
                    {comments?.map(c => <CommentItem key={c.id} c={c} />)}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <textarea className="input textarea" rows={2} placeholder="Написати коментар… (Ctrl+Enter)" value={commentText}
                      onChange={e => setCommentText(e.target.value)} style={{ flex:1, resize:"vertical" }}
                      onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddComment(); }} />
                    <button className="btn primary small" disabled={!commentText.trim() || commentSaving} onClick={handleAddComment} style={{ alignSelf:"flex-end" }}>
                      {commentSaving ? "…" : "↑"}
                    </button>
                  </div>
                </div>
              )}

              {/* 7. Журнал */}
              {!isNew && (
                <div className="form-section">
                  <SectionHead num="↻" title="Журнал змін"
                    action={<button className="btn ghost small" onClick={toggleHistory}>{showHistory ? "Сховати" : historyLoading ? "…" : "Показати"}</button>}
                  />
                  {showHistory && (
                    history === null ? <div style={{ fontSize:12, color:"var(--text-faint)" }}>Завантаження…</div>
                    : history.length === 0 ? <div style={{ fontSize:12, color:"var(--text-faint)" }}>Журнал порожній</div>
                    : history.map(h => <HistoryItem key={h.id} h={h} />)
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Revision modal */}
        {showRevision && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}
               onClick={() => setShowRevision(false)}>
            <div style={{ background:"var(--bg-body, #FDFBF7)", borderRadius:10, padding:24, width:400, maxWidth:"90%" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight:600, marginBottom:12 }}>Повернути на доопрацювання</div>
              <textarea className="input textarea" rows={4} placeholder="Вкажіть що саме потрібно виправити…" value={revisionComment}
                onChange={e => setRevisionComment(e.target.value)} style={{ width:"100%", marginBottom:12 }} autoFocus />
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button className="btn ghost small" onClick={() => setShowRevision(false)}>Скасувати</button>
                <button className="btn danger small" disabled={!revisionComment.trim() || saving} onClick={handleRequestRevision}>Повернути</button>
              </div>
            </div>
          </div>
        )}

        <div className="drawer-footer">
          <div className="meta">
            {task ? (
              <><span>Автор: </span><b>{task.created_by?.username || "—"}</b>
                <span style={{ marginLeft:12 }}>Створено: </span><b>{fmtDate(task.created_at)}</b>
                {task.completed_at && <><span style={{ marginLeft:12 }}>Виконано: </span><b>{fmtDate(task.completed_at)}</b></>}
              </>
            ) : <span style={{ color:"var(--text-faint)" }}>Нова задача</span>}
          </div>
          <div className="actions">
            {isAdmin && !isNew && task && (
              <>
                {status === "under_review" && <>
                  <button className="btn danger small" disabled={saving} onClick={() => setShowRevision(true)}>На доопрацювання</button>
                  <button className="btn primary small" disabled={saving} onClick={() => handleAction("approve")}>Затвердити ✓</button>
                </>}
                {status === "created" && <>
                  <button className="btn primary small" disabled={saving || !selectedIds.length} onClick={() => handleAction("assign")}>Призначити →</button>
                  <button className="btn ghost small" style={{ color:"var(--danger, #b44)" }} disabled={saving} onClick={() => setConfirmDelete(true)}>Видалити</button>
                </>}
              </>
            )}
            {!isAdmin && !isNew && task && (
              <>
                {(status === "assigned" || status === "revision_requested") && (
                  <button className="btn primary small" disabled={saving} onClick={() => handleAction("start")}>Взяти в роботу ▶</button>
                )}
                {status === "in_progress" && (
                  <button className="btn primary small" disabled={saving} onClick={() => handleAction("submit")}>Здати на перевірку ↑</button>
                )}
              </>
            )}
            <button className="btn ghost small" onClick={onClose}>Закрити</button>
            {!isReadOnly && (
              <button className="btn primary small" disabled={saving || !title.trim()} onClick={isNew ? handleCreate : handleUpdate}>
                {saving ? "…" : isNew ? "Створити" : "Зберегти"}
              </button>
            )}
          </div>
        </div>
        {confirmDelete && (
          <ConfirmDialog
            title="Видалити задачу?"
            message="Задача та її підзадачі будуть видалені. Цю дію не можна буде скасувати."
            confirmText="Видалити"
            danger
            disabled={saving}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => { setConfirmDelete(false); handleAction("delete"); }}
          />
        )}
      </div>
    </div>
  );
}
