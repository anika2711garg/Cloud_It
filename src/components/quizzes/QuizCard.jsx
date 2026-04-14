import { motion } from "framer-motion";
import { CheckCircle2, Clock4 } from "lucide-react";

export default function QuizCard({ quiz, questionCount = 0, onStart }) {
  return (
    <motion.article
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-white/30 bg-white/70 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/70"
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{quiz.title}</h3>
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock4 size={13} />
          {questionCount} questions
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 size={13} />
          {quiz.is_published ? "Published" : "Draft"}
        </span>
      </div>

      {onStart && (
        <button
          type="button"
          onClick={onStart}
          className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Start Attempt
        </button>
      )}
    </motion.article>
  );
}
