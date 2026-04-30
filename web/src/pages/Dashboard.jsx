import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { events, tasks, users } from "../api/index.js";
import { ACTIVITY_TYPES, TASK_STATUSES } from "../data.js";
import { StatusBadge } from "../components/StatusBadge.jsx";

const DAY_MS = 86400000;

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatShortDate(iso) { return iso?.split("-").reverse().join(".") || "—"; }
function formatDayLong(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  const days = ["неділя", "понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота"];
  return days[d.getDay()];
}
function getActivity(value) {
  return ACTIVITY_TYPES.find((a) => a.value === value) || { code: "?", label: value, full: value };
}
function shortName(u) {
  if (!u) return "—";
  return [u.last_name, u.first_name ? u.first_name[0] + "." : null, u.patronymic ? u.patronymic[0] + "." : null]
    .filter(Boolean).join(" ") || u.username;
}
function taskDeadlineShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}`;
}

export default function Dashboard({ onOpenEvent, onOpenTask }) {
  const navigate = useNavigate();
  const [calendar] = useState(() => {
    const now = new Date();
    const today = new Date(now); today.setHours(0,0,0,0);
    const todayIso = isoDate(today);
    const weekStartIso = isoDate(new Date(today.getTime() - 6*DAY_MS));
    const weekEndIso   = isoDate(new Date(today.getTime() + 6*DAY_MS));
    const yearStartIso = isoDate(new Date(today.getFullYear(), 0, 1));
    return { todayIso, weekStartIso, weekEndIso, yearStartIso, currentYear: today.getFullYear(),
      days: Array.from({ length: 6 }, (_, i) => {
        const d = new Date(today.getTime() + (i+1)*DAY_MS);
        return { iso: isoDate(d), day: ["НД","ПН","ВТ","СР","ЧТ","ПТ","СБ"][d.getDay()],
          num: String(d.getDate()).padStart(2,"0"), mo: ["січ","лют","бер","кві","тра","чер","лип","сер","вер","жов","лис","гру"][d.getMonth()],
          isToday: false };
      }),
    };
  });
  const [data, setData] = useState({ todayEvents: null, upcomingEvents: null, stats: null, activeTasks: null, birthdays: null });

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const base = { is_archived: false };
      Promise.all([
        events.list({ ...base, date__gte: calendar.todayIso, date__lte: calendar.todayIso, page_size: 40 }),
        events.list({ ...base, date__gte: calendar.todayIso, date__lte: calendar.weekEndIso, page_size: 120 }),
        events.list({ ...base, date__gte: calendar.weekStartIso, date__lte: calendar.todayIso, page_size: 1 }),
        events.list({ ...base, date__gte: calendar.weekStartIso, date__lte: calendar.todayIso, status: "completed", page_size: 1 }),
        events.list({ ...base, date__gte: calendar.yearStartIso, date__lte: calendar.todayIso, page_size: 1 }),
        events.list({ ...base, date__gte: calendar.yearStartIso, date__lte: calendar.todayIso, status: "completed", page_size: 1 }),
        events.list({ ...base, status: "overdue", page_size: 1 }),
        tasks.list({ page_size: 20 }),
        users.birthdays(30),
      ]).then(([today, upcoming, week, weekDone, year, yearDone, overdue, taskRes, bdays]) => {
        if (cancelled) return;
        const taskItems = (taskRes.items || []).filter(t => t.status !== "completed").sort((a,b) => {
          const o = { critical:0, high:1, medium:2, low:3 };
          return (o[a.priority]||9)-(o[b.priority]||9);
        }).slice(0,6);
        setData({
          todayEvents: today.items || [],
          upcomingEvents: upcoming.items || [],
          stats: { weekTotal: week.total||0, weekDone: weekDone.total||0, yearTotal: year.total||0, yearDone: yearDone.total||0, overdue: overdue.total||0, upcoming: upcoming.total||0 },
          activeTasks: taskItems,
          birthdays: bdays || [],
        });
      }).catch(() => {
        if (cancelled) return;
        setData({ todayEvents:[], upcomingEvents:[], stats:{weekTotal:0,weekDone:0,yearTotal:0,yearDone:0,overdue:0,upcoming:0}, activeTasks:[], birthdays:[] });
      });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [calendar]);

  const todayEvents   = data.todayEvents;
  const activeTasks   = data.activeTasks;
  const birthdays     = data.birthdays;
  const stats         = data.stats;
  const pct = (a, b) => b ? Math.round(a/b*100) : 0;

  return (
    <div className="dash">
      <div className="dash-main">

        {/* Metrics */}
        <div className="metrics">
          <Metric label="Сьогодні" value={todayEvents ? todayEvents.length : "…"}
            cap={todayEvents ? `${todayEvents.filter(e=>e.is_controlled).length} контр.` : "—"} />
          <Metric label="Найближчі 7 днів" value={stats ? stats.upcoming : "…"} cap="заплановано вперед" />
          <Metric label="Тиждень"
            value={stats ? `${stats.weekDone}/${stats.weekTotal}` : "…"}
            cap={stats ? <span><b>{pct(stats.weekDone,stats.weekTotal)}%</b> виконання</span> : "—"}
            tone="ok" />
          <Metric label="Прострочено" value={stats ? stats.overdue : "…"}
            cap={stats?.overdue ? "потребує уваги" : "немає"}
            tone={stats?.overdue ? "danger" : undefined} />
        </div>

        {/* Заходи сьогодні */}
        <div className="section-head" style={{ marginTop: 20 }}>
          <h2>Сьогодні · {formatShortDate(calendar.todayIso)}</h2>
          <span className="counter">{formatDayLong(calendar.todayIso)} · {todayEvents?.length ?? "…"} заходів</span>
          <div className="actions">
            <button type="button" className="section-action-link" onClick={() => navigate("/planning")}>відкрити планування →</button>
          </div>
        </div>
        <div className="today-list">
          {todayEvents === null && <div style={{ padding:"24px", textAlign:"center", fontSize:13, color:"var(--text-faint)" }}>Завантаження…</div>}
          {todayEvents?.length === 0 && <div style={{ padding:"24px", textAlign:"center", fontSize:13, color:"var(--text-faint)" }}>— заходів на сьогодні немає —</div>}
          {todayEvents?.map((ev) => (
            <div key={ev.id} className="today-row" onClick={() => onOpenEvent(ev.id)}>
              <span className="t-time">{ev.start_time ? ev.start_time.slice(0,5) : "—"}{ev.end_time ? "–"+ev.end_time.slice(0,5) : ""}</span>
              <ActivityChip value={ev.activity_type} />
              <div className="t-main">
                <div className="ttl">{ev.content || "—"}</div>
                <div className="meta">{ev.target_unit || ev.respondent_name || ""}{ev.is_controlled ? " · КОНТР." : ""}</div>
              </div>
              <span className="t-cnt">план {ev.planned_count ?? "—"}</span>
              <StatusBadge status={ev.status} />
            </div>
          ))}
        </div>

        {/* Активні задачі */}
        <div className="section-head">
          <h2>Активні задачі</h2>
          <span className="counter">{activeTasks?.length ?? "…"}</span>
          <div className="actions">
            <button type="button" className="section-action-link" onClick={() => navigate("/tasks")}>всі задачі →</button>
          </div>
        </div>
        <div className="today-list">
          {activeTasks === null && <div style={{ padding:"24px", textAlign:"center", fontSize:13, color:"var(--text-faint)" }}>Завантаження…</div>}
          {activeTasks?.length === 0 && <div style={{ padding:"24px", textAlign:"center", fontSize:13, color:"var(--text-faint)" }}>— немає активних задач —</div>}
          {activeTasks?.map(t => {
            const todayIso = calendar.todayIso;
            const overdue = t.deadline && t.deadline < todayIso;
            const st = TASK_STATUSES.find(x => x.value === t.status);
            return (
              <div key={t.id} className={"today-row"+(overdue?" is-overdue":"")}
                   style={{ gridTemplateColumns:"4px 1fr auto auto", cursor:"pointer" }}
                   onClick={() => onOpenTask?.(t.id)}>
                <div style={{ background: overdue?"var(--danger)":t.priority==="critical"?"var(--danger)":t.priority==="high"?"#B07050":t.priority==="medium"?"var(--warn)":"var(--ok)", borderRadius:2, alignSelf:"stretch" }} />
                <div className="t-main">
                  <div className="ttl">{t.title}</div>
                  <div className="meta">{st?.label||t.status}</div>
                </div>
                <span className="t-cnt">{taskDeadlineShort(t.deadline)}</span>
              </div>
            );
          })}
        </div>

      </div>

      {/* Rail */}
      <aside className="dash-rail">
        <NotesCard />

        {/* Дні народження */}
        <div className="rail-block">
          <div className="rail-title"><span>Дні народження</span><b>30 дн.</b></div>
          {birthdays === null && <div style={{ fontSize:13, color:"var(--text-faint)", padding:"8px 0" }}>Завантаження…</div>}
          {birthdays?.length === 0 && <div style={{ fontSize:13, color:"var(--text-faint)", padding:"8px 0" }}>— немає —</div>}
          {birthdays?.slice(0,5).map(b => {
            const today = b.days_until === 0;
            const bd = new Date(b.birth_date);
            const dayStr = today ? "Сьогодні" : b.days_until === 1 ? "Завтра"
              : `${String(bd.getDate()).padStart(2,"0")}.${String(bd.getMonth()+1).padStart(2,"0")}`;
            const age = calendar.currentYear - bd.getFullYear();
            return (
              <div key={b.id} className={"bday"+(today?" today":"")}>
                <div className="bday-when">{dayStr}</div>
                <div>
                  <div className="bday-name">{shortName(b)}</div>
                  {b.military_rank && <div className="bday-meta">{b.military_rank}</div>}
                </div>
                <div className="bday-age">{age} р.</div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value, cap, tone }) {
  return (
    <div className={"metric"+(tone?" "+tone:"")}>
      <span className="lbl">{label}</span>
      <span className="val">{value}</span>
      <span className="cap">{cap}</span>
    </div>
  );
}

function ActivityChip({ value }) {
  const a = getActivity(value);
  return <span className="act-chip" title={a.full}>{a.code}</span>;
}

function NotesCard() {
  const [value, setValue] = useState(() => localStorage.getItem("psy_notes") || "");
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      localStorage.setItem("psy_notes", value);
      setSavedAt(new Date());
    }, 600);
    return () => window.clearTimeout(id);
  }, [value]);

  const savedLabel = savedAt
    ? `збережено о ${String(savedAt.getHours()).padStart(2,"0")}:${String(savedAt.getMinutes()).padStart(2,"0")}`
    : "автозбереження";

  return (
    <div className="notes-card">
      <div className="notes-head">
        <span>Особисті нотатки</span>
        <span className="notes-saved">{savedLabel}</span>
      </div>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Швидкі нотатки, ідеї, нагадування…"
        style={{ minHeight:120, resize:"vertical" }}
      />
    </div>
  );
}
