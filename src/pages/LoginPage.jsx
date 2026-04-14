import { motion } from "framer-motion";
import { BookOpenText, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AnimatedButton from "../components/shared/AnimatedButton";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const AnimatedContainer = motion.div;
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 hidden dark:block dark:bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.2),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.2),transparent_35%)]" />

      <AnimatedContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/40 bg-white/70 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-slate-700 dark:bg-slate-900/70 md:grid-cols-2"
      >
        <aside className="hidden bg-gradient-to-br from-cyan-600 to-emerald-500 p-8 text-white md:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            <Sparkles size={14} />
            EduVault
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight">Learn faster with your personal study cloud.</h1>
          <p className="mt-4 text-sm text-white/90">
            Organize files, attempt quizzes, and track your momentum in one polished workspace.
          </p>
        </aside>

        <section className="p-6 sm:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-xl bg-cyan-100 px-3 py-2 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-200">
            <BookOpenText size={14} />
            Welcome Back
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Sign In</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none ring-cyan-400 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-800"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none ring-cyan-400 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-800"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </p>
            )}

            <AnimatedButton type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign In"}
            </AnimatedButton>
          </form>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            New here?{" "}
            <Link to="/signup" className="font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
              Create an account
            </Link>
          </p>
        </section>
      </AnimatedContainer>
    </div>
  );
}
