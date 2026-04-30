export const NAV = [
  { id: "home",          section: "workplace",  code: "01", label: "Головна" },
  { id: "planning",      section: "activities", code: "02", label: "Планування" },
  { id: "tasks",         section: "activities", code: "03", label: "Задачі" },
  { id: "psychologists", section: "service",    code: "04", label: "Психологи", adminOnly: true },
  { id: "profile",       section: "service",    code: "05", label: "Профіль" },
];

export const ACTIVITY_TYPES = [
  { code: "ППВ",   value: "ppv",        label: "ППВ",         full: "Психологічно-профілактична робота" },
  { code: "ППсП",  value: "ppsp",       label: "ППсП",        full: "Психологічна підготовка" },
  { code: "АДАПТ", value: "adaptation", label: "Адаптація",   full: "Адаптаційна робота" },
  { code: "СКРІН", value: "screening",  label: "Скринінг",    full: "Скринінгове обстеження" },
  { code: "СПД",   value: "spd",        label: "СПД",         full: "Соц.-психологічна діагностика" },
  { code: "ДОПОМ", value: "aid",        label: "Допомога",    full: "Психологічна допомога" },
  { code: "ВІДН",  value: "recovery",   label: "Відновлення", full: "Психологічне відновлення" },
  { code: "ІНШЕ",  value: "other",      label: "Інше",        full: "Інші заходи" },
];

export const PERSONNEL_CATEGORIES = [
  { value: "officer",  label: "Офіцер",      short: "ОФ" },
  { value: "contract", label: "Контрактник", short: "КС" },
  { value: "employee", label: "Працівник",   short: "ПР" },
  { value: "family",   label: "Члени сімей", short: "ЧС" },
];

export const TASK_PRIORITIES = [
  { value: "low",      label: "Низький",   color: "#9B9B90" },
  { value: "medium",   label: "Середній",  color: "#2563EB" },
  { value: "high",     label: "Високий",   color: "#D97706" },
  { value: "critical", label: "Критичний", color: "#C0392B" },
];

export const TASK_STATUSES = [
  { value: "created",            label: "Створено",          color: "#9B9B90" },
  { value: "assigned",           label: "Призначено",        color: "#2563EB" },
  { value: "in_progress",        label: "Виконується",       color: "#D97706" },
  { value: "under_review",       label: "На перевірці",      color: "#7C3AED" },
  { value: "revision_requested", label: "На доопрацювання",  color: "#C0392B" },
  { value: "completed",          label: "Виконано",          color: "#2D7A3A" },
];

export const QUOTES = [
  "«Першим обов'язком психолога є слухати — мовчанням та увагою лікувати те, чого слова ще не торкнулись.»\n— з методичних настанов УДО, розд. III",
  "«Психологічна стійкість — не відсутність страху, а здатність діяти попри нього.»\n— з методичних настанов УДО",
  "«Турбота про особовий склад починається з розуміння.»\n— принципи психологічного забезпечення УДО",
];
