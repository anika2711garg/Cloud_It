import { AnimatePresence, motion } from "framer-motion";
import {
  BookCopy,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Home,
  LogOut,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/subjects", label: "Subjects", icon: BookCopy },
  { to: "/files", label: "Files", icon: FolderOpen },
  { to: "/quizzes", label: "Quizzes", icon: Sparkles },
];

export default function Sidebar() {
  const { signOut, user, role, activeMode, switchMode, changeRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 92 : 300 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="sticky top-0 z-40 h-screen border-r border-slate-700/70 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl"
    >
      <div className="mb-6 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="full-brand"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <p className="text-lg font-bold text-slate-100">EduVault</p>
              <p className="text-xs text-slate-400">Smart learning workspace</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-200 transition hover:bg-slate-700"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-sky-500/20 text-cyan-200 shadow-inner"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }`
              }
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 border-t border-slate-700/70 pt-4">

        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs">
          <p className="mb-1 flex items-center gap-1 font-semibold text-slate-100">
            <UserRound size={14} />
            {!collapsed ? "Profile" : "Me"}
          </p>
          {!collapsed && (
            <>
              <p className="truncate text-slate-400">{user?.email}</p>
              <p className="mt-1 text-slate-300">Role: {role}</p>
              {role === "teacher" ? (
                <div className="mt-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => switchMode("teacher")}
                    className={`rounded-lg px-2 py-1 ${activeMode === "teacher" ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300"}`}
                  >
                    Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("student")}
                    className={`rounded-lg px-2 py-1 ${activeMode === "student" ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300"}`}
                  >
                    Student
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => changeRole("teacher")}
                  className="mt-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-2 py-1 text-white"
                >
                  Become Teacher
                </button>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400"
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  );
}
