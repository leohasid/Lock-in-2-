"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { ChevronRight, Flame, Sparkles, Dumbbell, Check } from "lucide-react";
import { toLocalDateString } from "@/lib/date-utils";
import { getNotificationSettings } from "@/app/utils/notifications";

interface UpcomingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
}

function parseScheduleTime(time: string): number {
  if (!time || time === "—") return 24 * 60 + 59;
  let t = time.trim().toLowerCase();
  const rangeSep = /\s*[–—-]\s*/;
  if (rangeSep.test(t)) t = t.split(rangeSep)[0].trim();
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return Math.min(23, parseInt(m24[1], 10)) * 60 + Math.min(59, parseInt(m24[2], 10));
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    if (m12[3] === "am" && h === 12) h = 0;
    if (m12[3] === "pm" && h !== 12) h += 12;
    return h * 60 + min;
  }
  return 24 * 60 + 59;
}

function getDaysClean(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

function getNutritionStreak(week: Array<{ date: string; calories: number; score: number }>, todayStr: string): number {
  const idx = week.findIndex((d) => d.date === todayStr);
  if (idx < 0) return 0;
  let streak = 0;
  for (let i = idx; i >= 0; i--) {
    if (week[i].calories > 0 && week[i].score >= 30) streak++;
    else break;
  }
  return streak;
}

function MacroBar({ label, pct, consumed, goal, unit, color }: {
  label: string; pct: number; consumed: number; goal: number; unit: string; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-400">{label}</span>
        <span className="text-xs tabular-nums text-gray-500">
          {Math.round(consumed)}<span className="text-gray-700 text-[10px]"> / {goal}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
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
    date: string; calories: number; protein: number; carbs: number; fat: number; score: number;
  }>>([]);
  const [todaySchedule, setTodaySchedule] = useState<UpcomingItem[]>([]);
  const [todayExerciseCount, setTodayExerciseCount] = useState(0);
  const [daysClean, setDaysClean] = useState(0);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [reflectionDone, setReflectionDone] = useState(false);
  const [hasAddictions, setHasAddictions] = useState(false);

  const loadData = () => {
    if (typeof window === "undefined") return;

    const goals = JSON.parse(localStorage.getItem("macroGoals") || "{}");
    const storedMeals = localStorage.getItem("meals");
    let consumed = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const storedTotals = localStorage.getItem(`nutritionTotals_${todayStr}`);
    if (storedTotals) {
      try {
        const t = JSON.parse(storedTotals);
        consumed = { calories: Number(t.calories) || 0, protein: Number(t.protein) || 0, carbs: Number(t.carbs) || 0, fats: Number(t.fats) || 0 };
      } catch {}
    }
    if (!consumed.calories && !consumed.protein && !consumed.carbs && !consumed.fats && storedMeals) {
      try {
        const todayUtc = new Date().toISOString().split("T")[0];
        const todayMeals = JSON.parse(storedMeals).filter((m: any) => m.date === todayStr || m.date === todayUtc);
        consumed = todayMeals.reduce((acc: typeof consumed, m: any) => ({
          calories: acc.calories + (Number(m.calories) || 0),
          protein: acc.protein + (Number(m.protein) || 0),
          carbs: acc.carbs + (Number(m.carbs) || 0),
          fats: acc.fats + (Number(m.fats) || 0),
        }), consumed);
      } catch {}
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
    const getMacroScore = (c: number, p: number, carb: number, f: number) =>
      Math.round(
        (calGoal > 0 ? Math.min(25, 25 * (c / calGoal)) : 25) +
        (proGoal > 0 ? Math.min(25, 25 * (p / proGoal)) : 25) +
        (carbGoal > 0 ? Math.min(25, 25 * (carb / carbGoal)) : 25) +
        (fatGoal > 0 ? Math.min(25, 25 * (f / fatGoal)) : 25)
      );

    const today = new Date();
    const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const weekData: typeof weeklyNutrition = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      const dateStr = toLocalDateString(d);
      let c = 0, p = 0, carb = 0, f = 0;
      const st = localStorage.getItem(`nutritionTotals_${dateStr}`);
      if (st) {
        try { const t = JSON.parse(st); c = Number(t.calories) || 0; p = Number(t.protein) || 0; carb = Number(t.carbs) || 0; f = Number(t.fats) || 0; } catch {}
      }
      if (!c && !p && !carb && !f && storedMeals) {
        try {
          const utcStr = d.toISOString().split("T")[0];
          const dayMeals = JSON.parse(storedMeals).filter((m: any) => m.date === dateStr || m.date === utcStr);
          dayMeals.forEach((m: any) => { c += Number(m.calories) || 0; p += Number(m.protein) || 0; carb += Number(m.carbs) || 0; f += Number(m.fats) || 0; });
          if (c || p || carb || f) localStorage.setItem(`nutritionTotals_${dateStr}`, JSON.stringify({ calories: c, protein: p, carbs: carb, fats: f }));
        } catch {}
      }
      weekData.push({ date: dateStr, calories: c, protein: p, carbs: carb, fat: f, score: getMacroScore(c, p, carb, f) });
    }
    setWeeklyNutrition(weekData);

    const reminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    const todayUtc = new Date().toISOString().split("T")[0];
    const scheduleItems: UpcomingItem[] = reminders
      .filter((r: any) => (r.date === todayStr || r.date === todayUtc) && !r.completed)
      .map((r: any, idx: number): UpcomingItem => {
        const start = r.time || "";
        const end = r.endTime?.trim();
        return {
          id: r.id || `reminder-${todayStr}-${idx}`,
          title: r.title,
          date: r.date,
          time: start && end ? `${start} – ${end}` : start || "—",
          type: r.type || "task",
        };
      });

    const workoutDone = localStorage.getItem(`workout_${todayStr}`) === "completed";
    const schedule = JSON.parse(localStorage.getItem("workoutSchedule") || "[]");
    const todayWorkoutRow = schedule.find((w: any) => w.date === todayStr || w.date === todayUtc);
    if (!workoutDone && todayWorkoutRow?.workoutName && todayWorkoutRow.workoutName !== "Rest Day") {
      const settings = getNotificationSettings();
      scheduleItems.push({
        id: `workout-${todayStr}`,
        title: todayWorkoutRow.workoutName.replace(/\s*Day\s*$/i, "").trim() || todayWorkoutRow.workoutName,
        date: todayStr,
        time: settings.gymScheduleTime || "—",
        type: "workout",
      });
      if (todayWorkoutRow?.optionId) {
        try {
          const opts = JSON.parse(localStorage.getItem("workoutOptions") || "[]");
          const opt = opts.find((o: any) => o.id === todayWorkoutRow.optionId);
          if (opt) setTodayExerciseCount((opt.days?.day1?.length || 0) + (opt.days?.day2?.length || 0) + (opt.days?.day3?.length || 0));
        } catch {}
      }
    }

    scheduleItems.sort((a, b) => parseScheduleTime(a.time) - parseScheduleTime(b.time));
    setTodaySchedule(scheduleItems.slice(0, 8));

    const addictions = JSON.parse(localStorage.getItem("addictions") || "[]");
    setHasAddictions(addictions.length > 0);
    setDaysClean(addictions.length > 0 ? Math.min(...addictions.map((a: any) => a.startDate ? getDaysClean(a.startDate) : 0)) : 0);
    setWorkoutCompleted(localStorage.getItem(`workout_${todayStr}`) === "completed");

    const storedRef = localStorage.getItem(`reflection_${todayStr}`);
    if (storedRef) {
      try { setReflectionDone(!!(JSON.parse(storedRef).aiFeedback)); } catch { setReflectionDone(false); }
    } else setReflectionDone(false);
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

  useEffect(() => { if (pathname === "/") loadData(); }, [pathname]);

  const nutritionOnTrack =
    nutrition.calories.consumed > 0 &&
    nutrition.calories.goal > 0 &&
    nutrition.calories.consumed >= nutrition.calories.goal * 0.5 &&
    nutrition.calories.consumed <= nutrition.calories.goal * 1.5;

  const cleanStreakPoints = hasAddictions ? (daysClean > 0 ? 25 : 0) : 25;
  const lockInScore = Math.min(100,
    (workoutCompleted ? 25 : 0) + (nutritionOnTrack ? 25 : 0) + cleanStreakPoints + (reflectionDone ? 25 : 0)
  );

  const nutritionStreak = useMemo(() => getNutritionStreak(weeklyNutrition, todayStr), [weeklyNutrition, todayStr]);
  const streakDays = hasAddictions ? daysClean : nutritionStreak;

  const calGoal = nutrition.calories.goal || 2000;
  const calConsumed = nutrition.calories.consumed;
  const proGoal = nutrition.protein.goal || 150;
  const carbGoal = nutrition.carbs.goal || 250;
  const fatGoal = nutrition.fat.goal || 65;

  const macroPcts = {
    cal: calGoal > 0 ? Math.min(100, (calConsumed / calGoal) * 100) : 0,
    pro: proGoal > 0 ? Math.min(100, (nutrition.protein.consumed / proGoal) * 100) : 0,
    carb: carbGoal > 0 ? Math.min(100, (nutrition.carbs.consumed / carbGoal) * 100) : 0,
    fat: fatGoal > 0 ? Math.min(100, (nutrition.fat.consumed / fatGoal) * 100) : 0,
  };

  const aiLine = useMemo(() => {
    if (streakDays >= 14) return `${streakDays} days strong. Your consistency is building real momentum.`;
    if (streakDays >= 7) return "Solid week — you're stacking wins. Keep showing up.";
    if (lockInScore >= 75) return "You're locked in. Keep the rhythm going today.";
    if (nutritionOnTrack && workoutCompleted) return "Full house today — workout and nutrition on point.";
    return "Small steps today become big results tomorrow.";
  }, [streakDays, lockInScore, nutritionOnTrack, workoutCompleted]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const todayWorkout = todaySchedule.find(e => e.type === "workout");
  const reminders = todaySchedule.filter(e => e.type !== "workout");
  const weekLetters = ["M", "T", "W", "T", "F", "S", "S"];

  const habits = [
    { label: "Workout", done: workoutCompleted },
    { label: "Nutrition", done: nutritionOnTrack },
    { label: "Clean", done: cleanStreakPoints > 0 },
    { label: "Reflect", done: reflectionDone },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-0.5">{greeting}</p>
            <h1 className="text-2xl font-black text-white leading-tight">{dateLabel}</h1>
          </div>
          <Link href="/goals" className="mt-1 text-xs font-semibold text-teal-400/70 hover:text-teal-400 transition-colors">
            Goals →
          </Link>
        </div>

        {/* Score hero card */}
        <div className="relative overflow-hidden rounded-3xl mb-4" style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0f2a2a 50%, #071a14 100%)"
        }}>
          <div className="absolute inset-0 opacity-40" style={{
            background: "radial-gradient(ellipse at top right, rgba(45,212,191,0.15) 0%, transparent 60%)"
          }} />
          <div className="relative p-5">
            {/* Score number */}
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-8xl font-black leading-none tracking-tighter" style={{
                background: "linear-gradient(135deg, #ffffff 40%, #2dd4bf 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {lockInScore}
              </span>
              <div>
                <span className="text-3xl font-bold text-gray-600">/100</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60 mt-0.5">
                  Lock-in score
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full rounded-full bg-white/8 mb-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${lockInScore}%`,
                  background: lockInScore >= 75 ? "linear-gradient(90deg, #0d9488, #2dd4bf)" :
                    lockInScore >= 50 ? "linear-gradient(90deg, #d97706, #f59e0b)" :
                    "linear-gradient(90deg, #dc2626, #ef4444)"
                }}
              />
            </div>

            {/* 4 habits */}
            <div className="grid grid-cols-4 gap-2">
              {habits.map((h) => (
                <div
                  key={h.label}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-colors ${
                    h.done
                      ? "bg-teal-500/20 border border-teal-500/30"
                      : "bg-white/4 border border-white/8"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    h.done ? "bg-teal-400" : "border border-gray-700"
                  }`}>
                    {h.done && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${
                    h.done ? "text-teal-300" : "text-gray-600"
                  }`}>{h.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's workout — only if scheduled and not done */}
        {todayWorkout && !workoutCompleted ? (
          <Link href="/gym/workout" className="mb-4 flex items-center justify-between rounded-2xl border border-teal-500/25 bg-gradient-to-r from-teal-900/30 to-transparent p-4 hover:border-teal-400/40 transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/25 flex items-center justify-center shrink-0">
                <Dumbbell className="w-5 h-5 text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60">Today's workout</p>
                <p className="text-base font-bold text-white truncate">{todayWorkout.title}</p>
                {todayExerciseCount > 0 && (
                  <p className="text-[11px] text-gray-500">{todayExerciseCount} exercises</p>
                )}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 px-4 py-2 bg-teal-400 group-hover:bg-teal-500 text-black text-sm font-bold rounded-xl transition-colors ml-3">
              Start <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ) : workoutCompleted ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-teal-500/20 bg-teal-500/8 p-4">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-teal-300">Workout complete</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Great work today</p>
            </div>
          </div>
        ) : null}

        {/* Nutrition */}
        <Link href="/nutrition" className="mb-4 block rounded-2xl border border-white/8 bg-[#0c1422] p-4 hover:border-white/15 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-white">Nutrition</p>
            <p className="text-xs tabular-nums text-gray-500">
              {Math.round(calConsumed).toLocaleString()}
              <span className="text-gray-700"> / {calGoal.toLocaleString()} kcal</span>
            </p>
          </div>
          <div className="space-y-3.5">
            <MacroBar label="Calories" pct={macroPcts.cal} consumed={calConsumed} goal={calGoal} unit=" kcal" color="bg-orange-400" />
            <MacroBar label="Protein" pct={macroPcts.pro} consumed={nutrition.protein.consumed} goal={proGoal} unit="g" color="bg-blue-400" />
            <MacroBar label="Carbs" pct={macroPcts.carb} consumed={nutrition.carbs.consumed} goal={carbGoal} unit="g" color="bg-violet-400" />
            <MacroBar label="Fat" pct={macroPcts.fat} consumed={nutrition.fat.consumed} goal={fatGoal} unit="g" color="bg-amber-400" />
          </div>
        </Link>

        {/* Week + streak */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-[#0c1422] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">This week</p>
            {streakDays > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-[11px] font-bold text-orange-300">{streakDays}-day streak</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weeklyNutrition.map((day, i) => {
              const isToday = day.date === todayStr;
              const hit = calGoal > 0 ? day.calories >= calGoal * 0.5 || day.score >= 50 : day.calories > 0;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1.5">
                  <div className={`w-full aspect-square rounded-xl transition-colors ${
                    hit ? "bg-teal-400" :
                    isToday ? "border-2 border-teal-500/40" :
                    "bg-white/5"
                  }`} />
                  <span className={`text-[9px] font-bold ${isToday ? "text-teal-400" : "text-gray-600"}`}>
                    {weekLetters[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Reflection */}
        <Link
          href="/consultation?from=reflection"
          className="mb-4 block rounded-2xl border border-violet-500/20 p-4 transition-all hover:border-violet-400/30"
          style={{ background: "linear-gradient(135deg, rgba(46,16,101,0.4) 0%, rgba(10,10,20,0.8) 100%)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300/70">AI Reflection</span>
          </div>
          <p className="text-sm font-semibold text-white leading-relaxed mb-3">{aiLine}</p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-600">Review · Set goals · Get feedback</span>
            <ChevronRight className="h-4 w-4 text-violet-400/60" />
          </div>
        </Link>

        {/* Reminders (non-workout items) */}
        {reminders.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-[#0c1422] overflow-hidden mb-4">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Reminders</p>
              <Link href="/calendar" className="text-[11px] font-semibold text-teal-400/60 hover:text-teal-400 transition-colors">
                Edit →
              </Link>
            </div>
            {reminders.map((ev) => {
              const displayTime = !ev.time || ev.time === "—" ? null : ev.time;
              return (
                <Link
                  key={ev.id}
                  href="/calendar"
                  className="flex items-center gap-3 px-4 py-3 border-t border-white/5 hover:bg-white/3 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400/60 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                    {displayTime && <p className="text-[11px] text-gray-500 mt-0.5">{displayTime}</p>}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-700 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
