import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createSubject, listSubjects } from "../services/studyHubApi";
import { ErrorState, LoadingState } from "../components/shared/StatusMessage";

export default function SubjectsPage() {
  const { user, role, activeMode } = useAuth();
  const canManageSubjects = role === "teacher" && activeMode === "teacher";
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSubjects = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError("");
    try {
      const data = await listSubjects(user.id);
      setSubjects(data);
    } catch (subjectError) {
      setError(subjectError.message);
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
      setSubjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <header>
        <h1 className="font-serif text-3xl text-slate-900">Subjects</h1>
        <p className="text-sm text-slate-600">Create subjects to organize files and quizzes.</p>
      </header>

      <ErrorState message={error} />

      {canManageSubjects ? (
        <form onSubmit={handleCreateSubject} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="subject-name" className="mb-1 block text-sm font-medium text-slate-700">
            Subject name
          </label>
          <div className="flex gap-2">
            <input
              id="subject-name"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="e.g. Data Structures"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Student mode is read-only for subjects. Switch to Teacher mode to create subjects.
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading subjects..." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {subjects.length === 0 ? (
            <p className="text-sm text-slate-500">No subjects yet.</p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {subjects.map((subject) => (
                <li key={subject.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                  {subject.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
