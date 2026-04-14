import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { LoadingState } from "./components/shared/StatusMessage";
import { useAuth } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import FilesPage from "./pages/FilesPage";
import LoginPage from "./pages/LoginPage";
import QuizzesPage from "./pages/QuizzesPage";
import SignupPage from "./pages/SignupPage";
import SubjectsPage from "./pages/SubjectsPage";

function ProtectedRoutes() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="mx-auto mt-8 max-w-md">
        <LoadingState label="Checking authentication..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoutes() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="mx-auto mt-8 max-w-md">
        <LoadingState label="Checking authentication..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoutes />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<ProtectedRoutes />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/quizzes" element={<QuizzesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}