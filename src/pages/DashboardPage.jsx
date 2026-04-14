import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getDashboardStats,
  listAttempts,
  listRecentFiles,
} from "../services/studyHubApi";
import { ErrorState, LoadingState } from "../components/shared/StatusMessage";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalFiles: 0, totalAttempts: 0, totalSubjects: 0 });
  const [attempts, setAttempts] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError("");
      try {
        const [statsData, attemptsData, filesData] = await Promise.all([
          getDashboardStats(user.id),
          listAttempts(user.id),
          listRecentFiles(user.id),
        ]);
        setStats(statsData);
        setAttempts(attemptsData.slice(0, 5));
        setRecentFiles(filesData.slice(0, 5));
      } catch (dashboardError) {
        setError(dashboardError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user?.id]);

  if (loading) {
    return <LoadingState label="Loading dashboard..." />;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">AI Study Hub</p>
        <h1 className="mt-2 font-serif text-3xl">Your Learning Command Center</h1>
        <p className="mt-2 text-sm text-slate-200">Track files, quizzes, and daily momentum from one place.</p>
      </header>

      <ErrorState message={error} />

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-slate-500">Total Files</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalFiles}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-slate-500">Quizzes Attempted</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalAttempts}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-slate-500">Subjects</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalSubjects}</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-xl text-slate-900">Recent Activity</h2>
          <ul className="mt-4 space-y-3">
            {attempts.length === 0 && <li className="text-sm text-slate-500">No quiz attempts yet.</li>}
            {attempts.map((attempt) => (
              <li key={attempt.id} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                Scored <span className="font-semibold">{attempt.score}</span> on {attempt.quiz_title}
                <p className="text-xs text-slate-500">
                  {new Date(attempt.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-xl text-slate-900">Recent Uploads</h2>
          <ul className="mt-4 space-y-3">
            {recentFiles.length === 0 && <li className="text-sm text-slate-500">No files uploaded yet.</li>}
            {recentFiles.map((file) => (
              <li key={file.id} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{new Date(file.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
