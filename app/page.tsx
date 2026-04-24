"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { ChevronRight, Sparkles, Dumbbell, Check } from "lucide-react";
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


function MacroRing({ label, pct, consumed, goal, unit, stroke }: {
  label: string; pct: number; consumed: number; goal: number; unit: string; stroke: string;
}) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(pct, 100)) / 100;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-black text-white leading-none tabular-nums">{Math.round(consumed)}</span>
          <span className="text-[8px] text-gray-600 mt-0.5">{unit}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-gray-500">{label}</span>
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
  const [weeklyTaskStats, setWeeklyTaskStats] = useState({ completed: 0, total: 0 });
  const [weeklyWorkoutStats, setWeeklyWorkoutStats] = useState({ completed: 0, scheduled: 0 });
  const [mogMessage, setMogMessage] = useState("");
  const [isFetchingMessage, setIsFetchingMessage] = useState(false);

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

    // Weekly task stats (Mon → today)
    const allReminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    let weekTaskCompleted = 0, weekTaskTotal = 0;
    const daysElapsedInWeek = today.getDay() === 0 ? 7 : today.getDay(); // Mon=1..Sun=7
    for (let i = 0; i < daysElapsedInWeek; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dStr = toLocalDateString(d);
      const utcStr = d.toISOString().split("T")[0];
      const dayTasks = allReminders.filter((r: any) => r.date === dStr || r.date === utcStr);
      weekTaskTotal += dayTasks.length;
      weekTaskCompleted += dayTasks.filter((r: any) => r.completed).length;
    }
    setWeeklyTaskStats({ completed: weekTaskCompleted, total: weekTaskTotal });

    // Weekly workout stats
    let weekWorkoutCompleted = 0, weekWorkoutScheduled = 0;
    for (let i = 0; i < daysElapsedInWeek; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dStr = toLocalDateString(d);
      const utcStr = d.toISOString().split("T")[0];
      const workoutRow = schedule.find((w: any) => w.date === dStr || w.date === utcStr);
      if (workoutRow?.workoutName && workoutRow.workoutName !== "Rest Day") {
        weekWorkoutScheduled++;
        if (localStorage.getItem(`workout_${dStr}`) === "completed") weekWorkoutCompleted++;
      }
    }
    setWeeklyWorkoutStats({ completed: weekWorkoutCompleted, scheduled: weekWorkoutScheduled });
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

  // Mog Score: weekly-weighted (0-100)
  const mogScore = useMemo(() => {
    // Today's habits: 40 pts
    const todayPts = (workoutCompleted ? 20 : 0) + (nutritionOnTrack ? 20 : 0);
    // Weekly task completion: 35 pts
    const taskRate = weeklyTaskStats.total > 0 ? weeklyTaskStats.completed / weeklyTaskStats.total : 0;
    const taskPts = Math.round(taskRate * 35);
    // Weekly nutrition logging: 15 pts
    const nutritionDaysLogged = weeklyNutrition.filter(d => d.calories > 100).length;
    const daysIntoWeek = Math.max(1, weeklyNutrition.filter(d => new Date(`${d.date}T12:00:00`) <= new Date()).length);
    const nutritionPts = Math.round((nutritionDaysLogged / daysIntoWeek) * 15);
    // Weekly workout consistency: 10 pts
    const workoutRate = weeklyWorkoutStats.scheduled > 0
      ? weeklyWorkoutStats.completed / weeklyWorkoutStats.scheduled
      : workoutCompleted ? 1 : 0;
    const workoutPts = Math.round(workoutRate * 10);
    return Math.min(100, todayPts + taskPts + nutritionPts + workoutPts);
  }, [workoutCompleted, nutritionOnTrack, weeklyTaskStats, weeklyNutrition, weeklyWorkoutStats]);

  // Fetch weekly AI analysis — rich snapshot of all app data, refreshes each Monday
  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const weekKey = toLocalDateString(monday);
    const cacheKey = `mogMessage_week_${weekKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setMogMessage(cached); return; }

    // --- Gym: exercise strength trends ---
    const allWorkoutKeys = Object.keys(localStorage).filter(k => k.startsWith("workout_data_")).sort();
    const exerciseHistory: Record<string, { date: string; maxWeight: number; maxReps: number }[]> = {};
    allWorkoutKeys.forEach(k => {
      const date = k.replace("workout_data_", "");
      try {
        const data = JSON.parse(localStorage.getItem(k) || "[]");
        data.forEach((ex: any) => {
          if (!ex.name?.trim()) return;
          const name = ex.name.trim();
          let maxW = 0, maxR = 0;
          ex.sets?.forEach((s: any) => {
            if (s.completed) {
              const w = Number(s.weight) || 0;
              const r = Number(s.reps) || 0;
              if (w > maxW) { maxW = w; maxR = r; }
            }
          });
          if (maxW > 0) {
            if (!exerciseHistory[name]) exerciseHistory[name] = [];
            exerciseHistory[name].push({ date, maxWeight: maxW, maxReps: maxR });
          }
        });
      } catch {}
    });

    // Build strength summary: exercises with progress
    const strengthLines: string[] = [];
    Object.entries(exerciseHistory).forEach(([name, history]) => {
      if (history.length < 2) return;
      const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      const diff = latest.maxWeight - first.maxWeight;
      const recent = sorted.slice(-3);
      const trend = recent.length >= 2
        ? recent[recent.length - 1].maxWeight - recent[0].maxWeight
        : 0;
      strengthLines.push(`${name}: latest ${latest.maxWeight}kg×${latest.maxReps} (${diff >= 0 ? "+" : ""}${diff.toFixed(1)}kg from first session, recent trend ${trend >= 0 ? "+" : ""}${trend.toFixed(1)}kg)`);
    });

    // PRs
    const prLines: string[] = [];
    Object.entries(exerciseHistory).forEach(([name, history]) => {
      const best = history.reduce((max, h) => h.maxWeight > max.maxWeight ? h : max, history[0]);
      prLines.push(`${name}: ${best.maxWeight}kg on ${best.date}`);
    });

    // Workout frequency (last 30 days)
    const last30 = new Date(); last30.setDate(last30.getDate() - 30);
    const workoutSessionsLast30 = allWorkoutKeys.filter(k => {
      const d = k.replace("workout_data_", "");
      return new Date(`${d}T12:00:00`) >= last30;
    }).length;

    // --- Nutrition: weekly summary ---
    const nutritionDaysLogged = weeklyNutrition.filter(d => d.calories > 100).length;
    const avgCalories = nutritionDaysLogged > 0
      ? Math.round(weeklyNutrition.filter(d => d.calories > 100).reduce((s, d) => s + d.calories, 0) / nutritionDaysLogged)
      : 0;
    const avgProtein = nutritionDaysLogged > 0
      ? Math.round(weeklyNutrition.filter(d => d.protein > 0).reduce((s, d) => s + d.protein, 0) / nutritionDaysLogged)
      : 0;

    // --- Addictions ---
    const addictionsData = JSON.parse(localStorage.getItem("addictions") || "[]");
    const addictionLines = addictionsData.map((a: any) => {
      const days = a.startDate ? Math.max(0, Math.floor((new Date().getTime() - new Date(a.startDate).getTime()) / 86400000)) : 0;
      return `${a.name || a.type}: ${days} days clean (best: ${a.bestStreak || days} days)`;
    });

    // Build prompt
    const promptLines = [
      `Today's Mog Score: ${mogScore}/100.`,
      `\n=== GYM ===`,
      `Workouts in last 30 days: ${workoutSessionsLast30}`,
      `This week: ${weeklyWorkoutStats.completed}/${weeklyWorkoutStats.scheduled} scheduled workouts done. Today's workout: ${workoutCompleted ? "completed" : "not yet done"}.`,
    ];
    if (strengthLines.length > 0) {
      promptLines.push(`Strength progress (all-time per exercise):\n${strengthLines.slice(0, 6).join("\n")}`);
    }
    if (prLines.length > 0) {
      promptLines.push(`Personal records:\n${prLines.slice(0, 5).join("\n")}`);
    }
    promptLines.push(
      `\n=== NUTRITION ===`,
      `Tracking days this week: ${nutritionDaysLogged}/7.`,
      avgCalories > 0 ? `Avg daily calories (tracked days): ${avgCalories} kcal (goal: ${nutrition.calories.goal}).` : "No nutrition logged yet this week.",
      avgProtein > 0 ? `Avg daily protein: ${avgProtein}g (goal: ${proGoal}g).` : "",
      `Today: ${nutritionOnTrack ? `${Math.round(calConsumed)} kcal logged (on track)` : calConsumed > 0 ? `${Math.round(calConsumed)} kcal logged (below goal)` : "nothing logged yet"}.`,
      `\n=== TASKS ===`,
      `This week: ${weeklyTaskStats.completed} of ${weeklyTaskStats.total} tasks completed.`,
    );
    if (addictionLines.length > 0) {
      promptLines.push(`\n=== RECOVERY ===`, addictionLines.join("\n"));
    }
    promptLines.push(`\nToday's date: ${todayStr}.`);
    promptLines.push(
      `\nWrite ONE sentence (max 20 words) for the user's home screen. Reference a specific number from the data. Be direct and motivating. No emojis. Vary focus weekly — gym, nutrition, tasks, or recovery. No generic praise.`
    );

    const prompt = promptLines.filter(Boolean).join("\n");

    setIsFetchingMessage(true);
    fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.response) {
          setMogMessage(data.response);
          localStorage.setItem(cacheKey, data.response);
          // Clean up old daily/score-keyed messages
          Object.keys(localStorage).filter(k => k.startsWith("mogMessage_") && k !== cacheKey).forEach(k => localStorage.removeItem(k));
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingMessage(false));
  }, [mogScore, todayStr]);

  const todayWorkout = todaySchedule.find(e => e.type === "workout");
  const reminders = todaySchedule.filter(e => e.type !== "workout");

  // Upcoming: current (most recent past task) + next (first future task)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  let upcomingCurrent: UpcomingItem | null = null;
  let upcomingNext: UpcomingItem | null = null;
  for (let i = todaySchedule.length - 1; i >= 0; i--) {
    if (parseScheduleTime(todaySchedule[i].time) <= nowMinutes) {
      upcomingCurrent = todaySchedule[i];
      upcomingNext = todaySchedule[i + 1] ?? null;
      break;
    }
  }
  if (!upcomingCurrent) {
    upcomingNext = todaySchedule[0] ?? null;
  }

  const habits = [
    { label: "Workout", done: workoutCompleted },
    { label: "Nutrition", done: nutritionOnTrack },
    { label: "Clean", done: hasAddictions ? daysClean > 0 : true },
    { label: "Reflect", done: reflectionDone },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white/5 border border-white/8 rounded-2xl p-1">
          <div className="flex-1 py-2.5 text-center text-sm font-bold text-white bg-white/10 rounded-xl">
            Home
          </div>
          <Link href="/goals" className="flex-1 py-2.5 text-center text-sm font-semibold text-gray-500 hover:text-gray-300 rounded-xl transition-colors">
            Goals
          </Link>
        </div>

        {/* Score hero card */}
        <div className="relative overflow-hidden rounded-2xl mb-4" style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0f2a2a 50%, #071a14 100%)"
        }}>
          <div className="absolute inset-0 opacity-40" style={{
            background: "radial-gradient(ellipse at top right, rgba(45,212,191,0.15) 0%, transparent 60%)"
          }} />
          <div className="relative p-4">
            {/* Score number + habits row */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-5xl font-black leading-none tracking-tighter" style={{
                  background: "linear-gradient(135deg, #ffffff 40%, #2dd4bf 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  {mogScore}
                </span>
                <div>
                  <span className="text-lg font-bold text-gray-600">/100</span>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400/60">Mog Score</p>
                </div>
              </div>

              {/* 4 habits inline */}
              <div className="flex gap-1.5 flex-1 justify-end">
                {habits.map((h) => (
                  <div
                    key={h.label}
                    className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-colors ${
                      h.done ? "bg-teal-500/20 border border-teal-500/30" : "bg-white/4 border border-white/8"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      h.done ? "bg-teal-400" : "border border-gray-700"
                    }`}>
                      {h.done && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wide ${
                      h.done ? "text-teal-300" : "text-gray-600"
                    }`}>{h.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full rounded-full bg-white/8 mb-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${mogScore}%`,
                  background: mogScore >= 75 ? "linear-gradient(90deg, #0d9488, #2dd4bf)" :
                    mogScore >= 50 ? "linear-gradient(90deg, #d97706, #f59e0b)" :
                    "linear-gradient(90deg, #dc2626, #ef4444)"
                }}
              />
            </div>

            {/* AI message */}
            {isFetchingMessage ? (
              <div className="flex items-center gap-1.5 pt-1">
                <div className="w-1 h-1 rounded-full bg-teal-400 animate-pulse" />
                <div className="w-1 h-1 rounded-full bg-teal-400 animate-pulse delay-75" />
                <div className="w-1 h-1 rounded-full bg-teal-400 animate-pulse delay-150" />
              </div>
            ) : mogMessage ? (
              <p className="text-[11px] text-gray-400 leading-relaxed">{mogMessage}</p>
            ) : null}
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
          <div className="grid grid-cols-4 gap-2">
            <MacroRing label="Calories" pct={macroPcts.cal} consumed={calConsumed} goal={calGoal} unit="kcal" stroke="#fb923c" />
            <MacroRing label="Protein" pct={macroPcts.pro} consumed={nutrition.protein.consumed} goal={proGoal} unit="g" stroke="#60a5fa" />
            <MacroRing label="Carbs" pct={macroPcts.carb} consumed={nutrition.carbs.consumed} goal={carbGoal} unit="g" stroke="#a78bfa" />
            <MacroRing label="Fat" pct={macroPcts.fat} consumed={nutrition.fat.consumed} goal={fatGoal} unit="g" stroke="#fbbf24" />
          </div>
        </Link>

        {/* Upcoming */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-[#0c1422] overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/5">
            <p className="text-sm font-bold text-white">Upcoming</p>
            <Link href="/calendar" className="text-[11px] font-semibold text-teal-400/60 hover:text-teal-400 transition-colors">
              View all →
            </Link>
          </div>
          {!upcomingCurrent && !upcomingNext ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-600">Nothing scheduled for today</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {upcomingCurrent && (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex flex-col items-center gap-1 shrink-0 w-8">
                    <span className="text-[9px] font-black uppercase tracking-widest text-teal-400">NOW</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{upcomingCurrent.title}</p>
                    {upcomingCurrent.time && upcomingCurrent.time !== "—" && (
                      <p className="text-[11px] text-gray-500 mt-0.5">{upcomingCurrent.time}</p>
                    )}
                  </div>
                  {upcomingCurrent.type === "workout" && (
                    <Dumbbell className="w-4 h-4 text-teal-400/50 shrink-0" />
                  )}
                </div>
              )}
              {upcomingNext && (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex flex-col items-center gap-1 shrink-0 w-8">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600">NEXT</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-300 truncate">{upcomingNext.title}</p>
                    {upcomingNext.time && upcomingNext.time !== "—" && (
                      <p className="text-[11px] text-gray-600 mt-0.5">{upcomingNext.time}</p>
                    )}
                  </div>
                  {upcomingNext.type === "workout" && (
                    <Dumbbell className="w-4 h-4 text-gray-600 shrink-0" />
                  )}
                </div>
              )}
            </div>
          )}
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
          <p className="text-sm font-semibold text-white leading-relaxed mb-3">{mogMessage || "Log your wins, set your goals, get AI feedback."}</p>
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
