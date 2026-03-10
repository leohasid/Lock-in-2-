"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, TrendingUp, Target, Zap, Activity } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  goalSets: number;
  goalReps: number;
  goalWeight: number;
  sets: Array<{
    reps: number;
    weight: number;
    completed: boolean;
  }>;
}

interface WorkoutPlanByDay {
  pushDay: Exercise[];
  pullDay: Exercise[];
  legsDay: Exercise[];
}

const fallbackPlan: Exercise[] = [
  {
    id: "bench",
    name: "Barbell Bench Press",
    goalSets: 4,
    goalReps: 10,
    goalWeight: 60,
    sets: Array.from({ length: 4 }, () => ({
      reps: 10,
      weight: 60,
      completed: true,
    })),
  },
  {
    id: "squat",
    name: "Back Squat",
    goalSets: 5,
    goalReps: 5,
    goalWeight: 90,
    sets: Array.from({ length: 5 }, () => ({
      reps: 5,
      weight: 90,
      completed: true,
    })),
  },
];

export default function GymStatsPage() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanByDay>({
    pushDay: [],
    pullDay: [],
    legsDay: [],
  });
  const [weeklyVolume, setWeeklyVolume] = useState<number[]>(Array(7).fill(0));
  const [weeklyVolumesLast4Weeks, setWeeklyVolumesLast4Weeks] = useState<number[]>([]);
  const [totalWorkoutsLogged, setTotalWorkoutsLogged] = useState(0);
  const [activeStreak, setActiveStreak] = useState(0);

  const loadWorkoutPlan = () => {
    if (typeof window === "undefined") return;
    const storedPlan = localStorage.getItem("workoutPlan");
    if (storedPlan) {
      try {
        const parsed = JSON.parse(storedPlan);
        setWorkoutPlan(parsed);
        return parsed;
      } catch (err) {
        console.error("Error parsing workout plan", err);
      }
    }
    return null;
  };

  const calculateVolumeFromData = (data: any[]) => {
    let volume = 0;
    data.forEach((ex) => {
      ex.sets?.forEach((set: any) => {
        if (set.completed) {
          volume += (Number(set.reps) || 0) * (Number(set.weight) || 0);
        }
      });
    });
    return volume;
  };

  const loadWeeklyStats = () => {
    if (typeof window === "undefined") return;
    const today = new Date();
    const volumes: number[] = [];

    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const dateStr = date.toISOString().split("T")[0];
      const raw = localStorage.getItem(`workout_data_${dateStr}`);
      let volume = 0;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          volume = calculateVolumeFromData(parsed);
        } catch (err) {
          console.error("Error parsing workout data", err);
        }
      }
      volumes.push(volume);
    }

    setWeeklyVolume(volumes);

    const fourWeeks: number[] = [];
    for (let w = 3; w >= 0; w--) {
      let weekVol = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const dateStr = date.toISOString().split("T")[0];
        const raw = localStorage.getItem(`workout_data_${dateStr}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            weekVol += calculateVolumeFromData(parsed);
          } catch {}
        }
      }
      fourWeeks.push(weekVol);
    }
    setWeeklyVolumesLast4Weeks(fourWeeks);

    const workoutEntries = Object.keys(localStorage).filter((key) =>
      key.startsWith("workout_data_")
    );
    setTotalWorkoutsLogged(workoutEntries.length);

    let streak = 0;
    for (let offset = 0; offset < 30; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const dateStr = date.toISOString().split("T")[0];
      const raw = localStorage.getItem(`workout_data_${dateStr}`);
      const hasVolume = (() => {
        if (!raw) return false;
        try {
          const parsed = JSON.parse(raw);
          return calculateVolumeFromData(parsed) > 0;
        } catch {
          return false;
        }
      })();
      if (hasVolume) {
        streak++;
      } else {
        break;
      }
    }
    setActiveStreak(streak);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    loadWorkoutPlan();
    loadWeeklyStats();

    const refresh = () => {
      loadWorkoutPlan();
      loadWeeklyStats();
    };

    const interval = setInterval(refresh, 5000);
    window.addEventListener("storage", refresh);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const exercises = useMemo(() => {
    const merged = [
      ...workoutPlan.pushDay,
      ...workoutPlan.pullDay,
      ...workoutPlan.legsDay,
    ];
    return merged.length > 0 ? merged : fallbackPlan;
  }, [workoutPlan]);

  const totals = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    let completedSets = 0;
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        totalSets++;
        if (s.completed) {
          completedSets++;
          totalVolume += (Number(s.reps) || 0) * (Number(s.weight) || 0);
        }
      });
    });
    return {
      progress: totalSets ? Math.round((completedSets / totalSets) * 100) : 0,
      totalVolume,
      completedSets,
      totalSets,
    };
  }, [exercises]);

  const goalVolume = useMemo(() => {
    return exercises.reduce((sum, ex) => {
      return sum + ex.goalSets * ex.goalReps * (ex.goalWeight || 0);
    }, 0);
  }, [exercises]);

  const volumeProgress = goalVolume
    ? Math.min((totals.totalVolume / goalVolume) * 100, 100)
    : 0;

  const weeklyData = weeklyVolume;
  const maxVolume = Math.max(...weeklyData, 1);
  const max4Week = weeklyVolumesLast4Weeks.length > 0 ? Math.max(...weeklyVolumesLast4Weeks, 1) : 1;

  const workoutsThisWeek = weeklyData.filter((value) => value > 0).length;
  const thisWeekVolume = weeklyData.reduce((a, b) => a + b, 0);

  const milestones = [10, 25, 50, 100, 250, 500];
  const nextMilestone = milestones.find((m) => m > totalWorkoutsLogged);
  const workoutsToNext = nextMilestone ? nextMilestone - totalWorkoutsLogged : 0;
  const averageSetVolume = totals.totalSets
    ? Math.round(totals.totalVolume / totals.totalSets)
    : 0;

  const heaviestSet = exercises.reduce((max, ex) => {
    const heaviestInExercise = ex.sets.reduce(
      (innerMax, set) => Math.max(innerMax, Number(set.weight) || 0),
      0
    );
    return Math.max(max, heaviestInExercise);
  }, 0);

  const lastWeekVolume = weeklyVolumesLast4Weeks.length >= 2 ? weeklyVolumesLast4Weeks[weeklyVolumesLast4Weeks.length - 2] : 0;
  const thisWeekVol = weeklyVolumesLast4Weeks[weeklyVolumesLast4Weeks.length - 1] ?? thisWeekVolume;
  const volumeDelta = lastWeekVolume
    ? Math.round(((thisWeekVol - lastWeekVolume) / Math.max(lastWeekVolume, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <Link href="/gym/workout" className="text-orange-400 hover:text-orange-300 mb-1.5 inline-block flex items-center gap-2 text-sm">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Workout
          </Link>
          <h1 className="text-2xl font-bold text-white">📊 Workout Statistics</h1>
        </div>

        {/* Journey Snapshot */}
        <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-400/30 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-teal-400 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Your Journey
          </h2>
          <p className="text-white text-sm leading-relaxed">
            {totalWorkoutsLogged === 0
              ? "Start your first workout to begin tracking your journey."
              : `${totalWorkoutsLogged} workout${totalWorkoutsLogged === 1 ? "" : "s"} completed.`}
            {nextMilestone && totalWorkoutsLogged > 0 && (
              <span className="block mt-1 text-gray-400 text-xs">
                {workoutsToNext} more until {nextMilestone} workouts!
              </span>
            )}
          </p>
        </div>

        {/* Momentum */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center mb-4">
          <TrendingUp className={`w-6 h-6 mx-auto mb-1 ${volumeDelta >= 0 ? "text-green-400" : "text-red-400"}`} />
          <p className={`text-2xl font-bold ${volumeDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
            {volumeDelta >= 0 ? "+" : ""}{volumeDelta}%
          </p>
          <p className="text-xs text-gray-500">vs last week</p>
        </div>

        {/* This Week */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">This Week</h2>
          <div className="flex items-end justify-between h-20 gap-1.5">
            {weeklyData.map((value, i) => {
              const heightPercent = (value / maxVolume) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gray-800 rounded-t relative" style={{ height: "70px" }}>
                    <div
                      className="w-full bg-teal-500 rounded-t absolute bottom-0 transition-all"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {i === weeklyData.length - 1 ? "Today" : `D${i + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">{thisWeekVolume} kg total</p>
        </div>

        {/* Personal Best & Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-20">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <Target className="w-5 h-5 text-teal-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-teal-400">{heaviestSet} kg</p>
            <p className="text-[10px] text-gray-400">Heaviest set</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <Activity className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-400">{workoutsThisWeek}</p>
            <p className="text-[10px] text-gray-400">This week</p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

