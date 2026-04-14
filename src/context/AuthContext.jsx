import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getUserProfile, upsertUserProfile, updateUserRole } from "../services/studyHubApi";

const AuthContext = createContext(null);
const SESSION_INIT_TIMEOUT_MS = 1200;
const ROLE_OVERRIDE_KEY_PREFIX = "ai-study-hub-role-override:";

function getRoleOverride(userId) {
  if (!userId) return null;

  try {
    const saved = localStorage.getItem(`${ROLE_OVERRIDE_KEY_PREFIX}${userId}`);
    return saved === "teacher" || saved === "student" ? saved : null;
  } catch {
    return null;
  }
}

function setRoleOverride(userId, roleValue) {
  if (!userId) return;

  try {
    localStorage.setItem(`${ROLE_OVERRIDE_KEY_PREFIX}${userId}`, roleValue);
  } catch {
    // Ignore storage errors.
  }
}

function clearRoleOverride(userId) {
  if (!userId) return;

  try {
    localStorage.removeItem(`${ROLE_OVERRIDE_KEY_PREFIX}${userId}`);
  } catch {
    // Ignore storage errors.
  }
}

function clearLocalViewCaches() {
  const keys = [
    "ai-study-hub-dashboard-cache",
    "ai-study-hub-subjects-cache",
    "ai-study-hub-files-cache",
    "ai-study-hub-quizzes-cache",
  ];

  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve({ timeout: true }), ms);
    }),
  ]);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("student");
  const [activeMode, setActiveMode] = useState("student");
  const [authLoading, setAuthLoading] = useState(true);

  const syncProfile = async (currentUser) => {
    if (!currentUser?.id) {
      setProfile(null);
      setRole("student");
      setActiveMode("student");
      return;
    }

    const metadataRole = currentUser.user_metadata?.role === "teacher" ? "teacher" : "student";

    try {
      let currentProfile = await getUserProfile(currentUser.id);

      if (!currentProfile) {
        currentProfile = await upsertUserProfile({
          userId: currentUser.id,
          email: currentUser.email,
          role: metadataRole,
        });
      }

      const profileRole = currentProfile?.role === "teacher" ? "teacher" : "student";
      const overrideRole = getRoleOverride(currentUser.id);
      const normalizedRole = overrideRole ?? profileRole;
      setProfile(currentProfile);
      setRole(normalizedRole);
      setActiveMode(normalizedRole === "teacher" ? "teacher" : "student");

      if (overrideRole && overrideRole === profileRole) {
        clearRoleOverride(currentUser.id);
      }
    } catch (_profileError) {
      // Keep app usable even if profile table/policies are not yet migrated.
      const overrideRole = getRoleOverride(currentUser.id);
      const normalizedRole = overrideRole ?? metadataRole;
      const fallbackProfile = {
        id: currentUser.id,
        email: currentUser.email,
        role: normalizedRole,
      };
      setProfile(fallbackProfile);
      setRole(normalizedRole);
      setActiveMode(normalizedRole === "teacher" ? "teacher" : "student");
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const sessionResponse = await withTimeout(
          supabase.auth.getSession(),
          SESSION_INIT_TIMEOUT_MS
        );

        if (sessionResponse?.timeout) {
          setSession(null);
          setUser(null);
          await syncProfile(null);
          return;
        }

        const {
          data: { session: currentSession },
        } = sessionResponse;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        await syncProfile(currentSession?.user ?? null);
      } catch (_sessionError) {
        setSession(null);
        setUser(null);
        await syncProfile(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        await syncProfile(newSession?.user ?? null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, selectedRole = "student") => {
    const roleToSave = selectedRole === "teacher" ? "teacher" : "student";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: roleToSave,
        },
      },
    });

    if (!error && data?.user?.id) {
      try {
        await upsertUserProfile({
          userId: data.user.id,
          email,
          role: roleToSave,
        });
      } catch (_upsertError) {
        // If email verification is enabled, insert may fail before login token is active.
      }
    }

    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const currentUserId = user?.id;
    if (currentUserId) {
      clearRoleOverride(currentUserId);
    }

    // Optimistically clear local auth state so logout always feels instant.
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole("student");
    setActiveMode("student");
    setAuthLoading(false);
    clearLocalViewCaches();

    try {
      const signOutResponse = await withTimeout(supabase.auth.signOut(), SESSION_INIT_TIMEOUT_MS);
      if (signOutResponse?.timeout) {
        return { error: null };
      }

      return { error: signOutResponse.error ?? null };
    } catch {
      // Local sign-out is already complete; ignore remote errors.
      return { error: null };
    }
  };

  const changeRole = async (nextRole) => {
    if (!user?.id) return;

    const normalizedRole = nextRole === "teacher" ? "teacher" : "student";
    setRole(normalizedRole);
    setActiveMode(normalizedRole === "teacher" ? "teacher" : "student");
    setProfile((prev) => ({
      id: user.id,
      email: user.email,
      role: normalizedRole,
      ...(prev ?? {}),
    }));
    setRoleOverride(user.id, normalizedRole);

    try {
      const updated = await updateUserRole({ userId: user.id, role: normalizedRole });
      const confirmedRole = updated.role === "teacher" ? "teacher" : "student";
      setProfile(updated);
      setRole(confirmedRole);
      setActiveMode(confirmedRole === "teacher" ? "teacher" : "student");
      clearRoleOverride(user.id);
      return;
    } catch (_updateRoleError) {
      // Fall through to upsert as a backup path when update policy fails.
    }

    try {
      const upserted = await upsertUserProfile({
        userId: user.id,
        email: user.email,
        role: normalizedRole,
      });
      const confirmedRole = upserted.role === "teacher" ? "teacher" : "student";
      setProfile(upserted);
      setRole(confirmedRole);
      setActiveMode(confirmedRole === "teacher" ? "teacher" : "student");
      clearRoleOverride(user.id);
    } catch (_upsertRoleError) {
      // Keep optimistic role in UI if backend role mutation is blocked.
    }
  };

  const switchMode = (nextMode) => {
    if (role !== "teacher") {
      setActiveMode("student");
      return;
    }

    setActiveMode(nextMode === "student" ? "student" : "teacher");
  };

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      role,
      activeMode,
      authLoading,
      signUp,
      signIn,
      signOut,
      changeRole,
      switchMode,
    }),
    [session, user, profile, role, activeMode, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
