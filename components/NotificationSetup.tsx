"use client";

import { useEffect } from "react";
import { requestNotificationPermission, registerServiceWorker } from "@/app/utils/notifications";

export default function NotificationSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    requestNotificationPermission().then(() => {
      registerServiceWorker();
    });
  }, []);
  return null;
}
