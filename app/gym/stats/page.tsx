"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Trophy, Flame, TrendingUp, TrendingDown, Dumbbell } from "lucide-react";

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

function calcVolume(exercises: WorkoutExercise[]): number {
  let v = 0;
  exercises.forEach((ex) =>
    ex.sets?.forEach((s) => {
      if (s.completed) v += (Number(s.reps) || 0) * (Number(s.weight) || 0);
    })
  );
  return v;
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

// Smooth SVG area/line chart
function AreaChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  const W = 100;
  const H = 56;
  const PAD = 3;
  const pts = data.map((v, i) => ({
    x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
    y: H - PAD - (v / max) * (H - PAD * 2),
  }));

  let linePath = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = (prev.x + curr.x) / 2;
    linePath += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
  }
  const areaPath =
    linePath + ` L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: 72 }}
      >
        <defs>
          <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaG)" />
        <path
          d={linePath}
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) =>
          data[i] > 0 ? (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === pts.length - 1 ? 2.5 : 1.8}
              fill={i === pts.length - 1 ? "#2dd4bf" : "#0f766e"}
            />
          ) : null
        )}
      </svg>
      {labels.length > 0 && (
        <div className="flex mt-1.5">
          {labels.map((l, i) => (
            <span
              key={i}
              className={`flex-1 text-center text-[9px] font-medium ${
                i === labels.length - 1 ? "text-teal-400" : "text-gray-600"
              }`}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 4-week × 7-day training calendar
function TrainingCalendar({ workoutDates }: { workoutDates: Set<string> }) {
  const today = new Date();
  const dow = today.getDay();
  const daysToMon = dow === 0 ? 6 : dow - 1;
  const mon = new Date(today);
  mon.setDate(today.getDate() - daysToMon);

  const start = new Date(mon);
  start.setDate(mon.getDate() - 21);

  const weeks: Date[][] = Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      return date;
    })
  );

  const todayStr = today.toISOString().split("T")[0];

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[9px] text-gray-600 text-center font-bold uppercase">
            {d}
          </span>
        ))}
      </div>
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((date, di) => {
              const ds = date.toISOString().split("T")[0];
              const isToday = ds === todayStr;
              const isFuture = date > today;
              const hit = workoutDates.has(ds);
              return (
                <div
                  key={di}
                  className={`aspect-square rounded-lg ${
                    isFuture
                      ? "opacity-0 pointer-events-none"
                      : isToday
                      ? hit
                        ? "bg-teal-400 ring-2 ring-teal-300/60 ring-offset-[2px] ring-offset-[#0c1422]"
                        : "ring-2 ring-teal-500/40 ring-offset-[2px] ring-offset-[#0c1422] bg-transparent"
                      : hit
                      ? "bg-teal-500/80"
                      : "bg-white/5"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GymStatsPage() {
  const [weeklyData, setWeeklyData] = useState<number[]>(Array(7).fill(0));
  const [weeklyLabels, setWeeklyLabels] = useState<string[]>([]);
  const [monthlyData, setMonthlyData] = useState<number[]>([]);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0);
  const [activeStreak, setActiveStreak] = useState(0);
  const [volumeDelta, setVolumeDelta] = useState<number | null>(null);
  const [personalRecords, setPersonalRecords] = useState<PREntry[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Weekly volumes
    const vols: number[] = [];
    const lbls: string[] = [];
    let thisWeekVol = 0;
    for (let off = 6; off >= 0; off--) {
      const d = new Date(today);
      d.setDate(today.getDate() - off);
      const ds = d.toISOString().split("T")[0];
      lbls.push(off === 0 ? "Today" : dayNames[d.getDay()].slice(0, 3));
      let v = 0;
      const raw = localStorage.getItem(`workout_data_${ds}`);
      if (raw) { try { v = calcVolume(JSON.parse(raw)); } catch {} }
      vols.push(v);
      thisWeekVol += v;
    }
    setWeeklyData(vols);
    setWeeklyLabels(lbls);
    setWorkoutsThisWeek(vols.filter((v) => v > 0).length);

    // 4-week trend
    const mVols: number[] = [];
    let lastWeekVol = 0;
    for (let w = 3; w >= 0; w--) {
      let wv = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const ds = date.toISOString().split("T")[0];
        const raw = localStorage.getItem(`workout_data_${ds}`);
        if (raw) { try { wv += calcVolume(JSON.parse(raw)); } catch {} }
      }
      if (w === 1) lastWeekVol = wv;
      mVols.push(wv);
    }
    setMonthlyData(mVols);
    if (lastWeekVol > 0) {
      setVolumeDelta(Math.round(((thisWeekVol - lastWeekVol) / lastWeekVol) * 100));
    }

    // All keys newest first
    const allKeys = Object.keys(localStorage)
      .filter((k) => k.startsWith("workout_data_"))
      .sort()
      .reverse();
    setTotalWorkouts(allKeys.length);

    // Dates with volume (for calendar)
    const dates = new Set<string>();
    allKeys.forEach((k) => {
      const ds = k.replace("workout_data_", "");
      try {
        const data = JSON.parse(localStorage.getItem(k) || "[]");
        if (calcVolume(data) > 0) dates.add(ds);
      } catch {}
    });
    setWorkoutDates(dates);

    // Streak
    let streak = 0;
    for (let off = 0; off < 90; off++) {
      const d = new Date(today);
      d.setDate(today.getDate() - off);
      const ds = d.toISOString().split("T")[0];
      const raw = localStorage.getItem(`workout_data_${ds}`);
      if (raw) {
        try { if (calcVolume(JSON.parse(raw)) > 0) { streak++; continue; } } catch {}
      }
      break;
    }
    setActiveStreak(streak);

    // PRs
    const prs: Record<string, { weight: number; reps: number; date: string }> = {};
    allKeys.forEach((k) => {
      const date = k.replace("workout_data_", "");
      try {
        const data: WorkoutExercise[] = JSON.parse(localStorage.getItem(k) || "[]");
        data.forEach((ex) => {
          ex.sets?.forEach((s) => {
            if (s.completed && Number(s.weight) > 0) {
              const cur = prs[ex.name];
              if (!cur || Number(s.weight) > cur.weight) {
                prs[ex.name] = { weight: Number(s.weight), reps: Number(s.reps) || 0, date };
              }
            }
          });
        });
      } catch {}
    });
    setPersonalRecords(
      Object.entries(prs)
        .map(([exercise, v]) => ({ exercise, ...v }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 6)
    );

    // Recent sessions
    const sessions: RecentSession[] = [];
    allKeys.slice(0, 8).forEach((k) => {
      const date = k.replace("workout_data_", "");
      try {
        const data: WorkoutExercise[] = JSON.parse(localStorage.getItem(k) || "[]");
        const volume = calcVolume(data);
        const setCount = data.reduce(
          (s, ex) => s + (ex.sets?.filter((set) => set.completed)?.length || 0),
          0
        );
        if (setCount > 0 || volume > 0)
          sessions.push({ date, volume, exerciseCount: data.length, setCount });
      } catch {}
    });
    setRecentSessions(sessions);
  }, []);

  const isEmpty = totalWorkouts === 0;
  const thisWeekVolume = weeklyData.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/gym/workout" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-5">
              <Dumbbell className="w-9 h-9 text-teal-400/50" />
            </div>
            <h2 className="text-xl font-bold mb-2">No sessions yet</h2>
            <p className="text-gray-400 text-sm mb-8 max-w-[220px] leading-relaxed">
              Complete your first workout to start tracking progress.
            </p>
            <Link
              href="/gym/workout"
              className="px-8 py-3.5 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-2xl transition-colors"
            >
              Start a workout
            </Link>
          </div>
        ) : (
          <>
            {/* Hero card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-teal-900/50 via-[#0c1422] to-black border border-teal-500/25 rounded-2xl p-5 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60 mb-1">
                      This week
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white leading-none">
                        {workoutsThisWeek}
                      </span>
                      <span className="text-gray-400 text-sm">
                        session{workoutsThisWeek !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {thisWeekVolume > 0 && (
                      <p className="text-sm text-teal-300/70 mt-1">
                        {thisWeekVolume.toLocaleString()} kg lifted
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {activeStreak > 0 && (
                      <div className="flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/20 rounded-xl px-3 py-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-sm font-bold text-orange-300">
                          {activeStreak}d streak
                        </span>
                      </div>
                    )}
                    {volumeDelta !== null && (
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold ${
                          volumeDelta >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {volumeDelta >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {volumeDelta >= 0 ? "+" : ""}
                        {volumeDelta}% vs last wk
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/8">
                  <div>
                    <p className="text-2xl font-black text-white">{totalWorkouts}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                      All-time sessions
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">
                      {thisWeekVolume > 0
                        ? `${(thisWeekVolume / 1000).toFixed(1)}k`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                      kg this week
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Training calendar */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60 mb-3">
                Training calendar · last 28 days
              </p>
              <TrainingCalendar workoutDates={workoutDates} />
            </div>

            {/* Volume chart this week */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60">
                  Volume · this week
                </p>
                {thisWeekVolume > 0 && (
                  <span className="text-xs font-semibold text-teal-400">
                    {thisWeekVolume.toLocaleString()} kg
                  </span>
                )}
              </div>
              <AreaChart data={weeklyData} labels={weeklyLabels} />
            </div>

            {/* 4-week trend */}
            {monthlyData.some((v) => v > 0) && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60 mb-3">
                  Volume trend · 4 weeks
                </p>
                <AreaChart
                  data={monthlyData}
                  labels={["3 wks ago", "2 wks ago", "Last week", "This week"]}
                />
              </div>
            )}

            {/* PRs */}
            {personalRecords.length > 0 && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80">
                    Personal records
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {personalRecords.map((pr, i) => (
                    <div
                      key={i}
                      className="bg-black/50 border border-white/6 rounded-xl p-3"
                    >
                      <p className="text-xs font-semibold text-gray-300 truncate mb-2">
                        {pr.exercise}
                      </p>
                      <p className="text-2xl font-black text-yellow-400 leading-none">
                        {pr.weight}
                        <span className="text-sm font-normal text-yellow-500/60 ml-0.5">
                          kg
                        </span>
                      </p>
                      {pr.reps > 0 && (
                        <p className="text-[10px] text-gray-600 mt-0.5">× {pr.reps} reps</p>
                      )}
                      <p className="text-[10px] text-gray-700 mt-1">{formatDate(pr.date)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60">
                    Recent sessions
                  </p>
                </div>
                {recentSessions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 border-t border-white/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{formatDate(s.date)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {s.exerciseCount} exercises · {s.setCount} sets
                      </p>
                    </div>
                    {s.volume > 0 && (
                      <p className="text-sm font-bold text-teal-400">
                        {s.volume.toLocaleString()} kg
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
