// Notification utility for workout reminders and calendar

export async function requestNotificationPermission(): Promise<boolean> {
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
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const notificationTime = new Date(date);
  notificationTime.setHours(11, 45, 0, 0);
  const now = new Date();
  if (notificationTime <= now) notificationTime.setDate(notificationTime.getDate() + 1);

  const timeUntilNotification = notificationTime.getTime() - now.getTime();
  if (timeUntilNotification > 0 && timeUntilNotification < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      const todayStr = new Date().toISOString().split("T")[0];
      const workoutStatus = localStorage.getItem(`workout_${todayStr}`);
      const hasCompleted = localStorage.getItem(`workout_data_${todayStr}`);

      if (workoutStatus !== "completed" && !hasCompleted) {
        const opts: NotificationOptions & { vibrate?: number[] } = {
          body: `Don't forget your ${workoutName} workout today!`,
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          tag: `workout-${todayStr}`,
          requireInteraction: false,
        };
        if ("vibrate" in navigator) opts.vibrate = [200, 100, 200];
        new Notification("💪 Missed Workout Reminder", opts);
      }
    }, timeUntilNotification);
  }
}

export function cancelWorkoutNotification(date: Date): void {
  // Cancelled via completion check in scheduleWorkoutNotification
  void date;
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
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const parsed = parseTimeToMinutes(reminderTime);
  if (!parsed) return;

  const [y, m, d] = dateStr.split("-").map(Number);
  const notifyAt = new Date(y, m - 1, d, parsed.hours, parsed.minutes, 0, 0);
  const now = new Date();

  if (notifyAt <= now) return;

  const delayMs = notifyAt.getTime() - now.getTime();
  if (delayMs > 24 * 60 * 60 * 1000) return; // Don't schedule more than 24h ahead

  setTimeout(() => {
    const opts: NotificationOptions & { vibrate?: number[] } = {
      body: taskTitle,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      tag: `task-${taskId}-${dateStr}`,
      requireInteraction: false,
    };
    if ("vibrate" in navigator) opts.vibrate = [200, 100, 200];
    new Notification("🔔 Task Reminder", opts);
  }, delayMs);
}

/** Reschedule all today's task reminders */
export function rescheduleTodayTaskReminders(tasks: {
  id: string;
  title: string;
  date: string;
  reminderTime?: string;
  reminderTimes?: string[];
}[]): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const todayStr = new Date().toISOString().split("T")[0];
  tasks
    .filter((t) => t.date === todayStr)
    .forEach((t) => {
      const times = t.reminderTimes ?? (t.reminderTime ? [t.reminderTime] : []);
      times.forEach((time) => scheduleTaskReminder(t.id, t.title, t.date, time));
    });
}

export async function showWorkoutReminder(workoutName: string): Promise<void> {
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
