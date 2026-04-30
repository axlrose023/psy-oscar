const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STORAGE_TOKEN   = "psy_token";
const STORAGE_REFRESH = "psy_refresh";

export function getToken()      { return localStorage.getItem(STORAGE_TOKEN); }
export function getRefresh()    { return localStorage.getItem(STORAGE_REFRESH); }
export function setTokens(a, r) { localStorage.setItem(STORAGE_TOKEN, a); if (r) localStorage.setItem(STORAGE_REFRESH, r); }
export function clearTokens()   { localStorage.removeItem(STORAGE_TOKEN); localStorage.removeItem(STORAGE_REFRESH); }
export function isLoggedIn()    { return !!getToken(); }

let _refreshing = null;

async function refreshTokens() {
  const r = getRefresh();
  if (!r) throw new Error("no_refresh");
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const res = await fetch(BASE + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: r }),
    });
    if (!res.ok) { clearTokens(); throw new Error("session_expired"); }
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token || r);
  })();
  try { await _refreshing; } finally { _refreshing = null; }
}

async function request(method, path, body, params, _retry = true) {
  const url = new URL(BASE + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      if (Array.isArray(v)) {
        v.filter((item) => item !== undefined && item !== null && item !== "").forEach((item) => {
          url.searchParams.append(k, item);
        });
        return;
      }
      url.searchParams.set(k, v);
    });
  }
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && _retry) {
    try {
      await refreshTokens();
      return request(method, path, body, params, false);
    } catch {
      clearTokens();
      window.dispatchEvent(new CustomEvent("psy:unauthorized"));
      throw new Error("Сесія закінчилась. Будь ласка, увійдіть знову.");
    }
  }

  if (res.status === 401) {
    clearTokens();
    window.dispatchEvent(new CustomEvent("psy:unauthorized"));
    throw new Error("Сесія закінчилась. Будь ласка, увійдіть знову.");
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
    let msg = "Помилка сервера";
    if (data?.detail) {
      if (typeof data.detail === "string") msg = data.detail;
      else if (Array.isArray(data.detail) && data.detail[0]?.msg) msg = data.detail[0].msg;
    }
    throw new Error(msg);
  }
  return data;
}

const get   = (path, params) => request("GET",    path, null, params);
const post  = (path, body)   => request("POST",   path, body);
const patch = (path, body)   => request("PATCH",  path, body);
const del   = (path)         => request("DELETE", path);

export async function login(username, password) {
  const data = await post("/auth/login", { username, password });
  setTokens(data.access_token, data.refresh_token);
  return data;
}
export function logout() { clearTokens(); }

export const users = {
  me:        ()           => get("/users/me"),
  updateMe:  (body)       => patch("/users/me", body),
  changePassword: (body)  => request("PUT", "/users/me/password", body),
  list:      (params)     => get("/users", params),
  birthdays: (days = 30)  => get("/users/birthdays", { days }),
  get:    (id)       => get(`/users/${id}`),
  create: (body)     => post("/users", body),
  update: (id, body) => patch(`/users/${id}`, body),
  archive:(id)       => post(`/users/${id}/archive`),
  addFamilyMember:    (id, body)       => post(`/users/${id}/family-members`, body),
  updateFamilyMember: (uid, eid, body) => patch(`/users/${uid}/family-members/${eid}`, body),
  deleteFamilyMember: (uid, eid)       => del(`/users/${uid}/family-members/${eid}`),
  addEducation:    (id, body)       => post(`/users/${id}/education`, body),
  updateEducation: (uid, eid, body) => patch(`/users/${uid}/education/${eid}`, body),
  deleteEducation: (uid, eid)       => del(`/users/${uid}/education/${eid}`),
  addCourse:    (id, body)       => post(`/users/${id}/courses`, body),
  updateCourse: (uid, eid, body) => patch(`/users/${uid}/courses/${eid}`, body),
  deleteCourse: (uid, eid)       => del(`/users/${uid}/courses/${eid}`),
  addDiscipline:    (id, body)       => post(`/users/${id}/disciplines`, body),
  updateDiscipline: (uid, eid, body) => patch(`/users/${uid}/disciplines/${eid}`, body),
  deleteDiscipline: (uid, eid)       => del(`/users/${uid}/disciplines/${eid}`),
  addDocument:    (id, body)       => post(`/users/${id}/documents`, body),
  updateDocument: (uid, eid, body) => patch(`/users/${uid}/documents/${eid}`, body),
  deleteDocument: (uid, eid)       => del(`/users/${uid}/documents/${eid}`),
  myFamilyMembers:    ()         => get("/users/me/family-members"),
  addMyFamilyMember:  (body)     => post("/users/me/family-members", body),
  updateMyFamilyMember: (id, body) => patch(`/users/me/family-members/${id}`, body),
  deleteMyFamilyMember: (id)     => del(`/users/me/family-members/${id}`),
  myEducation:        ()         => get("/users/me/education"),
  addMyEducation:     (body)     => post("/users/me/education", body),
  updateMyEducation:  (id, body) => patch(`/users/me/education/${id}`, body),
  deleteMyEducation:  (id)       => del(`/users/me/education/${id}`),
  myCourses:          ()         => get("/users/me/courses"),
  addMyCourse:        (body)     => post("/users/me/courses", body),
  updateMyCourse:     (id, body) => patch(`/users/me/courses/${id}`, body),
  deleteMyCourse:     (id)       => del(`/users/me/courses/${id}`),
  myDisciplines:      ()         => get("/users/me/disciplines"),
  addMyDiscipline:    (body)     => post("/users/me/disciplines", body),
  updateMyDiscipline: (id, body) => patch(`/users/me/disciplines/${id}`, body),
  deleteMyDiscipline: (id)       => del(`/users/me/disciplines/${id}`),
  myDocuments:        ()         => get("/users/me/documents"),
  addMyDocument:      (body)     => post("/users/me/documents", body),
  updateMyDocument:   (id, body) => patch(`/users/me/documents/${id}`, body),
  deleteMyDocument:   (id)       => del(`/users/me/documents/${id}`),
};

export const events = {
  list:     (params)   => get("/events", params),
  get:      (id)       => get(`/events/${id}`),
  create:   (body)     => post("/events", body),
  update:   (id, body) => patch(`/events/${id}`, body),
  complete: (id, body) => post(`/events/${id}/complete`, body || {}),
  postpone: (id, body) => post(`/events/${id}/postpone`, body),
  cancel:   (id, body) => post(`/events/${id}/cancel`, body),
  archive:  (id)       => post(`/events/${id}/archive`, {}),
  delete:   (id)       => del(`/events/${id}`),
  history:  (id)       => get(`/events/${id}/history`),
};

export const tasks = {
  list:            (params)      => get("/tasks", params),
  get:             (id)          => get(`/tasks/${id}`),
  create:          (body)        => post("/tasks", body),
  update:          (id, body)    => patch(`/tasks/${id}`, body),
  assign:          (id, body)    => post(`/tasks/${id}/assign`, body),
  unassign:        (id, body)    => post(`/tasks/${id}/unassign`, body),
  start:           (id)          => post(`/tasks/${id}/start`, {}),
  submit:          (id)          => post(`/tasks/${id}/submit`, {}),
  approve:         (id)          => post(`/tasks/${id}/approve`, {}),
  requestRevision: (id, comment) => post(`/tasks/${id}/request-revision`, { comment }),
  delete:          (id)          => del(`/tasks/${id}`),
  history:         (id)          => get(`/tasks/${id}/history`),
  comments:        (id)          => get(`/tasks/${id}/comments`),
  addComment:      (id, text)    => post(`/tasks/${id}/comments`, { text }),
};
