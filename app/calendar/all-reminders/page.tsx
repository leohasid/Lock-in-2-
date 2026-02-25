"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Trash2, ArrowLeft, Check } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  type: "supplement" | "task" | "habit";
  time: string;
  date: string;
  completed: boolean;
  repeatFrequency?: string;
}

export default function AllRemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedReminders = localStorage.getItem("reminders");
    if (storedReminders) {
      try {
        const parsed = JSON.parse(storedReminders);
        setReminders(parsed);
      } catch (e) {
        console.error("Error loading reminders:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    localStorage.setItem("reminders", JSON.stringify(reminders));
  }, [reminders, isLoaded]);

  const parseTimeForSort = (time: string): number => {
    if (!time) return 0;
    const t = time.trim().toLowerCase();
    const pm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*pm$/);
    const am = t.match(/^(\d{1,2})(?::(\d{2}))?\s*am$/);
    const colon = t.match(/^(\d{1,2}):(\d{2})$/);
    if (pm) {
      let h = parseInt(pm[1], 10);
      if (h === 12) h = 0;
      const m = pm[2] ? parseInt(pm[2], 10) : 0;
      return (h + 12) * 60 + m;
    }
    if (am) {
      let h = parseInt(am[1], 10);
      if (h === 12) h = 0;
      const m = am[2] ? parseInt(am[2], 10) : 0;
      return h * 60 + m;
    }
    if (colon) {
      return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
    }
    return 0;
  };

  const todayReminders = reminders
    .filter((r) => r.date === todayStr)
    .sort((a, b) => parseTimeForSort(a.time) - parseTimeForSort(b.time));

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter((r) => r.id !== id));
  };

  const toggleComplete = (id: string) => {
    setReminders(
      reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const getReminderIcon = (type: Reminder["type"]) => {
    switch (type) {
      case "supplement":
        return "💊";
      case "task":
        return "•";
      case "habit":
        return "🔄";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/calendar"
            className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-white">Today&apos;s Reminders</h1>
          <div className="w-9" />
        </div>

        {todayReminders.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No reminders for today</p>
        ) : (
          <div className="space-y-2">
            {todayReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border border-white/10 ${
                  reminder.completed ? "opacity-50" : "bg-[#0c1422]/80"
                }`}
              >
                <button
                  onClick={() => toggleComplete(reminder.id)}
                  className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                    reminder.completed
                      ? "bg-teal-400 border-teal-400"
                      : "border-teal-400/50 bg-transparent"
                  }`}
                >
                  {reminder.completed && <Check className="w-4 h-4 text-black" strokeWidth={3} />}
                </button>
                <span className="text-base">{getReminderIcon(reminder.type)}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      reminder.completed ? "text-gray-500 line-through" : "text-white"
                    }`}
                  >
                    {reminder.title}
                  </p>
                  <p className="text-xs text-gray-500">{reminder.time}</p>
                </div>
                <button
                  onClick={() => deleteReminder(reminder.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
