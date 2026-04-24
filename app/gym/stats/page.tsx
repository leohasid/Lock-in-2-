"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Trophy, Flame, Dumbbell, TrendingUp, Target, Zap, Calendar } from "lucide-react";

interface WorkoutExercise {
  name: string;
  sets: Array<{ reps: number; weight: number; completed: boolean }>;
}

interface ExerciseGuide {
  name: string;
  lastWeight: number;
  lastReps: number;
  suggested: number;
  pr: number;
  sessions: number;
  trend: "up" | "flat" | "down";
  lastDate: string;
}

interface SessionEntry {
  date: string;
  exercises: { name: string; topWeight: number; sets: number }[];
  totalSets: number;
}

interface PREntry {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

function fmtDate(dateStr: string): string {
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

function fmtShort(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch { return dateStr; }
}

function StatPill({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="flex-1 bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
      <p className={`text-2xl font-black leading-none mb-1 ${accent ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-[9px] text-gray-600 mb-0.5">{sub}</p>}
      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 w-full bg-white/6 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

export default function GymStatsPage() {
  const [totalSessions, setTotalSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [guides, setGuides] = useState<ExerciseGuide[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionEntry[]>([]);
  const [prs, setPrs] = useState<PREntry[]>([]);
  const [activeTab, setActiveTab] = useState<"guide" | "history" | "records">("guide");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const allKeys = Object.keys(localStorage)
      .filter(k => k.startsWith("workout_data_"))
      .sort();

    setTotalSessions(allKeys.length);

    const exerciseHistory: Record<string, { date: string; maxWeight: number; maxReps: number; sets: number }[]> = {};
    const prMap: Record<string, { weight: number; reps: number; date: string }> = {};
    const datesWithData = new Set<string>();
    const sessions: SessionEntry[] = [];

    allKeys.forEach(k => {
      const date = k.replace("workout_data_", "");
      try {
        const data: WorkoutExercise[] = JSON.parse(localStorage.getItem(k) || "[]");
        let hasData = false;
        const sessionExercises: SessionEntry["exercises"] = [];

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
              if (!prMap[name] || w > prMap[name].weight)
                prMap[name] = { weight: w, reps: r, date };
            }
          });
          if (maxW > 0) {
            if (!exerciseHistory[name]) exerciseHistory[name] = [];
            exerciseHistory[name].push({ date, maxWeight: maxW, maxReps: maxR, sets: completedSets });
            sessionExercises.push({ name, topWeight: maxW, sets: completedSets });
          }
        });

        if (hasData) {
          datesWithData.add(date);
          sessions.push({ date, exercises: sessionExercises, totalSets: sessionExercises.reduce((a, e) => a + e.sets, 0) });
        }
      } catch {}
    });

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

    // This week count
    const dow = today.getDay();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    let wc = 0;
    for (let i = 0; i <= daysToMon; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (datesWithData.has(d.toISOString().split("T")[0])) wc++;
    }
    setWeekCount(wc);

    // Guide cards: exercises with 2+ sessions
    const guideList: ExerciseGuide[] = Object.entries(exerciseHistory)
      .filter(([, h]) => h.length >= 1)
      .map(([name, h]) => {
        const last = h[h.length - 1];
        const prev = h.length >= 2 ? h[h.length - 2] : null;
        const pr = prMap[name]?.weight ?? last.maxWeight;
        const trend: ExerciseGuide["trend"] =
          !prev ? "flat"
          : last.maxWeight > prev.maxWeight ? "up"
          : last.maxWeight < prev.maxWeight ? "down"
          : "flat";
        const suggested = trend === "down"
          ? last.maxWeight
          : last.maxWeight + 2.5;
        return {
          name, lastWeight: last.maxWeight, lastReps: last.maxReps,
          suggested, pr, sessions: h.length, trend, lastDate: last.date,
        };
      })
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);

    setGuides(guideList);
    setRecentSessions(sessions.slice().reverse().slice(0, 5));
    setPrs(
      Object.entries(prMap)
        .map(([exercise, v]) => ({ exercise, ...v }))
        .filter(pr => pr.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8)
    );
  }, []);

  const isEmpty = totalSessions === 0;

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 pt-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/gym/workout" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold leading-none">Training Guide</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">Track & progress your lifts</p>
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-5">
              <Dumbbell className="w-9 h-9 text-teal-400/50" />
            </div>
            <h2 className="text-xl font-bold mb-2">No sessions yet</h2>
            <p className="text-gray-400 text-sm mb-8 max-w-[220px] leading-relaxed">
              Log your first workout and we'll start building your guide.
            </p>
            <Link href="/gym/workout" className="px-8 py-3.5 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-2xl transition-colors">
              Start a workout
            </Link>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="flex gap-2.5 mb-5">
              <StatPill label="Sessions" value={totalSessions} />
              <StatPill label="Streak" value={`${streak}d`} accent={streak > 0 ? "text-orange-400" : "text-white"} />
              <StatPill label="This week" value={weekCount} accent="text-teal-400" sub="workouts" />
            </div>

            {/* Tab bar */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-1 flex gap-1 mb-4">
              {(["guide", "history", "records"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold capitalize transition-all ${
                    activeTab === tab
                      ? "bg-teal-400 text-black"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab === "guide" ? "Lift Guide" : tab === "history" ? "History" : "Records"}
                </button>
              ))}
            </div>

            {/* ── LIFT GUIDE TAB ── */}
            {activeTab === "guide" && (
              <div className="space-y-3">
                {guides.length === 0 ? (
                  <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-6 text-center">
                    <p className="text-gray-500 text-sm">Log sets with weights to see your guide.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-3.5 h-3.5 text-teal-400" />
                      <p className="text-[11px] text-teal-400/70 font-semibold uppercase tracking-widest">Suggested for next session</p>
                    </div>
                    {guides.map(g => {
                      const prPct = g.pr > 0 ? (g.lastWeight / g.pr) * 100 : 100;
                      const trendColor = g.trend === "up" ? "#34d399" : g.trend === "down" ? "#f87171" : "#9ca3af";
                      const trendLabel = g.trend === "up" ? "▲" : g.trend === "down" ? "▼" : "—";
                      return (
                        <div key={g.name} className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{g.name}</p>
                              <p className="text-[10px] text-gray-600 mt-0.5">{g.sessions} session{g.sessions !== 1 ? "s" : ""} · last {fmtShort(g.lastDate)}</p>
                            </div>
                            <span className="text-[10px] font-bold ml-3 shrink-0" style={{ color: trendColor }}>
                              {trendLabel}
                            </span>
                          </div>

                          <div className="flex items-end gap-3 mb-3">
                            {/* Last */}
                            <div className="flex-1 bg-black/40 rounded-xl p-2.5">
                              <p className="text-[9px] text-gray-600 uppercase tracking-wide mb-1">Last</p>
                              <p className="text-lg font-black text-white leading-none">
                                {g.lastWeight}<span className="text-xs font-normal text-gray-600 ml-0.5">kg</span>
                              </p>
                              {g.lastReps > 0 && (
                                <p className="text-[10px] text-gray-600 mt-0.5">× {g.lastReps} reps</p>
                              )}
                            </div>

                            {/* Arrow */}
                            <div className="pb-2">
                              <TrendingUp className="w-4 h-4 text-teal-400/50" />
                            </div>

                            {/* Suggested */}
                            <div className="flex-1 bg-teal-500/8 border border-teal-500/20 rounded-xl p-2.5">
                              <p className="text-[9px] text-teal-400/60 uppercase tracking-wide mb-1">Target</p>
                              <p className="text-lg font-black text-teal-400 leading-none">
                                {g.suggested}<span className="text-xs font-normal text-teal-600 ml-0.5">kg</span>
                              </p>
                              {g.lastReps > 0 && (
                                <p className="text-[10px] text-teal-500/50 mt-0.5">× {g.lastReps} reps</p>
                              )}
                            </div>
                          </div>

                          {/* PR progress */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-700">PR progress</span>
                              <span className="text-[10px] text-yellow-500/70 font-semibold">
                                {g.pr}kg PR · {Math.round(prPct)}%
                              </span>
                            </div>
                            <ProgressBar pct={prPct} color="linear-gradient(to right, #eab308, #fde047)" />
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === "history" && (
              <div className="space-y-3">
                {recentSessions.length === 0 ? (
                  <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-6 text-center">
                    <p className="text-gray-500 text-sm">No sessions recorded yet.</p>
                  </div>
                ) : recentSessions.map((session, i) => (
                  <div key={i} className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-teal-400" />
                        <span className="text-sm font-bold text-white">{fmtDate(session.date)}</span>
                      </div>
                      <span className="text-[10px] text-gray-600 bg-white/5 rounded-lg px-2 py-0.5 font-semibold">
                        {session.totalSets} sets
                      </span>
                    </div>
                    <div className="space-y-2">
                      {session.exercises.map((ex, j) => (
                        <div key={j} className="flex items-center justify-between">
                          <span className="text-[12px] text-gray-400 truncate flex-1 mr-3">{ex.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-gray-600">{ex.sets}×</span>
                            <span className="text-[12px] font-bold text-white">{ex.topWeight}kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── RECORDS TAB ── */}
            {activeTab === "records" && (
              <div>
                {prs.length === 0 ? (
                  <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-6 text-center">
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
                          <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-black text-yellow-400">#{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{pr.exercise}</p>
                            <p className="text-[10px] text-gray-600 mt-0.5">{fmtShort(pr.date)}{pr.reps > 0 ? ` · ${pr.reps} reps` : ""}</p>
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
