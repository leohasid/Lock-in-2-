"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Check, ChevronRight } from "lucide-react";
import { toLocalDateString } from "@/lib/date-utils";

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
  const todayStr = toLocalDateString(new Date());

  const [nutrition, setNutrition] = useState({
    calories: { consumed: 0, goal: 2000 },
    protein: { consumed: 0, goal: 150 },
    carbs: { consumed: 0, goal: 200 },
    fat: { consumed: 0, goal: 65 },
  });
  const [weeklyNutrition, setWeeklyNutrition] = useState<Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    score: number;
  }>>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingItem[]>([]);
  const [daysClean, setDaysClean] = useState<number>(0);
  const [todayWorkout, setTodayWorkout] = useState<{ name: string; time: string } | null>(null);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [reflectionDone, setReflectionDone] = useState(false);
  const [hasAddictions, setHasAddictions] = useState(false);

  const loadData = () => {
    if (typeof window === "undefined") return;

    const goals = JSON.parse(localStorage.getItem("macroGoals") || "{}");
    const storedMeals = localStorage.getItem("meals");
    let consumed = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const todayTotalsKey = `nutritionTotals_${todayStr}`;
    const storedTodayTotals = localStorage.getItem(todayTotalsKey);
    if (storedTodayTotals) {
      try {
        const t = JSON.parse(storedTodayTotals);
        consumed = {
          calories: Number(t.calories) || 0,
          protein: Number(t.protein) || 0,
          carbs: Number(t.carbs) || 0,
          fats: Number(t.fats) || 0,
        };
      } catch (_) {}
    }
    if (consumed.calories === 0 && consumed.protein === 0 && consumed.carbs === 0 && consumed.fats === 0) {
      if (storedMeals) {
        try {
          const allMeals = JSON.parse(storedMeals);
          const todayUtc = new Date().toISOString().split("T")[0];
          const todayMeals = allMeals.filter(
            (m: { date?: string }) => m.date === todayStr || m.date === todayUtc
          );
          consumed = todayMeals.reduce(
            (acc: { calories: number; protein: number; carbs: number; fats: number }, m: any) => ({
              calories: acc.calories + (Number(m.calories) || 0),
              protein: acc.protein + (Number(m.protein) || 0),
              carbs: acc.carbs + (Number(m.carbs) || 0),
              fats: acc.fats + (Number(m.fats) || 0),
            }),
            consumed
          );
        } catch (_) {}
      }
    }
    setNutrition({
      calories: { consumed: consumed.calories, goal: goals.calories ?? 2000 },
      protein: { consumed: consumed.protein, goal: goals.protein ?? 150 },
      carbs: { consumed: consumed.carbs, goal: goals.carbs ?? 250 },
      fat: { consumed: consumed.fats, goal: goals.fats ?? 65 },
    });

    const calGoal = goals.calories ?? 2000;
    const proGoal = goals.protein ?? 150;
    const carbGoal = goals.carbs ?? 250;
    const fatGoal = goals.fats ?? 65;

    const getMacroScore = (c: number, p: number, carb: number, f: number) => {
      const s1 = calGoal > 0 ? Math.min(25, 25 * (c / calGoal)) : 25;
      const s2 = proGoal > 0 ? Math.min(25, 25 * (p / proGoal)) : 25;
      const s3 = carbGoal > 0 ? Math.min(25, 25 * (carb / carbGoal)) : 25;
      const s4 = fatGoal > 0 ? Math.min(25, 25 * (f / fatGoal)) : 25;
      return Math.round(s1 + s2 + s3 + s4);
    };

    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekData: typeof weeklyNutrition = [];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      const dateStr = toLocalDateString(d);
      let c = 0, p = 0, carb = 0, f = 0;
      const totalsKey = `nutritionTotals_${dateStr}`;
      const storedTotals = localStorage.getItem(totalsKey);
      if (storedTotals) {
        try {
          const t = JSON.parse(storedTotals);
          c = Number(t.calories) || 0;
          p = Number(t.protein) || 0;
          carb = Number(t.carbs) || 0;
          f = Number(t.fats) || 0;
        } catch (_) {}
      }
      if (c === 0 && p === 0 && carb === 0 && f === 0 && storedMeals) {
        try {
          const all = JSON.parse(storedMeals);
          const utcDateStr = d.toISOString().split("T")[0];
          const dayMeals = all.filter((m: { date?: string }) => {
            if (!m.date) return false;
            return m.date === dateStr || m.date === utcDateStr;
          });
          dayMeals.forEach((m: any) => {
            c += Number(m.calories) || 0;
            p += Number(m.protein) || 0;
            carb += Number(m.carbs) || 0;
            f += Number(m.fats) || 0;
          });
          if (c > 0 || p > 0 || carb > 0 || f > 0) {
            localStorage.setItem(totalsKey, JSON.stringify({ calories: c, protein: p, carbs: carb, fats: f }));
          }
        } catch (_) {}
      }
      const score = getMacroScore(c, p, carb, f);
      weekData.push({ date: dateStr, calories: c, protein: p, carbs: carb, fat: f, score });
    }
    setWeeklyNutrition(weekData);

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
    window.addEventListener("mealsUpdated", loadData);
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", loadData);
      window.removeEventListener("mealsUpdated", loadData);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Reload when navigating back to home (e.g. from Nutrition after adding a meal)
  useEffect(() => {
    if (pathname === "/") loadData();
  }, [pathname]);

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
      <div className="max-w-md mx-auto px-3 pt-4">
        {/* Tab Bar - Home | Goals */}
        <div className="flex gap-2 mb-4 pt-2 border-b border-teal-500/30">
          <Link
            href="/"
            className={`flex-1 py-1.5 font-semibold text-center text-xs ${
              pathname === "/"
                ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent"
                : "text-gray-400 hover:text-teal-300"
            }`}
          >
            Home
          </Link>
          <Link
            href="/goals"
            className={`flex-1 py-1.5 font-semibold text-center text-xs ${
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
          className="block rounded-xl p-3 mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-teal-500/40 hover:border-teal-400/60 transition-all"
        >
          <p className="text-sm font-semibold text-white">✨ AI Reflection</p>
          <p className="mt-0.5 flex items-center justify-between text-gray-400 text-xs">
            <span>Review yesterday • Set today</span>
            <ChevronRight className="w-4 h-4 text-teal-400" />
          </p>
        </Link>

        {/* LOCKED IN TODAY */}
        <div className="rounded-xl p-3 mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-teal-500/30">
          <p className="text-xs font-bold text-white flex items-center gap-1.5 mb-3">
            <span className="text-sm">🔥</span> LOCKED IN TODAY
          </p>
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center flex-shrink-0">
                {cleanStreakPoints > 0 ? <Check className="w-2.5 h-2.5 text-teal-400" strokeWidth={3} /> : null}
              </div>
              <p className="text-xs text-white">
                Clean streak: <span className="font-semibold text-teal-400">{hasAddictions ? `${daysClean} days` : "—"}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center flex-shrink-0">
                {workoutCompleted ? <Check className="w-2.5 h-2.5 text-teal-400" strokeWidth={3} /> : null}
              </div>
              <p className="text-xs text-white">
                Workout:{" "}
                <span className="font-semibold text-teal-400">
                  {workoutCompleted ? "Completed" : todayWorkout ? "Pending" : "Rest day"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center flex-shrink-0">
                {nutritionOnTrack ? <Check className="w-2.5 h-2.5 text-teal-400" strokeWidth={3} /> : null}
              </div>
              <p className="text-xs text-white">
                Nutrition:{" "}
                <span className="font-semibold text-teal-400">
                  {nutritionOnTrack ? "On track" : "Log food"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] text-gray-400">Discipline score</p>
              <p className="text-xl font-bold text-teal-400">{lockInScore}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
                <span className="text-xs">🧠</span> Lock-In Score
              </p>
              <div className="h-1.5 rounded-full overflow-hidden bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${lockInScore}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Macros - 7-day stacked bar chart with individual macro bars per day */}
        <Link
          href="/nutrition"
          className="block rounded-xl p-4 mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-teal-500/30 hover:border-teal-400/50 transition-all"
        >
          <p className="text-base font-bold text-white">Macros</p>
          <p className="text-xs text-gray-400 mb-3">7-day overview</p>

          {/* Legend - colored bars for each macro */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-orange-500" />
              <span className="text-[10px] text-gray-400">Calories</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-blue-500" />
              <span className="text-[10px] text-gray-400">Protein</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-purple-500" />
              <span className="text-[10px] text-gray-400">Carbs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-teal-400" />
              <span className="text-[10px] text-gray-400">Fats</span>
            </div>
          </div>

          {/* 4 bars side-by-side per day - scaled to nutrition goals. Dotted line = goal complete. */}
          {(() => {
            const calGoal = nutrition.calories.goal || 2000;
            const proGoal = nutrition.protein.goal || 150;
            const carbGoal = nutrition.carbs.goal || 200;
            const fatGoal = nutrition.fat.goal || 65;
            const chartHeight = 72;

            return (
              <div className="relative">
                {/* Dashed yellow goal line - at top, marks goal level */}
                <div className="absolute left-0 right-0 top-0 border-t-2 border-dashed border-yellow-500/80 z-10" />
                <div className="flex items-end justify-between gap-1">
                  {weeklyNutrition.map((day, i) => {
                    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                    const isToday = day.date === todayStr;
                    const calPct = calGoal > 0 ? Math.min((day.calories / calGoal) * 100, 100) : 0;
                    const proPct = proGoal > 0 ? Math.min((day.protein / proGoal) * 100, 100) : 0;
                    const carbPct = carbGoal > 0 ? Math.min((day.carbs / carbGoal) * 100, 100) : 0;
                    const fatPct = fatGoal > 0 ? Math.min((day.fat / fatGoal) * 100, 100) : 0;

                    const bars = [
                      { color: "bg-orange-500", pct: calPct },
                      { color: "bg-blue-500", pct: proPct },
                      { color: "bg-purple-500", pct: carbPct },
                      { color: "bg-teal-400", pct: fatPct },
                    ];

                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center min-w-0">
                        <div
                          className="w-full flex items-end justify-between gap-0.5"
                          style={{ height: `${chartHeight}px` }}
                        >
                          {bars.map((bar, j) => (
                            <div
                              key={j}
                              className="flex-1 flex flex-col justify-end min-w-0 h-full"
                            >
                              <div
                                className={`w-full rounded-t min-h-[2px] ${bar.color}`}
                                style={{
                                  height: `${Math.max((bar.pct / 100) * chartHeight, 2)}px`,
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        <span
                          className={`text-[9px] mt-1.5 truncate w-full text-center ${
                            isToday ? "text-teal-400 font-semibold" : "text-gray-500"
                          }`}
                        >
                          {dayLabels[i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <p className="text-[9px] text-gray-500 mt-2 text-center">
            Tap to view & log food in Nutrition
          </p>
        </Link>

        {/* UPCOMING */}
        <div className="rounded-xl p-3 mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-teal-500/30">
          <p className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
            <span className="text-sm">🏠</span> UPCOMING
          </p>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-gray-400">No upcoming events — stay disciplined.</p>
          ) : (
            <div className="space-y-1">
              {upcomingEvents.map((event) => (
                <p key={event.id} className="text-xs text-white">
                  {event.time} — {event.title}
                </p>
              ))}
            </div>
          )}
          <Link
            href="/calendar?view=schedule"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
          >
            Review routine
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
