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
