import React from "react";
import { TASK_STATUSES, TASK_PRIORITIES } from "../data.js";

export function StatusBadge({ status, solid }) {
  const labels = {
    draft:     "ЧЕРНЕТКА",
    planned:   "ЗАПЛАН.",
    completed: "ВИКОНАНО",
    overdue:   "ПРОСТРОЧ.",
    postponed: "ПЕРЕНЕС.",
    cancelled: "СКАСОВ.",
  };
  return <span className={`badge ${status} ${solid ? "solid" : ""}`}>{labels[status] || status}</span>;
}

export function TaskStatusBadge({ status }) {
  const s = TASK_STATUSES.find((x) => x.value === status);
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
      padding: "2px 8px", borderRadius: 20,
      background: s ? s.color + "22" : "#9B9B9022",
      color: s ? s.color : "#9B9B90",
      border: `1px solid ${s ? s.color + "44" : "#9B9B9044"}`,
      whiteSpace: "nowrap",
    }}>
      {s?.label || status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = TASK_PRIORITIES.find((x) => x.value === priority);
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
      padding: "2px 8px", borderRadius: 20,
      background: p ? p.color + "22" : "#9B9B9022",
      color: p ? p.color : "#9B9B90",
      border: `1px solid ${p ? p.color + "44" : "#9B9B9044"}`,
      whiteSpace: "nowrap",
    }}>
      {p?.label || priority}
    </span>
  );
}

export function taskStatusLabel(s) { return TASK_STATUSES.find((x) => x.value === s)?.label || s; }
export function taskStatusColor(s) { return TASK_STATUSES.find((x) => x.value === s)?.color || "#9B9B90"; }
