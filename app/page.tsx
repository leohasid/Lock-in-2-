"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

interface UpcomingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
}

function getDaysClean(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

function MacroCircle({
  label,
  current,
  goal,
  unit,
  progressColor,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  progressColor: string;
}) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const size = 64;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#1e293b"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={progressColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-sm leading-tight">
            {current}{unit}
          </span>
          <span className="text-white text-[10px]">/{goal}{unit}</span>
        </div>
      </div>
      <span className="text-white text-[10px] mt-1.5">{label}</span>
      <span className="text-[10px] mt-0.5" style={{ color: "#8FA3B0" }}>
        {goal}{unit === "" ? " cal" : unit}
      </span>
    </div>
  );
}

export default function Home() {
  const todayStr = new Date().toISOString().split("T")[0];

  const [firstName, setFirstName] = useState("Leo");
  const [nutrition, setNutrition] = useState({
    calories: { consumed: 0, goal: 2000 },
    protein: { consumed: 0, goal: 150 },
    carbs: { consumed: 0, goal: 200 },
    fat: { consumed: 0, goal: 65 },
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingItem[]>([]);
  const [daysClean, setDaysClean] = useState<number>(0);
  const [todayWorkout, setTodayWorkout] = useState<{ name: string; time: string } | null>(null);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const loadData = () => {
    if (typeof window === "undefined") return;

    const name = localStorage.getItem("userName");
    if (name) setFirstName(name);

    const goals = JSON.parse(localStorage.getItem("macroGoals") || "{}");
    let consumed = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const storedMeals = localStorage.getItem("meals");
    if (storedMeals) {
      try {
        const allMeals = JSON.parse(storedMeals);
        const todayMeals = allMeals.filter((m: { date?: string }) => m.date === todayStr);
        consumed = todayMeals.reduce(
          (acc: { calories: number; protein: number; carbs: number; fats: number }, m: any) => ({
            calories: acc.calories + (m.calories || 0),
            protein: acc.protein + (m.protein || 0),
            carbs: acc.carbs + (m.carbs || 0),
            fats: acc.fats + (m.fats || 0),
          }),
          consumed
        );
      } catch (_) {}
    }
    setNutrition({
      calories: { consumed: consumed.calories, goal: goals.calories ?? 2000 },
      protein: { consumed: consumed.protein, goal: goals.protein ?? 150 },
      carbs: { consumed: consumed.carbs, goal: goals.carbs ?? 200 },
      fat: { consumed: consumed.fats, goal: goals.fats ?? 65 },
    });

    const reminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    const todayReminders = reminders
      .filter((r: { date: string }) => r.date === todayStr)
      .sort((a: UpcomingItem, b: UpcomingItem) => (a.time || "").localeCompare(b.time || ""));
    setUpcomingEvents(todayReminders.slice(0, 4));

    const addictions = JSON.parse(localStorage.getItem("addictions") || "[]");
    if (addictions.length > 0) {
      const days = addictions.map((a: { startDate?: string }) =>
        a.startDate ? getDaysClean(a.startDate) : 0
      );
      setDaysClean(Math.min(...days));
    } else {
      setDaysClean(0);
    }

    const schedule = JSON.parse(localStorage.getItem("workoutSchedule") || "[]");
    const todayEntry = schedule.find((w: { date: string }) => w.date === todayStr);
    if (todayEntry && todayEntry.workoutName && todayEntry.workoutName !== "Rest Day") {
      const firstReminder = todayReminders.find(
        (r: { title?: string }) =>
          r.title &&
          (r.title.toLowerCase().includes("workout") ||
            r.title.toLowerCase().includes("gym") ||
            r.title.toLowerCase().includes("upper") ||
            r.title.toLowerCase().includes("push") ||
            r.title.toLowerCase().includes("pull") ||
            r.title.toLowerCase().includes("legs"))
      );
      const time = firstReminder?.time || "6pm";
      const formattedTime = time.includes(":")
        ? (() => {
            const [h, m] = time.split(":");
            const hour = parseInt(h, 10);
            const ampm = hour >= 12 ? "pm" : "am";
            const h12 = hour % 12 || 12;
            return m === "00" ? `${h12}${ampm}` : `${h12}:${m}${ampm}`;
          })()
        : time;
      setTodayWorkout({
        name: todayEntry.workoutName.replace(" Day", ""),
        time: formattedTime,
      });
    } else {
      setTodayWorkout(null);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const formatTime = (time: string) => {
    if (!time) return "6pm";
    if (time.length <= 2) return `${time}pm`;
    if (time.includes(":")) {
      const [h, m] = time.split(":");
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "pm" : "am";
      const h12 = hour % 12 || 12;
      return m === "00" ? `${h12}${ampm}` : `${h12}:${m}${ampm}`;
    }
    return time;
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#0B0F14" }}>
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Header */}
        <header className="mb-5">
          <h1 className="text-[26px] font-bold text-white leading-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-1" style={{ color: "#8FA3B0" }}>Lock in. One day at a time.</p>
        </header>

        {/* AI Reflection - text only with ✨, match photo */}
        <Link
          href="/consultation?from=reflection"
          className="block rounded-[18px] p-5 mb-6 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#0F766E" }}
        >
          <p className="text-lg font-semibold" style={{ color: "#E6FFFA" }}>
            ✨ AI Reflection
          </p>
          <p className="mt-1 flex items-center justify-between" style={{ color: "#99F6E4" }}>
            <span>Review yesterday • Set today</span>
            <span>&gt;</span>
          </p>
        </Link>

        {/* Today at a glance - single card, row + progress bars */}
        <div
          className="rounded-[18px] p-4 mb-5"
          style={{ backgroundColor: "#121826" }}
        >
          <p className="text-xs uppercase mb-2.5" style={{ color: "#8FA3B0" }}>
            Today at a glance
          </p>
          <div className="flex justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm">
                🛡 {daysClean} days clean
              </p>
              <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ backgroundColor: "#1e293b" }}>
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min((daysClean / 30) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm">
                🏋️ {todayWorkout ? `${todayWorkout.name} – ${formatTime(todayWorkout.time)}` : "Rest day"}
              </p>
              <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ backgroundColor: "#1e293b" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: todayWorkout ? "33%" : "0%",
                    backgroundColor: "#64748b",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Today's macros - circular progress + Log food link */}
        <div
          className="rounded-[18px] p-4 mb-5"
          style={{ backgroundColor: "#121826" }}
        >
          <p className="text-xs uppercase mb-4" style={{ color: "#8FA3B0" }}>
            Today&apos;s macros
          </p>
          <div className="flex justify-between gap-2 mb-4">
            <MacroCircle
              label="Calories"
              current={nutrition.calories.consumed}
              goal={nutrition.calories.goal}
              unit=""
              progressColor="#86efac"
            />
            <MacroCircle
              label="Protein"
              current={nutrition.protein.consumed}
              goal={nutrition.protein.goal}
              unit="g"
              progressColor="#2DD4BF"
            />
            <MacroCircle
              label="Carbs"
              current={nutrition.carbs.consumed}
              goal={nutrition.carbs.goal}
              unit="g"
              progressColor="#2DD4BF"
            />
            <MacroCircle
              label="Fat"
              current={nutrition.fat.consumed}
              goal={nutrition.fat.goal}
              unit="g"
              progressColor="#facc15"
            />
          </div>
          <Link
            href="/nutrition"
            className="inline-block mt-2 font-semibold hover:underline"
            style={{ color: "#2DD4BF" }}
          >
            Log food →
          </Link>
        </div>

        {/* Upcoming - single card, muted text + Edit routine link */}
        <div
          className="rounded-[18px] p-4 mb-5"
          style={{ backgroundColor: "#121826" }}
        >
          <p className="text-xs uppercase mb-2.5" style={{ color: "#8FA3B0" }}>
            Upcoming
          </p>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm" style={{ color: "#8FA3B0" }}>
              🏠 No upcoming events — stay disciplined.
            </p>
          ) : (
            <div className="space-y-1.5">
              {upcomingEvents.map((event) => (
                <p key={event.id} className="text-white text-sm">
                  {event.time} — {event.title}
                </p>
              ))}
            </div>
          )}
          <Link
            href="/calendar"
            className="inline-block mt-3 font-semibold hover:underline"
            style={{ color: "#2DD4BF" }}
          >
            Edit routine →
          </Link>
        </div>

        {/* Motivation - centered, Stay locked in. in teal */}
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: "#0F172A" }}
        >
          <p className="text-sm" style={{ color: "#E5E7EB" }}>
            ✨ Remember why you started.{" "}
            <Link href="/goals" className="font-semibold hover:underline" style={{ color: "#2DD4BF" }}>
              Stay locked in.
            </Link>
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
