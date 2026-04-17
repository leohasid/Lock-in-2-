"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Trophy, Flame, TrendingUp, TrendingDown, Dumbbell } from "lucide-react";

interface WorkoutExercise {
  name: string;
  sets: Array<{ reps: number; weight: number; completed: boolean }>;
}

interface LiftProgress {
  name: string;
  weights: number[];
  first: number;
  latest: number;
  delta: number;
  sessions: number;
}

interface PREntry {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
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

function Sparkline({ weights, positive }: { weights: number[]; positive: boolean }) {
  const data = weights.slice(-7);
  if (data.length < 2) return <div style={{ width: 72, height: 36 }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 72, H = 36, PAD = 3;

  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((v - min) / range) * (H - PAD * 2),
  }));

  let path = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    path += ` C ${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }

  const areaPath = `${path} L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`;
  const stroke = positive ? "#2dd4bf" : "#f87171";
  const fill = positive ? "rgba(45,212,191,0.12)" : "rgba(248,113,113,0.12)";
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: 72, height: 36, flexShrink: 0 }}>
      <path d={areaPath} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="2.5" fill={stroke} />
    </svg>
  );
}

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
          <span key={i} className="text-[9px] text-gray-600 text-center font-bold uppercase">{d}</span>
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
  const [totalSessions, setTotalSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [thisMonthCount, setThisMonthCount] = useState(0);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [liftProgress, setLiftProgress] = useState<LiftProgress[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PREntry[]>([]);
  const [recentSessions, setRecentSessions] = useState<
    { date: string; exerciseCount: number; setCount: number }[]
  >([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const allKeys = Object.keys(localStorage)
      .filter((k) => k.startsWith("workout_data_"))
      .sort(); // oldest → newest

    // Per-exercise weight history: name → [{date, maxWeight}]
    const exerciseMap: Record<string, { date: string; maxWeight: number }[]> = {};
    const prs: Record<string, { weight: number; reps: number; date: string }> = {};
    const datesWithData = new Set<string>();
    const sessionsArr: { date: string; exerciseCount: number; setCount: number }[] = [];

    allKeys.forEach((k) => {
      const date = k.replace("workout_data_", "");
      try {
        const data: WorkoutExercise[] = JSON.parse(localStorage.getItem(k) || "[]");
        let setCount = 0;
        let hasData = false;

        data.forEach((ex) => {
          if (!ex.name?.trim()) return;
          const name = ex.name.trim();
          let maxW = 0;
          ex.sets?.forEach((s) => {
            if (s.completed) {
              setCount++;
              hasData = true;
              const w = Number(s.weight) || 0;
              if (w > maxW) maxW = w;
              const cur = prs[name];
              if (!cur || w > cur.weight) {
                prs[name] = { weight: w, reps: Number(s.reps) || 0, date };
              }
            }
          });
          if (maxW > 0) {
            if (!exerciseMap[name]) exerciseMap[name] = [];
            exerciseMap[name].push({ date, maxWeight: maxW });
          }
        });

        if (hasData) {
          datesWithData.add(date);
          sessionsArr.push({ date, exerciseCount: data.length, setCount });
        }
      } catch {}
    });

    setTotalSessions(allKeys.length);
    setWorkoutDates(datesWithData);
    setRecentSessions([...sessionsArr].reverse().slice(0, 6));

    const ym = todayStr.slice(0, 7);
    setThisMonthCount([...datesWithData].filter((d) => d.startsWith(ym)).length);

    // Streak: consecutive days with workout (allow today to be in-progress)
    let s = 0;
    const startOff = datesWithData.has(todayStr) ? 0 : 1;
    for (let off = startOff; off < 90; off++) {
      const d = new Date(today);
      d.setDate(today.getDate() - off);
      if (datesWithData.has(d.toISOString().split("T")[0])) { s++; continue; }
      break;
    }
    setStreak(s);

    // Lift progressions: exercises with 2+ sessions
    const progresses: LiftProgress[] = Object.entries(exerciseMap)
      .filter(([, history]) => history.length >= 2)
      .map(([name, history]) => {
        const weights = history.map((h) => h.maxWeight);
        const first = weights[0];
        const latest = weights[weights.length - 1];
        return { name, weights, first, latest, delta: latest - first, sessions: weights.length };
      })
      .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))
      .slice(0, 8);

    setLiftProgress(progresses);

    setPersonalRecords(
      Object.entries(prs)
        .map(([exercise, v]) => ({ exercise, ...v }))
        .filter((pr) => pr.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 6)
    );
  }, []);

  const isEmpty = totalSessions === 0;

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
            {/* Hero stats — 3 tiles */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white leading-none">{totalSessions}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide mt-1.5 text-center leading-tight">
                  Sessions
                </span>
              </div>
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 flex flex-col items-center justify-center">
                <div className="flex items-center gap-0.5">
                  {streak > 0 && <Flame className="w-4 h-4 text-orange-400 mb-0.5" />}
                  <span className="text-3xl font-black text-white leading-none">{streak}</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide mt-1.5 text-center leading-tight">
                  Day streak
                </span>
              </div>
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-teal-400 leading-none">{thisMonthCount}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide mt-1.5 text-center leading-tight">
                  This month
                </span>
              </div>
            </div>

            {/* Strength Trends */}
            {liftProgress.length > 0 && (
              <div className="mb-5">
                <div className="flex items-end justify-between mb-3">
                  <h2 className="text-base font-bold text-white">Strength Trends</h2>
                  <span className="text-[11px] text-gray-600">max weight / session</span>
                </div>
                <div className="space-y-2">
                  {liftProgress.map((lift, i) => {
                    const isUp = lift.delta >= 0;
                    return (
                      <div
                        key={i}
                        className="bg-[#0c1422] border border-white/8 rounded-2xl px-4 py-3.5 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{lift.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xl font-black text-white leading-none">
                              {lift.latest}
                              <span className="text-sm font-normal text-gray-500 ml-0.5">kg</span>
                            </span>
                            <span
                              className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-lg ${
                                isUp
                                  ? "bg-teal-500/15 text-teal-400"
                                  : "bg-red-500/15 text-red-400"
                              }`}
                            >
                              {isUp ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {isUp ? "+" : ""}
                              {lift.delta}kg
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {lift.sessions} sessions · started at {lift.first}kg
                          </p>
                        </div>
                        <Sparkline weights={lift.weights} positive={isUp} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Training Calendar */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60 mb-3">
                Training calendar · last 28 days
              </p>
              <TrainingCalendar workoutDates={workoutDates} />
            </div>

            {/* Personal Records */}
            {personalRecords.length > 0 && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80">
                    Personal Records
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {personalRecords.map((pr, i) => (
                    <div
                      key={i}
                      className="bg-black/50 border border-yellow-500/10 rounded-xl p-3"
                    >
                      <p className="text-xs font-semibold text-gray-400 truncate mb-1.5">
                        {pr.exercise}
                      </p>
                      <p className="text-2xl font-black text-yellow-400 leading-none">
                        {pr.weight}
                        <span className="text-sm font-normal text-yellow-600/50 ml-0.5">kg</span>
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

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60">
                    Recent Sessions
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
                    <div className="w-2 h-2 rounded-full bg-teal-400/40" />
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
