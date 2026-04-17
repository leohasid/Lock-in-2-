"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { ChevronRight, Flame, Sparkles, Dumbbell, Clock } from "lucide-react";
import { toLocalDateString } from "@/lib/date-utils";
import { getNotificationSettings } from "@/app/utils/notifications";

interface UpcomingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
}

/** Sort key 0–1439; unknown / missing times sort last */
function parseScheduleTime(time: string): number {
  if (!time || time === "—") return 24 * 60 + 59;
  let t = time.trim().toLowerCase();
  const rangeSep = /\s*[–—-]\s*/;
  if (rangeSep.test(t)) {
    t = t.split(rangeSep)[0].trim();
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Math.min(23, parseInt(m24[1], 10));
    const min = Math.min(59, parseInt(m24[2], 10));
    return h * 60 + min;
  }
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    const ap = m12[3];
    if (ap === "am" && h === 12) h = 0;
    if (ap === "pm" && h !== 12) h += 12;
    return h * 60 + min;
  }
  return 24 * 60 + 59;
}

function getDaysClean(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

function getNutritionStreak(
  week: Array<{ date: string; calories: number; score: number }>,
  todayStr: string
): number {
  const idx = week.findIndex((d) => d.date === todayStr);
  if (idx < 0) return 0;
  let streak = 0;
  for (let i = idx; i >= 0; i--) {
    const day = week[i];
    if (day.calories > 0 && day.score >= 30) streak++;
    else break;
  }
  return streak;
}

/** Same rules as calendar: sortable minutes, supports 24h and am/pm */
function parseTimeToMinutes(time: string): number {
  if (!time) return 0;
  const t = time.trim().toLowerCase();
  const pmMatch = t.match(/^(\d{1,2})(?::(\d{2}))?\s*pm$/);
  const amMatch = t.match(/^(\d{1,2})(?::(\d{2}))?\s*am$/);
  const colonMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (pmMatch) {
    let h = parseInt(pmMatch[1], 10);
    if (h !== 12) h += 12;
    const m = pmMatch[2] ? parseInt(pmMatch[2], 10) : 0;
    return h * 60 + m;
  }
  if (amMatch) {
    let h = parseInt(amMatch[1], 10);
    if (h === 12) h = 0;
    const m = amMatch[2] ? parseInt(amMatch[2], 10) : 0;
    return h * 60 + m;
  }
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    return h * 60 + m;
  }
  return 0;
}

function CircularScoreRing({
  percent,
  size,
  strokeWidth,
  sublabel,
  value,
}: {
  percent: number;
  size: number;
  strokeWidth: number;
  sublabel: string;
  value: string | number;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  const offset = c - (p / 100) * c;
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-white/10" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-teal-400 transition-[stroke-dashoffset] duration-500"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold leading-none text-white">{value}</span>
      </div>
      <p className="absolute -bottom-5 left-1/2 w-max max-w-[110%] -translate-x-1/2 text-center text-[8px] font-bold uppercase tracking-wider text-gray-500">
        {sublabel}
      </p>
    </div>
  );
}

function MacroRing({
  label,
  pct,
  consumed,
  goal,
  strokeClass,
}: {
  label: string;
  pct: number;
  consumed: number;
  goal: number;
  strokeClass: string;
}) {
  const size = 64;
  const strokeWidth = 5;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, pct));
  const offset = c - (p / 100) * c;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-white/10" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className={`${strokeClass} transition-[stroke-dashoffset] duration-500`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {Math.round(p)}%
        </span>
      </div>
      <span className="text-[10px] font-medium text-gray-400">{label}</span>
      <span className="text-[9px] tabular-nums text-gray-500">
        {Math.round(consumed)} / {goal}
      </span>
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
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    score: number;
  }>>([]);
  const [todaySchedule, setTodaySchedule] = useState<UpcomingItem[]>([]);
  const [todayExerciseCount, setTodayExerciseCount] = useState(0);
  const [daysClean, setDaysClean] = useState<number>(0);
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
    const todayUtc = new Date().toISOString().split("T")[0];
    const scheduleItems: UpcomingItem[] = reminders
      .filter(
        (r: { date?: string; completed?: boolean }) =>
          (r.date === todayStr || r.date === todayUtc) && !r.completed
      )
      .map(
        (
          r: {
            id?: string;
            title: string;
            date: string;
            time: string;
            endTime?: string;
            type?: string;
          },
          idx: number
        ): UpcomingItem => {
          const start = r.time || "";
          const end = r.endTime?.trim();
          const display =
            start && end ? `${start} – ${end}` : start ? start : "—";
          return {
            id: r.id || `reminder-${todayStr}-${idx}`,
            title: r.title,
            date: r.date,
            time: display,
            type: r.type || "task",
          };
        }
      );

    const workoutDone = localStorage.getItem(`workout_${todayStr}`) === "completed";
    const schedule = JSON.parse(localStorage.getItem("workoutSchedule") || "[]");
    const todayWorkoutRow = schedule.find(
      (w: { date?: string }) => w.date === todayStr || w.date === todayUtc
    );
    if (
      !workoutDone &&
      todayWorkoutRow?.workoutName &&
      todayWorkoutRow.workoutName !== "Rest Day"
    ) {
      const settings = getNotificationSettings();
      scheduleItems.push({
        id: `workout-${todayStr}`,
        title: todayWorkoutRow.workoutName.replace(/\s*Day\s*$/i, "").trim() || todayWorkoutRow.workoutName,
        date: todayStr,
        time: settings.gymScheduleTime || "—",
        type: "workout",
      });
      // Look up exercise count for the featured workout card
      if (todayWorkoutRow?.optionId) {
        try {
          const opts = JSON.parse(localStorage.getItem("workoutOptions") || "[]");
          const opt = opts.find((o: any) => o.id === todayWorkoutRow.optionId);
          if (opt) {
            setTodayExerciseCount(
              (opt.days?.day1?.length || 0) +
              (opt.days?.day2?.length || 0) +
              (opt.days?.day3?.length || 0)
            );
          }
        } catch {}
      }
    }

    scheduleItems.sort(
      (a, b) => parseScheduleTime(a.time) - parseScheduleTime(b.time)
    );
    setTodaySchedule(scheduleItems.slice(0, 8));

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

  const nutritionStreak = useMemo(
    () => getNutritionStreak(weeklyNutrition, todayStr),
    [weeklyNutrition, todayStr]
  );

  const streakDays = hasAddictions ? daysClean : nutritionStreak;
  const streakTitle =
    streakDays > 0
      ? `${streakDays}-DAY STREAK`
      : hasAddictions
        ? "START YOUR STREAK"
        : "LOG TO BUILD STREAK";

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

  const aiReflectionLine = useMemo(() => {
    if (streakDays >= 14) {
      return `${streakDays} days strong! Your consistency is building real momentum.`;
    }
    if (streakDays >= 7) {
      return "Solid week — you're stacking wins. Keep showing up.";
    }
    if (lockInScore >= 75) {
      return "You're locked in. Keep the rhythm going today.";
    }
    if (nutritionOnTrack && workoutCompleted) {
      return "Full house today: workout and nutrition on point.";
    }
    return "Small steps today become big results tomorrow.";
  }, [streakDays, lockInScore, nutritionOnTrack, workoutCompleted]);

  const weekDayLetters = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black pb-28 text-white">
      <div className="mx-auto max-w-md px-4 pt-4">
        {/* Tab Bar - Home | Goals */}
        <div className="mb-5 flex gap-2 border-b border-teal-500/30 pt-2">
          <Link
            href="/"
            className={`flex-1 py-1.5 text-center text-xs font-semibold ${
              pathname === "/"
                ? "border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent text-teal-400"
                : "text-gray-400 hover:text-teal-300"
            }`}
          >
            Home
          </Link>
          <Link
            href="/goals"
            className={`flex-1 py-1.5 text-center text-xs font-semibold ${
              pathname === "/goals"
                ? "border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent text-teal-400"
                : "text-gray-400 hover:text-teal-300"
            }`}
          >
            Goals
          </Link>
        </div>

        {/* Score + streak row */}
        <div className="mb-5 flex items-start gap-4">
          <div className="flex shrink-0 flex-col items-center pb-6">
            <CircularScoreRing
              percent={lockInScore}
              size={112}
              strokeWidth={9}
              sublabel="Lock-in score"
              value={lockInScore}
            />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="mb-2 flex items-center gap-2">
              <Flame className="h-5 w-5 shrink-0 text-orange-400" strokeWidth={2} />
              <span className="text-sm font-bold uppercase tracking-wide text-white">{streakTitle}</span>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-gray-400">
              {hasAddictions
                ? "Every clean day counts toward your lock-in score."
                : "Log meals and complete your habits to grow your streak."}
            </p>
            <div className="flex items-center justify-between gap-1">
              {weeklyNutrition.map((day, i) => {
                const isToday = day.date === todayStr;
                const hit =
                  calGoal > 0 ? day.calories >= calGoal * 0.5 || day.score >= 50 : day.calories > 0;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        hit
                          ? "bg-teal-400"
                          : isToday
                            ? "ring-2 ring-teal-400/50 ring-offset-2 ring-offset-[#0c1422]"
                            : "bg-white/15"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-medium ${isToday ? "text-teal-400" : "text-gray-500"}`}
                    >
                      {weekDayLetters[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Your day */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Your day
              </p>
              <p className="mt-0.5 text-lg font-bold leading-tight text-white">
                {todaySchedule.length === 0
                  ? "Nothing scheduled"
                  : `${todaySchedule.length} item${todaySchedule.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Link
              href="/calendar"
              className="text-[11px] font-semibold text-teal-400/60 hover:text-teal-400 transition-colors"
            >
              View all →
            </Link>
          </div>

          {todaySchedule.length === 0 ? (
            <Link
              href="/calendar"
              className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-dashed border-white/10 px-4 py-4 hover:border-teal-500/30 transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold text-white">Nothing planned yet</p>
                <p className="text-xs text-gray-500 mt-0.5">Add reminders and tasks</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-teal-400 transition-colors" />
            </Link>
          ) : (
            <div className="px-4 pb-4 space-y-2">
              {todaySchedule.map((event, i) => {
                const isWorkout = event.type === "workout";
                const displayTime = !event.time || event.time === "—" ? null : event.time;
                const featuredWorkout = isWorkout && i === todaySchedule.findIndex(e => e.type === "workout");

                if (featuredWorkout) {
                  return (
                    <div
                      key={event.id}
                      className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-900/40 to-teal-900/10 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/70 mb-1">
                            {displayTime ? `${displayTime} · ` : ""}Workout
                          </p>
                          <p className="text-xl font-black text-white leading-tight truncate">
                            {event.title}
                          </p>
                          {todayExerciseCount > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {todayExerciseCount} exercise{todayExerciseCount !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <Link
                          href="/gym/workout"
                          className="shrink-0 flex items-center gap-1 px-4 py-2.5 bg-teal-400 hover:bg-teal-500 active:bg-teal-600 text-black text-sm font-bold rounded-xl transition-colors"
                        >
                          Start
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={event.id}
                    href={isWorkout ? "/gym/workout" : "/calendar"}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 hover:border-white/15 transition-colors group"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isWorkout
                          ? "border border-teal-500/25 bg-teal-500/15"
                          : "border border-white/8 bg-white/5"
                      }`}
                    >
                      {isWorkout ? (
                        <Dumbbell className="w-4 h-4 text-teal-400" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{event.title}</p>
                      {displayTime && (
                        <p className="mt-0.5 text-[11px] text-gray-500">{displayTime}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 text-gray-700 group-hover:text-gray-400 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Macros — ring row */}
        <Link
          href="/nutrition"
          className="mb-4 block rounded-2xl border border-teal-500/30 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black p-4 transition-colors hover:border-teal-400/50"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-white">Macros</p>
            <p className="text-xs tabular-nums text-gray-400">
              {Math.round(calConsumed).toLocaleString()} / {calGoal.toLocaleString()} kcal
            </p>
          </div>
          <div className="flex justify-between gap-1">
            <MacroRing
              label="Calories"
              pct={macroPcts.cal}
              consumed={calConsumed}
              goal={calGoal}
              strokeClass="stroke-orange-500"
            />
            <MacroRing
              label="Protein"
              pct={macroPcts.pro}
              consumed={nutrition.protein.consumed}
              goal={proGoal}
              strokeClass="stroke-blue-500"
            />
            <MacroRing
              label="Carbs"
              pct={macroPcts.carb}
              consumed={nutrition.carbs.consumed}
              goal={carbGoal}
              strokeClass="stroke-purple-500"
            />
            <MacroRing
              label="Fats"
              pct={macroPcts.fat}
              consumed={nutrition.fat.consumed}
              goal={fatGoal}
              strokeClass="stroke-teal-400"
            />
          </div>
        </Link>

        {/* AI Reflection */}
        <Link
          href="/consultation?from=reflection"
          className="mb-4 block rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/80 via-[#1a1f35] to-black p-4 transition-all hover:border-teal-400/40"
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300/90">
              AI reflection
            </span>
          </div>
          <p className="text-sm font-semibold leading-snug text-white">{aiReflectionLine}</p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <p className="text-gray-400">
              <span className="text-teal-400/90">Review yesterday</span>
              <span className="mx-1.5 text-gray-600">·</span>
              <span className="text-teal-400/90">Set today&apos;s goals</span>
            </p>
            <ChevronRight className="h-4 w-4 shrink-0 text-teal-400" />
          </div>
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
