import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NAV } from "../data.js";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function fmtClock(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const ROLE_LABELS = { admin: "адміністратор", psychologist: "психолог", respondent: "користувач" };

function userInitials(u) {
  if (!u) return "??";
  const l = (u.last_name || "")[0] || "";
  const f = (u.first_name || "")[0] || "";
  return (l + f).toUpperCase() || (u.username || "??").slice(0, 2).toUpperCase();
}

function userDisplayName(u) {
  if (!u) return "—";
  const parts = [u.last_name, u.first_name ? u.first_name[0] + "." : null, u.patronymic ? u.patronymic[0] + "." : null];
  const full = parts.filter(Boolean).join(" ");
  return full || u.username;
}

const ROUTE_META = {
  "/":              { parent: "ГОЛОВНА",    child: "ОПЕРАТИВНИЙ ОГЛЯД" },
  "/planning":      { parent: "ПЛАНУВАННЯ", child: "ЖУРНАЛ ЗАХОДІВ" },
  "/tasks":         { parent: "ПОРУЧЕННЯ",  child: "ЖУРНАЛ ЗАВДАНЬ" },
  "/profile":       { parent: "СЕРВІС",     child: "ПРОФІЛЬ" },
  "/psychologists": { parent: "СЕРВІС",     child: "ПСИХОЛОГИ" },
};

export function TopBar({ currentUser, onLogout }) {
  const now = useClock();
  const location = useLocation();
  const navigate = useNavigate();
  const section = ROUTE_META[location.pathname] || { parent: "—", child: "" };
  const roleLabel = ROLE_LABELS[currentUser?.role] || "—";
  const levelLabel = currentUser?.role === "admin" ? "РІВЕНЬ ДОСТУПУ · 1" : "РІВЕНЬ ДОСТУПУ · 2";

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div className="topbar-brand-crest">УДО</div>
        <div>
          <div className="topbar-brand-text">АРМ ПСИХОЛОГА</div>
          <div className="topbar-brand-sub">УДО УКРАЇНИ</div>
        </div>
      </div>
      <div className="topbar-main">
        <div className="topbar-crumbs">
          <span>{section.parent}</span>
          {section.child && <><i>/</i><span>{section.child}</span></>}
        </div>
        <div className="topbar-meta">
          <span className="level">{levelLabel}</span>
          <span className="clock">{fmtClock(now)}</span>
          <button className="user topbar-user-link" type="button" onClick={() => navigate("/profile")}>
            <span className="user-avatar">{userInitials(currentUser)}</span>
            <span>
              <span className="user-name">{userDisplayName(currentUser)}</span>{" "}
              <span className="user-role">· {roleLabel}</span>
            </span>
          </button>
          <button className="topbar-logout" onClick={onLogout}>Вихід →</button>
        </div>
      </div>
    </div>
  );
}

const NAV_SECTIONS = [
  { key: "workplace",  label: "Робоче місце" },
  { key: "activities", label: "Заходи" },
  { key: "future",     label: "Майбутні модулі" },
  { key: "service",    label: "Сервіс" },
];

const ROUTE_MAP = {
  home:          "/",
  planning:      "/planning",
  tasks:         "/tasks",
  profile:       "/profile",
  psychologists: "/psychologists",
};

export function Sidebar({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const items = role === "admin" ? NAV : NAV.filter((it) => !it.adminOnly);

  const activeId = Object.entries(ROUTE_MAP).find(([, path]) => path === location.pathname)?.[0] || "home";

  return (
    <aside className="sidebar">
      {NAV_SECTIONS.map((sec) => {
        const secItems = items.filter((it) => it.section === sec.key);
        if (!secItems.length) return null;
        return (
          <React.Fragment key={sec.key}>
            <div className="sidebar-section">{sec.label}</div>
            {secItems.map((it) => (
              <div
                key={it.id}
                className={`nav-item ${activeId === it.id ? "active" : ""} ${it.disabled ? "disabled" : ""}`}
                onClick={() => !it.disabled && ROUTE_MAP[it.id] ? navigate(ROUTE_MAP[it.id]) : undefined}
                aria-disabled={it.disabled ? "true" : undefined}
                title={it.disabled ? "Буде доступно в наступних версіях" : undefined}
              >
                <span className="nav-code">{it.code}</span>
                <span className="nav-label">{it.label}</span>
                {(it.badge || it.disabled) && <span className="nav-badge">{it.badge || "пізніше"}</span>}
              </div>
            ))}
          </React.Fragment>
        );
      })}
    </aside>
  );
}

export function StatusBar() {
  return (
    <div className="statusbar">
      <span className="ok">● З'єднання захищене</span>
      <span className="sep">|</span>
      <span>PROD · UA-KYI-01</span>
      <span className="sep">|</span>
      <span>v 1.0</span>
      <span style={{ marginLeft: "auto" }}>ДЛЯ СЛУЖБОВОГО КОРИСТУВАННЯ</span>
    </div>
  );
}
