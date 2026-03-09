"use client";

import { useEffect } from "react";
import {
  requestNotificationPermission,
  registerServiceWorker,
  scheduleDailyTasksSummaryNotification,
} from "@/app/utils/notifications";

export default function NotificationSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    requestNotificationPermission().then(() => {
      registerServiceWorker();
      scheduleDailyTasksSummaryNotification();
    });
  }, []);
  return null;
}
