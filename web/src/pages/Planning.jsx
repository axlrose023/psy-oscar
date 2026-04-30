import { useState, useMemo, useEffect, useCallback } from "react";
import { events as eventsApi, users } from "../api/index.js";
import { ACTIVITY_TYPES, PERSONNEL_CATEGORIES } from "../data.js";
import { StatusBadge } from "../components/StatusBadge.jsx";

const STATUSES = [
  { value: "draft",     label: "Чернетка",   color: "var(--st-draft)" },
  { value: "planned",   label: "Заплановано", color: "var(--st-planned)" },
  { value: "completed", label: "Виконано",    color: "var(--st-completed)" },
  { value: "overdue",   label: "Прострочено", color: "var(--st-overdue)" },
  { value: "postponed", label: "Перенесено",  color: "var(--st-postponed)" },
  { value: "cancelled", label: "Скасовано",   color: "var(--st-cancelled)" },
];

function isoDate(d) { return d.toISOString().slice(0,10); }
function dateOffset(days) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+days); return d; }
function formatShortDate(iso) { return iso?.split("-").reverse().join(".")||"—"; }
function formatDayLong(iso) {
  if (!iso) return "—";
  const d = new Date(iso+"T00:00:00");
  return ["неділя","понеділок","вівторок","середа","четвер","п'ятниця","субота"][d.getDay()];
}
function dayMonthName(iso) {
  if (!iso) return "—";
  return ["січ","лют","бер","кві","тра","чер","лип","сер","вер","жов","лис","гру"][new Date(iso+"T00:00:00").getMonth()];
}
function relativeDay(iso) {
  if (!iso) return "—";
  const diff = Math.round((new Date(iso+"T00:00:00") - dateOffset(0)) / 86400000);
  if (diff===0) return "сьогодні";
  if (diff===1) return "завтра";
  if (diff===-1) return "вчора";
  return diff>0 ? `+${diff} дн.` : `${diff} дн.`;
}

function getActivity(value) {
  return ACTIVITY_TYPES.find(a=>a.value===value)||{code:"?",label:value,full:value};
}
function getCategory(value) {
  return PERSONNEL_CATEGORIES.find(c=>c.value===value)||{short:"—",label:value};
}

function ActivityChip({ value }) {
  const a = getActivity(value);
  return <span className="act-chip" title={a.full}>{a.code}</span>;
}

export default function PlanningPage({ onOpenEvent, onNewEvent, isAdmin }) {
  const [from, setFrom] = useState(isoDate(dateOffset(-7)));
  const [to,   setTo]   = useState(isoDate(dateOffset(13)));
  const [activity, setActivity] = useState("all");
  const [psyFilter, setPsyFilter] = useState("all");
  const [psychologists, setPsychologists] = useState([]);
  const [statuses, setStatuses] = useState(["planned"]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  const [evList, setEvList] = useState(null);
  const [loadErr, setLoadErr] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    users.list({ role:"psychologist", page_size:100 })
      .then(res => setPsychologists(res.items||[]))
      .catch(()=>{});
  }, [isAdmin]);

  const loadEvents = useCallback(async () => {
    setLoadErr(null);
    try {
      const params = { date__gte:from, date__lte:to, page_size:PAGE_SIZE, page, is_archived:false };
      if (activity!=="all") params.activity_type = activity;
      if (isAdmin && psyFilter!=="all") params.psychologist_id = psyFilter;
      const res = await eventsApi.list(params);
      const items = res.items||res;
      setEvList(items);
    } catch(err) {
      setLoadErr(err.message);
      setEvList([]);
    }
  }, [from, to, activity, psyFilter, page, isAdmin]);

  useEffect(() => {
    const t = window.setTimeout(()=>loadEvents(), 0);
    return ()=>window.clearTimeout(t);
  }, [loadEvents]);

  useEffect(() => {
    window.__planningReload = loadEvents;
    return ()=>{ window.__planningReload=null; };
  }, [loadEvents]);

  const filtered = useMemo(() => {
    if (!evList) return [];
    return evList.filter(e => {
      if (statuses.length > 0 && !statuses.includes(e.status)) return false;
      if (search && !(e.content||"").toLowerCase().includes(search.toLowerCase()) &&
                   !(e.target_unit||"").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [evList, statuses, search]);

  const statusCounts = useMemo(() => {
    const counts={};
    STATUSES.forEach(s=>{ counts[s.value]=0; });
    (evList||[]).forEach(e=>{ if(counts[e.status]!==undefined) counts[e.status]++; });
    return counts;
  }, [evList]);

  function toggleStatus(s) {
    setStatuses(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev,s]);
  }

  const todayIso = isoDate(dateOffset(0));

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title-row">
          <h1 className="page-title">Планування заходів</h1>
          <div className="page-counter">
            показано <b>{filtered.length}</b> · діапазон <b>{formatShortDate(from)}</b> — <b>{formatShortDate(to)}</b>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn primary" onClick={onNewEvent}>＋ Новий захід</button>
        </div>
      </div>

      <div className="filterbar">
        <label className="field" style={{ minWidth:240 }}>
          <span className="field-label">Період</span>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <input className="input" type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(1);}} style={{ width:140 }}/>
            <span style={{ color:"var(--text-faint)", fontFamily:"var(--mono)" }}>→</span>
            <input className="input" type="date" value={to} onChange={e=>{setTo(e.target.value);setPage(1);}} style={{ width:140 }}/>
          </div>
        </label>
        <label className="field" style={{ minWidth:200 }}>
          <span className="field-label">Вид заходу</span>
          <select className="select" value={activity} onChange={e=>{setActivity(e.target.value);setPage(1);}}>
            <option value="all">— усі —</option>
            {ACTIVITY_TYPES.map(a=><option key={a.value} value={a.value}>{a.code} · {a.label}</option>)}
          </select>
        </label>
        {isAdmin && (
          <label className="field" style={{ minWidth:160 }}>
            <span className="field-label">Психолог</span>
            <select className="select" value={psyFilter} onChange={e=>{setPsyFilter(e.target.value);setPage(1);}}>
              <option value="all">— усі —</option>
              {psychologists.map(p=>(
                <option key={p.id} value={p.id}>
                  {[p.last_name,p.first_name?p.first_name[0]+".":null].filter(Boolean).join(" ")||p.username}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field grow">
          <span className="field-label">Пошук</span>
          <input className="input" placeholder="зміст або підрозділ…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </label>
        <div className="right">
          <button className="btn ghost" onClick={()=>{setStatuses(["planned"]);setActivity("all");setPsyFilter("all");setSearch("");setPage(1);}}>Скинути</button>
        </div>
      </div>

      <div className="statusbar-pills">
        <span className="lbl">Статус</span>
        {STATUSES.map(s=>{
          const on = statuses.includes(s.value);
          return (
            <button key={s.value} className={"pill"+(on?" on":"")}
              style={on?{borderColor:s.color,color:s.color}:{}}
              onClick={()=>toggleStatus(s.value)}>
              <span className="dot" style={{background:on?s.color:"var(--text-faint)"}}/>
              {s.label}
              <span className="cnt" style={on?{color:s.color}:{}}>{statusCounts[s.value]||0}</span>
            </button>
          );
        })}
      </div>

      {loadErr && <div style={{margin:"12px 24px",padding:"8px 14px",background:"#FDECEA",color:"#C0392B",fontSize:13}}>Помилка: {loadErr}</div>}

      <div className="page-body">
        <AgendaView events={filtered} onOpenEvent={onOpenEvent} todayIso={todayIso} isAdmin={isAdmin}/>
      </div>
    </div>
  );
}

// ── AGENDA ──
function AgendaView({ events, onOpenEvent, todayIso, isAdmin }) {
  const byDate = useMemo(()=>{
    const map = new Map();
    events.forEach(ev=>{
      if(!map.has(ev.date)) map.set(ev.date,[]);
      map.get(ev.date).push(ev);
    });
    Array.from(map.values()).forEach(list=>list.sort((a,b)=>(a.start_time||"").localeCompare(b.start_time||"")));
    return Array.from(map.entries()).sort(([a],[b])=>a.localeCompare(b));
  }, [events]);

  if (byDate.length===0) return (
    <div style={{marginTop:24,padding:32,textAlign:"center",border:"1px solid var(--line)",background:"var(--bg-head)"}}>
      <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text-faint)"}}>— записів за обраними фільтрами не знайдено —</div>
    </div>
  );

  return (
    <div className="agenda">
      {byDate.map(([date,list])=>{
        const isToday = date===todayIso;
        const d = new Date(date+"T00:00:00");
        const planned  = list.filter(e=>e.status==="planned").length;
        const done     = list.filter(e=>e.status==="completed").length;
        const late     = list.filter(e=>e.status==="overdue").length;
        const ctrl     = list.filter(e=>e.is_controlled).length;
        return (
          <div key={date} className="agenda-day">
            <div className={"agenda-day-head"+(isToday?" is-today":"")}>
              <div>
                <span className="date-num">{String(d.getDate()).padStart(2,"0")}</span>
                <span className="date-mo">{dayMonthName(date)}</span>
              </div>
              <div className="date-meta">
                <span className="day-name">{formatDayLong(date)}</span>
                <span className="day-rel">· {relativeDay(date)}</span>
              </div>
              <div className="day-stats">
                <span>{list.length} всього</span>
                {planned>0 && <span className="planned">{planned} план.</span>}
                {done>0    && <span className="done">{done} викон.</span>}
                {late>0    && <span className="late">{late} простр.</span>}
                {ctrl>0    && <span style={{color:"var(--st-overdue)"}}>● {ctrl} контр.</span>}
              </div>
            </div>
            {list.map(ev=>{
              const cat = getCategory(ev.personnel_category);
              const psyName = ev.assignees?.length
                ? ev.assignees.map((a) => (
                    [a.user.last_name, a.user.first_name ? a.user.first_name[0] + "." : null]
                      .filter(Boolean).join(" ") || a.user.username
                  )).join(", ")
                : ev.psychologist
                  ? [ev.psychologist.last_name, ev.psychologist.first_name?ev.psychologist.first_name[0]+".":null].filter(Boolean).join(" ")||ev.psychologist.username
                  : null;
              return (
                <div key={ev.id} className={"agenda-event"+(ev.is_controlled?" is-controlled":"")}
                     onClick={()=>onOpenEvent(ev.id)}>
                  <div className="ag-time">
                    <span>{ev.start_time?ev.start_time.slice(0,5):"—"}</span>
                    {ev.end_time&&<span className="end">– {ev.end_time.slice(0,5)}</span>}
                  </div>
                  <ActivityChip value={ev.activity_type}/>
                  <div className="ag-main">
                    <div className="ttl">{ev.content||"—"}</div>
                    <div className="meta">
                      <span>{ev.target_unit||ev.respondent_name||""}</span>
                      {ev.is_controlled&&<span className="ctr">КОНТРОЛЬНИЙ</span>}
                    </div>
                  </div>
                  <div className="ag-cat">{cat.short} · {cat.label.split(" ")[0]}</div>
                  <div className="ag-cnt">
                    {ev.status==="completed"
                      ? <><span className="actual">{ev.actual_count??"—"}</span> / {ev.planned_count??"—"}</>
                      : <><span className="planned-lbl">план</span> {ev.planned_count??"—"}</>}
                  </div>
                  <StatusBadge status={ev.status}/>
                  {isAdmin&&psyName&&<div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--text-faint)"}}>{psyName}</div>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
