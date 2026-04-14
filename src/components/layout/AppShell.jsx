import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <Sidebar />
      <main className="w-full p-4 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
