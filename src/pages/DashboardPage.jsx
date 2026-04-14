import { motion } from "framer-motion";
import { BarChart3, BookOpenText, FileStack, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import GlassCard from "../components/shared/GlassCard";
import { ErrorState, LoadingState } from "../components/shared/StatusMessage";
import { useAuth } from "../context/AuthContext";
import { MOCK_ATTEMPTS, MOCK_FILES, MOCK_SUBJECTS, fallbackIfEmpty } from "../lib/mockData";
import { getDashboardStats, listAttempts, listRecentFiles } from "../services/studyHubApi";

const DASHBOARD_CACHE_KEY = "ai-study-hub-dashboard-cache";
const DASHBOARD_REQUEST_TIMEOUT_MS = 1400;

function loadCachedDashboard() {
  try {
    const cached = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function saveCachedDashboard(payload) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write errors.
  }
}

function withTimeout(promise, fallbackValue, timeoutMs = DASHBOARD_REQUEST_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs);
    }),
  ]);
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: index * 0.08 },
  }),
};

function StatCard({ icon: Icon, label, value, progress, index }) {
  return (
    <motion.div variants={cardVariants} custom={index} initial="hidden" animate="visible">
      <GlassCard>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-2 text-4xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
          </div>
          <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
            <Icon size={18} />
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const initialCache = loadCachedDashboard();
  const [stats, setStats] = useState(
    initialCache?.stats ?? { totalFiles: 0, totalAttempts: 0, totalSubjects: 0 }
  );
  const [attempts, setAttempts] = useState(initialCache?.attempts ?? []);
  const [recentFiles, setRecentFiles] = useState(initialCache?.recentFiles ?? []);
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [statsData, attemptsData, filesData] = await Promise.all([
          withTimeout(getDashboardStats(user.id), { totalFiles: 0, totalAttempts: 0, totalSubjects: 0 }),
          withTimeout(listAttempts(user.id), []),
          withTimeout(listRecentFiles(user.id), []),
        ]);

        const fallbackStats = {
          totalFiles: fallbackIfEmpty(filesData, MOCK_FILES).length,
          totalAttempts: fallbackIfEmpty(attemptsData, MOCK_ATTEMPTS).length,
          totalSubjects: MOCK_SUBJECTS.length,
        };

        const resolvedStats =
          statsData.totalFiles === 0 && statsData.totalAttempts === 0 && statsData.totalSubjects === 0
            ? fallbackStats
            : statsData;
        const resolvedAttempts = fallbackIfEmpty(attemptsData, MOCK_ATTEMPTS).slice(0, 6);
        const resolvedFiles = fallbackIfEmpty(filesData, MOCK_FILES).slice(0, 6);

        setStats(resolvedStats);
        setAttempts(resolvedAttempts);
        setRecentFiles(resolvedFiles);

        saveCachedDashboard({
          stats: resolvedStats,
          attempts: resolvedAttempts,
          recentFiles: resolvedFiles,
          cachedAt: Date.now(),
        });
      } catch (dashboardError) {
        setError(dashboardError.message);
        setStats({ totalFiles: MOCK_FILES.length, totalAttempts: MOCK_ATTEMPTS.length, totalSubjects: MOCK_SUBJECTS.length });
        setAttempts(MOCK_ATTEMPTS);
        setRecentFiles(MOCK_FILES);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user?.id]);

  const cards = useMemo(
    () => [
      { label: "Total Files", value: stats.totalFiles, icon: FileStack, progress: Math.min(100, stats.totalFiles * 18) },
      { label: "Total Subjects", value: stats.totalSubjects, icon: BookOpenText, progress: Math.min(100, stats.totalSubjects * 24) },
      { label: "Quiz Attempts", value: stats.totalAttempts, icon: Trophy, progress: Math.min(100, stats.totalAttempts * 22) },
    ],
    [stats]
  );

  if (loading) {
    return <LoadingState label="Building your dashboard..." />;
  }

  return (
    <section className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/30 bg-white/60 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/60"
      >
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">SaaS Learning Dashboard</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100 md:text-4xl">Welcome to EduVault</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          A modern workspace for subject planning, file management, and smart quiz practice.
        </p>
      </motion.header>

      <ErrorState message={error} />

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card, index) => (
          <StatCard key={card.label} index={index} {...card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard hover={false}>
          <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <BarChart3 size={18} />
            <h2 className="text-lg font-bold">Recent Activity Timeline</h2>
          </div>

          <ol className="space-y-3">
            {attempts.length === 0 ? (
              <li className="text-sm text-slate-500">No quiz activity yet.</li>
            ) : (
              attempts.map((attempt, index) => (
                <motion.li
                  key={attempt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {attempt.quiz_title} • score {attempt.score}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(attempt.created_at).toLocaleString()}</p>
                </motion.li>
              ))
            )}
          </ol>
        </GlassCard>

        <GlassCard hover={false}>
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">Recent Uploads</h2>
          <div className="space-y-3">
            {recentFiles.length === 0 ? (
              <p className="text-sm text-slate-500">No uploads yet.</p>
            ) : (
              recentFiles.map((file, index) => (
                <motion.article
                  key={file.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <p className="font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(file.created_at).toLocaleString()}</p>
                </motion.article>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
