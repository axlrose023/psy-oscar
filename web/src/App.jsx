import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { isLoggedIn, logout, users as usersApi } from "./api/index.js";
import { TopBar, Sidebar, StatusBar } from "./components/Shell.jsx";
import EventForm from "./components/EventForm.jsx";
import TaskForm from "./components/TaskForm.jsx";
import LoginPage from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PlanningPage from "./pages/Planning.jsx";
import TasksPage from "./pages/Tasks.jsx";
import PsychologistsPage from "./pages/Psychologists.jsx";
import ProfilePage from "./pages/Profile.jsx";

function ProtectedLayout({ currentUser, onLogout, children }) {
  const role = currentUser?.role || "psychologist";
  return (
    <div className="app">
      <TopBar currentUser={currentUser} onLogout={onLogout} />
      <Sidebar role={role} />
      <main className="content">{children}</main>
      <StatusBar />
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  // drawer: null | { type: "event"|"task", id?, linkedTaskId?, tab? }
  const [drawer, setDrawer] = useState(null);

  useEffect(() => {
    document.body.setAttribute("data-theme", "gov");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!isLoggedIn()) {
        if (!cancelled) setAuthChecked(true);
        return;
      }

      usersApi.me()
        .then(me => { if (!cancelled) setCurrentUser(me); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setAuthChecked(true); });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const doLogout = useCallback(() => {
    logout();
    setCurrentUser(null);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const handler = () => doLogout();
    window.addEventListener("psy:unauthorized", handler);
    return () => window.removeEventListener("psy:unauthorized", handler);
  }, [doLogout]);

  // Expose global hook so task form can navigate to subtask
  useEffect(() => {
    window.__openTask = (id) => setDrawer({ type:"task", id });
    return () => { window.__openTask = null; };
  }, []);

  async function handleLogin() {
    const me = await usersApi.me();
    setCurrentUser(me);
    navigate("/");
  }

  if (!authChecked) return null;

  const role = currentUser?.role || "psychologist";
  const loggedIn = isLoggedIn() && !!currentUser;

  return (
    <>
      <Routes>
        <Route path="/login" element={
          loggedIn ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
        } />

        <Route path="/" element={
          !loggedIn ? <Navigate to="/login" replace /> :
          <ProtectedLayout currentUser={currentUser} onLogout={doLogout}>
            <Dashboard
              onOpenEvent={(id) => setDrawer({ type:"event", id })}
              onOpenTask={(id) => setDrawer({ type:"task", id })}
            />
          </ProtectedLayout>
        } />

        <Route path="/planning" element={
          !loggedIn ? <Navigate to="/login" replace /> :
          <ProtectedLayout currentUser={currentUser} onLogout={doLogout}>
            <PlanningPage
              isAdmin={role === "admin"}
              onOpenEvent={(id, tab) => setDrawer({ type:"event", id, tab })}
              onNewEvent={() => setDrawer({ type:"event" })}
            />
          </ProtectedLayout>
        } />

        <Route path="/tasks" element={
          !loggedIn ? <Navigate to="/login" replace /> :
          <ProtectedLayout currentUser={currentUser} onLogout={doLogout}>
            <TasksPage
              isAdmin={role === "admin"}
              currentUser={currentUser}
              onOpenTask={(id) => setDrawer({ type:"task", id })}
              onNewTask={() => setDrawer({ type:"task" })}
            />
          </ProtectedLayout>
        } />

        <Route path="/profile" element={
          !loggedIn ? <Navigate to="/login" replace /> :
          <ProtectedLayout currentUser={currentUser} onLogout={doLogout}>
            <ProfilePage onProfileSaved={setCurrentUser} />
          </ProtectedLayout>
        } />

        <Route path="/psychologists" element={
          !loggedIn || role !== "admin" ? <Navigate to="/" replace /> :
          <ProtectedLayout currentUser={currentUser} onLogout={doLogout}>
            <PsychologistsPage />
          </ProtectedLayout>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Event form drawer */}
      {drawer?.type === "event" && (
        <EventForm
          eventId={drawer.id}
          isAdmin={role === "admin"}
          currentUser={currentUser}
          openHistory={drawer.tab === "history"}
          linkedTaskId={drawer.linkedTaskId}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            if (window.__planningReload) window.__planningReload();
          }}
        />
      )}

      {/* Task form drawer */}
      {drawer?.type === "task" && (
        <TaskForm
          key={drawer.id || drawer.parentTaskId || "new-task"}
          taskId={drawer.id}
          initialParentTaskId={drawer.parentTaskId}
          currentUser={currentUser}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            if (window.__tasksReload) window.__tasksReload();
          }}
          onNewSubtask={(parentTaskId) => setDrawer({ type:"task", parentTaskId })}
          onOpenEvent={(eventId, linkedTaskId) => {
            if (linkedTaskId && !eventId) {
              setDrawer({ type:"event", linkedTaskId });
            } else {
              setDrawer({ type:"event", id: eventId });
            }
          }}
        />
      )}
    </>
  );
}
