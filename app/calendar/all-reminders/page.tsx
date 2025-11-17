"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Trash2, ArrowLeft, Calendar } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  type: "supplement" | "task" | "habit";
  time: string;
  date: string; // ISO date string (YYYY-MM-DD)
  completed: boolean;
  repeatFrequency?: string; // e.g., "daily", "weekly", "every 3 days", etc.
}

export default function AllRemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load reminders from localStorage on mount
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

  // Save reminders to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    localStorage.setItem("reminders", JSON.stringify(reminders));
  }, [reminders, isLoaded]);

  const deleteReminder = (id: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      setReminders(reminders.filter((r) => r.id !== id));
    }
  };

  const deleteAllReminders = (title: string, type: Reminder["type"]) => {
    const count = reminders.filter((r) => r.title === title && r.type === type).length;
    if (confirm(`Are you sure you want to delete ALL "${title}" reminders? This will remove ${count} instance${count !== 1 ? "s" : ""}.`)) {
      setReminders(reminders.filter((r) => !(r.title === title && r.type === type)));
    }
  };

  const getReminderIcon = (type: Reminder["type"]) => {
    switch (type) {
      case "supplement":
        return "💊";
      case "task":
        return "✅";
      case "habit":
        return "🔄";
    }
  };

  // Group reminders by title and type to show only unique reminders
  const uniqueReminders = reminders.reduce((acc, reminder) => {
    const key = `${reminder.title}-${reminder.type}`;
    if (!acc[key]) {
      acc[key] = {
        reminder: reminder,
        count: 0,
        dates: [] as string[],
        hasDaily: false,
      };
    }
    acc[key].count++;
    if (!acc[key].dates.includes(reminder.date)) {
      acc[key].dates.push(reminder.date);
    }
    if (reminder.repeatFrequency && 
        (reminder.repeatFrequency.toLowerCase().includes("daily") || 
         reminder.repeatFrequency.toLowerCase().includes("every day") ||
         reminder.repeatFrequency.toLowerCase() === "day")) {
      acc[key].hasDaily = true;
    }
    return acc;
  }, {} as Record<string, { reminder: Reminder; count: number; dates: string[]; hasDaily: boolean }>);

  // Convert to array and sort by title
  const uniqueRemindersList = Object.values(uniqueReminders).sort((a, b) => 
    a.reminder.title.localeCompare(b.reminder.title)
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-4xl font-bold text-white">All Reminders</h1>
          </div>
          <p className="text-gray-400">Manage and delete your reminders</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-white mb-2">{reminders.length}</div>
            <div className="text-gray-400">Total Instances</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-white mb-2">
              {reminders.filter((r) => r.completed).length}
            </div>
            <div className="text-gray-400">Completed</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-white mb-2">
              {uniqueRemindersList.length}
            </div>
            <div className="text-gray-400">Unique Reminders</div>
          </div>
        </div>

        {/* Unique Reminders List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Your Reminders</h2>
          {uniqueRemindersList.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center">
              <p className="text-gray-400 text-lg">No reminders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {uniqueRemindersList.map((item) => {
                const { reminder, count, dates, hasDaily } = item;
                const sortedDates = dates.sort();
                const firstDate = new Date(sortedDates[0]);
                const lastDate = new Date(sortedDates[sortedDates.length - 1]);

                return (
                  <div key={`${reminder.title}-${reminder.type}`} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{getReminderIcon(reminder.type)}</div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">{reminder.title}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-gray-400 text-sm">
                              {count} instance{count !== 1 ? "s" : ""}
                            </p>
                            {reminder.repeatFrequency && (
                              <span className="text-orange-400 text-sm">
                                • Repeats: {reminder.repeatFrequency}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <p className="text-gray-500 text-xs">
                              {firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {sortedDates.length > 1 && (
                                <span> - {lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              )}
                            </p>
                            <span className="text-gray-500">•</span>
                            <p className="text-gray-500 text-xs">{reminder.time}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteAllReminders(reminder.title, reminder.type)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete All
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}

