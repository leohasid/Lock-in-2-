"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Trophy, Flame, Dumbbell } from "lucide-react";

interface WorkoutExercise {
  name: string;
  sets: Array<{ reps: number; weight: number; completed: boolean }>;
}

interface LiftData {
  name: string;
  weights: number[];
  dates: string[];
  first: number;
  latest: number;
  best: number;
  delta: number;
  sessions: number;
}

interface PREntry {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

function fmt(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch { return ""; }
}

function fmtFull(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch { return dateStr; }
}

function uid(s: string) {
  return s.replace(/[^a-zA-Z0-9]/g, "_");
}

// --- Donut consistency ring ---
function ConsistencyRing({ worked, total }: { worked: number; total: number }) {
  const pct = total > 0 ? Math.min(1, worked / total) : 0;
  const R = 44;
  const C = 2 * Math.PI * R;
  return (
    <svg width={108} height={108} viewBox="0 0 108 108" className="shrink-0">
      <defs>
        <linearGradient id="ringG" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      <circle cx={54} cy={54} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
      {pct > 0 && (
        <circle
          cx={54} cy={54} r={R}
          fill="none"
          stroke="url(#ringG)"
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${pct * C} ${C}`}
          transform="rotate(-90 54 54)"
        />
      )}
      <text x="54" y="48" textAnchor="middle" fontSize="21" fontWeight="900" fill="white">{worked}</text>
      <text x="54" y="62" textAnchor="middle" fontSize="8.5" fill="rgba(156,163,175,0.65)">of {total} days</text>
    </svg>
  );
}

// --- 7-day presence bars ---
function WeekBars({ data, labels, todayIdx }: { data: number[]; labels: string[]; todayIdx: number }) {
  return (
    <div className="flex items-end gap-1.5" style={{ height: 72 }}>
      {data.map((v, i) => {
        const worked = v > 0;
        const isFuture = i > todayIdx;
        const isToday = i === todayIdx;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="w-full rounded-lg transition-all"
              style={{
                height: worked ? 54 : 5,
                background: isFuture
                  ? "rgba(255,255,255,0.03)"
                  : worked
                  ? isToday
                    ? "linear-gradient(to top, #0d9488, #5eead4)"
                    : "linear-gradient(to top, #0d9488, #2dd4bf)"
                  : "rgba(255,255,255,0.06)",
              }}
            />
            <span className={`text-[9px] font-bold ${
              isFuture ? "text-gray-700" : isToday ? "text-teal-400" : "text-gray-500"
            }`}>
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// --- Full line chart per exercise ---
function LiftChart({ lift, index }: { lift: LiftData; index: number }) {
  const pts_n = Math.min(lift.weights.length, 10);
  const wts = lift.weights.slice(-pts_n);
  const dts = lift.dates.slice(-pts_n);

  const rawMin = Math.min(...wts);
  const rawMax = Math.max(...wts);
  const pad = Math.max((rawMax - rawMin) * 0.2, rawMax * 0.08, 3);
  const yMin = Math.max(0, rawMin - pad);
  const yMax = rawMax + pad * 0.5;
  const yRange = yMax - yMin || 1;

  const W = 300, H = 100;
  const ML = 36, MR = 8, MT = 10, MB = 22;
  const cW = W - ML - MR;
  const cH = H - MT - MB;

  const toX = (i: number) => ML + (i / Math.max(wts.length - 1, 1)) * cW;
  const toY = (v: number) => MT + (1 - (v - yMin) / yRange) * cH;

  const pts = wts.map((v, i) => ({ x: toX(i), y: toY(v) }));

  let line = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    line += ` C ${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  const area = `${line} L ${pts[pts.length - 1].x},${MT + cH} L ${pts[0].x},${MT + cH} Z`;

  const yTicks = [
    Math.round(yMin + yRange * 0.1),
    Math.round(yMin + yRange * 0.5),
    Math.round(yMin + yRange * 0.9),
  ];

  const gId = `lg_${index}_${uid(lift.name)}`;
  const isUp = lift.delta >= 0;
  const pctChange = lift.first > 0 ? Math.round(Math.abs((lift.delta / lift.first) * 100)) : 0;

  return (
    <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-white">{lift.name}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{lift.sessions} sessions</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-white leading-none">{lift.latest}kg</p>
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold mt-0.5 px-2 py-0.5 rounded-lg ${
            isUp ? "bg-teal-500/15 text-teal-400" : "bg-red-500/15 text-red-400"
          }`}>
            {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{lift.delta}kg ({pctChange}%)
          </span>
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid + Y labels */}
        {yTicks.map((t, idx) => {
          const y = toY(t);
          return (
            <g key={idx}>
              <line x1={ML} y1={y} x2={W - MR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
              <text x={ML - 4} y={y + 3.5} textAnchor="end" fontSize="7.5" fill="rgba(156,163,175,0.5)">{t}</text>
            </g>
          );
        })}

        {/* Area */}
        <path d={area} fill={`url(#${gId})`} />
        {/* Line */}
        <path d={line} fill="none" stroke="#2dd4bf" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y}
            r={i === pts.length - 1 ? 3.5 : 2.2}
            fill={i === pts.length - 1 ? "#2dd4bf" : "rgba(45,212,191,0.55)"}
          />
        ))}

        {/* X labels: first + last */}
        <text x={pts[0].x} y={H - 4} textAnchor="middle" fontSize="7.5" fill="rgba(156,163,175,0.4)">{fmt(dts[0])}</text>
        {pts.length > 1 && (
          <text x={pts[pts.length - 1].x} y={H - 4} textAnchor="middle" fontSize="7.5" fill="rgba(156,163,175,0.6)">{fmt(dts[dts.length - 1])}</text>
        )}
      </svg>

      {/* Baseline bar */}
      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-white/5">
        <span className="text-[10px] text-gray-600 shrink-0">Started {lift.first}kg</span>
        <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400"
            style={{ width: `${Math.min(100, (lift.latest / lift.best) * 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-teal-400 font-bold shrink-0">Best {lift.best}kg</span>
      </div>
    </div>
  );
}

// --- 4-week training calendar ---
function TrainingCalendar({ workoutDates }: { workoutDates: Set<string> }) {
  const today = new Date();
  const dow = today.getDay();
  const daysToMon = dow === 0 ? 6 : dow - 1;
  const start = new Date(today);
  start.setDate(today.getDate() - daysToMon - 21);

  const weeks = Array.from({ length: 4 }, (_, w) =>
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
          <span key={i} className="text-[9px] text-gray-600 text-center font-bold">{d}</span>
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
                <div key={di} className={`aspect-square rounded-lg ${
                  isFuture ? "opacity-0 pointer-events-none"
                  : isToday
                    ? hit ? "bg-teal-400 ring-2 ring-teal-300/60 ring-offset-[2px] ring-offset-[#0c1422]"
                          : "ring-2 ring-teal-500/40 ring-offset-[2px] ring-offset-[#0c1422]"
                  : hit ? "bg-teal-500/80" : "bg-white/5"
                }`} />
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
  const [thisMonthWorked, setThisMonthWorked] = useState(0);
  const [daysPassedInMonth, setDaysPassedInMonth] = useState(1);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [weeklyData, setWeeklyData] = useState<number[]>(Array(7).fill(0));
  const [weeklyLabels, setWeeklyLabels] = useState<string[]>([]);
  const [weeklyTodayIdx, setWeeklyTodayIdx] = useState(6);
  const [liftData, setLiftData] = useState<LiftData[]>([]);
  const [prs, setPrs] = useState<PREntry[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const ym = todayStr.slice(0, 7);

    setDaysPassedInMonth(today.getDate());

    const allKeys = Object.keys(localStorage)
      .filter(k => k.startsWith("workout_data_"))
      .sort();

    setTotalSessions(allKeys.length);

    const exerciseMap: Record<string, { date: string; maxWeight: number }[]> = {};
    const prMap: Record<string, { weight: number; reps: number; date: string }> = {};
    const datesWithData = new Set<string>();

    allKeys.forEach(k => {
      const date = k.replace("workout_data_", "");
      try {
        const data: WorkoutExercise[] = JSON.parse(localStorage.getItem(k) || "[]");
        let hasData = false;
        data.forEach(ex => {
          if (!ex.name?.trim()) return;
          const name = ex.name.trim();
          let maxW = 0;
          ex.sets?.forEach(s => {
            if (s.completed) {
              hasData = true;
              const w = Number(s.weight) || 0;
              if (w > maxW) maxW = w;
              const cur = prMap[name];
              if (!cur || w > cur.weight)
                prMap[name] = { weight: w, reps: Number(s.reps) || 0, date };
            }
          });
          if (maxW > 0) {
            if (!exerciseMap[name]) exerciseMap[name] = [];
            exerciseMap[name].push({ date, maxWeight: maxW });
          }
        });
        if (hasData) datesWithData.add(date);
      } catch {}
    });

    setWorkoutDates(datesWithData);
    setThisMonthWorked([...datesWithData].filter(d => d.startsWith(ym)).length);

    // Streak
    let s = 0;
    const startOff = datesWithData.has(todayStr) ? 0 : 1;
    for (let off = startOff; off < 90; off++) {
      const d = new Date(today);
      d.setDate(today.getDate() - off);
      if (datesWithData.has(d.toISOString().split("T")[0])) { s++; continue; }
      break;
    }
    setStreak(s);

    // Weekly presence bars
    const dow = today.getDay();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];
    const vols: number[] = [];
    const lbls: string[] = [];
    let todayIdx = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - daysToMon + i);
      const ds = d.toISOString().split("T")[0];
      if (ds === todayStr) todayIdx = i;
      lbls.push(dayLetters[i]);
      vols.push(datesWithData.has(ds) ? 1 : 0);
    }
    setWeeklyData(vols);
    setWeeklyLabels(lbls);
    setWeeklyTodayIdx(todayIdx);

    // Lift progressions (2+ sessions with weights)
    const lifts: LiftData[] = Object.entries(exerciseMap)
      .filter(([, h]) => h.length >= 2)
      .map(([name, h]) => {
        const weights = h.map(x => x.maxWeight);
        const dates = h.map(x => x.date);
        const first = weights[0];
        const latest = weights[weights.length - 1];
        const best = Math.max(...weights);
        return { name, weights, dates, first, latest, best, delta: latest - first, sessions: weights.length };
      })
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 6);

    setLiftData(lifts);

    setPrs(
      Object.entries(prMap)
        .map(([exercise, v]) => ({ exercise, ...v }))
        .filter(pr => pr.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 6)
    );
  }, []);

  const isEmpty = totalSessions === 0;
  const workoutsThisWeek = weeklyData.filter(v => v > 0).length;

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
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
            <Link href="/gym/workout" className="px-8 py-3.5 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-2xl transition-colors">
              Start a workout
            </Link>
          </div>
        ) : (
          <>
            {/* ── HERO: Consistency ring + stats ── */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-4 flex items-center gap-4">
              <ConsistencyRing worked={thisMonthWorked} total={daysPassedInMonth} />
              <div className="flex-1 space-y-2.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">This month</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-teal-400">{thisMonthWorked}</span>
                    <span className="text-sm text-gray-500">workouts</span>
                  </div>
                </div>
                <div className="h-px w-full bg-white/6" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wide">All-time</p>
                    <p className="text-xl font-black text-white">{totalSessions}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wide">Streak</p>
                    <div className="flex items-center gap-1">
                      {streak > 0 && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                      <p className="text-xl font-black text-white">{streak}d</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── THIS WEEK bar chart ── */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-white">This week</p>
                <span className="text-[11px] font-semibold text-teal-400">{workoutsThisWeek} / 7 days</span>
              </div>
              <WeekBars data={weeklyData} labels={weeklyLabels} todayIdx={weeklyTodayIdx} />
            </div>

            {/* ── STRENGTH PROGRESS charts ── */}
            {liftData.length > 0 && (
              <div className="mb-4">
                <div className="flex items-end justify-between mb-3">
                  <h2 className="text-base font-bold text-white">Strength Progress</h2>
                  <span className="text-[11px] text-gray-600">max weight · per session</span>
                </div>
                <div className="space-y-3">
                  {liftData.map((lift, i) => (
                    <LiftChart key={lift.name} lift={lift} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* ── TRAINING CALENDAR ── */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/60 mb-3">
                Training Calendar · last 28 days
              </p>
              <TrainingCalendar workoutDates={workoutDates} />
            </div>

            {/* ── PERSONAL RECORDS ── */}
            {prs.length > 0 && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80">Personal Records</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {prs.map((pr, i) => (
                    <div key={i} className="bg-black/50 border border-yellow-500/10 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-400 truncate mb-1.5">{pr.exercise}</p>
                      <p className="text-2xl font-black text-yellow-400 leading-none">
                        {pr.weight}<span className="text-sm font-normal text-yellow-600/50 ml-0.5">kg</span>
                      </p>
                      {pr.reps > 0 && <p className="text-[10px] text-gray-600 mt-0.5">× {pr.reps} reps</p>}
                      <p className="text-[10px] text-gray-700 mt-1">{fmtFull(pr.date)}</p>
                    </div>
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
