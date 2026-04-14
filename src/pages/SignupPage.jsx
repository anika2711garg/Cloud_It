import { motion } from "framer-motion";
import { GraduationCap, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import AnimatedButton from "../components/shared/AnimatedButton";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const AnimatedContainer = motion.div;
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { error: signUpError } = await signUp(email, password, role);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const confirmationMessage = "A confirmation email has been sent. Kindly verify the same to proceed.";
    alert(confirmationMessage);
    setMessage(confirmationMessage);
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 hidden dark:block dark:bg-[radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(245,158,11,0.16),transparent_40%)]" />

      <AnimatedContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/40 bg-white/70 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-slate-700 dark:bg-slate-900/70 md:grid-cols-2"
      >
        <aside className="hidden bg-gradient-to-br from-amber-500 to-cyan-600 p-8 text-white md:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            <Sparkles size={14} />
            Join Studio
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight">Build your study operating system.</h1>
          <p className="mt-4 text-sm text-white/90">
            Choose your role, collect your material, and unlock focused prep sessions.
          </p>
        </aside>

        <section className="p-6 sm:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            <GraduationCap size={14} />
            Create Account
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Sign Up</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Set up your profile and launch your study workspace.</p>
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Important: After account creation, Confirm your email inbox before continuing.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none ring-cyan-400 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-800"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                minLength={6}
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none ring-cyan-400 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-800"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor="signup-role">
                Register As
              </label>
              <select
                id="signup-role"
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none ring-cyan-400 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-800"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                {message}
              </p>
            )}

            <AnimatedButton type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Create Account"}
            </AnimatedButton>
          </form>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
              Sign in
            </Link>
          </p>
        </section>
      </AnimatedContainer>
    </div>
  );
}
