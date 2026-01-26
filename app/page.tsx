"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { 
  CheckCircle2, Calendar, 
  Check, Play, Sparkles
} from "lucide-react";

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
      
  // Load goals from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedGoals = localStorage.getItem("goals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        const todayStr = new Date().toISOString().split("T")[0];
        
        const updatedGoals = goals.map((goal: Goal) => {
          if (goal.goalType === "daily" && goal.lastUpdated !== todayStr) {
            return { ...goal, current: 0, lastUpdated: todayStr };
          }
          return goal;
        });
        
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

  const dailyGoals = allGoals.filter(goal => goal.goalType === "daily");
  const longTermGoals = allGoals.filter(goal => goal.goalType === "long-term");

  // Filter goals by time period
  const weeklyGoals = longTermGoals.filter(goal => {
    if (!goal.targetDate) return false;
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7 && daysDiff > 0;
  });

  const monthlyGoals = longTermGoals.filter(goal => {
    if (!goal.targetDate) return false;
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 30 && daysDiff > 7;
  });


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Calculate savings goal progress (mock - you can enhance this)
  const savingsGoal = longTermGoals.find(g => g.type === "financial");
  const savingsProgress = savingsGoal ? Math.min(savingsGoal.current / savingsGoal.target, 1) : 0.75;

  const handleMarkComplete = (goalId: string) => {
    const updatedGoals = allGoals.map(g => {
      if (g.id === goalId && g.goalType === "daily") {
        return { ...g, current: g.target, lastUpdated: new Date().toISOString().split("T")[0] };
      }
      return g;
    });
    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
  };


  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto pb-20">
      {/* Header */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <Link
            href="/consultation?from=reflection"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/50 rounded-lg text-cyan-400 text-xs font-medium transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            AI Reflection
          </Link>
          <h1 className="text-base font-semibold text-white">Goals Dashboard</h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>

        <div className="px-4 space-y-3">
          {/* Daily Goals Section */}
          <div className="bg-gray-900/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <CheckCircle2 className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-0.5 bg-cyan-400 rounded-full" />
                </div>
                <h2 className="text-sm font-semibold text-white">Daily Goals</h2>
        </div>
        <Link
                href="/goals?filter=daily"
                className="text-xs font-medium text-cyan-400"
        >
                View All
        </Link>
        </div>

            <div className="space-y-1.5">
              {dailyGoals.length > 0 ? (
                dailyGoals.slice(0, 3).map((goal) => {
                  const isCompleted = goal.current >= goal.target;
                  return (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between p-2 bg-black/60 rounded-lg"
                    >
          <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 border-2 rounded ${
                          isCompleted 
                            ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                            : "border-gray-500"
                        }`}>
                          {isCompleted && <Check className="w-2.5 h-2.5 text-black" />}
                        </div>
                        <span className="text-white text-xs">{goal.title}</span>
                      </div>
                      {!isCompleted && (
                        <button
                          onClick={() => handleMarkComplete(goal.id)}
                          className="px-2 py-0.5 bg-gray-700 text-white text-[10px] rounded hover:bg-gray-600 transition-colors"
                        >
                          Mark
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-2 bg-black/60 rounded-lg text-gray-400 text-center text-xs">
                  No daily goals yet
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Goals Section */}
          <div className="bg-gray-900/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="relative">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <Play className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-0.5 bg-cyan-400 rounded-full" />
              </div>
              <h2 className="text-sm font-semibold text-white">Scheduled Goals</h2>
            </div>

            {/* Weekly Goals */}
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-white mb-1">Weekly Goals</h3>
              {weeklyGoals.length > 0 ? (
                <div className="p-2 bg-black/60 rounded-lg">
          <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 border-2 rounded flex-shrink-0 ${
                      weeklyGoals[0].current >= weeklyGoals[0].target
                        ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                        : "border-gray-500"
                    }`}>
                      {weeklyGoals[0].current >= weeklyGoals[0].target && <Check className="w-2.5 h-2.5 text-black" />}
          </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-xs block truncate">{weeklyGoals[0].title}</span>
                      {weeklyGoals[0].targetDate && (
                        <p className="text-gray-400 text-[10px]">Due: {formatDate(weeklyGoals[0].targetDate)}</p>
                      )}
          </div>
          </div>
        </div>
              ) : (
                <div className="p-2 bg-black/60 rounded-lg text-gray-400 text-center text-xs">
                  No weekly goals yet
                </div>
              )}
            </div>

            {/* Monthly Goals */}
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-white mb-1">Monthly Goals</h3>
              {monthlyGoals.length > 0 ? (
                <div className="p-2 bg-black/60 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 border-2 rounded flex-shrink-0 ${
                      monthlyGoals[0].current >= monthlyGoals[0].target
                        ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                        : "border-gray-500"
                    }`}>
                      {monthlyGoals[0].current >= monthlyGoals[0].target && <Check className="w-2.5 h-2.5 text-black" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-xs block truncate">{monthlyGoals[0].title}</span>
                      {monthlyGoals[0].targetDate && (
                        <p className="text-gray-400 text-[10px]">Due: {formatDate(monthlyGoals[0].targetDate)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-black/60 rounded-lg text-gray-400 text-center text-xs">
                  No monthly goals yet
                </div>
                  )}
            </div>

            {/* Long-Term Goals */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-white">Long-Term Goals</h3>
                {longTermGoals.length > 1 && (
                  <Link 
                    href="/goals"
                    className="text-xs font-medium text-cyan-400"
                  >
                    View All
                  </Link>
                  )}
              </div>
              {longTermGoals.length > 0 ? (
                <div className="p-2 bg-black/60 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 border-2 rounded flex-shrink-0 ${
                      longTermGoals[0].current >= longTermGoals[0].target
                        ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                        : "border-gray-500"
                    }`}>
                      {longTermGoals[0].current >= longTermGoals[0].target && <Check className="w-2.5 h-2.5 text-black" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-xs block truncate">{longTermGoals[0].title}</span>
                      {longTermGoals[0].targetDate && (
                        <p className="text-gray-400 text-[10px]">Due: {formatDate(longTermGoals[0].targetDate)}</p>
                      )}
                    </div>
                  </div>
        </div>
              ) : (
                <div className="p-2 bg-black/60 rounded-lg text-gray-400 text-center text-xs">
                  No long-term goals yet
          </div>
        )}
            </div>
          </div>

        </div>
        </div>

      <BottomNav />
    </div>
  );
}
