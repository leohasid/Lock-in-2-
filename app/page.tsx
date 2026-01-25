"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { 
  CheckCircle2, Calendar, 
  Check, Play, BookOpen, MessageCircle
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

  // Check if today's reflection exists
  const [hasTodayReflection, setHasTodayReflection] = useState(false);
  const [reflectionPreview, setReflectionPreview] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const todayStr = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem(`reflection_${todayStr}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setHasTodayReflection(true);
        // Show a preview of how the day was
        if (data.howWasDay) {
          setReflectionPreview(data.howWasDay.length > 60 ? data.howWasDay.substring(0, 60) + "..." : data.howWasDay);
        } else {
          setReflectionPreview("Reflection saved");
        }
        // Get AI feedback if it exists
        if (data.aiFeedback) {
          setAiFeedback(data.aiFeedback.length > 120 ? data.aiFeedback.substring(0, 120) + "..." : data.aiFeedback);
        } else {
          setAiFeedback("");
        }
      } catch (e) {
        setHasTodayReflection(false);
        setReflectionPreview("");
        setAiFeedback("");
      }
    } else {
      setHasTodayReflection(false);
      setReflectionPreview("");
      setAiFeedback("");
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto pb-24">
      {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-semibold text-white text-center">Goals Dashboard</h1>
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
                href="/goals?filter=daily"
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
            <div className="flex items-center gap-2 mb-4">
              <div className="relative">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <Play className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 bg-cyan-400 rounded-full" />
          </div>
              <h2 className="text-lg font-semibold text-white">Scheduled Goals</h2>
        </div>

            {/* Weekly Goals */}
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white mb-2">Weekly Goals</h3>
              {weeklyGoals.length > 0 ? (
                <div className="p-3 bg-black/60 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 border-2 rounded ${
                      weeklyGoals[0].current >= weeklyGoals[0].target
                        ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                        : "border-gray-500"
                    }`}>
                      {weeklyGoals[0].current >= weeklyGoals[0].target && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-white text-sm flex-1">{weeklyGoals[0].title}</span>
                  </div>
                  {weeklyGoals[0].targetDate && (
                    <p className="text-gray-400 text-xs ml-8">Due: {formatDate(weeklyGoals[0].targetDate)}</p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-black/60 rounded-xl text-gray-400 text-center text-sm">
                  No weekly goals yet
                </div>
              )}
            </div>

            {/* Monthly Goals */}
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white mb-2">Monthly Goals</h3>
              {monthlyGoals.length > 0 ? (
                <div className="p-3 bg-black/60 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 border-2 rounded ${
                      monthlyGoals[0].current >= monthlyGoals[0].target
                        ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                        : "border-gray-500"
                    }`}>
                      {monthlyGoals[0].current >= monthlyGoals[0].target && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-white text-sm flex-1">{monthlyGoals[0].title}</span>
                  </div>
                  {monthlyGoals[0].targetDate && (
                    <p className="text-gray-400 text-xs ml-8">Due: {formatDate(monthlyGoals[0].targetDate)}</p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-black/60 rounded-xl text-gray-400 text-center text-sm">
                  No monthly goals yet
                </div>
              )}
            </div>

            {/* Long-Term Goals */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-white">Long-Term Goals</h3>
                {longTermGoals.length > 1 && (
                  <Link 
                    href="/goals"
                    className="text-sm font-medium text-cyan-400"
                  >
                    View All
                  </Link>
                )}
              </div>
              {longTermGoals.length > 0 ? (
                <div className="p-3 bg-black/60 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 border-2 rounded ${
                      longTermGoals[0].current >= longTermGoals[0].target
                        ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                        : "border-gray-500"
                    }`}>
                      {longTermGoals[0].current >= longTermGoals[0].target && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-white text-sm flex-1">{longTermGoals[0].title}</span>
                  </div>
                  {longTermGoals[0].targetDate && (
                    <p className="text-gray-400 text-xs ml-8">Due: {formatDate(longTermGoals[0].targetDate)}</p>
                  )}
        </div>
              ) : (
                <div className="p-3 bg-black/60 rounded-xl text-gray-400 text-center text-sm">
                  No long-term goals yet
          </div>
        )}
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

          {/* Reflection Section */}
          <div className="bg-gray-900/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Reflection</h2>
              </div>
              <Link 
                href="/reflections"
                className="text-sm font-medium text-cyan-400"
              >
                View All
              </Link>
            </div>
            {hasTodayReflection ? (
              <div className="space-y-3">
                <div className="p-3 bg-black/60 rounded-xl">
                  <p className="text-white text-sm mb-2">Today's Reflection</p>
                  <p className="text-gray-400 text-xs">{reflectionPreview}</p>
                </div>
                {aiFeedback && (
                  <div className="p-3 bg-black/60 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-4 h-4 text-cyan-400" />
                      <p className="text-white text-sm">AI Response</p>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed">{aiFeedback}</p>
        </div>
                )}
                <Link
                  href="/consultation?from=reflection"
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/50 rounded-xl text-cyan-400 text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat with AI about your day
                </Link>
              </div>
            ) : (
              <div className="p-3 bg-black/60 rounded-xl">
                <p className="text-gray-400 text-sm text-center">No reflection for today yet</p>
                <Link
                  href="/reflections"
                  className="block text-center mt-2 text-cyan-400 text-sm hover:underline"
                >
                  Start reflecting
                </Link>
              </div>
            )}
          </div>
        </div>
        </div>

      <BottomNav />
    </div>
  );
}
