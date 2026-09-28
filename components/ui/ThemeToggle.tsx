"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/ui/Icons";

const STORAGE_KEY = "theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getIsDark = () => document.documentElement.classList.contains("dark");
const getServerIsDark = () => false;

function hasStoredPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const isDark = useSyncExternalStore(subscribe, getIsDark, getServerIsDark);

  // Dopóki użytkownik nie wybrał motywu ręcznie, podążamy za ustawieniem systemu.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (!hasStoredPreference()) {
        document.documentElement.classList.toggle("dark", query.matches);
      }
    };
    query.addEventListener("change", onSystemChange);
    return () => query.removeEventListener("change", onSystemChange);
  }, []);

  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Brak dostępu do localStorage: motyw działa do końca sesji strony.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      title={isDark ? "Jasny motyw" : "Ciemny motyw"}
      className={`grid h-9 w-9 place-items-center rounded-full transition ${className}`.trim()}
    >
      {isDark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
