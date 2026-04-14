import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import QuizCard from "../components/quizzes/QuizCard";
import AnimatedButton from "../components/shared/AnimatedButton";
import GlassCard from "../components/shared/GlassCard";
import Modal from "../components/shared/Modal";
import { ErrorState, LoadingState } from "../components/shared/StatusMessage";
import { useAuth } from "../context/AuthContext";
import { MOCK_ATTEMPTS, MOCK_QUIZ, MOCK_SUBJECTS, fallbackIfEmpty } from "../lib/mockData";
import {
  addQuestion,
  createAttempt,
  createQuiz,
  getQuizWithQuestions,
  listAttempts,
  listAvailableQuizzes,
  listSubjects,
  listTeacherQuizzes,
  seedDemoQuizzes,
  setQuizPublished,
} from "../services/studyHubApi";

const initialQuestionState = {
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
};

const answerChoices = ["A", "B", "C", "D"];
const QUIZZES_CACHE_KEY = "ai-study-hub-quizzes-cache";
const QUIZZES_TIMEOUT_MS = 1500;

function isMockQuizId(quizId = "") {
  return String(quizId).startsWith("mock-");
}

function loadQuizzesCache(userId) {
  if (!userId) return null;

  try {
    const raw = localStorage.getItem(QUIZZES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveQuizzesCache(userId, payload) {
  if (!userId) return;

  try {
    localStorage.setItem(
      QUIZZES_CACHE_KEY,
      JSON.stringify({ userId, ...payload, cachedAt: Date.now() })
    );
  } catch {
    // Ignore cache write errors.
  }
}

function withTimeout(promise, fallbackValue, timeoutMs = QUIZZES_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs);
    }),
  ]);
}

export default function QuizzesPage() {
  const { user, role, activeMode } = useAuth();
  const isTeacherMode = role === "teacher" && activeMode === "teacher";

  const [subjects, setSubjects] = useState([]);
  const [managedQuizzes, setManagedQuizzes] = useState([]);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);

  const [quizTitle, setQuizTitle] = useState("");
  const [quizSubjectId, setQuizSubjectId] = useState("");
  const [publishQuiz, setPublishQuiz] = useState(true);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questionForm, setQuestionForm] = useState(initialQuestionState);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [publishingQuiz, setPublishingQuiz] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const [attemptMode, setAttemptMode] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [finalResult, setFinalResult] = useState({ score: 0, total: 0 });

  const activeQuestion = selectedQuiz?.questions?.[activeQuestionIndex];
  const totalQuestions = selectedQuiz?.questions?.length ?? 0;
  const progress = totalQuestions > 0 ? ((activeQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject.name])),
    [subjects]
  );

  const selectableQuizzes = isTeacherMode ? managedQuizzes : availableQuizzes;

  const loadQuizzesData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const cached = loadQuizzesCache(user.id);
    if (cached) {
      if (Array.isArray(cached.subjects)) setSubjects(cached.subjects);
      if (Array.isArray(cached.managedQuizzes)) setManagedQuizzes(cached.managedQuizzes);
      if (Array.isArray(cached.availableQuizzes)) setAvailableQuizzes(cached.availableQuizzes);
      if (Array.isArray(cached.attempts)) setAttempts(cached.attempts);
      setLoading(false);
    }

    setLoading(!cached);
    setError("");
    try {
      const [subjectsData, teacherQuizzesData, availableQuizzesData, attemptsData] = await Promise.all([
        withTimeout(listSubjects(user.id), []),
        withTimeout(listTeacherQuizzes(user.id), []),
        withTimeout(listAvailableQuizzes(user.id), []),
        withTimeout(listAttempts(user.id), []),
      ]);

      const safeSubjects = fallbackIfEmpty(subjectsData, MOCK_SUBJECTS);
      const safeManaged = fallbackIfEmpty(teacherQuizzesData, [MOCK_QUIZ]);
      const safeAvailable = fallbackIfEmpty(availableQuizzesData, [MOCK_QUIZ]);
      const safeAttempts = fallbackIfEmpty(attemptsData, MOCK_ATTEMPTS);

      setSubjects(safeSubjects);
      setManagedQuizzes(safeManaged);
      setAvailableQuizzes(safeAvailable);
      setAttempts(safeAttempts);
      saveQuizzesCache(user.id, {
        subjects: safeSubjects,
        managedQuizzes: safeManaged,
        availableQuizzes: safeAvailable,
        attempts: safeAttempts,
      });
    } catch (loadError) {
      setError(loadError.message);
      setSubjects(MOCK_SUBJECTS);
      setManagedQuizzes([MOCK_QUIZ]);
      setAvailableQuizzes([MOCK_QUIZ]);
      setAttempts(MOCK_ATTEMPTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzesData();
  }, [user?.id]);

  useEffect(() => {
    setSelectedQuizId("");
    setSelectedQuiz(null);
    setAttemptMode(false);
    setActiveQuestionIndex(0);
    setScore(0);
    setSelectedAnswer("");
  }, [isTeacherMode]);

  useEffect(() => {
    const loadSelectedQuiz = async () => {
      if (!selectedQuizId || !user?.id) {
        setSelectedQuiz(null);
        return;
      }

      if (isMockQuizId(selectedQuizId)) {
        setSelectedQuiz(MOCK_QUIZ);
        return;
      }

      setError("");
      try {
        const quizWithQuestions = await withTimeout(
          getQuizWithQuestions(selectedQuizId, user.id),
          null
        );

        if (!quizWithQuestions) {
          throw new Error("Quiz details are taking too long to load. Please try again.");
        }

        setSelectedQuiz(quizWithQuestions);
      } catch (selectedError) {
        setError(selectedError.message);

        const fallbackSelected = selectableQuizzes.find((quiz) => quiz.id === selectedQuizId);
        if (fallbackSelected && isMockQuizId(fallbackSelected.id)) {
          setSelectedQuiz(MOCK_QUIZ);
        }
      }
    };

    loadSelectedQuiz();
  }, [selectedQuizId, user?.id, selectableQuizzes]);

  const handleCreateQuiz = async (event) => {
    event.preventDefault();
    if (!quizTitle.trim()) return;

    setSavingQuiz(true);
    setError("");
    setNotice("");
    try {
      const created = await createQuiz({
        title: quizTitle.trim(),
        subjectId: quizSubjectId || null,
        userId: user.id,
        isPublished: publishQuiz,
      });

      setManagedQuizzes((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)));
      if (created.is_published) {
        setAvailableQuizzes((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)));
      }

      setQuizTitle("");
      setQuizSubjectId("");
      setPublishQuiz(true);
      setSelectedQuizId(created.id);
      setNotice("Quiz created successfully.");
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleQuestionInput = (field, value) => {
    setQuestionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddQuestion = async (event) => {
    event.preventDefault();
    if (!selectedQuizId) {
      setError("Select a quiz first.");
      return;
    }

    const hasEmpty = Object.entries(questionForm).some(
      ([key, value]) => key !== "correct_answer" && !value.trim()
    );
    if (hasEmpty) {
      setError("Fill all question and option fields.");
      return;
    }

    setSavingQuestion(true);
    setError("");
    setNotice("");
    try {
      const createdQuestion = await addQuestion({
        quiz_id: selectedQuizId,
        ...questionForm,
      });

      setSelectedQuiz((prev) =>
        prev
          ? { ...prev, questions: [...(prev.questions ?? []), createdQuestion] }
          : prev
      );
      setQuestionForm(initialQuestionState);
      setNotice("Question added.");
    } catch (questionError) {
      setError(questionError.message);
    } finally {
      setSavingQuestion(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!selectedQuiz || selectedQuiz.user_id !== user?.id) return;

    setPublishingQuiz(true);
    setError("");
    setNotice("");
    try {
      const updatedQuiz = await setQuizPublished({
        quizId: selectedQuiz.id,
        userId: user.id,
        isPublished: !selectedQuiz.is_published,
      });

      setSelectedQuiz((prev) => (prev ? { ...prev, is_published: updatedQuiz.is_published } : prev));

      setManagedQuizzes((prev) =>
        prev.map((quiz) => (quiz.id === updatedQuiz.id ? updatedQuiz : quiz))
      );

      setAvailableQuizzes((prev) => {
        const withoutCurrent = prev.filter((quiz) => quiz.id !== updatedQuiz.id);
        if (updatedQuiz.is_published) {
          return [...withoutCurrent, updatedQuiz].sort((a, b) => a.title.localeCompare(b.title));
        }
        return withoutCurrent;
      });

      setNotice(updatedQuiz.is_published ? "Quiz published." : "Quiz moved to draft.");
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setPublishingQuiz(false);
    }
  };

  const handleSeedDemoQuizzes = async () => {
    setSeedingDemo(true);
    setError("");
    setNotice("");
    try {
      const { createdCount } = await seedDemoQuizzes({ userId: user.id, subjectId: quizSubjectId || null });
      await loadQuizzesData();
      setNotice(
        createdCount > 0
          ? `Generated ${createdCount} demo quizzes with questions.`
          : "Demo quizzes already exist for this teacher account."
      );
    } catch (seedError) {
      setError(seedError.message);
    } finally {
      setSeedingDemo(false);
    }
  };

  const startAttempt = () => {
    if (!selectedQuiz || selectedQuiz.questions.length === 0) {
      setError("Add at least one question before attempting this quiz.");
      return;
    }

    setAttemptMode(true);
    setActiveQuestionIndex(0);
    setScore(0);
    setSelectedAnswer("");
    setError("");
    setNotice("");
  };

  const handleAnswer = async (answer) => {
    if (!selectedQuiz || !activeQuestion || selectedAnswer) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === activeQuestion.correct_answer;
    const nextScore = isCorrect ? score + 1 : score;
    const nextIndex = activeQuestionIndex + 1;

    setTimeout(async () => {
      if (nextIndex >= selectedQuiz.questions.length) {
        try {
          await createAttempt({ quizId: selectedQuiz.id, userId: user.id, score: nextScore });
          setAttemptMode(false);
          setScore(0);
          setActiveQuestionIndex(0);
          setSelectedAnswer("");
          setFinalResult({ score: nextScore, total: selectedQuiz.questions.length });
          setShowScoreModal(true);
          setNotice(`Attempt saved. Final score: ${nextScore}/${selectedQuiz.questions.length}`);
          await loadQuizzesData();
        } catch (attemptError) {
          setError(attemptError.message);
        }
        return;
      }

      setScore(nextScore);
      setActiveQuestionIndex(nextIndex);
      setSelectedAnswer("");
    }, 400);
  };

  if (loading) {
    return <LoadingState label="Loading quizzes..." />;
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Quiz Studio</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {isTeacherMode
              ? "Teacher mode: create, publish, and manage quiz flows."
              : "Student mode: attempt quizzes with live progress and animated feedback."}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-amber-100/80 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <Sparkles size={14} />
          {isTeacherMode ? "Teacher Workspace" : "Student Workspace"}
        </div>
      </header>

      <ErrorState message={error} />
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <GlassCard hover={false} className="xl:col-span-1">
          {isTeacherMode ? (
            <form onSubmit={handleCreateQuiz} className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create Quiz</h2>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                placeholder="Quiz title"
                value={quizTitle}
                onChange={(event) => setQuizTitle(event.target.value)}
                required
              />
              <select
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={quizSubjectId}
                onChange={(event) => setQuizSubjectId(event.target.value)}
              >
                <option value="">Optional subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>

              <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={publishQuiz}
                  onChange={(event) => setPublishQuiz(event.target.checked)}
                />
                Publish immediately
              </label>

              <div className="grid gap-2">
                <AnimatedButton type="submit" disabled={savingQuiz}>
                  {savingQuiz ? "Creating..." : "Create Quiz"}
                </AnimatedButton>
                <AnimatedButton type="button" onClick={handleSeedDemoQuizzes} disabled={seedingDemo} variant="secondary">
                  {seedingDemo ? "Generating..." : "Generate Demo Quizzes"}
                </AnimatedButton>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Student Guidelines</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>Choose a published quiz from the quiz rail.</li>
                <li>Answer each question once for authentic scoring.</li>
                <li>Your final result is saved automatically.</li>
              </ul>
            </div>
          )}
        </GlassCard>

        <GlassCard hover={false} className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isTeacherMode ? "Manage Quizzes" : "Available Quizzes"}
            </h2>
            <select
              className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={selectedQuizId}
              onChange={(event) => {
                setSelectedQuizId(event.target.value);
                setAttemptMode(false);
                setSelectedAnswer("");
              }}
            >
              <option value="">Select a quiz</option>
              {selectableQuizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {selectableQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                questionCount={quiz.id === selectedQuiz?.id ? selectedQuiz.questions?.length ?? 0 : 0}
                onStart={!isTeacherMode && quiz.id === selectedQuiz?.id ? startAttempt : undefined}
              />
            ))}
          </div>

          {selectedQuiz && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedQuiz.title}</p>
              <p className="text-slate-600 dark:text-slate-300">
                Subject: {subjectMap.get(selectedQuiz.subject_id) ?? "Not assigned"}
              </p>
              <p className="text-slate-600 dark:text-slate-300">Questions: {selectedQuiz.questions.length}</p>

              {isTeacherMode && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                      selectedQuiz.is_published
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"
                    }`}
                  >
                    {selectedQuiz.is_published ? "Published" : "Draft"}
                  </span>
                  <AnimatedButton type="button" onClick={handlePublishToggle} disabled={publishingQuiz}>
                    {publishingQuiz ? "Saving..." : selectedQuiz.is_published ? "Move to Draft" : "Publish Quiz"}
                  </AnimatedButton>
                </div>
              )}

              {!isTeacherMode && (
                <div className="mt-3">
                  <AnimatedButton type="button" onClick={startAttempt}>
                    Start Attempt
                  </AnimatedButton>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      {isTeacherMode && selectedQuizId && (
        <GlassCard hover={false}>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Question</h2>
          <form onSubmit={handleAddQuestion} className="mt-3 space-y-2">
            <textarea
              className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              placeholder="Question"
              rows={2}
              value={questionForm.question}
              onChange={(event) => handleQuestionInput("question", event.target.value)}
              required
            />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                placeholder="Option A"
                value={questionForm.option_a}
                onChange={(event) => handleQuestionInput("option_a", event.target.value)}
                required
              />
              <input
                className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                placeholder="Option B"
                value={questionForm.option_b}
                onChange={(event) => handleQuestionInput("option_b", event.target.value)}
                required
              />
              <input
                className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                placeholder="Option C"
                value={questionForm.option_c}
                onChange={(event) => handleQuestionInput("option_c", event.target.value)}
                required
              />
              <input
                className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                placeholder="Option D"
                value={questionForm.option_d}
                onChange={(event) => handleQuestionInput("option_d", event.target.value)}
                required
              />
            </div>
            <select
              className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={questionForm.correct_answer}
              onChange={(event) => handleQuestionInput("correct_answer", event.target.value)}
            >
              <option value="A">Correct: A</option>
              <option value="B">Correct: B</option>
              <option value="C">Correct: C</option>
              <option value="D">Correct: D</option>
            </select>
            <AnimatedButton type="submit" disabled={savingQuestion}>
              {savingQuestion ? "Saving..." : "Add Question"}
            </AnimatedButton>
          </form>
        </GlassCard>
      )}

      {!isTeacherMode && attemptMode && activeQuestion && (
        <GlassCard hover={false}>
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500"
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
            Question {activeQuestionIndex + 1} of {selectedQuiz.questions.length}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeQuestion.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{activeQuestion.question}</h3>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {answerChoices.map((key) => {
                  const value = activeQuestion[`option_${key.toLowerCase()}`];
                  const isCorrect = key === activeQuestion.correct_answer;
                  const isChosen = key === selectedAnswer;
                  const shouldHighlightCorrect = selectedAnswer && isCorrect;
                  const shouldHighlightWrong = selectedAnswer && isChosen && !isCorrect;

                  return (
                    <motion.button
                      key={key}
                      type="button"
                      whileHover={!selectedAnswer ? { y: -2 } : undefined}
                      onClick={() => handleAnswer(key)}
                      disabled={Boolean(selectedAnswer)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                        shouldHighlightCorrect
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : shouldHighlightWrong
                            ? "border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                            : "border-slate-300 bg-white/70 text-slate-700 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                      }`}
                    >
                      <span className="mr-2 font-semibold text-cyan-700 dark:text-cyan-300">{key}.</span>
                      {value}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      )}

      <GlassCard hover={false}>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Progress Tracking</h2>
        {attempts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No attempts yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{attempt.quiz_title}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-200">
                    <CheckCircle2 size={12} />
                    {attempt.score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(attempt.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <Modal
        isOpen={showScoreModal}
        title="Attempt Complete"
        onClose={() => setShowScoreModal(false)}
      >
        <div className="space-y-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center dark:border-emerald-900 dark:bg-emerald-950/40"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Final Score</p>
            <p className="mt-2 text-4xl font-black text-emerald-700 dark:text-emerald-300">
              {finalResult.score}/{finalResult.total}
            </p>
          </motion.div>
          <AnimatedButton type="button" onClick={() => setShowScoreModal(false)} className="w-full">
            Continue
          </AnimatedButton>
        </div>
      </Modal>
    </section>
  );
}
