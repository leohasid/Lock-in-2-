"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { CheckCircle2, Calendar } from "lucide-react";

interface Goal {
  id: string;
  type: string;
  goalType: "daily" | "long-term";
  title: string;
  current: number;
  target: number;
  unit: string;
  targetDate: string;
  lastUpdated?: string;
}

export default function Home() {
  const [allGoals, setAllGoals] = useState<Goal[]>([]);

  // Load goals from localStorage and reset daily goals if needed
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedGoals = localStorage.getItem("goals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        const todayStr = new Date().toISOString().split("T")[0];
        
        // Reset daily goals if it's a new day
        const updatedGoals = goals.map((goal: Goal) => {
          if (goal.goalType === "daily" && goal.lastUpdated !== todayStr) {
            return { ...goal, current: 0, lastUpdated: todayStr };
          }
          return goal;
        });
        
        // Only update if there were changes
        const hasChanges = updatedGoals.some((g: Goal, i: number) => 
          g.current !== goals[i]?.current || g.lastUpdated !== goals[i]?.lastUpdated
        );
        
        if (hasChanges) {
          setAllGoals(updatedGoals);
          localStorage.setItem("goals", JSON.stringify(updatedGoals));
        } else {
          setAllGoals(goals);
        }
      } catch (e) {
        setAllGoals([]);
      }
    }
  }, []);

  // Get daily goals
  const dailyGoals = allGoals.filter(goal => goal.goalType === "daily");
  
  // Get long-term goals
  const longTermGoals = allGoals.filter(goal => goal.goalType === "long-term");

  // Calculate weekly progress (mock for now - you can enhance this with actual weekly tracking)
  const weeklyGoals = longTermGoals.filter(goal => {
    if (!goal.targetDate) return false;
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7 && daysDiff > 0;
  });

  // Calculate monthly progress
  const monthlyGoals = longTermGoals.filter(goal => {
    if (!goal.targetDate) return false;
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 30 && daysDiff > 7;
  });

  // Calculate progress for a set of goals
  const calculateProgress = (goals: Goal[]) => {
    if (goals.length === 0) return { completed: 0, total: 0, progress: 0 };
    const completed = goals.filter(g => g.current >= g.target).length;
    const total = goals.length;
    return { completed, total, progress: total > 0 ? completed / total : 0 };
  };

  const weeklyProgress = calculateProgress(weeklyGoals);
  const monthlyProgress = calculateProgress(monthlyGoals);
  const longTermProgress = calculateProgress(longTermGoals);

  // Get next weekly goal title
  const getNextWeeklyGoal = () => {
    const incomplete = weeklyGoals.find(g => g.current < g.target);
    return incomplete ? incomplete.title : weeklyGoals[0]?.title || "No weekly goals";
  };

  // Get next monthly goal title
  const getNextMonthlyGoal = () => {
    const incomplete = monthlyGoals.find(g => g.current < g.target);
    return incomplete ? incomplete.title : monthlyGoals[0]?.title || "No monthly goals";
  };

  // Get next long-term goal title
  const getNextLongTermGoal = () => {
    const incomplete = longTermGoals.find(g => g.current < g.target);
    return incomplete ? incomplete.title : longTermGoals[0]?.title || "No long-term goals";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">Goals</h1>
        </div>

        <div className="space-y-5">
          {/* Daily Goals Section */}
          <div className="bg-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Daily Goals</h2>
              <Link 
                href="/goals"
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View All
              </Link>
            </div>
            
            <div className="space-y-3">
              {dailyGoals.length > 0 ? (
                dailyGoals.slice(0, 4).map((goal) => {
                  const isCompleted = goal.current >= goal.target;
                  return (
                    <div
                      key={goal.id}
                      className="flex items-center gap-3 p-4 bg-black/60 rounded-xl"
                    >
                      <CheckCircle2 
                        className={`w-6 h-6 flex-shrink-0 ${
                          isCompleted ? "text-cyan-400" : "text-gray-600"
                        }`}
                      />
                      <span className="flex-1 text-white text-base">
                        {goal.title}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-black/60 rounded-xl text-gray-400 text-center">
                  No daily goals yet. <Link href="/goals" className="text-cyan-400 hover:underline">Add one</Link>
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Goals Section */}
          <div className="bg-white/5 rounded-2xl p-5">
            <h2 className="text-xl font-semibold text-white mb-4">Scheduled Goals</h2>
            
            <div className="space-y-3">
              {/* Weekly Goals Card */}
              <div className="p-4 bg-black/60 rounded-xl">
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold text-white">Weekly Goals</h3>
                  <p className="text-sm text-gray-400">
                    {weeklyProgress.completed > 0 
                      ? `${weeklyProgress.completed} / ${weeklyProgress.total} completed`
                      : weeklyGoals.length > 0 
                        ? getNextWeeklyGoal()
                        : "No weekly goals"}
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-cyan-400 h-2 rounded-full transition-all"
                      style={{ width: `${weeklyProgress.progress * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Goals Card */}
              <div className="p-4 bg-black/60 rounded-xl">
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold text-white">Monthly Goals</h3>
                  <p className="text-sm text-gray-400">
                    {monthlyProgress.completed > 0
                      ? `${monthlyProgress.completed} / ${monthlyProgress.total} completed`
                      : monthlyGoals.length > 0
                        ? getNextMonthlyGoal()
                        : "No monthly goals"}
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-cyan-400 h-2 rounded-full transition-all"
                      style={{ width: `${monthlyProgress.progress * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Long-Term Goals Card */}
              <div className="p-4 bg-black/60 rounded-xl">
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold text-white">Long-Term Goals</h3>
                  <p className="text-sm text-gray-400">
                    {longTermProgress.completed > 0
                      ? `${longTermProgress.completed} / ${longTermProgress.total} completed`
                      : longTermGoals.length > 0
                        ? getNextLongTermGoal()
                        : "No long-term goals"}
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-cyan-400 h-2 rounded-full transition-all"
                      style={{ width: `${longTermProgress.progress * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
