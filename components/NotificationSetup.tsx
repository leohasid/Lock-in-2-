"use client";

import { useEffect } from "react";
import {
  requestNotificationPermission,
  registerServiceWorker,
  scheduleDailyTasksSummaryNotification,
  rescheduleTodayTaskReminders,
} from "@/app/utils/notifications";

export default function NotificationSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    requestNotificationPermission().then(() => {
      registerServiceWorker();
      scheduleDailyTasksSummaryNotification();
      try {
        const stored = localStorage.getItem("reminders");
        if (stored) {
          const reminders = JSON.parse(stored);
          rescheduleTodayTaskReminders(reminders);
        }
      } catch (_) {}
    });
  }, []);
  return null;
}
