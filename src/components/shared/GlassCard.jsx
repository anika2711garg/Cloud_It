import { motion } from "framer-motion";

export default function GlassCard({ children, className = "", hover = true }) {
  const hoverProps = hover
    ? {
        whileHover: { y: -4, scale: 1.01 },
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <motion.section
      {...hoverProps}
      className={`rounded-2xl border border-white/30 bg-white/60 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/60 ${className}`}
    >
      {children}
    </motion.section>
  );
}
