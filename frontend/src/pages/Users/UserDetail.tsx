import { useState } from "react";
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorAlert from "../../components/common/ErrorAlert";
import { getUser, updateUser, createUserRelated, updateUserRelated, deleteUserRelated } from "../../api/users";
import { useApi } from "../../hooks/useApi";
import type { UserDetail as UserDetailType, ProfileTab } from "../../types/user";
import { PROFILE_TABS, PROFILE_FIELDS, ROLE_LABELS } from "../../types/user";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { useModal } from "../../hooks/useModal";

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { data: user, isLoading, error, refetch } = useApi(
    () => getUser(userId!),
    [userId],
  );
  const [activeTab, setActiveTab] = useState<ProfileTab>("general");

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;
  if (!user) return null;

  const fullName = [user.last_name, user.first_name, user.patronymic]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PageMeta title={`${fullName || user.username} | АРМ Психолога`} description="" />
      <PageBreadCrumb pageTitle={fullName || user.username} />

      {/* Meta card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center gap-6 xl:flex-row">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {user.photo ? (
                <img src={user.photo} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-medium text-gray-500 dark:text-gray-400">
                  {(user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")}
                </span>
              )}
            </div>
            <div className="text-center xl:text-left">
              <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                {fullName || user.username}
              </h4>
              <div className="flex flex-col items-center gap-1 xl:flex-row xl:gap-3">
                {user.position && <p className="text-sm text-gray-500 dark:text-gray-400">{user.position}</p>}
                {user.military_rank && (
                  <>
                    <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.military_rank}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge size="sm" color={user.is_active ? "success" : "error"}>
              {user.is_active ? "Активний" : "Неактивний"}
            </Badge>
            <Badge size="sm" color="primary">{ROLE_LABELS[user.role]}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 px-6 py-4 no-scrollbar dark:border-gray-800">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "general" && (
            <GeneralTab user={user} onSave={async (patch) => { await updateUser(userId!, patch); refetch(); }} />
          )}
          {activeTab === "family" && (
            <RelatedTab
              userId={userId!}
              entity="family-members"
              items={user.family_members}
              onRefresh={refetch}
              title="Члени родини"
              emptyText="Немає записів про родину"
              columns={[
                { key: "relation_type", label: "Ступінь" },
                { key: "last_name", label: "Прізвище" },
                { key: "first_name", label: "Ім'я" },
                { key: "patronymic", label: "По батькові" },
                { key: "birth_date", label: "Дата народження", type: "date" },
                { key: "address", label: "Адреса" },
              ]}
            />
          )}
          {activeTab === "education" && (
            <RelatedTab userId={userId!} entity="education" items={user.education} onRefresh={refetch} title="Освіта" emptyText="Немає записів"
              columns={[{ key: "institution", label: "Заклад" }, { key: "education_level", label: "Рівень" }, { key: "speciality", label: "Спеціальність" }, { key: "graduation_date", label: "Дата випуску", type: "date" }]}
            />
          )}
          {activeTab === "courses" && (
            <RelatedTab userId={userId!} entity="courses" items={user.courses} onRefresh={refetch} title="Курси" emptyText="Немає записів"
              columns={[{ key: "institution", label: "Заклад" }, { key: "topic", label: "Тема" }, { key: "ect_hours", label: "Години", type: "number" }, { key: "completion_date", label: "Дата", type: "date" }]}
            />
          )}
          {activeTab === "disciplines" && (
            <RelatedTab userId={userId!} entity="disciplines" items={user.disciplines} onRefresh={refetch} title="Заохочення та стягнення" emptyText="Немає записів"
              columns={[{ key: "type", label: "Тип" }, { key: "date", label: "Дата", type: "date" }, { key: "authority", label: "Орган" }]}
            />
          )}
          {activeTab === "documents" && (
            <RelatedTab userId={userId!} entity="documents" items={user.documents} onRefresh={refetch} title="Документи" emptyText="Немає документів"
              columns={[{ key: "title", label: "Назва" }, { key: "file_path", label: "Файл" }, { key: "description", label: "Опис" }]}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── General tab ────────────────────────────────────────────────

function GeneralTab({ user, onSave }: { user: UserDetailType; onSave: (patch: Record<string, unknown>) => Promise<void> }) {
  const { isOpen, openModal, closeModal } = useModal();
  const [form, setForm] = useState<Record<string, string | boolean | null>>({});
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    const initial: Record<string, string | boolean | null> = {};
    PROFILE_FIELDS.forEach((f) => { initial[f.key] = user[f.key] as string | boolean | null; });
    setForm(initial);
    openModal();
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); closeModal(); } finally { setSaving(false); }
  };

  const displayValue = (val: unknown, type: string): string => {
    if (val === null || val === undefined) return "—";
    if (type === "boolean") return val ? "Так" : "Ні";
    return String(val);
  };

  return (
    <>
      <div className="flex items-start justify-between">
        <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">Основна інформація</h4>
        <button onClick={handleOpen} className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]">
          Редагувати
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {PROFILE_FIELDS.map((f) => (
          <div key={f.key}>
            <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{f.label}</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{displayValue(user[f.key], f.type)}</p>
          </div>
        ))}
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Редагування профілю</h4>
          </div>
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                {PROFILE_FIELDS.map((f) => (
                  <div key={f.key}>
                    <Label>{f.label}</Label>
                    {f.type === "boolean" ? (
                      <div className="flex items-center gap-3 pt-2">
                        <button type="button" onClick={() => setForm((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                          className={`relative h-6 w-11 rounded-full transition-colors ${form[f.key] ? "bg-brand-500" : "bg-gray-200 dark:bg-white/10"}`}>
                          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm transition-transform ${form[f.key] ? "translate-x-full" : "translate-x-0"}`} />
                        </button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{form[f.key] ? "Так" : "Ні"}</span>
                      </div>
                    ) : (
                      <Input type={f.type === "date" ? "date" : "text"} value={(form[f.key] as string) ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>Скасувати</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Збереження..." : "Зберегти"}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

// ─── Related entity tab ─────────────────────────────────────────

type EntityName = "family-members" | "education" | "courses" | "disciplines" | "documents";

interface RelatedTabProps {
  userId: string;
  entity: EntityName;
  items: { id: string; [key: string]: unknown }[];
  onRefresh: () => void;
  columns: { key: string; label: string; type?: "text" | "date" | "number" }[];
  title: string;
  emptyText: string;
}

function RelatedTab({ userId, entity, items, onRefresh, columns, title, emptyText }: RelatedTabProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number | null>>({});
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingId(null);
    const empty: Record<string, string | number | null> = {};
    columns.forEach((c) => (empty[c.key] = ""));
    setForm(empty);
    openModal();
  };

  const handleEdit = (item: Record<string, unknown>) => {
    setEditingId(item.id as string);
    const vals: Record<string, string | number | null> = {};
    columns.forEach((c) => (vals[c.key] = item[c.key] as string | number | null));
    setForm(vals);
    openModal();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await updateUserRelated(userId, entity, editingId, form);
      } else {
        await createUserRelated(userId, entity, form);
      }
      closeModal();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteUserRelated(userId, entity, id);
    onRefresh();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h4>
        <button onClick={handleAdd} className="flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3.33334V12.6667M3.33334 8H12.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Додати
        </button>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{col.label}</th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Дії</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{(item[col.key] as string | number) ?? "—"}</td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(item as Record<string, unknown>)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300">
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M6.5 7v4M9.5 7v4M3.5 4.5l.5 8a1.5 1.5 0 001.5 1.5h5a1.5 1.5 0 001.5-1.5l.5-8" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[600px] m-4">
        <div className="no-scrollbar relative w-full overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white/90">{editingId ? "Редагування" : "Додати запис"}</h4>
          </div>
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 px-2 lg:grid-cols-2">
              {columns.map((col) => (
                <div key={col.key}>
                  <Label>{col.label}</Label>
                  <Input
                    type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
                    value={(form[col.key] as string | number) ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [col.key]: col.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>Скасувати</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Збереження..." : "Зберегти"}</Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
