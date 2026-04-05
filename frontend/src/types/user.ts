// ─── Enums / constants ──────────────────────────────────────────

export type UserRole = "admin" | "psychologist" | "respondent";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Начальник",
  psychologist: "Психолог",
  respondent: "Респондент",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
  psychologist:
    "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
  respondent:
    "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
};

// ─── Related entities ───────────────────────────────────────────

export interface UserRelatedBase {
  id: string;
  [key: string]: unknown;
}

export interface UserFamilyMember extends UserRelatedBase {
  id: string;
  relation_type: string;
  last_name: string;
  first_name: string;
  patronymic?: string | null;
  birth_date?: string | null;
  address?: string | null;
}

export interface UserEducation extends UserRelatedBase {
  id: string;
  institution: string;
  graduation_date?: string | null;
  education_level?: string | null;
  speciality?: string | null;
}

export interface UserCourse extends UserRelatedBase {
  id: string;
  institution: string;
  completion_date?: string | null;
  topic?: string | null;
  ect_hours?: number | null;
}

export interface UserDiscipline extends UserRelatedBase {
  id: string;
  type: string;
  date?: string | null;
  authority?: string | null;
}

export interface UserDocument extends UserRelatedBase {
  id: string;
  title: string;
  file_path: string;
  description?: string | null;
}

// ─── User (list / short) ───────────────────────────────────────

export interface UserShort {
  id: string;
  username: string;
  role: UserRole;
}

// ─── User detail (profile + related) ───────────────────────────

export interface UserDetail extends UserShort {
  tax_number?: string | null;
  last_name?: string | null;
  first_name?: string | null;
  patronymic?: string | null;
  photo?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  military_rank?: string | null;
  position?: string | null;
  address?: string | null;
  marital_status?: string | null;
  social_accounts?: string | null;
  combat_participation?: boolean | null;
  reserve_status?: boolean | null;
  housing?: string | null;
  rating?: string | null;
  contract_end_date?: string | null;
  pz_direction?: string | null;
  is_active: boolean;

  family_members: UserFamilyMember[];
  education: UserEducation[];
  courses: UserCourse[];
  disciplines: UserDiscipline[];
  documents: UserDocument[];
}

// ─── Profile field groups (for tabbed display) ─────────────────

export const PROFILE_FIELDS: {
  key: keyof UserDetail;
  label: string;
  type: "text" | "date" | "boolean" | "select";
  options?: string[];
}[] = [
  { key: "last_name", label: "Прізвище", type: "text" },
  { key: "first_name", label: "Ім'я", type: "text" },
  { key: "patronymic", label: "По батькові", type: "text" },
  { key: "tax_number", label: "ІПН", type: "text" },
  { key: "birth_date", label: "Дата народження", type: "date" },
  { key: "phone", label: "Телефон", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "military_rank", label: "Військове звання", type: "text" },
  { key: "position", label: "Посада", type: "text" },
  { key: "address", label: "Адреса", type: "text" },
  { key: "marital_status", label: "Сімейний стан", type: "text" },
  { key: "social_accounts", label: "Соціальні мережі", type: "text" },
  { key: "combat_participation", label: "Участь у бойових діях", type: "boolean" },
  { key: "reserve_status", label: "Перебування в запасі", type: "boolean" },
  { key: "housing", label: "Житло", type: "text" },
  { key: "rating", label: "Рейтинг", type: "text" },
  { key: "contract_end_date", label: "Закінчення контракту", type: "date" },
  { key: "pz_direction", label: "Напрямок ПЗ", type: "text" },
];

// ─── Tab definitions ────────────────────────────────────────────

export type ProfileTab =
  | "general"
  | "family"
  | "education"
  | "courses"
  | "disciplines"
  | "documents"
  | "password";

export const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: "general", label: "Основне" },
  { key: "family", label: "Родина" },
  { key: "education", label: "Освіта" },
  { key: "courses", label: "Курси" },
  { key: "disciplines", label: "Дисципліна" },
  { key: "documents", label: "Документи" },
  { key: "password", label: "Пароль" },
];
