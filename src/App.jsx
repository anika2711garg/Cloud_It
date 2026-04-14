import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { LoadingState } from "./components/shared/StatusMessage";
import { useAuth } from "./context/AuthContext";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const FilesPage = lazy(() => import("./pages/FilesPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const QuizzesPage = lazy(() => import("./pages/QuizzesPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const SubjectsPage = lazy(() => import("./pages/SubjectsPage"));

function AnimatedPage({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

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
  const location = useLocation();

  return (
    <Suspense fallback={<LoadingState label="Preparing workspace..." />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route element={<PublicOnlyRoutes />}>
            <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />
            <Route path="/signup" element={<AnimatedPage><SignupPage /></AnimatedPage>} />
          </Route>

          <Route element={<ProtectedRoutes />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<AnimatedPage><DashboardPage /></AnimatedPage>} />
              <Route path="/subjects" element={<AnimatedPage><SubjectsPage /></AnimatedPage>} />
              <Route path="/files" element={<AnimatedPage><FilesPage /></AnimatedPage>} />
              <Route path="/quizzes" element={<AnimatedPage><QuizzesPage /></AnimatedPage>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}