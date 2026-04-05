import { useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorAlert from "../../components/common/ErrorAlert";
import Button from "../../components/ui/button/Button";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { getUsers, createUser } from "../../api/users";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import type { UserShort } from "../../types/user";
import { ROLE_LABELS } from "../../types/user";
import type { UserRole } from "../../types/user";

const ROLE_BADGE_COLOR: Record<UserRole, "error" | "primary" | "success"> = {
  admin: "error",
  psychologist: "primary",
  respondent: "success",
};

export default function UsersList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const createModal = useModal();

  const { data, isLoading, error, refetch } = useApi(
    () =>
      getUsers({
        page,
        page_size: 20,
        ...(search.trim() ? { username__search: search.trim() } : {}),
      }),
    [page, search],
  );

  return (
    <>
      <PageMeta title="Психологи | АРМ Психолога" description="" />
      <PageBreadCrumb pageTitle="Психологи" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="9" cy="9" r="6" />
                <path d="M13.5 13.5L17 17" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Пошук за іменем..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          {isAdmin && (
            <Button size="sm" onClick={createModal.openModal}>
              Додати психолога
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.33334V12.6667M3.33334 8H12.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="p-6">
            <ErrorAlert message={error} onRetry={refetch} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-100 dark:border-gray-800">
                    <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Користувач
                    </TableCell>
                    <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Роль
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                  {data?.items.length === 0 && (
                    <TableRow>
                      <TableCell className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                        Нічого не знайдено
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Сторінка {data.page} з {data.total_pages} (всього {data.total})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.has_prev}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
                  >
                    Назад
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.has_next}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
                  >
                    Далі
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isAdmin && (
        <CreateUserModal
          isOpen={createModal.isOpen}
          onClose={createModal.closeModal}
          onCreated={refetch}
        />
      )}
    </>
  );
}

// ─── Create User Modal ───────────────────────────────────────────

function CreateUserModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("psychologist");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createUser({ username: username.trim(), password, role });
      setUsername("");
      setPassword("");
      setRole("psychologist");
      onClose();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка створення");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 lg:p-8">
      <h3 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Новий користувач
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-error-300 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Логін <span className="text-error-500">*</span>
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            placeholder="username"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Пароль <span className="text-error-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            placeholder="Мінімум 6 символів"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Роль</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          >
            <option value="psychologist">{ROLE_LABELS.psychologist}</option>
            <option value="admin">{ROLE_LABELS.admin}</option>
            <option value="respondent">{ROLE_LABELS.respondent}</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>Скасувати</Button>
          <Button size="sm" type="submit" disabled={saving || !username.trim() || !password.trim()}>
            {saving ? "Створення..." : "Створити"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UserRow({ user }: { user: UserShort }) {
  return (
    <TableRow className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]">
      <TableCell className="px-6 py-4">
        <Link to={`/users/${user.id}`} className="flex items-center gap-3 group">
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {user.username[0]?.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-800 group-hover:text-brand-500 dark:text-white/90 dark:group-hover:text-brand-400 transition-colors">
            {user.username}
          </p>
        </Link>
      </TableCell>
      <TableCell className="px-6 py-4">
        <Badge size="sm" color={ROLE_BADGE_COLOR[user.role]}>
          {ROLE_LABELS[user.role]}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
