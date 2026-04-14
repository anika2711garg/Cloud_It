import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme] = useState("dark");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("ai-study-hub-theme", "dark");
  }, [theme]);

  const setTheme = () => {};
  const toggleTheme = () => {};

  const value = useMemo(
    () => ({
      theme,
      isDark: true,
      setTheme,
      toggleTheme,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
