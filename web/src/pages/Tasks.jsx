import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { tasks as tasksApi } from "../api/index.js";
import { TASK_PRIORITIES, TASK_STATUSES } from "../data.js";

const KANBAN_COLS = [
  { id: "created",            label: "Створено",        color: "#6B6B5C" },
  { id: "assigned",           label: "Призначено",      color: "#8B6A2A" },
  { id: "in_progress",        label: "Виконується",     color: "#1D4ED8" },
  { id: "under_review",       label: "На перевірці",    color: "#7C3AED" },
  { id: "revision_requested", label: "Потребує правок", color: "#B91C1C" },
  { id: "completed",          label: "Виконано",        color: "#15803D" },
];

function isoToday() { const d=new Date();d.setHours(0,0,0,0);return d.toISOString().slice(0,10); }
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}
function fmtDateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}`;
}
function relDay(iso) {
  if (!iso) return "";
  const diff = Math.round((new Date(iso) - new Date(isoToday())) / 86400000);
  if (diff===0) return " · сьогодні";
  if (diff===1) return " · завтра";
  if (diff===-1) return " · вчора";
  return diff>0 ? ` · +${diff} дн.` : ` · ${diff} дн.`;
}
function isOverdue(task) {
  return !!(task.deadline && task.status!=="completed" && new Date(task.deadline)<new Date());
}
function initials(username) {
  if (!username) return "??";
  return username.slice(-2).toUpperCase();
}

const LIST_PAGE_SIZE = 15;

function isTaskAssignee(task, currentUser) {
  return !!(task && currentUser && (task.assignees || []).some(a => a.user?.id === currentUser.id));
}

function canDropTask(task, colId, isAdmin, currentUser) {
  if (!task || task.status === colId) return false;
  const isAssignee = isTaskAssignee(task, currentUser);
  if (colId === "assigned") return isAssignee && ["in_progress", "under_review"].includes(task.status);
  if (colId === "in_progress") return isAssignee && ["assigned", "revision_requested", "under_review"].includes(task.status);
  if (colId === "under_review") return (isAssignee && task.status === "in_progress") || (isAdmin && task.status === "revision_requested");
  if (colId === "completed") return isAdmin && ["under_review", "revision_requested"].includes(task.status);
  if (colId === "revision_requested") return isAdmin && task.status === "under_review";
  return false;
}

export default function TasksPage({ isAdmin, currentUser, onOpenTask, onNewTask }) {
  const [view, setView]       = useState(() => localStorage.getItem("tasks_view") || "kanban");
  const [filter, setFilter]   = useState("all");
  const [taskList, setTaskList] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [listPage, setListPage] = useState(1);
  const [revisionModal, setRevisionModal] = useState(null); // { taskId }
  const [revisionText, setRevisionText]   = useState("");

  const loadTasks = useCallback(async () => {
    try {
      const res = await tasksApi.list({ page_size: 100 });
      setTaskList(res.items || res);
    } catch {
      setTaskList([]);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(()=>loadTasks(),0);
    return ()=>window.clearTimeout(t);
  }, [loadTasks]);

  useEffect(() => {
    window.__tasksReload = loadTasks;
    return ()=>{ window.__tasksReload=null; };
  }, [loadTasks]);

  const allTasks = useMemo(() => taskList || [], [taskList]);
  const isMine = useCallback((task) => (
    (task.assignees || []).some(a => a.user?.id === currentUser?.id)
  ), [currentUser?.id]);
  const rootTasks = useMemo(() => allTasks.filter(t => !t.parent_task_id), [allTasks]);

  const quickFilters = [
    { id:"all",     label:"Усі",        count: rootTasks.length },
    { id:"active",  label:"Активні",    count: rootTasks.filter(t=>t.status!=="completed").length },
    { id:"mine",    label:"Мої",        count: rootTasks.filter(isMine).length },
    { id:"overdue", label:"Прострочені",count: rootTasks.filter(t=>isOverdue(t)).length },
  ];

  const visible = useMemo(()=>{
    if (!taskList) return [];
    if (filter==="active")  return rootTasks.filter(t=>t.status!=="completed");
    if (filter==="mine")    return rootTasks.filter(isMine);
    if (filter==="overdue") return rootTasks.filter(t=>isOverdue(t));
    return rootTasks;
  }, [taskList, rootTasks, filter, isMine]);

  const totalPages = Math.max(1, Math.ceil(visible.length / LIST_PAGE_SIZE));
  const visiblePage = visible.slice((listPage-1)*LIST_PAGE_SIZE, listPage*LIST_PAGE_SIZE);

  async function handleDrop(colId, taskId) {
    const task = allTasks.find(t=>t.id===taskId);
    if (!canDropTask(task, colId, isAdmin, currentUser)) return;
    setTaskList(prev=>prev.map(t=>t.id===taskId?{...t,status:colId}:t));
    try {
      let updated;
      if (colId==="assigned") updated = await tasksApi.update(taskId, { status: "assigned" });
      else if (colId==="in_progress") updated = await tasksApi.start(taskId);
      else if (colId==="under_review") {
        updated = isAdmin && task.status === "revision_requested"
          ? await tasksApi.update(taskId, { status: "under_review" })
          : await tasksApi.submit(taskId);
      }
      else if (colId==="completed") updated = await tasksApi.approve(taskId);
      else if (colId==="revision_requested") {
        // revert optimistic update and show modal
        setTaskList(prev=>prev.map(t=>t.id===taskId?{...t,status:task.status}:t));
        setRevisionModal({ taskId });
        setRevisionText("");
        return;
      }
      if (updated) setTaskList(prev=>prev.map(t=>t.id===taskId?updated:t));
    } catch { loadTasks(); }
  }

  async function confirmRevision() {
    if (!revisionModal || !revisionText.trim()) return;
    const { taskId } = revisionModal;
    setRevisionModal(null);
    setTaskList(prev=>prev.map(t=>t.id===taskId?{...t,status:"revision_requested"}:t));
    try {
      const updated = await tasksApi.requestRevision(taskId, revisionText.trim());
      if (updated) setTaskList(prev=>prev.map(t=>t.id===taskId?updated:t));
    } catch { loadTasks(); }
    setRevisionText("");
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title-row">
          <h1 className="page-title">Задачі</h1>
          <div className="page-counter"><b>{visible.length}</b> з {rootTasks.length}</div>
        </div>
        <div className="page-actions">
          <div className="view-tabs">
            <button className={"view-tab"+(view==="kanban"?" active":"")} onClick={()=>{setView("kanban");localStorage.setItem("tasks_view","kanban");}}>⊟ Дошка</button>
            <button className={"view-tab"+(view==="list"?" active":"")} onClick={()=>{setView("list");localStorage.setItem("tasks_view","list");}}>☰ Список</button>
          </div>
          <button className="btn primary" onClick={onNewTask}>＋ Нова задача</button>
        </div>
      </div>

      <div className="filterbar">
        <div className="field" style={{minWidth:0}}>
          <span className="field-label">Швидкі фільтри</span>
          <div style={{display:"flex",gap:4}}>
            {quickFilters.map(f=>(
              <button key={f.id} className={"pill"+(filter===f.id?" on":"")}
                onClick={()=>{setFilter(f.id);setListPage(1);}} style={{height:30}}>
                {f.label}
                <span className="cnt">{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-body">
        {taskList===null && (
          <div style={{padding:48,textAlign:"center",fontFamily:"var(--mono)",fontSize:11,color:"var(--text-faint)"}}>Завантаження…</div>
        )}
        {taskList!==null && view==="kanban" && (
          <KanbanBoard tasks={visible} onOpenTask={onOpenTask} onDrop={handleDrop}
            dragging={dragging} setDragging={setDragging} isAdmin={isAdmin} currentUser={currentUser}/>
        )}
        {taskList!==null && view==="list" && (
          <>
            <TaskList tasks={visiblePage} onOpenTask={onOpenTask}/>
            {totalPages > 1 && (
              <div className="tbl-pagination">
                <button className="pg-btn" disabled={listPage===1} onClick={()=>setListPage(p=>p-1)}>← Назад</button>
                <span className="pg-info">{listPage} / {totalPages} · {visible.length} задач</span>
                <button className="pg-btn" disabled={listPage===totalPages} onClick={()=>setListPage(p=>p+1)}>Далі →</button>
              </div>
            )}
          </>
        )}
      </div>

      {revisionModal && (
        <div className="confirm-overlay" onClick={() => setRevisionModal(null)}>
          <div className="confirm-card" onClick={e=>e.stopPropagation()}>
            <h3>Повернути на доопрацювання</h3>
            <p style={{marginBottom:10,color:"var(--text-body)",fontSize:13}}>Вкажіть що саме потрібно виправити:</p>
            <textarea className="input textarea" rows={4} autoFocus
              style={{width:"100%",marginBottom:12,resize:"vertical"}}
              value={revisionText} onChange={e=>setRevisionText(e.target.value)}
              placeholder="Опишіть зауваження…"
              onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))confirmRevision();}}/>
            <div className="actions">
              <button className="btn ghost" onClick={()=>setRevisionModal(null)}>Скасувати</button>
              <button className="btn danger" disabled={!revisionText.trim()} onClick={confirmRevision}>Повернути</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KanbanBoard({ tasks, onOpenTask, onDrop, dragging, setDragging, isAdmin, currentUser }) {
  const [dropTarget, setDropTarget] = useState(null);
  const draggingTask = tasks.find(t=>t.id===dragging);

  function handleDragStart(e, task) {
    setDragging(task.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  }
  function handleDragEnd() {
    setDragging(null);
    setDropTarget(null);
  }
  function handleDragOver(e, colId) {
    if (!draggingTask || !canDropTask(draggingTask, colId, isAdmin, currentUser)) {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(colId);
  }
  function handleDrop(e, colId) {
    e.preventDefault();
    const taskId = dragging || e.dataTransfer.getData("text/plain");
    if (taskId) onDrop(colId, taskId);
    setDragging(null);
    setDropTarget(null);
  }

  return (
    <div className="kanban-scroll">
      <div className="kanban-v2">
        {KANBAN_COLS.filter(col => isAdmin || col.id !== "created").map(col=>{
          const colTasks = tasks.filter(t=>t.status===col.id);
          const isTarget = dropTarget===col.id;
          const canDrop = draggingTask ? canDropTask(draggingTask, col.id, isAdmin, currentUser) : true;
          return (
            <div key={col.id} className={"k-col"+(draggingTask && !canDrop ? " drop-disabled" : "")}
              onDragOver={e=>handleDragOver(e,col.id)}
              onDragLeave={()=>setDropTarget(null)}
              onDrop={e=>handleDrop(e,col.id)}
              style={isTarget?{outline:"2px solid var(--accent)",outlineOffset:-2}:{}}>
              <div className="k-col-head" style={{color:col.color}}>
                <span className="lbl">{col.label}</span>
                <span className="cnt">{colTasks.length}</span>
              </div>
              <div className="k-col-body">
                {colTasks.length===0 && <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--text-faint)",padding:"8px 0",textAlign:"center"}}>— немає —</div>}
                {colTasks.map(t=>(
                  <KCard key={t.id} task={t}
                    onOpen={onOpenTask}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDragging={dragging===t.id}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KCard({ task, onOpen, onDragStart, onDragEnd, isDragging }) {
  const overdue = isOverdue(task);
  const pri = TASK_PRIORITIES.find(p=>p.value===task.priority);
  const priColor = pri?.color || "var(--text-faint)";
  const priLabel = pri?.short || pri?.label || task.priority;

  const subtasksDone  = task.subtasks?.filter(s=>s.status==="completed").length || 0;
  const subtasksTotal = task.subtasks?.length || 0;
  const progress = subtasksTotal > 0 ? subtasksDone/subtasksTotal : 0;

  const assignees = task.assignees || [];

  const downPosRef = useRef(null);
  function handleMouseDown(e) {
    if (e.button !== 0) return;
    downPosRef.current = { x: e.clientX, y: e.clientY };
  }
  function handleMouseUp(e) {
    if (e.button !== 0 || !downPosRef.current) return;
    const dx = Math.abs(e.clientX - downPosRef.current.x);
    const dy = Math.abs(e.clientY - downPosRef.current.y);
    downPosRef.current = null;
    if (dx < 5 && dy < 5) onOpen(task.id);
  }

  return (
    <div className={"k-card pri-"+task.priority+(isDragging?" dragging":"")}
      draggable
      onDragStart={e=>onDragStart(e,task)}
      onDragEnd={onDragEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}>
      <div className="k-card-meta">
        <span className="k-pri" style={{color:priColor,borderColor:priColor}}>{priLabel}</span>
        {overdue && <span className="k-overdue">ПРОСТР.</span>}
        <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:9,color:"var(--text-faint)"}}>
          #{task.id?.slice(0,6)||"—"}
        </span>
      </div>
      <div className="ttl">{task.title}</div>
      <div className={"due"+(overdue?" late":"")}>
        {task.deadline ? `до ${fmtDateShort(task.deadline)}${relDay(task.deadline)}` : "без дедлайну"}
      </div>
      <div className="k-card-foot">
        <div className="k-asg">
          {assignees.slice(0,3).map((a,i)=>(
            <div key={i} className="k-av" title={a.user?.username}>{initials(a.user?.username)}</div>
          ))}
          {assignees.length>3 && <span className="more">+{assignees.length-3}</span>}
          {assignees.length===0 && <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--text-faint)"}}>не призначено</span>}
        </div>
        {subtasksTotal>0 && (
          <div className="k-progress">
            <span>{subtasksDone}/{subtasksTotal}</span>
            <div className="k-bar"><i style={{width:`${progress*100}%`}}/></div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskList({ tasks, onOpenTask }) {
  if (tasks.length === 0) return (
    <div style={{padding:"40px 24px",textAlign:"center",color:"var(--text-faint)",fontSize:13}}>— немає задач —</div>
  );
  return (
    <div className="task-list-cards">
      {tasks.map(t => {
        const overdue = isOverdue(t);
        const pri = TASK_PRIORITIES.find(p=>p.value===t.priority);
        const st  = TASK_STATUSES.find(s=>s.value===t.status);
        return (
          <div key={t.id} className="task-list-row" onClick={()=>onOpenTask(t.id)}>
            <span className="tl-id">#{t.id?.slice(0,8)||"—"}</span>
            <span className="tl-title">{t.title}</span>
            <span className="badge" style={{color:pri?.color||"var(--text-faint)"}}>
              <span className="b-dot"/>{pri?.label||t.priority}
            </span>
            <span className="badge" style={{color:st?.color||"var(--text-faint)"}}>
              <span className="b-dot"/>{st?.label||t.status}
            </span>
            <span className="tl-date" style={{color:overdue?"var(--danger)":"var(--text-dim)"}}>
              {fmtDate(t.deadline)}
            </span>
            <div className="k-asg">
              {(t.assignees||[]).slice(0,3).map((a,i)=>(
                <div key={i} className="k-av" title={a.user?.username}>{initials(a.user?.username)}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
