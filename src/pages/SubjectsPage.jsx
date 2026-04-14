import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import SubjectCard from "../components/subjects/SubjectCard";
import AnimatedButton from "../components/shared/AnimatedButton";
import GlassCard from "../components/shared/GlassCard";
import { ErrorState, LoadingState } from "../components/shared/StatusMessage";
import { useAuth } from "../context/AuthContext";
import { MOCK_SUBJECTS, fallbackIfEmpty } from "../lib/mockData";
import { createSubject, listSubjects } from "../services/studyHubApi";

const emojis = ["🧠", "📘", "🧪", "💡", "🛰️", "🧬"];
const SUBJECTS_CACHE_KEY = "ai-study-hub-subjects-cache";
const SUBJECTS_TIMEOUT_MS = 1400;

function loadSubjectsCache(userId) {
  if (!userId) return null;

  try {
    const raw = localStorage.getItem(SUBJECTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId || !Array.isArray(parsed?.subjects)) {
      return null;
    }
    return parsed.subjects;
  } catch {
    return null;
  }
}

function saveSubjectsCache(userId, subjects) {
  if (!userId) return;

  try {
    localStorage.setItem(
      SUBJECTS_CACHE_KEY,
      JSON.stringify({ userId, subjects, cachedAt: Date.now() })
    );
  } catch {
    // Ignore cache write errors.
  }
}

function withTimeout(promise, fallbackValue, timeoutMs = SUBJECTS_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs);
    }),
  ]);
}

export default function SubjectsPage() {
  const { user, role, activeMode } = useAuth();
  const canManageSubjects = role === "teacher" && activeMode === "teacher";

  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSubjects = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const cachedSubjects = loadSubjectsCache(user.id);
    if (cachedSubjects?.length) {
      setSubjects(cachedSubjects);
      setLoading(false);
    }

    setLoading(!(cachedSubjects?.length > 0));
    setError("");
    try {
      const data = await withTimeout(listSubjects(user.id), []);
      const withEmoji = fallbackIfEmpty(data, MOCK_SUBJECTS).map((subject, index) => ({
        ...subject,
        emoji: subject.emoji || emojis[index % emojis.length],
      }));
      setSubjects(withEmoji);
      saveSubjectsCache(user.id, withEmoji);
    } catch (subjectError) {
      setError(subjectError.message);
      setSubjects(MOCK_SUBJECTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [user?.id]);

  const handleCreateSubject = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError("");
    try {
      const created = await createSubject({ name: name.trim(), userId: user.id });
      setSubjects((prev) => [
        ...prev,
        { ...created, emoji: emojis[Math.floor(Math.random() * emojis.length)] },
      ]);
      setName("");
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading colorful subject spaces..." />;
  }

  return (
    <section className="space-y-5">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Subjects</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Organize learning tracks with vibrant subject cards.</p>
      </motion.header>

      <ErrorState message={error} />

      {canManageSubjects ? (
        <GlassCard hover={false}>
          <form onSubmit={handleCreateSubject} className="space-y-3">
            <label htmlFor="subject-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Add New Subject
            </label>
            <div className="flex gap-2">
              <input
                id="subject-name"
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-cyan-500 dark:border-slate-600 dark:bg-slate-800/70"
                placeholder="e.g. Computer Networks"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <AnimatedButton type="submit" disabled={saving} className="inline-flex items-center gap-1">
                <Plus size={14} />
                {saving ? "Saving..." : "Add"}
              </AnimatedButton>
            </div>
          </form>
        </GlassCard>
      ) : (
        <GlassCard hover={false}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Student mode shows subjects in read-only format. Switch to teacher mode for management actions.
          </p>
        </GlassCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject, index) => (
          <SubjectCard key={subject.id} subject={subject} index={index} />
        ))}
      </div>
    </section>
  );
}
