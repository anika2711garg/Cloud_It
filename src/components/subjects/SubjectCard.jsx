import { motion } from "framer-motion";

const palette = [
  "from-pink-500/20 to-orange-500/10",
  "from-cyan-500/20 to-blue-500/10",
  "from-emerald-500/20 to-teal-500/10",
  "from-violet-500/20 to-fuchsia-500/10",
];

export default function SubjectCard({ subject, index }) {
  const gradient = palette[index % palette.length];

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      className={`rounded-2xl border border-white/30 bg-gradient-to-br ${gradient} p-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-slate-700/70`}
    >
      <p className="text-xl">{subject.emoji || "📘"}</p>
      <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{subject.name}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">Quick access notes and quizzes</p>
    </motion.article>
  );
}
