import React, { useState, useMemo, useEffect } from "react";
import { users } from "../api/index.js";

function initials(u) {
  const l = (u.last_name || "")[0] || "";
  const f = (u.first_name || "")[0] || "";
  return (l + f).toUpperCase() || (u.username || "??").slice(0, 2).toUpperCase();
}
function fullName(u) {
  return [u.last_name, u.first_name, u.patronymic].filter(Boolean).join(" ");
}
function shortName(u) {
  return [u.last_name, u.first_name ? u.first_name[0] + "." : null, u.patronymic ? u.patronymic[0] + "." : null]
    .filter(Boolean).join(" ") || u.username;
}

function PsychologistCard({ user, onEdit, onArchive }) {
  const active = user.is_active && !user.is_archived;
  return (
    <div onClick={() => onEdit(user)}
         style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", gap:16, alignItems:"center",
                  background:"var(--bg, #fff)", border:"1px solid var(--line, #E8E4DC)",
                  borderLeft:`4px solid ${active ? "var(--accent, #FD890A)" : "var(--line-strong, #B8B4AC)"}`,
                  borderRadius:8, padding:"16px 20px", opacity:active?1:0.6, cursor:"pointer" }}>
      <div style={{ width:44, height:44, borderRadius:"50%", background:active?"var(--accent,#FD890A)":"#B8B4AC",
                    color:"#fff", fontWeight:700, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {initials(user)}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-faint)" }}>{user.username}</span>
          <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20,
                         background:active?"#FD890A18":"#9B9B9018", color:active?"var(--accent,#FD890A)":"#9B9B90" }}>
            {user.is_archived ? "Архів" : active ? "Активний" : "Неактивний"}
          </span>
        </div>
        <div style={{ fontSize:15, fontWeight:600, color:"var(--text-bright)", marginBottom:4 }}>{fullName(user) || user.username}</div>
        <div style={{ display:"flex", gap:20, fontSize:12, color:"var(--text-faint)", flexWrap:"wrap" }}>
          {user.military_rank && <span>{user.military_rank}</span>}
          {user.position && <span>{user.position}</span>}
          {user.phone && <span>☎ {user.phone}</span>}
          {user.email && <span>✉ {user.email}</span>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, pointerEvents:"auto" }}>
        <button className="text-btn" type="button" onClick={e => { e.stopPropagation(); onEdit(user); }}>Редагувати</button>
        {!user.is_archived && (
          <button className="text-btn danger" type="button" onClick={e => { e.stopPropagation(); onArchive(user); }}>Архівувати</button>
        )}
      </div>
    </div>
  );
}

function PsychologistForm({ user, onClose, onSaved }) {
  const isNew = !user;
  const [form, setForm] = useState({
    username: user?.username || "", password: "",
    last_name: user?.last_name || "", first_name: user?.first_name || "", patronymic: user?.patronymic || "",
    birth_date: user?.birth_date || "",
    military_rank: user?.military_rank || "", position: user?.position || "",
    phone: user?.phone || "", email: user?.email || "",
    tax_number: user?.tax_number || "", pz_direction: user?.pz_direction || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.username.trim()) { setError("Логін обов'язковий"); return; }
    if (isNew && !form.password) { setError("Пароль обов'язковий"); return; }
    setSaving(true); setError(null);
    try {
      let saved;
      if (isNew) {
        saved = await users.create({ username: form.username, password: form.password, role: "psychologist" });
      } else {
        saved = { id: user.id };
      }
      const profileFields = ["last_name","first_name","patronymic","birth_date","military_rank","position","phone","email","tax_number","pz_direction"];
      const body = {};
      profileFields.forEach(k => { body[k] = form[k] || null; });
      await users.update(saved.id || user.id, body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" style={{ maxWidth:520 }}>
        <div className="drawer-head">
          <span className="drawer-title">{isNew ? "Новий психолог" : `Редагування · ${shortName(user)}`}</span>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>
        <form className="drawer-body" onSubmit={submit}>
          {error && <div style={{ marginBottom:12, padding:"8px 14px", background:"#FDECEA", color:"#C0392B", borderRadius:6, fontSize:13 }}>{error}</div>}

          <div className="form-section">
            <div className="form-section-head"><span className="form-section-num">01</span><span className="form-section-title">Обліковий запис</span></div>
            <label className="field"><span className="field-label">Логін<span className="req">*</span></span>
              <input className="input" value={form.username} onChange={e => set("username", e.target.value)} disabled={!isNew} autoFocus={isNew} />
            </label>
            {isNew && (
              <label className="field"><span className="field-label">Пароль<span className="req">*</span></span>
                <input className="input" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="мін. 6 символів" />
              </label>
            )}
            <label className="field"><span className="field-label">ІПН (код)</span>
              <input className="input" value={form.tax_number} onChange={e => set("tax_number", e.target.value)} maxLength={10} style={{ maxWidth:160 }} />
            </label>
          </div>

          <div className="form-section">
            <div className="form-section-head"><span className="form-section-num">02</span><span className="form-section-title">Персональні дані</span></div>
            <label className="field"><span className="field-label">Прізвище</span>
              <input className="input" value={form.last_name} onChange={e => set("last_name", e.target.value)} />
            </label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <label className="field"><span className="field-label">Ім'я</span>
                <input className="input" value={form.first_name} onChange={e => set("first_name", e.target.value)} />
              </label>
              <label className="field"><span className="field-label">По батькові</span>
                <input className="input" value={form.patronymic} onChange={e => set("patronymic", e.target.value)} />
              </label>
            </div>
            <label className="field"><span className="field-label">Дата народження</span>
              <input className="input" type="date" value={form.birth_date} onChange={e => set("birth_date", e.target.value || null)} style={{ maxWidth:180 }} />
            </label>
          </div>

          <div className="form-section">
            <div className="form-section-head"><span className="form-section-num">03</span><span className="form-section-title">Службові дані</span></div>
            <label className="field"><span className="field-label">Військове звання</span>
              <input className="input" value={form.military_rank} onChange={e => set("military_rank", e.target.value)} />
            </label>
            <label className="field"><span className="field-label">Посада</span>
              <input className="input" value={form.position} onChange={e => set("position", e.target.value)} />
            </label>
            <label className="field"><span className="field-label">Напрям ПЗ</span>
              <input className="input" value={form.pz_direction} onChange={e => set("pz_direction", e.target.value)} />
            </label>
          </div>

          <div className="form-section">
            <div className="form-section-head"><span className="form-section-num">04</span><span className="form-section-title">Контакти</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <label className="field"><span className="field-label">Телефон</span>
                <input className="input" value={form.phone} onChange={e => set("phone", e.target.value)} />
              </label>
              <label className="field"><span className="field-label">Email</span>
                <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
              </label>
            </div>
          </div>

          <div className="drawer-footer">
            <div />
            <div className="actions">
              <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>Скасувати</button>
              <button type="submit" className="btn primary" disabled={saving}>{saving ? "Збереження…" : isNew ? "Створити" : "Зберегти"}</button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}

export default function PsychologistsPage() {
  const [userList, setUserList]         = useState(null);
  const [search, setSearch]             = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editUser, setEditUser]         = useState(undefined);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [actionErr, setActionErr]       = useState(null);

  function load() {
    users.list({ role:"psychologist", page_size:100 })
      .then(res => setUserList(res.items || []))
      .catch(err => setActionErr("Помилка завантаження: " + err.message));
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const src = userList || [];
    return src.filter(u => {
      if (!showInactive && (u.is_archived || !u.is_active)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!fullName(u).toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [userList, search, showInactive]);

  const total = (userList || []).length;
  const activeCount = (userList || []).filter(u => u.is_active && !u.is_archived).length;

  async function confirmArchive() {
    if (!archiveTarget) return;
    const user = archiveTarget;
    setArchiveTarget(null);
    setActionErr(null);
    try { await users.archive(user.id); load(); }
    catch (err) { setActionErr(err.message); }
  }

  return (
    <div className="list-page">
      <div className="list-toolbar">
        <div className="list-title-row">
          <h1 className="list-h1">Психологи</h1>
          <div className="list-counter">активних <b>{activeCount}</b> з <b>{total}</b></div>
        </div>
        <div className="toolbar-actions">
          <button className="btn ghost small" onClick={() => setShowInactive(v => !v)}>{showInactive ? "Сховати неактивних" : "Показати всіх"}</button>
          <button className="btn primary" onClick={() => setEditUser(null)}>＋ Додати</button>
        </div>
      </div>

      {actionErr && (
        <div style={{ margin:"0 24px 8px", padding:"8px 14px", background:"#FDECEA", color:"#C0392B", borderRadius:6, fontSize:13 }}>
          {actionErr} <button style={{ float:"right", border:"none", background:"none", cursor:"pointer", color:"#C0392B" }} onClick={() => setActionErr(null)}>×</button>
        </div>
      )}

      <div className="filter-bar" style={{ gridTemplateColumns:"1fr" }}>
        <div className="filter">
          <span className="filter-label">Пошук</span>
          <input className="input" placeholder="Ім'я або логін…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ padding:"16px 24px 48px", display:"flex", flexDirection:"column", gap:10, background:"var(--bg-deep, #FAFAF8)" }}>
        {userList === null && <div style={{ textAlign:"center", padding:"48px 0", color:"var(--text-faint)", fontSize:14 }}>Завантаження…</div>}
        {userList !== null && filtered.length === 0 && <div style={{ textAlign:"center", padding:"48px 0", color:"var(--text-faint)", fontSize:14 }}>Психологів не знайдено</div>}
        {filtered.map(u => <PsychologistCard key={u.id} user={u} onEdit={u => setEditUser(u)} onArchive={u => setArchiveTarget(u)} />)}
      </div>

      <div className="list-footer"><span>Показано: {filtered.length} · Всього: {total}</span></div>

      {editUser !== undefined && (
        <PsychologistForm user={editUser} onClose={() => setEditUser(undefined)} onSaved={() => { load(); setEditUser(undefined); }} />
      )}

      {archiveTarget && (
        <div className="confirm-overlay" onClick={() => setArchiveTarget(null)}>
          <div className="confirm-card" onClick={e => e.stopPropagation()}>
            <h3>Архівувати психолога?</h3>
            <p>
              <b>{fullName(archiveTarget) || archiveTarget.username}</b> буде переміщено в архів,
              доступ до системи буде заблоковано. Цю дію можна скасувати пізніше.
            </p>
            <div className="actions">
              <button className="btn ghost" onClick={() => setArchiveTarget(null)}>Скасувати</button>
              <button className="text-btn danger" onClick={confirmArchive}>Архівувати</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
