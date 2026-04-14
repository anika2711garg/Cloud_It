import { motion } from "framer-motion";

export default function AnimatedButton({
  children,
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
