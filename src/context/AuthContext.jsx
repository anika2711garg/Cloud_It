import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getUserProfile, upsertUserProfile, updateUserRole } from "../services/studyHubApi";

const AuthContext = createContext(null);
const SESSION_INIT_TIMEOUT_MS = 2000;

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

      const normalizedRole = currentProfile?.role === "teacher" ? "teacher" : "student";
      setProfile(currentProfile);
      setRole(normalizedRole);
      setActiveMode(normalizedRole === "teacher" ? "teacher" : "student");
    } catch (_profileError) {
      // Keep app usable even if profile table/policies are not yet migrated.
      const fallbackProfile = {
        id: currentUser.id,
        email: currentUser.email,
        role: metadataRole,
      };
      setProfile(fallbackProfile);
      setRole(metadataRole);
      setActiveMode(metadataRole === "teacher" ? "teacher" : "student");
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
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const changeRole = async (nextRole) => {
    if (!user?.id) return;

    const updated = await updateUserRole({ userId: user.id, role: nextRole });
    const normalizedRole = updated.role === "teacher" ? "teacher" : "student";
    setProfile(updated);
    setRole(normalizedRole);
    setActiveMode(normalizedRole === "teacher" ? "teacher" : "student");
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
