import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import TaskList from "./pages/Tasks/TaskList";
import TaskKanban from "./pages/Tasks/TaskKanban";
import TaskDetail from "./pages/Tasks/TaskDetail";
import UsersList from "./pages/Users/UsersList";
import UserDetail from "./pages/Users/UserDetail";
import EventsList from "./pages/Events/EventsList";
import EventDetail from "./pages/Events/EventDetail";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/tasks/list" element={<TaskList />} />
              <Route path="/tasks/kanban" element={<TaskKanban />} />
              <Route path="/tasks/:taskId" element={<TaskDetail />} />
              <Route path="/users" element={<UsersList />} />
              <Route path="/users/:userId" element={<UserDetail />} />
              <Route path="/events" element={<EventsList />} />
              <Route path="/events/:eventId" element={<EventDetail />} />
            </Route>
          </Route>

          {/* Public routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
