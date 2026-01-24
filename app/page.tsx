"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { 
  Settings, Bell, CheckCircle2, Calendar, 
  Check, Play, User
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
  const [selectedTab, setSelectedTab] = useState<"weekly" | "monthly" | "long-term">("weekly");

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

  const getCurrentTabGoals = () => {
    switch (selectedTab) {
      case "weekly": return weeklyGoals;
      case "monthly": return monthlyGoals;
      case "long-term": return longTermGoals;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Calculate this week progress
  const thisWeekCompleted = dailyGoals.filter(g => g.current >= g.target).length;
  const thisWeekTotal = dailyGoals.length;
  const thisWeekProgress = thisWeekTotal > 0 ? thisWeekCompleted / thisWeekTotal : 0;

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
      <div className="max-w-md mx-auto pb-24">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Settings className="w-6 h-6 text-white" />
          <h1 className="text-lg font-semibold text-white">Goals Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-6 h-6 text-white" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Slogan */}
        <div className="px-4 pb-4">
          <p className="text-cyan-400 italic text-sm">Stay Focused and Achieve Your Goals!</p>
        </div>

        <div className="px-4 space-y-5">
          {/* Daily Goals Section */}
          <div className="bg-gray-900/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <CheckCircle2 className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 bg-cyan-400 rounded-full" />
                </div>
                <h2 className="text-lg font-semibold text-white">Daily Goals</h2>
              </div>
              <Link 
                href="/goals"
                className="text-sm font-medium text-cyan-400"
              >
                View All
              </Link>
            </div>
            
            <div className="space-y-2">
              {dailyGoals.length > 0 ? (
                dailyGoals.slice(0, 4).map((goal) => {
                  const isCompleted = goal.current >= goal.target;
                  return (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between p-3 bg-black/60 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 rounded ${
                          isCompleted 
                            ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                            : "border-gray-500"
                        }`}>
                          {isCompleted && <Check className="w-3 h-3 text-black" />}
                        </div>
                        <span className="text-white text-sm">{goal.title}</span>
                      </div>
                      {!isCompleted && (
                        <button
                          onClick={() => handleMarkComplete(goal.id)}
                          className="px-3 py-1 bg-gray-700 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-3 bg-black/60 rounded-xl text-gray-400 text-center text-sm">
                  No daily goals yet
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Goals Section */}
          <div className="bg-gray-900/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <Play className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 bg-cyan-400 rounded-full" />
              </div>
              <h2 className="text-lg font-semibold text-white">Scheduled Goals</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSelectedTab("weekly")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedTab === "weekly"
                    ? "bg-cyan-400 text-black"
                    : "bg-gray-800 text-white"
                }`}
              >
                Weekly Goals
              </button>
              <button
                onClick={() => setSelectedTab("monthly")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedTab === "monthly"
                    ? "bg-cyan-400 text-black"
                    : "bg-gray-800 text-white"
                }`}
              >
                Monthly Goals
              </button>
              <button
                onClick={() => setSelectedTab("long-term")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedTab === "long-term"
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-white"
                }`}
              >
                Long-Term Goals
              </button>
            </div>

            {/* Goals List */}
            <div className="space-y-3">
              {getCurrentTabGoals().length > 0 ? (
                getCurrentTabGoals().map((goal) => {
                  const isCompleted = goal.current >= goal.target;
                  return (
                    <div key={goal.id} className="p-3 bg-black/60 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-5 h-5 border-2 rounded ${
                          isCompleted 
                            ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                            : "border-gray-500"
                        }`}>
                          {isCompleted && <Check className="w-3 h-3 text-black" />}
                        </div>
                        <span className="text-white text-sm flex-1">{goal.title}</span>
                      </div>
                      {goal.targetDate && (
                        <p className="text-gray-400 text-xs ml-8">Due: {formatDate(goal.targetDate)}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-3 bg-black/60 rounded-xl text-gray-400 text-center text-sm">
                  No {selectedTab} goals yet
                </div>
              )}
            </div>
          </div>

          {/* This Week Section */}
          <div className="bg-gray-900/50 rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-white mb-3">This Week</h2>
            <p className="text-white text-sm mb-2">
              Progress: {thisWeekCompleted} / {thisWeekTotal} Tasks Completed
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-cyan-400 h-2 rounded-full transition-all"
                style={{ width: `${thisWeekProgress * 100}%` }}
              />
            </div>
          </div>

          {/* Goal Tracker Section */}
          <div className="bg-gray-900/50 rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-white mb-3">Goal Tracker</h2>
            <p className="text-white text-sm mb-2">
              {Math.round(savingsProgress * 100)}% Towards Savings Goal
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-cyan-400 h-2 rounded-full transition-all"
                style={{ width: `${savingsProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
