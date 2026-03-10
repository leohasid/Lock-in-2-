// Notification utility for workout reminders and calendar
// When running in iOS Mogifi Ai app (WKWebView), uses native bridge for local notifications
// that fire even when app is backgrounded. Otherwise uses Web Notifications API.

export interface NotificationSettings {
  workoutReminderTime: string; // "11:45" (HH:mm)
  workoutReminderTitle: string;
  workoutReminderMessage: string; // Use {workoutName} as placeholder
  taskReminderTitle: string;
  dailySummaryTime: string; // "09:00" (HH:mm) - when to remind about today's tasks
  dailySummaryTitle: string;
  dailySummaryMessage: string; // Use {count} and {nextTask} as placeholders
  gymScheduleTime: string; // "18:00" (HH:mm) - when user plans to work out (for 1hr before/after reminders)
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  workoutReminderTime: "11:45",
  workoutReminderTitle: "💪 Missed Workout Reminder",
  workoutReminderMessage: "Don't forget your {workoutName} workout today!",
  taskReminderTitle: "🔔 Task Reminder",
  dailySummaryTime: "09:00",
  dailySummaryTitle: "📋 Today's Schedule",
  dailySummaryMessage: "You have {count} task(s) outstanding today. {nextTask}",
  gymScheduleTime: "18:00",
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const stored = localStorage.getItem("notificationSettings");
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NotificationSettings>;
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
    }
  } catch (_) {}
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function setNotificationSettings(settings: Partial<NotificationSettings>): void {
  if (typeof window === "undefined") return;
  const current = getNotificationSettings();
  const merged = { ...current, ...settings };
  localStorage.setItem("notificationSettings", JSON.stringify(merged));
}

// Check if we're in the iOS app with native notification bridge
function isNativeNotificationBridgeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { webkit?: { messageHandlers?: { mogifiNotifications?: unknown } } };
  return !!(w.webkit?.messageHandlers?.mogifiNotifications);
}

// Schedule via native iOS bridge (fires when app is backgrounded)
function scheduleViaNativeBridge(
  id: string,
  title: string,
  body: string,
  triggerAtMs: number | null
): void {
  const w = window as Window & { webkit?: { messageHandlers?: { mogifiNotifications?: { postMessage: (msg: unknown) => void } } } };
  const handler = w.webkit?.messageHandlers?.mogifiNotifications;
  if (!handler) return;
  handler.postMessage({
    action: "schedule",
    id,
    title,
    body,
    triggerAt: triggerAtMs,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  // Native iOS app: permission is requested by the app on load; assume granted when bridge exists
  if (isNativeNotificationBridgeAvailable()) return true;

  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.log("Service Worker not supported");
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

export function scheduleWorkoutNotification(date: Date, workoutName: string): void {
  const useNative = isNativeNotificationBridgeAvailable();
  if (!useNative && (!("Notification" in window) || Notification.permission !== "granted")) return;

  const settings = getNotificationSettings();
  const [h, m] = (settings.workoutReminderTime || "11:45").split(":").map((x) => parseInt(x, 10) || 0);

  const notificationTime = new Date(date);
  notificationTime.setHours(h, m, 0, 0);
  const now = new Date();
  if (notificationTime <= now) notificationTime.setDate(notificationTime.getDate() + 1);

  const timeUntilNotification = notificationTime.getTime() - now.getTime();
  if (timeUntilNotification > 0 && timeUntilNotification < 24 * 60 * 60 * 1000) {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const todayStr = `${y}-${mo}-${d}`;
    const id = `workout-${todayStr}`;

    const throttleKey = "workout_notification_last_scheduled";
    const throttleMs = 5 * 60 * 1000;
    if (typeof window !== "undefined") {
      const last = localStorage.getItem(throttleKey);
      if (last) {
        const elapsed = Date.now() - parseInt(last, 10);
        if (elapsed < throttleMs) return;
      }
      localStorage.setItem(throttleKey, String(Date.now()));
    }

    const title = settings.workoutReminderTitle || "💪 Missed Workout Reminder";
    const body = (settings.workoutReminderMessage || "Don't forget your {workoutName} workout today!").replace(
      "{workoutName}",
      workoutName
    );

    if (useNative) {
      // Native iOS: schedule for future time - fires even when app is backgrounded
      scheduleViaNativeBridge(id, title, body, notificationTime.getTime());
    } else {
      setTimeout(() => {
        const workoutStatus = localStorage.getItem(`workout_${todayStr}`);
        const hasCompleted = localStorage.getItem(`workout_data_${todayStr}`);
        if (workoutStatus !== "completed" && !hasCompleted) {
          const opts: NotificationOptions & { vibrate?: number[] } = {
            body,
            icon: "/icon-192x192.png",
            badge: "/icon-192x192.png",
            tag: id,
            requireInteraction: false,
          };
          if ("vibrate" in navigator) opts.vibrate = [200, 100, 200];
          new Notification(title, opts);
        }
      }, timeUntilNotification);
    }
  }
}

export function cancelWorkoutNotification(date: Date): void {
  // Cancelled via completion check in scheduleWorkoutNotification
  void date;
}

/** Schedule 1 hour before planned gym time - "Your {workoutName} workout is in 1 hour!" */
export function scheduleGym1HourBeforeNotification(date: Date, workoutName: string): void {
  const useNative = isNativeNotificationBridgeAvailable();
  if (!useNative && (!("Notification" in window) || Notification.permission !== "granted")) return;

  const settings = getNotificationSettings();
  const gymTimeStr = settings.gymScheduleTime || "18:00";
  const [h, m] = gymTimeStr.split(":").map((x) => parseInt(x, 10) || 0);

  const gymTime = new Date(date);
  gymTime.setHours(h, m, 0, 0);
  const oneHourBefore = new Date(gymTime.getTime() - 60 * 60 * 1000);
  const now = new Date();

  if (oneHourBefore <= now) return;
  const delayMs = oneHourBefore.getTime() - now.getTime();
  if (delayMs > 24 * 60 * 60 * 1000) return;

  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${mo}-${d}`;
  const id = `gym-1hr-before-${dateStr}`;

  const title = "💪 Gym in 1 hour";
  const body = `Your ${workoutName} workout is coming up! Time to get ready.`;

  if (useNative) {
    scheduleViaNativeBridge(id, title, body, oneHourBefore.getTime());
  } else {
    setTimeout(() => {
      const workoutStatus = localStorage.getItem(`workout_${dateStr}`);
      const hasCompleted = localStorage.getItem(`workout_data_${dateStr}`);
      if (workoutStatus !== "completed" && !hasCompleted) {
        const opts: NotificationOptions & { vibrate?: number[] } = {
          body,
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          tag: id,
          requireInteraction: false,
        };
        if ("vibrate" in navigator) opts.vibrate = [200, 100, 200];
        new Notification(title, opts);
      }
    }, delayMs);
  }
}

/** Schedule 1 hour after planned gym time - "Have you been to the gym today?" (only if not started) */
export function scheduleGym1HourAfterNotification(date: Date, workoutName: string): void {
  const useNative = isNativeNotificationBridgeAvailable();
  if (!useNative && (!("Notification" in window) || Notification.permission !== "granted")) return;

  const settings = getNotificationSettings();
  const gymTimeStr = settings.gymScheduleTime || "18:00";
  const [h, m] = gymTimeStr.split(":").map((x) => parseInt(x, 10) || 0);

  const gymTime = new Date(date);
  gymTime.setHours(h, m, 0, 0);
  const oneHourAfter = new Date(gymTime.getTime() + 60 * 60 * 1000);
  const now = new Date();

  if (oneHourAfter <= now) return;
  const delayMs = oneHourAfter.getTime() - now.getTime();
  if (delayMs > 24 * 60 * 60 * 1000) return;

  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${mo}-${d}`;
  const id = `gym-1hr-after-${dateStr}`;

  const title = "💪 Have you been to the gym?";
  const body = `Don't forget your ${workoutName} workout today! It's not too late to get it in.`;

  if (useNative) {
    scheduleViaNativeBridge(id, title, body, oneHourAfter.getTime());
  } else {
    setTimeout(() => {
      const workoutStatus = localStorage.getItem(`workout_${dateStr}`);
      const hasCompleted = localStorage.getItem(`workout_data_${dateStr}`);
      if (workoutStatus !== "completed" && !hasCompleted) {
        const opts: NotificationOptions & { vibrate?: number[] } = {
          body,
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          tag: id,
          requireInteraction: false,
        };
        if ("vibrate" in navigator) opts.vibrate = [200, 100, 200];
        new Notification(title, opts);
      }
    }, delayMs);
  }
}

/** Parse time string (e.g. "14:00", "2pm", "6pm") to hours and minutes */
function parseTimeToMinutes(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const t = timeStr.trim().toLowerCase();
  const pmMatch = t.match(/^(\d{1,2})(?::(\d{2}))?\s*pm$/);
  const amMatch = t.match(/^(\d{1,2})(?::(\d{2}))?\s*am$/);
  const colonMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (pmMatch) {
    let h = parseInt(pmMatch[1], 10);
    if (h === 12) h = 0;
    const m = pmMatch[2] ? parseInt(pmMatch[2], 10) : 0;
    return { hours: h + 12, minutes: m };
  }
  if (amMatch) {
    let h = parseInt(amMatch[1], 10);
    if (h === 12) h = 0;
    const m = amMatch[2] ? parseInt(amMatch[2], 10) : 0;
    return { hours: h, minutes: m };
  }
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { hours: h, minutes: m };
  }
  return null;
}

/** Schedule a push notification for a task at a specific time today */
export function scheduleTaskReminder(
  taskId: string,
  taskTitle: string,
  dateStr: string,
  reminderTime: string
): void {
  const useNative = isNativeNotificationBridgeAvailable();
  if (!useNative && (!("Notification" in window) || Notification.permission !== "granted")) return;

  const parsed = parseTimeToMinutes(reminderTime);
  if (!parsed) return;

  const [y, m, d] = dateStr.split("-").map(Number);
  const notifyAt = new Date(y, m - 1, d, parsed.hours, parsed.minutes, 0, 0);
  const now = new Date();

  if (notifyAt <= now) return;

  const delayMs = notifyAt.getTime() - now.getTime();
  if (delayMs > 24 * 60 * 60 * 1000) return; // Don't schedule more than 24h ahead

  const id = `task-${taskId}-${dateStr}-${reminderTime.replace(/:/g, "")}`;
  const taskTitleSetting = getNotificationSettings().taskReminderTitle || "🔔 Task Reminder";

  if (useNative) {
    scheduleViaNativeBridge(id, taskTitleSetting, taskTitle, notifyAt.getTime());
  } else {
    setTimeout(() => {
      const opts: NotificationOptions & { vibrate?: number[] } = {
        body: taskTitle,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: id,
        requireInteraction: false,
      };
      if ("vibrate" in navigator) opts.vibrate = [200, 100, 200];
      new Notification(taskTitleSetting, opts);
    }, delayMs);
  }
}

/** Schedule a daily summary notification about today's outstanding tasks */
export function scheduleDailyTasksSummaryNotification(): void {
  const useNative = isNativeNotificationBridgeAvailable();
  if (!useNative && (!("Notification" in window) || Notification.permission !== "granted")) return;

  const todayStr = new Date().toISOString().split("T")[0];
  let reminders: { title: string; time: string; completed?: boolean }[] = [];
  try {
    const stored = localStorage.getItem("reminders");
    if (stored) reminders = JSON.parse(stored);
  } catch (_) {}

  const todayItems = reminders.filter(
    (r: { date?: string; completed?: boolean }) => r.date === todayStr && !r.completed
  );
  if (todayItems.length === 0) return;

  const settings = getNotificationSettings();
  const [h, m] = (settings.dailySummaryTime || "09:00").split(":").map((x) => parseInt(x, 10) || 0);

  const notifyAt = new Date();
  notifyAt.setHours(h, m, 0, 0);
  const now = new Date();
  if (notifyAt <= now) return; // Already past today's summary time

  const delayMs = notifyAt.getTime() - now.getTime();
  if (delayMs > 24 * 60 * 60 * 1000) return;

  const count = todayItems.length;
  const sorted = [...todayItems].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const next = sorted[0];
  const nextTask = next
    ? `${next.title}${next.time ? ` at ${formatTimeForDisplay(next.time)}` : ""}`
    : "";

  const title = settings.dailySummaryTitle || "📋 Today's Schedule";
  let body = (settings.dailySummaryMessage || "You have {count} task(s) outstanding today. {nextTask}")
    .replace("{count}", String(count))
    .replace("{nextTask}", nextTask ? `Next: ${nextTask}` : "");

  if (!body.trim()) body = `You have ${count} task(s) outstanding today.`;

  const id = `daily-summary-${todayStr}`;

  if (useNative) {
    scheduleViaNativeBridge(id, title, body, notifyAt.getTime());
  } else {
    setTimeout(() => {
      const opts: NotificationOptions & { vibrate?: number[] } = {
        body,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: id,
        requireInteraction: false,
      };
      if ("vibrate" in navigator) opts.vibrate = [200, 100, 200];
      new Notification(title, opts);
    }, delayMs);
  }
}

function formatTimeForDisplay(time: string): string {
  if (!time) return "";
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  const hour = parseInt(match[1], 10);
  const min = match[2];
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return min === "00" ? `${h12}${ampm}` : `${h12}:${min}${ampm}`;
}

/** Reschedule all today's task reminders. Uses reminderTimes, reminderTime, or task time. */
export function rescheduleTodayTaskReminders(tasks: {
  id: string;
  title: string;
  date: string;
  time?: string;
  reminderTime?: string;
  reminderTimes?: string[];
}[]): void {
  const useNative = isNativeNotificationBridgeAvailable();
  if (!useNative && (!("Notification" in window) || Notification.permission !== "granted")) return;
  const todayStr = new Date().toISOString().split("T")[0];
  tasks
    .filter((t) => t.date === todayStr)
    .forEach((t) => {
      const times =
        t.reminderTimes ??
        (t.reminderTime ? [t.reminderTime] : t.time ? [t.time] : []);
      times.forEach((time) => scheduleTaskReminder(t.id, t.title, t.date, time));
    });
}

export async function showWorkoutReminder(workoutName: string): Promise<void> {
  const useNative = isNativeNotificationBridgeAvailable();
  if (useNative) {
    scheduleViaNativeBridge(
      `workout-reminder-${Date.now()}`,
      "💪 Workout Reminder",
      `Time for your ${workoutName} workout! Don't forget to complete it.`,
      null
    );
    return;
  }

  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;
  }

  const notificationOptions: NotificationOptions = {
    body: `Time for your ${workoutName} workout! Don't forget to complete it.`,
    tag: "workout-reminder",
    requireInteraction: false,
  };

  try {
    notificationOptions.icon = "/icon-192x192.png";
    notificationOptions.badge = "/icon-192x192.png";
  } catch {
    // Icons optional
  }

  if ("vibrate" in navigator) {
    (notificationOptions as NotificationOptions & { vibrate?: number[] }).vibrate = [200, 100, 200];
  }

  new Notification("💪 Workout Reminder", notificationOptions);
}

/** Show an immediate notification. Uses native bridge on iOS so it works in WebView. */
export function showImmediateNotification(title: string, body: string): void {
  if (isNativeNotificationBridgeAvailable()) {
    scheduleViaNativeBridge(`immediate-${Date.now()}`, title, body, null);
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, tag: `immediate-${Date.now()}` });
  }
}
