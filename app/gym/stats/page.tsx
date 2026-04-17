"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, TrendingUp, TrendingDown, Trophy, Calendar, Dumbbell, Flame, ChevronRight } from "lucide-react";

interface WorkoutExercise {
  name: string;
  sets: Array<{ reps: number; weight: number; completed: boolean }>;
}

interface PREntry {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

interface RecentSession {
  date: string;
  volume: number;
  exerciseCount: number;
  setCount: number;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function calcVolume(exercises: WorkoutExercise[]): number {
  let v = 0;
  exercises.forEach((ex) =>
    ex.sets?.forEach((s) => {
      if (s.completed) v += (Number(s.reps) || 0) * (Number(s.weight) || 0);
    })
  );
  return v;
}

function BarChart({
  bars,
  highlightLast = true,
}: {
  bars: { value: number; label: string }[];
  highlightLast?: boolean;
}) {
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: 80 }}>
      {bars.map((bar, i) => {
        const heightPct = (bar.value / maxVal) * 100;
        const isHighlighted = highlightLast && i === bars.length - 1;
        const hasValue = bar.value > 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative rounded-sm" style={{ height: 64 }}>
              <div className="w-full h-full bg-white/5 rounded-sm" />
              {hasValue && (
                <div
                  className={`w-full rounded-sm absolute bottom-0 transition-all duration-500 ${
                    isHighlighted ? "bg-teal-400" : "bg-teal-600/60"
                  }`}
                  style={{ height: `${Math.max(heightPct, 6)}%` }}
                />
              )}
            </div>
            <span
              className={`text-[9px] font-medium leading-none ${
                isHighlighted ? "text-teal-400" : "text-gray-500"
              }`}
            >
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function GymStatsPage() {
  const [weeklyBars, setWeeklyBars] = useState<{ value: number; label: string }[]>([]);
  const [monthlyBars, setMonthlyBars] = useState<{ value: number; label: string }[]>([]);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0);
  const [activeStreak, setActiveStreak] = useState(0);
  const [volumeDelta, setVolumeDelta] = useState<number | null>(null);
  const [personalRecords, setPersonalRecords] = useState<PREntry[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const today = new Date();
    const dayShortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Weekly bars
    const weekly: { value: number; label: string }[] = [];
    let thisWeekVol = 0;
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const dateStr = d.toISOString().split("T")[0];
      const label = offset === 0 ? "Today" : dayShortNames[d.getDay()];
      let vol = 0;
      const raw = localStorage.getItem(`workout_data_${dateStr}`);
      if (raw) {
        try {
          vol = calcVolume(JSON.parse(raw));
        } catch {}
      }
      weekly.push({ value: vol, label });
      thisWeekVol += vol;
    }
    setWeeklyBars(weekly);
    setWorkoutsThisWeek(weekly.filter((b) => b.value > 0).length);

    // Monthly bars + delta
    const monthly: { value: number; label: string }[] = [];
    let lastWeekVol = 0;
    for (let w = 3; w >= 0; w--) {
      let weekVol = 0;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - w * 7 - 6);
      const label =
        w === 0
          ? "This wk"
          : weekStart.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const dateStr = date.toISOString().split("T")[0];
        const raw = localStorage.getItem(`workout_data_${dateStr}`);
        if (raw) {
          try {
            weekVol += calcVolume(JSON.parse(raw));
          } catch {}
        }
      }
      if (w === 1) lastWeekVol = weekVol;
      monthly.push({ value: weekVol, label });
    }
    setMonthlyBars(monthly);
    if (lastWeekVol > 0) {
      setVolumeDelta(
        Math.round(((thisWeekVol - lastWeekVol) / lastWeekVol) * 100)
      );
    }

    // All session keys sorted newest first
    const allKeys = Object.keys(localStorage)
      .filter((k) => k.startsWith("workout_data_"))
      .sort()
      .reverse();
    setTotalWorkouts(allKeys.length);

    // Streak
    let streak = 0;
    for (let offset = 0; offset < 90; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const dateStr = d.toISOString().split("T")[0];
      const raw = localStorage.getItem(`workout_data_${dateStr}`);
      if (raw) {
        try {
          if (calcVolume(JSON.parse(raw)) > 0) {
            streak++;
            continue;
          }
        } catch {}
      }
      break;
    }
    setActiveStreak(streak);

    // Personal records
    const prs: Record<string, { weight: number; reps: number; date: string }> = {};
    allKeys.forEach((key) => {
      const date = key.replace("workout_data_", "");
      try {
        const data: WorkoutExercise[] = JSON.parse(localStorage.getItem(key) || "[]");
        data.forEach((ex) => {
          ex.sets?.forEach((s) => {
            if (s.completed && Number(s.weight) > 0) {
              const cur = prs[ex.name];
              if (!cur || Number(s.weight) > cur.weight) {
                prs[ex.name] = {
                  weight: Number(s.weight),
                  reps: Number(s.reps) || 0,
                  date,
                };
              }
            }
          });
        });
      } catch {}
    });
    const prList = Object.entries(prs)
      .map(([exercise, v]) => ({ exercise, ...v }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);
    setPersonalRecords(prList);

    // Recent sessions
    const sessions: RecentSession[] = [];
    allKeys.slice(0, 8).forEach((key) => {
      const date = key.replace("workout_data_", "");
      try {
        const data: WorkoutExercise[] = JSON.parse(localStorage.getItem(key) || "[]");
        const volume = calcVolume(data);
        const setCount = data.reduce(
          (sum, ex) => sum + (ex.sets?.filter((s) => s.completed)?.length || 0),
          0
        );
        if (setCount > 0 || volume > 0) {
          sessions.push({ date, volume, exerciseCount: data.length, setCount });
        }
      } catch {}
    });
    setRecentSessions(sessions);
  }, []);

  const isEmpty = totalWorkouts === 0;

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/gym/workout"
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Progress</h1>
        </div>

        {isEmpty ? (
          <div className="bg-[#0c1422] border border-teal-500/20 rounded-2xl p-8 text-center mt-8">
            <Dumbbell className="w-10 h-10 text-teal-400/40 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No workouts yet</p>
            <p className="text-sm text-gray-400 mb-5">
              Complete your first workout to track progress here.
            </p>
            <Link
              href="/gym/workout"
              className="inline-block px-6 py-3 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-xl transition-colors text-sm"
            >
              Start a workout
            </Link>
          </div>
        ) : (
          <>
            {/* Hero stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-teal-400">{totalWorkouts}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">Sessions</p>
              </div>
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-teal-400">{workoutsThisWeek}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">This week</p>
              </div>
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{activeStreak}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide flex items-center justify-center gap-0.5">
                  <Flame className="w-2.5 h-2.5" /> Streak
                </p>
              </div>
            </div>

            {/* Volume delta chip */}
            {volumeDelta !== null && (
              <div
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 mb-4 ${
                  volumeDelta >= 0
                    ? "bg-green-500/10 border-green-500/25 text-green-400"
                    : "bg-red-500/10 border-red-500/25 text-red-400"
                }`}
              >
                {volumeDelta >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-bold">
                  {volumeDelta >= 0 ? "+" : ""}
                  {volumeDelta}% volume vs last week
                </span>
              </div>
            )}

            {/* This week chart */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/70 mb-3">
                This week
              </p>
              <BarChart bars={weeklyBars} highlightLast />
              <p className="text-xs text-gray-600 mt-2 text-center">
                {weeklyBars
                  .reduce((s, b) => s + b.value, 0)
                  .toLocaleString()}{" "}
                kg total volume
              </p>
            </div>

            {/* 4-week trend */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/70 mb-3">
                4-week trend
              </p>
              <BarChart bars={monthlyBars} highlightLast />
            </div>

            {/* Personal records */}
            {personalRecords.length > 0 && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80">
                    Personal records
                  </p>
                </div>
                <div className="space-y-0">
                  {personalRecords.map((pr, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {pr.exercise}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatDate(pr.date)}
                        </p>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <p className="text-sm font-bold text-yellow-400">
                          {pr.weight} kg
                        </p>
                        {pr.reps > 0 && (
                          <p className="text-[10px] text-gray-500">
                            × {pr.reps} reps
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/70">
                    Recent sessions
                  </p>
                </div>
                <div className="space-y-0">
                  {recentSessions.map((s, i) => (
                    <Link
                      key={i}
                      href="/gym/workout"
                      className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 hover:opacity-80 transition-opacity"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {formatDate(s.date)}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {s.exerciseCount} exercise{s.exerciseCount !== 1 ? "s" : ""} ·{" "}
                          {s.setCount} sets
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.volume > 0 && (
                          <span className="text-sm font-bold text-teal-400">
                            {s.volume.toLocaleString()} kg
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
