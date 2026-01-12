"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { TrendingUp, TrendingDown, Target, Flame, Dumbbell, Calendar } from "lucide-react";

export default function Home() {
  const [today, setToday] = useState(new Date());
  const [userName, setUserName] = useState("Leo");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get calories data
  const caloriesData = useMemo(() => {
    if (typeof window === "undefined") return { current: 0, goal: 2000, percentage: 0 };
    
    const currentDate = new Date();
    const todayStr = currentDate.toISOString().split("T")[0];
    
    const storedMeals = localStorage.getItem("meals");
    if (storedMeals) {
      try {
        const meals = JSON.parse(storedMeals);
        const todayMeals = meals.filter((m: any) => m.date === todayStr);
        const totalCalories = todayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        const storedGoals = localStorage.getItem("macroGoals");
        const goal = storedGoals ? JSON.parse(storedGoals).calories || 2000 : 2000;
        return {
          current: totalCalories,
          goal,
          percentage: Math.min(Math.round((totalCalories / goal) * 100), 100),
        };
      } catch (e) {
        return { current: 0, goal: 2000, percentage: 0 };
      }
    }
    return { current: 0, goal: 2000, percentage: 0 };
  }, [refreshTrigger]);

  // Get weekly calories for chart
  const weeklyCaloriesData = useMemo(() => {
    if (typeof window === "undefined") return [];
    
    const currentDate = new Date();
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return [];
    
    try {
      const meals = JSON.parse(storedMeals);
      const data: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayMeals = meals.filter((m: any) => m.date === dateStr);
        const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        data.push(dayCalories);
      }
      return data;
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

  // Get gym stats
  const gymStats = useMemo(() => {
    if (typeof window === "undefined") return { streak: 0, thisWeek: 0, total: 0 };
    
    let streak = 0;
    let thisWeek = 0;
    let total = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const weekAgo = new Date(todayDate);
    weekAgo.setDate(todayDate.getDate() - 7);
    
    for (let i = 0; i < 31; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const completed = localStorage.getItem(`workout_${dateStr}`) === "completed" || 
                       (localStorage.getItem(`workout_${dateStr}`) && localStorage.getItem(`workout_${dateStr}`) !== "null");
      
      if (completed) {
        total++;
        if (date >= weekAgo) thisWeek++;
        if (i === streak) streak++;
      } else if (i === 0) {
        break;
      }
    }
    
    return { streak, thisWeek, total };
  }, []);

  // Get reminders count
  const remindersData = useMemo(() => {
    if (typeof window === "undefined") return { today: 0, completed: 0 };
    
    const todayStr = new Date().toISOString().split("T")[0];
    const reminders = localStorage.getItem("reminders");
    if (!reminders) return { today: 0, completed: 0 };
    
    try {
      const parsed = JSON.parse(reminders);
      const todayReminders = parsed.filter((r: any) => r.date === todayStr);
      const completed = todayReminders.filter((r: any) => r.completed).length;
      return { today: todayReminders.length, completed };
    } catch (e) {
      return { today: 0, completed: 0 };
    }
  }, []);

  // Load user name
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onboardingData = localStorage.getItem("onboardingData");
    if (onboardingData) {
      try {
        const data = JSON.parse(onboardingData);
        if (data.name) setUserName(data.name);
      } catch (e) {}
    }
  }, []);

  // Refresh data periodically
  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const maxCalories = Math.max(
    ...weeklyCaloriesData, 
    caloriesData.goal, 
    2000, // Minimum scale
    1
  );
  const avgCalories = weeklyCaloriesData.length > 0 
    ? Math.round(weeklyCaloriesData.reduce((a, b) => a + b, 0) / weeklyCaloriesData.length)
    : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white px-4 pt-6 pb-28">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-sm text-gray-400">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      {/* Calories Bar Chart */}
      <section className="mb-6 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Calories</h2>
            <p className="text-xs text-gray-400">7-day overview</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-white">{avgCalories}</div>
            <div className="text-xs text-gray-400">Daily avg</div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-48 relative">
          <svg width="100%" height="100%" className="overflow-visible" style={{ paddingBottom: '20px' }}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((p) => (
              <line
                key={p}
                x1="0"
                y1={`${p}%`}
                x2="100%"
                y2={`${p}%`}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            ))}

            {/* Target calories line */}
            {caloriesData.goal > 0 && (
              <line
                x1="0"
                y1={`${100 - (caloriesData.goal / maxCalories) * 90}%`}
                x2="100%"
                y2={`${100 - (caloriesData.goal / maxCalories) * 90}%`}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="4,4"
                opacity="0.8"
              />
            )}

            {/* Target label */}
            {caloriesData.goal > 0 && (
              <text
                x="2"
                y={`${100 - (caloriesData.goal / maxCalories) * 90}%`}
                dy="-5"
                className="text-[10px] fill-yellow-400 font-semibold"
              >
                Goal: {caloriesData.goal}
              </text>
            )}

            {/* Bars */}
            {weeklyCaloriesData.map((val, i) => {
              const barWidth = 100 / weeklyCaloriesData.length;
              const barHeight = (val / maxCalories) * 90;
              const xPos = (i * barWidth) + (barWidth * 0.15);
              const barActualWidth = barWidth * 0.7;
              const yPos = 100 - barHeight;
              const isAboveGoal = val >= caloriesData.goal;
              
              return (
                <g key={i}>
                  {/* Bar */}
                  <rect
                    x={`${xPos}%`}
                    y={`${yPos}%`}
                    width={`${barActualWidth}%`}
                    height={`${barHeight}%`}
                    fill={isAboveGoal ? "url(#barGradientGreen)" : "url(#barGradient)"}
                    rx="4"
                    className="transition-all hover:opacity-80"
                  />
                  {/* Value label on top of bar */}
                  {val > 0 && (
                    <text
                      x={`${xPos + barActualWidth / 2}%`}
                      y={`${Math.max(yPos - 2, 5)}%`}
                      textAnchor="middle"
                      className="text-[9px] fill-white font-semibold"
                    >
                      {Math.round(val)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Gradient definitions */}
            <defs>
              <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5eead4" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="barGradientGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Day labels */}
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
            <span key={i} className="flex-1 text-center">{day}</span>
          ))}
        </div>
      </section>

      {/* Today's Overview */}
      <section className="grid grid-cols-2 gap-3 mb-6">
        {/* Reminders */}
        <Link href="/calendar" className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10 hover:border-teal-400/50 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium text-gray-300">Reminders</span>
          </div>
          <div className="text-xl font-bold text-white mb-1">
            {remindersData.completed}/{remindersData.today}
          </div>
          <div className="text-xs text-gray-400">Completed today</div>
        </Link>

        {/* Goals Quick View */}
        <Link href="/goals" className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10 hover:border-teal-400/50 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium text-gray-300">Goals</span>
          </div>
          <div className="text-xl font-bold text-white mb-1">—</div>
          <div className="text-xs text-gray-400">View all goals</div>
        </Link>
      </section>

      {/* Quick Actions */}
      <section className="mb-6">
        <Link
          href="/reflections"
          className="block w-full bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black px-6 py-4 rounded-xl font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-teal-500/30 text-center"
        >
          Daily Reflection
        </Link>
      </section>

      <BottomNav />
    </main>
  );
}
