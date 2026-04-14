import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/subjects", label: "Subjects" },
  { to: "/files", label: "Files" },
  { to: "/quizzes", label: "Quizzes" },
];

export default function Sidebar() {
  const { signOut, user, role, activeMode, switchMode, changeRole } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <aside className="w-full border-b border-slate-200 bg-white/90 p-4 backdrop-blur lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="mb-6 flex items-center justify-between lg:block">
        <div>
          <p className="font-serif text-2xl font-semibold text-slate-900">AI Study Hub</p>
          <p className="text-xs text-slate-500">Learn smarter with your personal cloud</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 lg:hidden"
        >
          Logout
        </button>
      </div>

      <nav className="flex flex-wrap gap-2 lg:flex-col">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-cyan-100 text-cyan-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 hidden rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 lg:block">
        <p className="mb-1 font-semibold text-slate-900">Signed in as</p>
        <p className="break-all">{user?.email}</p>
        <p className="mt-2">
          Role: <span className="font-semibold capitalize">{role}</span>
        </p>
        <p>
          Active mode: <span className="font-semibold capitalize">{activeMode}</span>
        </p>

        {role === "teacher" && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => switchMode("teacher")}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                activeMode === "teacher" ? "bg-cyan-700 text-white" : "bg-white text-slate-600"
              }`}
            >
              Teacher Mode
            </button>
            <button
              type="button"
              onClick={() => switchMode("student")}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                activeMode === "student" ? "bg-cyan-700 text-white" : "bg-white text-slate-600"
              }`}
            >
              Student Mode
            </button>
          </div>
        )}

        {role === "student" && (
          <button
            type="button"
            onClick={() => changeRole("teacher")}
            className="mt-3 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
          >
            Upgrade to Teacher
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 hidden w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 lg:block"
      >
        Logout
      </button>
    </aside>
  );
}
