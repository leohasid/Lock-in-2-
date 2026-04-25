"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Trophy, Flame, Dumbbell, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  avgReps: number;
}

interface PREntry {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

interface SessionEntry {
  date: string;
  exercises: { name: string; topWeight: number; completedSets: number }[];
  totalSets: number;
}

function fmtShort(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch { return dateStr; }
}

function fmtDay(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  } catch { return dateStr; }
}

// ── Smooth bezier line chart ──
function LiftChart({ lift, idx }: { lift: LiftData; idx: number }) {
  const pts_n = Math.min(lift.weights.length, 12);
  const wts = lift.weights.slice(-pts_n);
  const dts = lift.dates.slice(-pts_n);

  const rawMin = Math.min(...wts);
  const rawMax = Math.max(...wts);
  const pad = Math.max((rawMax - rawMin) * 0.25, rawMax * 0.06, 2);
  const yMin = Math.max(0, rawMin - pad);
  const yMax = rawMax + pad * 0.4;
  const yRange = yMax - yMin || 1;

  const W = 320, H = 90;
  const ML = 32, MR = 6, MT = 8, MB = 18;
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

  const yTicks = [Math.round(yMin + yRange * 0.15), Math.round(yMin + yRange * 0.55), Math.round(yMin + yRange * 0.9)];
  const gId = `lg_${idx}`;
  const isUp = lift.delta > 0;
  const isFlat = lift.delta === 0;
  const pctChange = lift.first > 0 ? Math.round(Math.abs((lift.delta / lift.first) * 100)) : 0;

  return (
    <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{lift.name}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">{lift.sessions} sessions · best {lift.best}kg</p>
        </div>
        <div className="text-right ml-3 shrink-0">
          <p className="text-xl font-black text-white leading-none">{lift.latest}<span className="text-xs font-normal text-gray-600 ml-0.5">kg</span></p>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-lg ${
            isFlat ? "bg-white/6 text-gray-500"
            : isUp ? "bg-teal-500/15 text-teal-400"
            : "bg-red-500/15 text-red-400"
          }`}>
            {isFlat ? <Minus className="w-2.5 h-2.5" /> : isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {isFlat ? "No change" : `${isUp ? "+" : ""}${lift.delta}kg (${pctChange}%)`}
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => {
          const y = toY(t);
          return (
            <g key={i}>
              <line x1={ML} y1={y} x2={W - MR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.7" />
              <text x={ML - 4} y={y + 3} textAnchor="end" fontSize="7" fill="rgba(156,163,175,0.4)">{t}</text>
            </g>
          );
        })}
        <path d={area} fill={`url(#${gId})`} />
        <path d={line} fill="none" stroke="#2dd4bf" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y}
            r={i === pts.length - 1 ? 3.5 : 2}
            fill={i === pts.length - 1 ? "#2dd4bf" : "rgba(45,212,191,0.45)"}
          />
        ))}
        {pts.length > 0 && (
          <text x={pts[0].x} y={H - 3} textAnchor="middle" fontSize="7" fill="rgba(156,163,175,0.35)">{fmtShort(dts[0])}</text>
        )}
        {pts.length > 1 && (
          <text x={pts[pts.length - 1].x} y={H - 3} textAnchor="middle" fontSize="7" fill="rgba(156,163,175,0.55)">{fmtShort(dts[dts.length - 1])}</text>
        )}
      </svg>
    </div>
  );
}

// ── Volume bar chart (sets per session) ──
function VolumeChart({ sessions }: { sessions: SessionEntry[] }) {
  const recent = sessions.slice(-8);
  if (recent.length < 2) return null;
  const maxSets = Math.max(...recent.map(s => s.totalSets), 1);

  return (
    <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-white">Training Volume</p>
        <span className="text-[10px] text-gray-600">sets per session</span>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 64 }}>
        {recent.map((s, i) => {
          const pct = (s.totalSets / maxSets) * 100;
          const isLast = i === recent.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[8px] text-gray-600 tabular-nums">{s.totalSets}</span>
              <div
                className="w-full rounded-md transition-all"
                style={{
                  height: Math.max(4, (pct / 100) * 44),
                  background: isLast
                    ? "linear-gradient(to top, #0d9488, #5eead4)"
                    : "rgba(45,212,191,0.25)",
                }}
              />
              <span className="text-[8px] text-gray-700 truncate w-full text-center">{fmtShort(s.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 7-day consistency dots ──
function WeekDots({ workoutDates }: { workoutDates: Set<string> }) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dow = today.getDay();
  const daysToMon = dow === 0 ? 6 : dow - 1;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - daysToMon + i);
    const ds = d.toISOString().split("T")[0];
    return { ds, label: ["M","T","W","T","F","S","S"][i], isFuture: ds > todayStr, isToday: ds === todayStr };
  });

  return (
    <div className="flex gap-2 justify-between">
      {days.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className={`w-full aspect-square rounded-lg max-w-[36px] ${
            d.isFuture ? "bg-white/3"
            : workoutDates.has(d.ds)
              ? d.isToday ? "bg-teal-400 ring-2 ring-teal-300/50 ring-offset-1 ring-offset-[#0c1422]"
                          : "bg-teal-500/70"
              : d.isToday ? "ring-1 ring-teal-500/40 ring-offset-1 ring-offset-[#0c1422] bg-transparent"
                          : "bg-white/6"
          }`} />
          <span className={`text-[9px] font-bold ${
            d.isFuture ? "text-gray-700" : d.isToday ? "text-teal-400" : "text-gray-600"
          }`}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function GymStatsPage() {
  const [totalSessions, setTotalSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [liftData, setLiftData] = useState<LiftData[]>([]);
  const [prs, setPrs] = useState<PREntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [aiMsg, setAiMsg] = useState("");
  const [aiFetching, setAiFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "lifts" | "records">("overview");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const allKeys = Object.keys(localStorage).filter(k => k.startsWith("workout_data_")).sort();
    setTotalSessions(allKeys.length);

    const exerciseMap: Record<string, { date: string; maxWeight: number; maxReps: number }[]> = {};
    const prMap: Record<string, { weight: number; reps: number; date: string }> = {};
    const datesSet = new Set<string>();
    const sessionList: SessionEntry[] = [];

    allKeys.forEach(k => {
      const date = k.replace("workout_data_", "");
      try {
        const data: WorkoutExercise[] = JSON.parse(localStorage.getItem(k) || "[]");
        let hasData = false;
        const sexs: SessionEntry["exercises"] = [];
        data.forEach(ex => {
          if (!ex.name?.trim()) return;
          const name = ex.name.trim();
          let maxW = 0, maxR = 0, completedSets = 0;
          ex.sets?.forEach(s => {
            if (s.completed) {
              hasData = true;
              const w = Number(s.weight) || 0;
              const r = Number(s.reps) || 0;
              if (w > maxW) { maxW = w; maxR = r; }
              completedSets++;
              if (!prMap[name] || w > prMap[name].weight) prMap[name] = { weight: w, reps: r, date };
            }
          });
          if (maxW > 0) {
            if (!exerciseMap[name]) exerciseMap[name] = [];
            exerciseMap[name].push({ date, maxWeight: maxW, maxReps: maxR });
            sexs.push({ name, topWeight: maxW, completedSets });
          }
        });
        if (hasData) {
          datesSet.add(date);
          sessionList.push({ date, exercises: sexs, totalSets: sexs.reduce((a, e) => a + e.completedSets, 0) });
        }
      } catch {}
    });

    setWorkoutDates(datesSet);

    // Streak
    let s = 0;
    const startOff = datesSet.has(todayStr) ? 0 : 1;
    for (let off = startOff; off < 90; off++) {
      const d = new Date(today);
      d.setDate(today.getDate() - off);
      if (datesSet.has(d.toISOString().split("T")[0])) { s++; continue; }
      break;
    }
    setStreak(s);

    const dow = today.getDay();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    let wc = 0;
    for (let i = 0; i <= daysToMon; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (datesSet.has(d.toISOString().split("T")[0])) wc++;
    }
    setWeekCount(wc);

    const lifts: LiftData[] = Object.entries(exerciseMap)
      .filter(([, h]) => h.length >= 2)
      .map(([name, h]) => {
        const weights = h.map(x => x.maxWeight);
        const dates = h.map(x => x.date);
        const reps = h.map(x => x.maxReps);
        const avgReps = reps.length > 0 ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length) : 0;
        const first = weights[0], latest = weights[weights.length - 1], best = Math.max(...weights);
        return { name, weights, dates, first, latest, best, delta: latest - first, sessions: weights.length, avgReps };
      })
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);

    setLiftData(lifts);
    setSessions(sessionList);
    setPrs(
      Object.entries(prMap)
        .map(([exercise, v]) => ({ exercise, ...v }))
        .filter(pr => pr.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10)
    );

    // AI analysis — cached weekly
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    const weekKey = mon.toISOString().split("T")[0];
    const cacheKey = `gymAI_week_${weekKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setAiMsg(cached); return; }

    if (allKeys.length === 0) return;

    // Build data for AI
    const improvingLifts = Object.entries(exerciseMap)
      .filter(([, h]) => h.length >= 2)
      .map(([name, h]) => {
        const first = h[0].maxWeight, latest = h[h.length - 1].maxWeight;
        return { name, delta: latest - first, latest, sessions: h.length };
      })
      .filter(l => l.delta > 0)
      .sort((a, b) => b.delta - a.delta);

    const stagnantLifts = Object.entries(exerciseMap)
      .filter(([, h]) => h.length >= 3)
      .map(([name, h]) => {
        const recent = h.slice(-3).map(x => x.maxWeight);
        const spread = Math.max(...recent) - Math.min(...recent);
        return { name, spread, latest: h[h.length - 1].maxWeight };
      })
      .filter(l => l.spread === 0);

    const totalSets = sessionList.reduce((a, s) => a + s.totalSets, 0);
    const avgSetsPerSession = sessionList.length > 0 ? Math.round(totalSets / sessionList.length) : 0;

    const prompt = `You are a gym coach analysing a user's training data. Provide a 2-3 sentence performance summary.

Sessions: ${allKeys.length} total, ${wc} this week, streak ${s} days.
Avg sets per session: ${avgSetsPerSession}.
Improving lifts: ${improvingLifts.length > 0 ? improvingLifts.slice(0, 3).map(l => `${l.name} +${l.delta}kg over ${l.sessions} sessions`).join(", ") : "none yet"}.
Stagnant lifts (no change last 3 sessions): ${stagnantLifts.length > 0 ? stagnantLifts.slice(0, 2).map(l => l.name).join(", ") : "none"}.
Top PRs: ${Object.entries(prMap).filter(([,v]) => v.weight > 0).sort(([,a],[,b]) => b.weight - a.weight).slice(0, 3).map(([name, v]) => `${name} ${v.weight}kg`).join(", ")}.

Rules:
- Reference specific numbers from the data.
- If lifts are improving, acknowledge and encourage.
- If lifts are stagnant, give ONE specific actionable tip (progressive overload, sleep, protein, deload week, etc.).
- Be direct, coach-like, no fluff. No emojis. Max 40 words total.`;

    setAiFetching(true);
    fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "general", data: { prompt } }),
    })
      .then(r => r.json())
      .then(d => {
        const msg = d.result || d.message || "";
        if (msg) {
          setAiMsg(msg);
          localStorage.setItem(cacheKey, msg);
          // Remove old gym AI cache keys
          Object.keys(localStorage)
            .filter(k => k.startsWith("gymAI_week_") && k !== cacheKey)
            .forEach(k => localStorage.removeItem(k));
        }
      })
      .catch(() => {})
      .finally(() => setAiFetching(false));
  }, []);

  const isEmpty = totalSessions === 0;
  const workoutsThisWeek = weekCount;

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 pt-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/gym/workout" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold leading-none">Progress</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">Your training performance</p>
          </div>
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
            {/* AI Analysis Card */}
            <div className="relative overflow-hidden rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f2a2a 60%, #071a14 100%)" }}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400/70">AI Coach Analysis</span>
                </div>
                {aiFetching ? (
                  <div className="flex gap-1 py-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                ) : aiMsg ? (
                  <p className="text-[13px] text-gray-300 leading-relaxed">{aiMsg}</p>
                ) : (
                  <p className="text-[12px] text-gray-600 leading-relaxed">Log more sessions to unlock your personalised AI analysis.</p>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-white leading-none mb-1">{totalSessions}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Sessions</p>
              </div>
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {streak > 0 && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                  <p className={`text-2xl font-black leading-none ${streak > 0 ? "text-orange-400" : "text-white"}`}>{streak}d</p>
                </div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Streak</p>
              </div>
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-teal-400 leading-none mb-1">{workoutsThisWeek}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">This week</p>
              </div>
            </div>

            {/* Tab bar */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-1 flex gap-1 mb-4">
              {(["overview", "lifts", "records"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold capitalize transition-all ${
                    activeTab === tab ? "bg-teal-400 text-black" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab === "overview" ? "Overview" : tab === "lifts" ? "Strength" : "Records"}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <div className="space-y-3">
                {/* This week dots */}
                <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
                  <p className="text-sm font-bold text-white mb-3">This week</p>
                  <WeekDots workoutDates={workoutDates} />
                </div>

                {/* Volume chart */}
                {sessions.length >= 2 && <VolumeChart sessions={sessions} />}

                {/* Recent sessions */}
                <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
                  <p className="text-sm font-bold text-white mb-3">Recent sessions</p>
                  <div className="space-y-3">
                    {sessions.slice().reverse().slice(0, 4).map((s, i) => (
                      <div key={i}>
                        {i > 0 && <div className="h-px bg-white/5 mb-3" />}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[12px] font-semibold text-gray-300">{fmtDay(s.date)}</span>
                          <span className="text-[10px] text-gray-600 bg-white/5 rounded-lg px-2 py-0.5">{s.totalSets} sets</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {s.exercises.slice(0, 5).map((ex, j) => (
                            <span key={j} className="text-[10px] text-gray-500 bg-white/4 border border-white/6 rounded-lg px-2 py-0.5">
                              {ex.name} <span className="text-white font-bold">{ex.topWeight}kg</span>
                            </span>
                          ))}
                          {s.exercises.length > 5 && (
                            <span className="text-[10px] text-gray-700 px-1">+{s.exercises.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STRENGTH / LIFTS TAB ── */}
            {activeTab === "lifts" && (
              <div className="space-y-3">
                {liftData.length === 0 ? (
                  <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-8 text-center">
                    <p className="text-gray-500 text-sm">Need 2+ sessions per exercise to show charts.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold px-1">
                      Max weight per session
                    </p>
                    {liftData.map((lift, i) => <LiftChart key={lift.name} lift={lift} idx={i} />)}
                  </>
                )}
              </div>
            )}

            {/* ── RECORDS TAB ── */}
            {activeTab === "records" && (
              <div>
                {prs.length === 0 ? (
                  <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-8 text-center">
                    <p className="text-gray-500 text-sm">No records yet — log sets with weights.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                      <p className="text-[11px] text-yellow-400/70 font-semibold uppercase tracking-widest">Personal Records</p>
                    </div>
                    <div className="space-y-2">
                      {prs.map((pr, i) => (
                        <div key={i} className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 flex items-center gap-4">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            i === 0 ? "bg-yellow-400/15 border border-yellow-400/25"
                            : i === 1 ? "bg-gray-400/10 border border-gray-400/20"
                            : i === 2 ? "bg-amber-700/15 border border-amber-700/25"
                            : "bg-white/5 border border-white/8"
                          }`}>
                            <span className={`text-[11px] font-black ${
                              i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-600"
                            }`}>#{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{pr.exercise}</p>
                            <p className="text-[10px] text-gray-600 mt-0.5">
                              {fmtShort(pr.date)}{pr.reps > 0 ? ` · ${pr.reps} reps` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xl font-black text-yellow-400 leading-none">
                              {pr.weight}<span className="text-xs font-normal text-yellow-600/50 ml-0.5">kg</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
