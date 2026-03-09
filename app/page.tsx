"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Check, ChevronRight } from "lucide-react";

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

export default function Home() {
  const pathname = usePathname();
  const todayStr = new Date().toISOString().split("T")[0];

  const [nutrition, setNutrition] = useState({
    calories: { consumed: 0, goal: 2000 },
    protein: { consumed: 0, goal: 150 },
    carbs: { consumed: 0, goal: 200 },
    fat: { consumed: 0, goal: 65 },
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingItem[]>([]);
  const [daysClean, setDaysClean] = useState<number>(0);
  const [todayWorkout, setTodayWorkout] = useState<{ name: string; time: string } | null>(null);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [reflectionDone, setReflectionDone] = useState(false);
  const [hasAddictions, setHasAddictions] = useState(false);

  const loadData = () => {
    if (typeof window === "undefined") return;

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
    const futureReminders = reminders
      .filter((r: { date: string }) => r.date > todayStr)
      .sort((a: UpcomingItem, b: UpcomingItem) => {
        const dateCmp = (a.date || "").localeCompare(b.date || "");
        return dateCmp !== 0 ? dateCmp : (a.time || "").localeCompare(b.time || "");
      });
    setUpcomingEvents(futureReminders.slice(0, 4));

    const addictions = JSON.parse(localStorage.getItem("addictions") || "[]");
    setHasAddictions(addictions.length > 0);
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
      setTodayWorkout({
        name: todayEntry.workoutName.replace(" Day", ""),
        time: "6pm",
      });
    } else {
      setTodayWorkout(null);
    }

    setWorkoutCompleted(localStorage.getItem(`workout_${todayStr}`) === "completed");

    const storedReflection = localStorage.getItem(`reflection_${todayStr}`);
    if (storedReflection) {
      try {
        const data = JSON.parse(storedReflection);
        setReflectionDone(!!data.aiFeedback);
      } catch {
        setReflectionDone(false);
      }
    } else {
      setReflectionDone(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  // Nutrition "on track" = logged meals and within 50-150% of calorie goal
  const nutritionOnTrack =
    nutrition.calories.consumed > 0 &&
    nutrition.calories.goal > 0 &&
    nutrition.calories.consumed >= nutrition.calories.goal * 0.5 &&
    nutrition.calories.consumed <= nutrition.calories.goal * 1.5;

  // Lock-in score: 25 each for workout, nutrition, clean streak, reflection (max 100)
  // Clean streak: 25 if (a) daysClean > 0 or (b) no addictions tracked (don't penalize)
  const cleanStreakPoints = hasAddictions ? (daysClean > 0 ? 25 : 0) : 25;
  const lockInScore = Math.min(
    100,
    (workoutCompleted ? 25 : 0) +
      (nutritionOnTrack ? 25 : 0) +
      cleanStreakPoints +
      (reflectionDone ? 25 : 0)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Tab Bar - Home | Goals */}
        <div className="flex gap-2 mb-6 pt-4 border-b border-teal-500/30">
          <Link
            href="/"
            className={`flex-1 py-2 font-semibold text-center text-sm ${
              pathname === "/"
                ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent"
                : "text-gray-400 hover:text-teal-300"
            }`}
          >
            Home
          </Link>
          <Link
            href="/goals"
            className={`flex-1 py-2 font-semibold text-center text-sm ${
              pathname === "/goals"
                ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent"
                : "text-gray-400 hover:text-teal-300"
            }`}
          >
            Goals
          </Link>
        </div>

        {/* AI Reflection */}
        <Link
          href="/consultation?from=reflection"
          className="block rounded-2xl p-5 mb-5 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-teal-500/40 hover:border-teal-400/60 transition-all"
        >
          <p className="text-lg font-semibold text-white">✨ AI Reflection</p>
          <p className="mt-1 flex items-center justify-between text-gray-400">
            <span>Review yesterday • Set today</span>
            <ChevronRight className="w-5 h-5 text-teal-400" />
          </p>
        </Link>

        {/* LOCKED IN TODAY */}
        <div className="rounded-2xl p-5 mb-5 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-teal-500/30">
          <p className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <span className="text-lg">🔥</span> LOCKED IN TODAY
          </p>
          <div className="space-y-2.5 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center">
                {cleanStreakPoints > 0 ? <Check className="w-3 h-3 text-teal-400" strokeWidth={3} /> : null}
              </div>
              <p className="text-sm text-white">
                Clean streak: <span className="font-bold text-teal-400">{hasAddictions ? `${daysClean} days` : "—"}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center">
                {workoutCompleted ? <Check className="w-3 h-3 text-teal-400" strokeWidth={3} /> : null}
              </div>
              <p className="text-sm text-white">
                Workout:{" "}
                <span className="font-bold text-teal-400">
                  {workoutCompleted ? "Completed" : todayWorkout ? "Pending" : "Rest day"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center">
                {nutritionOnTrack ? <Check className="w-3 h-3 text-teal-400" strokeWidth={3} /> : null}
              </div>
              <p className="text-sm text-white">
                Nutrition:{" "}
                <span className="font-bold text-teal-400">
                  {nutritionOnTrack ? "On track" : "Log food"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400">Discipline score</p>
              <p className="text-3xl font-bold text-teal-400">{lockInScore}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <span>🧠</span> Lock-In Score
              </p>
              <div className="h-2 rounded-full overflow-hidden bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${lockInScore}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* UPCOMING */}
        <div className="rounded-2xl p-5 mb-5 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border-2 border-teal-500/30">
          <p className="text-base font-bold text-white flex items-center gap-2 mb-2">
            <span>🏠</span> UPCOMING
          </p>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming events — stay disciplined.</p>
          ) : (
            <div className="space-y-1.5">
              {upcomingEvents.map((event) => (
                <p key={event.id} className="text-sm text-white">
                  {event.time} — {event.title}
                </p>
              ))}
            </div>
          )}
          <Link
            href="/calendar?view=schedule"
            className="mt-3 inline-flex items-center gap-1 font-semibold text-teal-400 hover:text-teal-300 transition-colors"
          >
            Review routine
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
