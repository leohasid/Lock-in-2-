"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Sparkles, Check } from "lucide-react";

interface Task {
  id: string;
  title: string;
  type: string;
  time: string;
  date: string;
  completed: boolean;
}

interface UpcomingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
}

export default function Home() {
  const pathname = usePathname();
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [calories, setCalories] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [daysClean, setDaysClean] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  const loadData = () => {
    if (typeof window === "undefined") return;

    // Tasks
    const reminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    const todayTasks = reminders.filter((r: Task) => r.type === "task" && r.date === todayStr);
    setTasks(todayTasks);

    // Calories
    const storedMeals = localStorage.getItem("meals");
    if (storedMeals) {
      try {
        const allMeals = JSON.parse(storedMeals);
        const todayMeals = allMeals.filter((m: { date?: string }) => m.date === todayStr);
        const total = todayMeals.reduce((sum: number, m: { calories?: number }) => sum + (m.calories || 0), 0);
        setCalories(total);
      } catch (_) {}
    }
    const goals = JSON.parse(localStorage.getItem("macroGoals") || "{}");
    if (goals.calories) setCalorieGoal(goals.calories);

    // Days clean (from addictions)
    const addictions = JSON.parse(localStorage.getItem("addictions") || "[]");
    if (addictions.length > 0) {
      const getDaysClean = (startDate: string) => {
        const start = new Date(startDate);
        const today = new Date();
        return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      };
      const maxDays = Math.max(...addictions.map((a: { startDate: string }) => getDaysClean(a.startDate)));
      setDaysClean(maxDays);
    } else {
      setDaysClean(null);
    }

    // Upcoming (today + tomorrow reminders, exclude tasks - or include all)
    const todayAndTomorrow = reminders.filter(
      (r: { date: string }) => r.date === todayStr || r.date === tomorrowStr
    );
    const sorted = todayAndTomorrow.sort((a: UpcomingItem, b: UpcomingItem) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return (a.time || "").localeCompare(b.time || "");
    });
    setUpcoming(sorted.slice(0, 4));
  };

  useEffect(() => {
    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const handleToggleTask = (taskId: string) => {
    const reminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    const updated = reminders.map((r: Task) =>
      r.id === taskId ? { ...r, completed: !r.completed } : r
    );
    localStorage.setItem("reminders", JSON.stringify(updated));
    setTasks(updated.filter((r: Task) => r.type === "task" && r.date === todayStr));
  };

  const tasksDone = tasks.filter((t) => t.completed).length;
  const tasksTotal = tasks.length;
  const caloriePct = calorieGoal > 0 ? Math.min((calories / calorieGoal) * 100, 100) : 0;

  const formatEventDate = (date: string, time: string) => {
    const d = new Date(date + (time ? "T" + time : ""));
    if (date === todayStr) return `Today at ${time || "All day"}`;
    if (date === tomorrowStr) return `Tomorrow at ${time || "All day"}`;
    return new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + (time ? ` at ${time}` : "");
  };

  const getHoursUntil = (date: string, time: string) => {
    if (date !== todayStr || !time) return null;
    const [h, m] = time.split(":").map(Number);
    const event = new Date();
    event.setHours(h || 0, m || 0, 0, 0);
    const diff = event.getTime() - Date.now();
    if (diff < 0) return null;
    return Math.round(diff / (1000 * 60 * 60));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto pb-24 px-5">
        {/* Tab Bar */}
        <div className="flex gap-2 mb-6 pt-4 border-b border-[#2A2A2A]">
          <Link
            href="/"
            className={`flex-1 py-2 font-semibold text-center text-sm ${
              pathname === "/" ? "text-[#00D9D9] border-b-2 border-[#00D9D9]" : "text-gray-500 hover:text-[#00D9D9]"
            }`}
          >
            Home
          </Link>
          <Link
            href="/goals"
            className={`flex-1 py-2 font-semibold text-center text-sm ${
              pathname === "/goals" ? "text-[#00D9D9] border-b-2 border-[#00D9D9]" : "text-gray-500 hover:text-[#00D9D9]"
            }`}
          >
            Goals
          </Link>
        </div>

        {/* AI Reflection */}
        <Link
          href="/consultation?from=reflection"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#00D9D9]/10 border border-[#00D9D9]/30 text-[#00D9D9] font-medium hover:bg-[#00D9D9]/20 transition-colors mb-6"
        >
          <Sparkles className="w-5 h-5" />
          AI Reflection
        </Link>

        {/* Quick Stats Row */}
        <p className="text-[11px] font-semibold text-[#666666] tracking-wider mb-3">QUICK STATS</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {/* Tasks */}
          <div className="rounded-xl bg-[#0F1419] border border-[#1F2937] p-4">
            <p className="text-[#00D9D9] font-bold text-2xl">{tasksDone}</p>
            <p className="text-[#888888] text-sm">/ {tasksTotal || 0}</p>
            <p className="text-[#888888] text-xs mt-1">Tasks done</p>
            <div className="flex gap-1.5 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < tasksDone ? "bg-[#00D9D9]" : "border border-[#444444] bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
          {/* Calories */}
          <div className="rounded-xl bg-[#0F1419] border border-[#1F2937] p-4">
            <p className="text-[#00D9D9] font-bold text-2xl">{calories.toLocaleString()}</p>
            <p className="text-[#888888] text-xs mt-1">Calories today</p>
            <div className="mt-2 h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-[#00D9D9] transition-all"
                style={{ width: `${caloriePct}%` }}
              />
            </div>
            <p className="text-[#666666] text-[10px] mt-1">/ {calorieGoal.toLocaleString()}</p>
          </div>
          {/* Days clean */}
          <div className="rounded-xl bg-[#0F1419] border border-[#1F2937] p-4">
            <p className="text-[#00D9D9] font-bold text-2xl">{daysClean ?? "—"}</p>
            <p className="text-[#888888] text-xs mt-1">Days clean</p>
            <div className="flex gap-1 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    daysClean !== null && i < Math.min(4, Math.floor(daysClean / 7) + 1)
                      ? "bg-[#00D9D9]"
                      : "bg-[#1A1A1A]"
                  }`}
                />
              ))}
            </div>
            {daysClean !== null && (
              <p className="text-[#666666] text-[9px] mt-1">
                Week {Math.min(5, Math.floor(daysClean / 7) + 1)}/5
              </p>
            )}
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-[#666666] tracking-wider">TODAY&apos;S TASKS</p>
          <span className="text-[11px] font-semibold text-[#00D9D9]">{tasksDone}/{tasksTotal}</span>
        </div>
        <div className="space-y-2 mb-4">
          {tasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 rounded-xl bg-[#0F1419] border border-[#1F2937] px-4 py-3"
            >
              <button
                onClick={() => handleToggleTask(task.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                  task.completed ? "bg-[#00D9D9] border-[#00D9D9]" : "border-[#00D9D9] bg-transparent"
                }`}
              >
                {task.completed && <Check className="w-5 h-5 text-black" strokeWidth={3} />}
              </button>
              <span
                className={`flex-1 text-[15px] ${
                  task.completed ? "text-[#555555] line-through" : "text-white"
                }`}
              >
                {task.title}
              </span>
              <span className={`text-xs ${task.completed ? "text-[#555555]" : "text-[#666666]"}`}>
                {task.completed ? "Done" : task.time || "—"}
              </span>
            </div>
          ))}
        </div>
        <Link
          href="/goals"
          className="block text-center text-[#00D9D9] text-sm font-medium mb-8"
        >
          View all tasks →
        </Link>

        {/* Upcoming */}
        <p className="text-[11px] font-semibold text-[#666666] tracking-wider mb-3">UPCOMING</p>
        <div className="space-y-2">
          {upcoming.slice(0, 3).map((item) => {
            const hoursUntil = getHoursUntil(item.date, item.time);
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl bg-[#0F1419] border border-[#1F2937] px-4 py-3"
              >
                <div
                  className={`w-1 h-9 rounded flex-shrink-0 ${
                    item.date === todayStr ? "bg-[#00D9D9]" : "bg-[#555555]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-[15px]">{item.title}</p>
                  <p className="text-[#666666] text-[13px]">{formatEventDate(item.date, item.time)}</p>
                </div>
                {hoursUntil !== null && (
                  <span className="text-[#00D9D9] text-xs">{hoursUntil}h</span>
                )}
              </div>
            );
          })}
        </div>
        {upcoming.length === 0 && (
          <p className="text-[#555555] text-sm py-4 text-center">No upcoming events</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
