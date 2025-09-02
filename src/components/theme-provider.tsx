import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

const DEFAULT_STORAGE_KEY = "ptrn-theme";

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyHtmlClassForTheme(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && getSystemPrefersDark());
  document.documentElement.classList[isDark ? "add" : "remove"]("dark");
}

export function ThemeProvider({ children, defaultTheme = "system", storageKey = DEFAULT_STORAGE_KEY }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = window.localStorage.getItem(storageKey) as Theme | null;
    return stored ?? defaultTheme;
  });

  const mediaQueryRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    applyHtmlClassForTheme(theme);

    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(storageKey, theme);
    } catch (_) {}

    if (!window.matchMedia) return;

    if (mediaQueryRef.current) {
      mediaQueryRef.current.removeEventListener("change", handleSystemChange);
    }

    mediaQueryRef.current = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemChange() {
      if (theme === "system") {
        applyHtmlClassForTheme("system");
      }
    }

    mediaQueryRef.current.addEventListener("change", handleSystemChange);
    return () => {
      mediaQueryRef.current?.removeEventListener("change", handleSystemChange);
    };
  }, [theme, storageKey]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (next: Theme) => {
      setThemeState(next);
    },
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

