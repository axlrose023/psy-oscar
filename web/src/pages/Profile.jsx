import { useCallback, useEffect, useMemo, useState } from "react";
import { users } from "../api/index.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const PROFILE_FIELDS = [
  "tax_number", "last_name", "first_name", "patronymic", "photo", "birth_date",
  "phone", "email", "military_rank", "position", "address", "marital_status",
  "social_accounts", "combat_participation", "reserve_status", "housing",
  "rating", "contract_end_date", "pz_direction",
];

const EMPTY_PROFILE = Object.fromEntries(PROFILE_FIELDS.map((key) => [key, ""]));

const RELATED = {
  family: {
    title: "Сім'я",
    countLabel: "записів",
    source: "family_members",
    add: users.addMyFamilyMember,
    update: users.updateMyFamilyMember,
    delete: users.deleteMyFamilyMember,
    fields: [
      { name: "relation_type", label: "Ступінь споріднення", required: true, maxLength: 20 },
      { name: "last_name", label: "Прізвище", required: true, maxLength: 30 },
      { name: "first_name", label: "Ім'я", required: true, maxLength: 20 },
      { name: "patronymic", label: "По батькові", maxLength: 20 },
      { name: "birth_date", label: "Дата народження", type: "date" },
      { name: "address", label: "Адреса", maxLength: 200 },
    ],
    render: (item) => ({
      title: [item.last_name, item.first_name, item.patronymic].filter(Boolean).join(" "),
      meta: [item.relation_type, item.birth_date, item.address].filter(Boolean).join(" · "),
    }),
  },
  education: {
    title: "Освіта",
    countLabel: "записів",
    source: "education",
    add: users.addMyEducation,
    update: users.updateMyEducation,
    delete: users.deleteMyEducation,
    fields: [
      { name: "institution", label: "Заклад", required: true, maxLength: 100 },
      { name: "graduation_date", label: "Дата завершення", type: "date" },
      { name: "education_level", label: "Рівень освіти", maxLength: 50 },
      { name: "speciality", label: "Спеціальність", maxLength: 100 },
    ],
    render: (item) => ({
      title: item.institution,
      meta: [item.education_level, item.speciality, item.graduation_date].filter(Boolean).join(" · "),
    }),
  },
  courses: {
    title: "Курси",
    countLabel: "записів",
    source: "courses",
    add: users.addMyCourse,
    update: users.updateMyCourse,
    delete: users.deleteMyCourse,
    fields: [
      { name: "institution", label: "Організація", required: true, maxLength: 100 },
      { name: "completion_date", label: "Дата завершення", type: "date" },
      { name: "topic", label: "Тема", maxLength: 100 },
      { name: "ect_hours", label: "Години", type: "number", asNumber: true },
    ],
    render: (item) => ({
      title: item.topic || item.institution,
      meta: [item.institution, item.completion_date, item.ect_hours ? `${item.ect_hours} год.` : null].filter(Boolean).join(" · "),
    }),
  },
  disciplines: {
    title: "Дисциплінарні записи",
    countLabel: "записів",
    source: "disciplines",
    add: users.addMyDiscipline,
    update: users.updateMyDiscipline,
    delete: users.deleteMyDiscipline,
    fields: [
      { name: "type", label: "Тип", required: true, maxLength: 50 },
      { name: "date", label: "Дата", type: "date" },
      { name: "authority", label: "Орган / підстава", maxLength: 50 },
    ],
    render: (item) => ({
      title: item.type,
      meta: [item.date, item.authority].filter(Boolean).join(" · "),
    }),
  },
  documents: {
    title: "Документи",
    countLabel: "записів",
    source: "documents",
    add: users.addMyDocument,
    update: users.updateMyDocument,
    delete: users.deleteMyDocument,
    fields: [
      { name: "title", label: "Назва", required: true, maxLength: 50 },
      { name: "file_path", label: "Посилання / шлях", required: true },
      { name: "description", label: "Опис", multiline: true },
    ],
    render: (item) => ({
      title: item.title,
      meta: [item.file_path, item.description].filter(Boolean).join(" · "),
    }),
  },
};

function cleanText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function emptyToNull(value) {
  const next = cleanText(value);
  return next === "" ? null : next;
}

function profileToForm(user) {
  const form = { ...EMPTY_PROFILE };
  PROFILE_FIELDS.forEach((field) => {
    const value = user?.[field];
    form[field] = value === null || value === undefined ? "" : value;
  });
  form.combat_participation = !!user?.combat_participation;
  form.reserve_status = !!user?.reserve_status;
  return form;
}

function profilePayload(form) {
  const body = {};
  PROFILE_FIELDS.forEach((field) => {
    if (field === "combat_participation" || field === "reserve_status") {
      body[field] = !!form[field];
    } else {
      body[field] = emptyToNull(form[field]);
    }
  });
  return body;
}

function initials(user) {
  const l = user?.last_name?.[0] || "";
  const f = user?.first_name?.[0] || "";
  return (l + f).toUpperCase() || (user?.username || "??").slice(0, 2).toUpperCase();
}

function fullName(user) {
  return [user?.last_name, user?.first_name, user?.patronymic].filter(Boolean).join(" ") || user?.username || "—";
}

export default function ProfilePage({ onProfileSaved }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busySection, setBusySection] = useState(null);
  const [showAdditional, setShowAdditional] = useState(false);
  const [confirmProfileSave, setConfirmProfileSave] = useState(false);

  const loadProfile = useCallback(async () => {
    setError(null);
    try {
      const me = await users.me();
      setProfile(me);
      setForm(profileToForm(me));
      onProfileSaved?.(me);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onProfileSaved]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadProfile(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  const completion = useMemo(() => {
    const checks = [
      !!form.last_name && !!form.first_name,
      !!form.birth_date,
      !!form.phone,
      !!form.email,
      !!form.position,
      !!form.military_rank || !!form.pz_direction,
      (profile?.family_members || []).length > 0,
      (profile?.education || []).length > 0,
      (profile?.courses || []).length > 0,
      (profile?.documents || []).length > 0,
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
  }, [form, profile]);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function requestSaveProfile(event) {
    event.preventDefault();
    setConfirmProfileSave(true);
  }

  async function saveProfile() {
    setSaving(true);
    setConfirmProfileSave(false);
    setError(null);
    setMessage(null);
    try {
      const updated = await users.updateMe(profilePayload(form));
      setProfile(updated);
      setForm(profileToForm(updated));
      onProfileSaved?.(updated);
      setMessage("Профіль оновлено");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function mutateRelated(key, action, item, body) {
    const config = RELATED[key];
    setBusySection(key);
    setError(null);
    setMessage(null);
    try {
      if (action === "delete") {
        await config.delete(item.id);
      } else if (action === "update") {
        await config.update(item.id, body);
      } else {
        await config.add(body);
      }
      await loadProfile();
      setMessage("Дані оновлено");
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusySection(null);
    }
  }

  if (loading) {
    return <div className="profile-page"><div className="profile-loading">Завантаження профілю…</div></div>;
  }

  return (
    <div className="profile-page">
      <header className="profile-hero">
        <div className="profile-avatar">{initials(profile)}</div>
        <div className="profile-identity">
          <span className="profile-kicker">Особистий кабінет</span>
          <h1>{fullName(profile)}</h1>
          <div className="profile-meta">
            <span>{profile?.username}</span>
            <span>{profile?.role}</span>
            {profile?.position && <span>{profile.position}</span>}
          </div>
        </div>
        <div className="profile-health">
          <span>Повнота профілю</span>
          <strong>{completion.percent}%</strong>
          <small>{completion.done} з {completion.total}</small>
          <div className="profile-health-bar"><i style={{ width: `${completion.percent}%` }} /></div>
        </div>
      </header>

      {(error || message) && (
        <div className={`profile-alert ${error ? "danger" : "ok"}`}>
          {error || message}
          <button onClick={() => { setError(null); setMessage(null); }}>×</button>
        </div>
      )}

      <div className="profile-layout">
        <form id="profile-form" className="profile-main" onSubmit={requestSaveProfile}>
          <ProfileSection title="Персональні дані" number="01">
            <div className="profile-grid three">
              <TextField label="Прізвище" value={form.last_name} onChange={(v) => setField("last_name", v)} maxLength={30} />
              <TextField label="Ім'я" value={form.first_name} onChange={(v) => setField("first_name", v)} maxLength={20} />
              <TextField label="По батькові" value={form.patronymic} onChange={(v) => setField("patronymic", v)} maxLength={20} />
            </div>
            <div className="profile-grid two">
              <TextField label="Дата народження" type="date" value={form.birth_date} onChange={(v) => setField("birth_date", v)} />
              <TextField label="Фото / посилання" value={form.photo} onChange={(v) => setField("photo", v)} />
            </div>
          </ProfileSection>

          <ProfileSection title="Службові дані" number="02">
            <div className="profile-grid two">
              <TextField label="Військове звання" value={form.military_rank} onChange={(v) => setField("military_rank", v)} maxLength={50} />
              <TextField label="Посада" value={form.position} onChange={(v) => setField("position", v)} maxLength={200} />
            </div>
            <TextField label="Напрям ПЗ" value={form.pz_direction} onChange={(v) => setField("pz_direction", v)} maxLength={50} />
          </ProfileSection>

          <ProfileSection title="Контакти" number="03">
            <div className="profile-grid two">
              <TextField label="Телефон" value={form.phone} onChange={(v) => setField("phone", v)} maxLength={30} />
              <TextField label="Email" type="email" value={form.email} onChange={(v) => setField("email", v)} maxLength={50} />
            </div>
          </ProfileSection>

          <button className="profile-additional-toggle" type="button" onClick={() => setShowAdditional((value) => !value)}>
            <span>
              <b>Додаткові дані</b>
              <small>адреса, сім'я, освіта, курси, документи</small>
            </span>
            <strong>{showAdditional ? "Сховати" : "Відкрити"}</strong>
          </button>

          {showAdditional && (
            <ProfileSection title="Додаткові поля" number="04">
              <div className="profile-grid three">
                <TextField label="ІПН" value={form.tax_number} onChange={(v) => setField("tax_number", v)} maxLength={10} />
                <TextField label="Сімейний стан" value={form.marital_status} onChange={(v) => setField("marital_status", v)} maxLength={100} />
                <TextField label="Житло" value={form.housing} onChange={(v) => setField("housing", v)} maxLength={50} />
              </div>
              <div className="profile-grid three">
                <TextField label="Рейтинг" value={form.rating} onChange={(v) => setField("rating", v)} maxLength={5} />
                <TextField label="Завершення контракту" type="date" value={form.contract_end_date} onChange={(v) => setField("contract_end_date", v)} />
                <TextField label="Соціальні акаунти" value={form.social_accounts} onChange={(v) => setField("social_accounts", v)} maxLength={200} />
              </div>
              <TextField label="Адреса" value={form.address} onChange={(v) => setField("address", v)} maxLength={200} />
              <div className="profile-switches">
                <SwitchField label="Участь у бойових діях" checked={form.combat_participation} onChange={(v) => setField("combat_participation", v)} />
                <SwitchField label="Резерв" checked={form.reserve_status} onChange={(v) => setField("reserve_status", v)} />
              </div>
            </ProfileSection>
          )}

        </form>

        <aside className="profile-side">
          <PasswordPanel />
          <ProfileSummary profile={profile} completion={completion} />
        </aside>
      </div>

      {showAdditional && (
        <div className="profile-related-grid">
          {[0, 1].map((column) => (
            <div className="profile-related-column" key={column}>
              {Object.entries(RELATED)
                .filter((_, index) => index % 2 === column)
                .map(([key, config]) => (
                  <RelatedSection
                    key={key}
                    id={key}
                    config={config}
                    items={profile?.[config.source] || []}
                    busy={busySection === key}
                    onMutate={mutateRelated}
                  />
                ))}
            </div>
          ))}
        </div>
      )}

      <div className="profile-savebar profile-savebar-final">
        <span>{showAdditional ? "Основні, контактні та додаткові поля профілю" : "Основні та контактні поля профілю"}</span>
        <button className="btn primary" type="submit" form="profile-form" disabled={saving}>{saving ? "Збереження…" : "Зберегти профіль"}</button>
      </div>
      {confirmProfileSave && (
        <ConfirmDialog
          title="Зберегти зміни профілю?"
          message="Оновлені особисті дані будуть записані у ваш профіль."
          confirmText="Зберегти"
          disabled={saving}
          onCancel={() => setConfirmProfileSave(false)}
          onConfirm={saveProfile}
        />
      )}
    </div>
  );
}

function ProfileSection({ title, number, children }) {
  return (
    <section className="profile-section">
      <div className="profile-section-head">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TextField({ label, value, onChange, type = "text", maxLength, multiline, required }) {
  return (
    <label className="field profile-field">
      <span className="field-label">{label}{required && <span className="req">*</span>}</span>
      {multiline ? (
        <textarea className="textarea" rows={3} value={value || ""} maxLength={maxLength} required={required} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" type={type} value={value || ""} maxLength={maxLength} required={required} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function SwitchField({ label, checked, onChange }) {
  return (
    <button type="button" className={`profile-switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
      <span />
      <b>{label}</b>
    </button>
  );
}

function ProfileSummary({ profile, completion }) {
  const rows = [
    ["Статус", profile?.is_archived ? "Архів" : profile?.is_active ? "Активний" : "Неактивний"],
    ["Роль", profile?.role || "—"],
    ["Логін", profile?.username || "—"],
    ["Дані", `${completion.done} з ${completion.total}`],
    ["Сім'я", `${profile?.family_members?.length || 0}`],
    ["Освіта", `${profile?.education?.length || 0}`],
  ];

  return (
    <section className="profile-card">
      <div className="profile-card-head">Стан профілю</div>
      <div className="profile-summary-list">
        {rows.map(([label, value]) => (
          <div key={label}><span>{label}</span><b>{value}</b></div>
        ))}
      </div>
    </section>
  );
}

function PasswordPanel() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!oldPassword) {
      setError("Вкажіть поточний пароль");
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 20) {
      setError("Новий пароль має бути від 6 до 20 символів");
      return;
    }
    if (newPassword !== confirm) {
      setError("Новий пароль і підтвердження не збігаються");
      return;
    }
    if (oldPassword === newPassword) {
      setError("Новий пароль має відрізнятися від поточного");
      return;
    }

    setSaving(true);
    try {
      await users.changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
      setMessage("Пароль змінено");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-card">
      <div className="profile-card-head">Безпека</div>
      {(error || message) && <div className={`profile-mini-alert ${error ? "danger" : "ok"}`}>{error || message}</div>}
      <form className="password-form" onSubmit={submit}>
        <TextField label="Поточний пароль" type="password" value={oldPassword} onChange={setOldPassword} />
        <TextField label="Новий пароль" type="password" value={newPassword} onChange={setNewPassword} maxLength={20} />
        <TextField label="Підтвердити пароль" type="password" value={confirm} onChange={setConfirm} maxLength={20} />
        <button className="btn primary" type="submit" disabled={saving}>{saving ? "Оновлення…" : "Змінити пароль"}</button>
      </form>
    </section>
  );
}

function RelatedSection({ id, config, items, busy, onMutate }) {
  const [editing, setEditing] = useState(null);
  const [editorError, setEditorError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  function closeEditor() {
    setEditing(null);
    setEditorError(null);
  }

  async function executeSave(item, body) {
    setEditorError(null);
    setConfirmAction(null);
    try {
      await onMutate(id, item?.id ? "update" : "create", item, body);
      closeEditor();
    } catch (err) {
      setEditorError(err.message);
    }
  }

  function save(item, body) {
    setConfirmAction({ type: item?.id ? "update" : "create", item, body });
  }

  async function executeRemove(item) {
    setConfirmAction(null);
    try {
      await onMutate(id, "delete", item);
      closeEditor();
    } catch (err) {
      setEditorError(err.message);
    }
  }

  function remove(item) {
    setConfirmAction({ type: "delete", item });
  }

  const stateClass = [
    "profile-related",
    items.length > 0 ? "has-items" : "is-empty",
    editing ? "is-editing" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={stateClass} data-related={id}>
      <div className="profile-related-head">
        <div>
          <h3>{config.title}</h3>
          <span>{items.length} {config.countLabel}</span>
        </div>
        <button className="btn ghost small" type="button" onClick={() => setEditing({})}>＋ Додати</button>
      </div>

      {editing && (
        <RelatedEditor
          key={editing.id || "new"}
          config={config}
          item={editing.id ? editing : null}
          busy={busy}
          error={editorError}
          onCancel={closeEditor}
          onSave={(body) => save(editing.id ? editing : null, body)}
        />
      )}

      {items.length > 0 && (
        <div className="profile-related-list">
          {items.map((item) => {
            const view = config.render(item);
            return (
              <article key={item.id} className="profile-related-item">
                <div>
                  <strong>{view.title || "—"}</strong>
                  <span>{view.meta || "—"}</span>
                </div>
                <div className="profile-related-actions">
                  <button className="related-action-btn" type="button" onClick={() => setEditing(item)}>Редагувати</button>
                  <button className="related-action-btn danger" type="button" onClick={() => remove(item)}>Видалити</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === "delete" ? "Видалити запис?" : "Зберегти зміни?"}
          message={confirmAction.type === "delete" ? "Запис буде видалено з профілю." : "Дані цього розділу будуть оновлені."}
          confirmText={confirmAction.type === "delete" ? "Видалити" : "Зберегти"}
          danger={confirmAction.type === "delete"}
          disabled={busy}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => (
            confirmAction.type === "delete"
              ? executeRemove(confirmAction.item)
              : executeSave(confirmAction.item, confirmAction.body)
          )}
        />
      )}
    </section>
  );
}

function RelatedEditor({ config, item, busy, error, onCancel, onSave }) {
  const [form, setForm] = useState(() => {
    const initial = {};
    config.fields.forEach((field) => {
      const value = item?.[field.name];
      initial[field.name] = value === null || value === undefined ? "" : value;
    });
    return initial;
  });

  function set(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const body = {};
    for (const field of config.fields) {
      const value = form[field.name];
      if (field.required && !String(value || "").trim()) return;
      if (field.asNumber) {
        body[field.name] = value === "" || value === null || value === undefined ? null : Number(value);
      } else {
        body[field.name] = emptyToNull(value);
      }
    }
    onSave(body);
  }

  return (
    <form className="related-editor" onSubmit={submit}>
      {error && <div className="profile-mini-alert danger">{error}</div>}
      <div className="related-editor-grid">
        {config.fields.map((field) => (
          <TextField
            key={field.name}
            label={field.label}
            type={field.type || "text"}
            value={form[field.name]}
            maxLength={field.maxLength}
            multiline={field.multiline}
            required={field.required}
            onChange={(value) => set(field.name, value)}
          />
        ))}
      </div>
      <div className="related-editor-actions">
        <button className="btn ghost small" type="button" onClick={onCancel}>Скасувати</button>
        <button className="btn primary small" type="submit" disabled={busy}>{busy ? "Збереження…" : "Зберегти"}</button>
      </div>
    </form>
  );
}
