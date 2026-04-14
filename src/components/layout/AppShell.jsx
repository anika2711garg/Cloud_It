import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 lg:flex">
      <div className="pointer-events-none absolute inset-0 -z-10" />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/30 bg-white/55 p-4 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/55 lg:hidden">
        <p className="font-semibold">EduVault</p>
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800"
        >
          <Menu size={18} />
        </button>
      </header>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="h-full w-[280px]"
              onClick={(event) => event.stopPropagation()}
            >
              <Sidebar />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="w-full p-4 pb-10 pt-5 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
