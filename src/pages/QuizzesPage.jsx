import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
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
import { ErrorState, LoadingState } from "../components/shared/StatusMessage";

const initialQuestionState = {
	question: "",
	option_a: "",
	option_b: "",
	option_c: "",
	option_d: "",
	correct_answer: "A",
};

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

	const activeQuestion = selectedQuiz?.questions?.[activeQuestionIndex];

	const subjectMap = useMemo(
		() => new Map(subjects.map((subject) => [subject.id, subject.name])),
		[subjects]
	);

	const selectableQuizzes = isTeacherMode ? managedQuizzes : availableQuizzes;

	const loadQuizzesData = async () => {
		if (!user?.id) return;

		setLoading(true);
		setError("");
		try {
			const [subjectsData, teacherQuizzesData, availableQuizzesData, attemptsData] = await Promise.all([
				listSubjects(user.id),
				listTeacherQuizzes(user.id),
				listAvailableQuizzes(user.id),
				listAttempts(user.id),
			]);

			setSubjects(subjectsData);
			setManagedQuizzes(teacherQuizzesData);
			setAvailableQuizzes(availableQuizzesData);
			setAttempts(attemptsData);
		} catch (loadError) {
			setError(loadError.message);
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
	}, [isTeacherMode]);

	useEffect(() => {
		const loadSelectedQuiz = async () => {
			if (!selectedQuizId || !user?.id) {
				setSelectedQuiz(null);
				return;
			}

			setError("");
			try {
				const quizWithQuestions = await getQuizWithQuestions(selectedQuizId, user.id);
				setSelectedQuiz(quizWithQuestions);
			} catch (selectedError) {
				setError(selectedError.message);
			}
		};

		loadSelectedQuiz();
	}, [selectedQuizId, user?.id]);

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
		setError("");
		setNotice("");
	};

	const handleAnswer = async (answer) => {
		if (!selectedQuiz || !activeQuestion) return;

		const isCorrect = answer === activeQuestion.correct_answer;
		const nextScore = isCorrect ? score + 1 : score;
		const nextIndex = activeQuestionIndex + 1;

		if (nextIndex >= selectedQuiz.questions.length) {
			try {
				await createAttempt({ quizId: selectedQuiz.id, userId: user.id, score: nextScore });
				setAttemptMode(false);
				setScore(0);
				setActiveQuestionIndex(0);
				setNotice(`Attempt saved. Final score: ${nextScore}/${selectedQuiz.questions.length}`);
				await loadQuizzesData();
			} catch (attemptError) {
				setError(attemptError.message);
			}
			return;
		}

		setScore(nextScore);
		setActiveQuestionIndex(nextIndex);
	};

	if (loading) {
		return <LoadingState label="Loading quizzes..." />;
	}

	return (
		<section className="space-y-5">
			<header>
				<h1 className="font-serif text-3xl text-slate-900">Quiz System</h1>
				<p className="text-sm text-slate-600">
					{isTeacherMode
						? "Teacher mode: create, publish, and manage question banks."
						: "Student mode: attempt available quizzes and track your scores."}
				</p>
			</header>

			<ErrorState message={error} />
			{notice && (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
					{notice}
				</div>
			)}

			<div className="grid gap-4 xl:grid-cols-2">
				{isTeacherMode ? (
					<form onSubmit={handleCreateQuiz} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
						<h2 className="font-semibold text-slate-900">Create Quiz</h2>
						<input
							className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2"
							placeholder="Quiz title"
							value={quizTitle}
							onChange={(event) => setQuizTitle(event.target.value)}
							required
						/>
						<select
							className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
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

						<label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
							<input
								type="checkbox"
								checked={publishQuiz}
								onChange={(event) => setPublishQuiz(event.target.checked)}
							/>
							Publish immediately
						</label>

						<div className="mt-3 flex flex-wrap gap-2">
							<button
								type="submit"
								disabled={savingQuiz}
								className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
							>
								{savingQuiz ? "Creating..." : "Create quiz"}
							</button>
							<button
								type="button"
								onClick={handleSeedDemoQuizzes}
								disabled={seedingDemo}
								className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
							>
								{seedingDemo ? "Generating..." : "Generate Demo Quizzes"}
							</button>
						</div>
					</form>
				) : (
					<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
						<h2 className="font-semibold text-slate-900">Student Guidelines</h2>
						<ul className="mt-3 space-y-2 text-sm text-slate-600">
							<li>Choose a published quiz from the list.</li>
							<li>Answer one question at a time.</li>
							<li>Your score is saved automatically after completion.</li>
						</ul>
					</div>
				)}

				<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<h2 className="font-semibold text-slate-900">
						{isTeacherMode ? "Manage Quizzes" : "Available Quizzes"}
					</h2>
					<select
						className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2"
						value={selectedQuizId}
						onChange={(event) => {
							setSelectedQuizId(event.target.value);
							setAttemptMode(false);
						}}
					>
						<option value="">Select a quiz</option>
						{selectableQuizzes.map((quiz) => (
							<option key={quiz.id} value={quiz.id}>
								{quiz.title}
							</option>
						))}
					</select>

					{selectedQuiz && (
						<div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
							<p className="font-medium text-slate-900">{selectedQuiz.title}</p>
							<p className="text-slate-500">
								Subject: {subjectMap.get(selectedQuiz.subject_id) ?? "Not assigned"}
							</p>
							<p className="text-slate-500">Questions: {selectedQuiz.questions.length}</p>

							{isTeacherMode ? (
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<span
										className={`rounded-md px-2 py-1 text-xs font-semibold ${
											selectedQuiz.is_published
												? "bg-emerald-100 text-emerald-700"
												: "bg-amber-100 text-amber-700"
										}`}
									>
										{selectedQuiz.is_published ? "Published" : "Draft"}
									</span>
									<button
										type="button"
										onClick={handlePublishToggle}
										disabled={publishingQuiz}
										className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
									>
										{publishingQuiz
											? "Saving..."
											: selectedQuiz.is_published
												? "Move to Draft"
												: "Publish Quiz"}
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={startAttempt}
									className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
								>
									Start Attempt
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			{isTeacherMode && selectedQuizId && (
				<form onSubmit={handleAddQuestion} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
					<h2 className="font-semibold text-slate-900">Add Question</h2>
					<textarea
						className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2"
						placeholder="Question"
						rows={2}
						value={questionForm.question}
						onChange={(event) => handleQuestionInput("question", event.target.value)}
						required
					/>
					<div className="mt-2 grid gap-2 md:grid-cols-2">
						<input
							className="rounded-md border border-slate-300 px-3 py-2"
							placeholder="Option A"
							value={questionForm.option_a}
							onChange={(event) => handleQuestionInput("option_a", event.target.value)}
							required
						/>
						<input
							className="rounded-md border border-slate-300 px-3 py-2"
							placeholder="Option B"
							value={questionForm.option_b}
							onChange={(event) => handleQuestionInput("option_b", event.target.value)}
							required
						/>
						<input
							className="rounded-md border border-slate-300 px-3 py-2"
							placeholder="Option C"
							value={questionForm.option_c}
							onChange={(event) => handleQuestionInput("option_c", event.target.value)}
							required
						/>
						<input
							className="rounded-md border border-slate-300 px-3 py-2"
							placeholder="Option D"
							value={questionForm.option_d}
							onChange={(event) => handleQuestionInput("option_d", event.target.value)}
							required
						/>
					</div>
					<select
						className="mt-2 rounded-md border border-slate-300 px-3 py-2"
						value={questionForm.correct_answer}
						onChange={(event) => handleQuestionInput("correct_answer", event.target.value)}
					>
						<option value="A">Correct: A</option>
						<option value="B">Correct: B</option>
						<option value="C">Correct: C</option>
						<option value="D">Correct: D</option>
					</select>
					<button
						type="submit"
						disabled={savingQuestion}
						className="mt-3 rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
					>
						{savingQuestion ? "Saving..." : "Add question"}
					</button>
				</form>
			)}

			{!isTeacherMode && attemptMode && activeQuestion && (
				<section className="rounded-xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
					<p className="text-xs uppercase tracking-[0.2em] text-cyan-700">
						Question {activeQuestionIndex + 1} of {selectedQuiz.questions.length}
					</p>
					<h3 className="mt-2 text-lg font-semibold text-slate-900">{activeQuestion.question}</h3>
					<div className="mt-4 grid gap-2 md:grid-cols-2">
						{[
							["A", activeQuestion.option_a],
							["B", activeQuestion.option_b],
							["C", activeQuestion.option_c],
							["D", activeQuestion.option_d],
						].map(([key, value]) => (
							<button
								key={key}
								type="button"
								onClick={() => handleAnswer(key)}
								className="rounded-md border border-cyan-300 bg-white px-4 py-2 text-left text-sm text-slate-700 hover:bg-cyan-100"
							>
								<span className="mr-2 font-semibold text-cyan-700">{key}.</span>
								{value}
							</button>
						))}
					</div>
				</section>
			)}

			<section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
				<h2 className="font-semibold text-slate-900">Progress Tracking</h2>
				{attempts.length === 0 ? (
					<p className="mt-2 text-sm text-slate-500">No attempts yet.</p>
				) : (
					<ul className="mt-3 space-y-2 text-sm">
						{attempts.map((attempt) => (
							<li key={attempt.id} className="rounded-md bg-slate-50 p-3">
								<span className="font-medium text-slate-900">{attempt.quiz_title}</span>: score {attempt.score}
								<p className="text-xs text-slate-500">{new Date(attempt.created_at).toLocaleString()}</p>
							</li>
						))}
					</ul>
				)}
			</section>
		</section>
	);
}
