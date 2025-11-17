"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, TrendingUp, Target, Zap, Calendar, Activity } from "lucide-react";

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

const CircularProgress = ({ percentage, size = 120, color = "#f97316" }: { percentage: number; size?: number; color?: string }) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = isNaN(percentage) || !isFinite(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
  const offset = circumference - (safePercentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1f2937"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={isNaN(offset) || !isFinite(offset) ? circumference : offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-white">{Math.round(safePercentage)}%</div>
        <div className="text-xs text-gray-400">complete</div>
      </div>
    </div>
  );
};

export default function GymStatsPage() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanByDay>({
    pushDay: [],
    pullDay: [],
    legsDay: [],
  });
  const [weeklyVolume, setWeeklyVolume] = useState<number[]>(Array(7).fill(0));
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

  const workoutsThisWeek = weeklyData.filter((value) => value > 0).length;
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

  const lastWeekAverage =
    weeklyData.length > 1
      ? Math.round(
          weeklyData.slice(0, weeklyData.length - 1).reduce((a, b) => a + b, 0) /
            (weeklyData.length - 1)
        )
      : 0;
  const todayVolume = weeklyData[weeklyData.length - 1] || 0;
  const volumeDelta = lastWeekAverage
    ? Math.round(((todayVolume - lastWeekAverage) / Math.max(lastWeekAverage, 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/gym" className="text-orange-400 hover:text-orange-300 mb-2 inline-block flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Workout
          </Link>
          <h1 className="text-3xl font-bold text-white">📊 Workout Statistics</h1>
        </div>

        {/* Main Progress Circles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold mb-4">Workout Completion</h3>
            <div className="flex justify-center mb-4">
              <CircularProgress percentage={totals.progress} size={140} color="#f97316" />
            </div>
            <p className="text-gray-400 text-sm">
              {totals.completedSets} of {totals.totalSets} sets completed
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold mb-4">Volume Progress</h3>
            <div className="flex justify-center mb-4">
              <CircularProgress percentage={volumeProgress} size={140} color="#22c55e" />
            </div>
            <p className="text-gray-400 text-sm">
              {totals.totalVolume} kg total volume
            </p>
          </div>
        </div>

        {/* Stats Grid with Circular Progress */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <CircularProgress
                percentage={Math.max(volumeDelta, 0)}
                size={80}
                color="#f97316"
              />
            </div>
            <p className="text-xl font-bold text-orange-400 mt-2">
              {volumeDelta >= 0 ? "+" : ""}
              {volumeDelta}%
            </p>
            <p className="text-xs text-gray-400">Daily vs avg volume</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <CircularProgress
                percentage={heaviestSet ? Math.min((heaviestSet / 200) * 100, 100) : 0}
                size={80}
                color="#3b82f6"
              />
            </div>
            <p className="text-xl font-bold text-orange-400 mt-2">{heaviestSet} kg</p>
            <p className="text-xs text-gray-400">Heaviest set logged</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <CircularProgress
                percentage={Math.min((averageSetVolume / 200) * 100, 100)}
                size={80}
                color="#eab308"
              />
            </div>
            <p className="text-xl font-bold text-orange-400 mt-2">
              {averageSetVolume} kg
            </p>
            <p className="text-xs text-gray-400">Avg set volume</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <CircularProgress
                percentage={Math.min((activeStreak / 14) * 100, 100)}
                size={80}
                color="#22c55e"
              />
            </div>
            <p className="text-xl font-bold text-orange-400 mt-2">{activeStreak} days</p>
            <p className="text-xs text-gray-400">Active streak</p>
          </div>
        </div>

        {/* Weekly Volume Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-400" />
            Weekly Volume Trend
          </h2>
          <div className="flex items-end justify-between h-32 gap-2">
            {weeklyData.map((value, i) => {
              const heightPercent = (value / maxVolume) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gray-800 rounded-t relative" style={{ height: "100px" }}>
                    <div
                      className="w-full bg-orange-500 rounded-t absolute bottom-0 transition-all duration-500"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 mt-2">
                    {i === weeklyData.length - 1 ? "Today" : `Day ${i + 1}`}
                  </span>
                  <span className="text-xs text-gray-500">{value}kg</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exercise Progress */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Exercise Progress</h2>
          <div className="space-y-4">
            {exercises.map((ex) => {
              const completedSets = ex.sets.filter(s => s.completed).length;
              const progress = (completedSets / ex.goalSets) * 100;
              return (
                <div key={ex.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{ex.name}</h3>
                    <span className="text-sm text-gray-400">
                      {completedSets} / {ex.goalSets} sets
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CircularProgress percentage={progress} size={80} color="#f97316" />
                    <div className="flex-1">
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">
                        Goal: {ex.goalSets}×{ex.goalReps} @ {ex.goalWeight}kg
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <TrendingUp className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{workoutsThisWeek}</p>
            <p className="text-sm text-gray-400">Workouts This Week</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <Target className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalWorkoutsLogged}</p>
            <p className="text-sm text-gray-400">Total Workouts</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <Calendar className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{activeStreak}</p>
            <p className="text-sm text-gray-400">Day Streak</p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

