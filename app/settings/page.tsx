"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import {
  getNotificationSettings,
  setNotificationSettings,
  type NotificationSettings,
} from "@/app/utils/notifications";
import { ArrowLeft, Bell } from "lucide-react";

export default function SettingsPage() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    setSettings(getNotificationSettings());
  }, []);

  const handleSave = () => {
    if (!settings) return;
    setNotificationSettings(settings);
    alert("Notification settings saved!");
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Tab Bar - Home | Goals */}
        <div className="flex gap-1 mb-6 pt-4 bg-white/5 border border-white/8 rounded-2xl p-1">
          <Link href="/" className="flex-1 py-2.5 text-center text-sm font-semibold text-gray-500 hover:text-gray-300 rounded-xl transition-colors">
            Home
          </Link>
          <Link href="/goals" className="flex-1 py-2.5 text-center text-sm font-semibold text-gray-500 hover:text-gray-300 rounded-xl transition-colors">
            Goals
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Notification Settings</h1>
        </div>

        {/* Notification Settings */}
        <div className="rounded-2xl bg-[#0c1422] border border-white/8 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold">Notification Settings</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Choose when and what your notifications say for workouts and tasks.
          </p>

          <div className="space-y-4">
            {/* Planned gym time - for 1hr before/after reminders */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Planned gym time
              </label>
              <input
                type="time"
                value={settings.gymScheduleTime ?? "18:00"}
                onChange={(e) =>
                  setSettings({ ...settings, gymScheduleTime: e.target.value })
                }
                className="w-full bg-white/5 border border-white/8 rounded-lg p-3 text-white focus:outline-none focus:border-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                When you plan to work out (1hr before &amp; 1hr after reminders use this)
              </p>
            </div>

            {/* Workout reminder time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Workout reminder time
              </label>
              <input
                type="time"
                value={settings.workoutReminderTime}
                onChange={(e) =>
                  setSettings({ ...settings, workoutReminderTime: e.target.value })
                }
                className="w-full bg-white/5 border border-white/8 rounded-lg p-3 text-white focus:outline-none focus:border-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                When to remind you about today&apos;s workout (e.g. 11:45 AM)
              </p>
            </div>

            {/* Workout reminder title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Workout notification title
              </label>
              <input
                type="text"
                value={settings.workoutReminderTitle}
                onChange={(e) =>
                  setSettings({ ...settings, workoutReminderTitle: e.target.value })
                }
                placeholder="💪 Missed Workout Reminder"
                className="w-full bg-white/5 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Workout reminder message */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Workout notification message
              </label>
              <input
                type="text"
                value={settings.workoutReminderMessage}
                onChange={(e) =>
                  setSettings({ ...settings, workoutReminderMessage: e.target.value })
                }
                placeholder="Don't forget your {workoutName} workout today!"
                className="w-full bg-white/5 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {"{workoutName}"} where the workout name should appear
              </p>
            </div>

            {/* Task reminder title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Task reminder title
              </label>
              <input
                type="text"
                value={settings.taskReminderTitle}
                onChange={(e) =>
                  setSettings({ ...settings, taskReminderTitle: e.target.value })
                }
                placeholder="🔔 Task Reminder"
                className="w-full bg-white/5 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Title for schedule task reminders (the task name appears as the message)
              </p>
            </div>

            {/* Daily tasks summary - divider */}
            <div className="pt-4 mt-4 border-t border-white/8">
              <p className="text-sm font-medium text-teal-400 mb-3">📋 Daily tasks reminder</p>
              <p className="text-xs text-gray-500 mb-3">
                A morning notification summarizing your outstanding tasks (e.g. &quot;You have 4 tasks outstanding. Next: Meeting at 2pm&quot;)
              </p>
            </div>

            {/* Daily summary time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Daily summary time
              </label>
              <input
                type="time"
                value={settings.dailySummaryTime}
                onChange={(e) =>
                  setSettings({ ...settings, dailySummaryTime: e.target.value })
                }
                className="w-full bg-white/5 border border-white/8 rounded-lg p-3 text-white focus:outline-none focus:border-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                When to remind you about today&apos;s tasks (e.g. 9:00 AM)
              </p>
            </div>

            {/* Daily summary title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Daily summary title
              </label>
              <input
                type="text"
                value={settings.dailySummaryTitle}
                onChange={(e) =>
                  setSettings({ ...settings, dailySummaryTitle: e.target.value })
                }
                placeholder="📋 Today's Schedule"
                className="w-full bg-white/5 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Daily summary message */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Daily summary message
              </label>
              <input
                type="text"
                value={settings.dailySummaryMessage}
                onChange={(e) =>
                  setSettings({ ...settings, dailySummaryMessage: e.target.value })
                }
                placeholder="You have {count} task(s) outstanding today. {nextTask}"
                className="w-full bg-white/5 border border-white/8 rounded-lg p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {"{count}"} for number of tasks, {"{nextTask}"} for &quot;Next: Meeting at 2pm&quot; etc.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="mt-6 w-full py-3 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black font-bold rounded-xl transition-all"
          >
            Save Settings
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
