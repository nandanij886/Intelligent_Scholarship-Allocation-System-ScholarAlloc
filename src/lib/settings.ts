import { useSyncExternalStore } from "react";

export interface AppSettings {
  baseUrl: string;
  mockMode: boolean;
  theme: "light" | "dark";
}
const KEY = "scholaralloc-settings";
const DEFAULTS: AppSettings = { baseUrl: "http://localhost:8080/api", mockMode: true, theme: "light" };

let cache: AppSettings | null = null;
const listeners = new Set<() => void>();

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  if (!cache) {
    try {
      cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
    } catch {
      cache = { ...DEFAULTS };
    }
  }
  return cache!;
}
export function updateSettings(patch: Partial<AppSettings>) {
  cache = { ...getSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}
export function useSettings(): AppSettings {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    getSettings,
    () => DEFAULTS,
  );
}
