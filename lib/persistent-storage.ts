/**
 * Persistent storage for onboarding/subscription state.
 * - In Mogifi iOS app: uses native UserDefaults via mogifiStorage bridge - GUARANTEED to persist
 * - In Capacitor app: uses Capacitor Preferences (UserDefaults/SharedPreferences)
 * - In browser: uses localStorage
 */
import { Preferences } from "@capacitor/preferences";

const ONBOARDING_KEYS = [
  "onboardingCompleted",
  "onboardingData",
  "subscriptionStatus",
  "subscriptionPlan",
  "subscriptionDate",
] as const;

// Mogifi iOS app has native storage bridge (UserDefaults) - most reliable
function isMogifiNativeStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { MogifiNativeStorage?: { get: (k: string) => Promise<string>; set: (k: string, v: string) => void } };
  return !!(w.MogifiNativeStorage?.get && w.MogifiNativeStorage?.set);
}

export async function get(key: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (isMogifiNativeStorageAvailable()) {
    const w = window as Window & { MogifiNativeStorage: { get: (k: string) => Promise<string> } };
    const v = await w.MogifiNativeStorage.get(key);
    return v || null;
  }
  try {
    const { value } = await Preferences.get({ key });
    return value;
  } catch {
    return localStorage.getItem(key);
  }
}

export async function set(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (isMogifiNativeStorageAvailable()) {
    const w = window as Window & { MogifiNativeStorage: { set: (k: string, v: string) => void } };
    w.MogifiNativeStorage.set(key, value);
    return;
  }
  try {
    await Preferences.set({ key, value });
  } catch {
    localStorage.setItem(key, value);
  }
}

export async function remove(key: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (isMogifiNativeStorageAvailable()) {
    const w = window as Window & { MogifiNativeStorage: { set: (k: string, v: string) => void } };
    w.MogifiNativeStorage.set(key, "");
    return;
  }
  try {
    await Preferences.remove({ key });
  } catch {
    localStorage.removeItem(key);
  }
}

/**
 * Migrate localStorage to native storage when in Mogifi app (first load after update)
 */
export async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  if (isMogifiNativeStorageAvailable()) {
    const w = window as Window & { MogifiNativeStorage: { get: (k: string) => Promise<string>; set: (k: string, v: string) => void } };
    for (const key of ONBOARDING_KEYS) {
      const existing = await w.MogifiNativeStorage.get(key);
      if (!existing) {
        const localValue = localStorage.getItem(key);
        if (localValue) w.MogifiNativeStorage.set(key, localValue);
      }
    }
    return;
  }
  try {
    for (const key of ONBOARDING_KEYS) {
      const localValue = localStorage.getItem(key);
      if (localValue) {
        const { value } = await Preferences.get({ key });
        if (!value) await Preferences.set({ key, value: localValue });
      }
    }
  } catch {
    // Ignore
  }
}
