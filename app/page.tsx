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

  // Get today's hourly macro data for line graph
  const todayMacroData = useMemo(() => {
    if (typeof window === "undefined") return { calories: [], protein: [], carbs: [], fats: [] };
    
    const currentDate = new Date();
    const todayStr = currentDate.toISOString().split("T")[0];
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return { calories: [], protein: [], carbs: [], fats: [] };
    
    try {
      const meals = JSON.parse(storedMeals);
      const todayMeals = meals.filter((m: any) => m.date === todayStr);
      
      // Initialize hourly data (24 hours)
      const hourlyData: { [key: string]: { calories: number; protein: number; carbs: number; fats: number } } = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[`${i.toString().padStart(2, '0')}:00`] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      }
      
      // Sum macros by hour
      todayMeals.forEach((meal: any) => {
        if (meal.time) {
          const hour = meal.time.split(':')[0];
          const hourKey = `${hour.padStart(2, '0')}:00`;
          if (hourlyData[hourKey]) {
            hourlyData[hourKey].calories += meal.calories || 0;
            hourlyData[hourKey].protein += meal.protein || 0;
            hourlyData[hourKey].carbs += meal.carbs || 0;
            hourlyData[hourKey].fats += meal.fats || 0;
          }
        }
      });
      
      // Convert to cumulative arrays and filter to show key hours
      const keyHours = [0, 6, 9, 12, 15, 18, 21];
      let cumulativeCalories = 0;
      let cumulativeProtein = 0;
      let cumulativeCarbs = 0;
      let cumulativeFats = 0;
      
      const caloriesData: Array<{ time: string; value: number }> = [];
      const proteinData: Array<{ time: string; value: number }> = [];
      const carbsData: Array<{ time: string; value: number }> = [];
      const fatsData: Array<{ time: string; value: number }> = [];
      
      for (let i = 0; i < 24; i++) {
        const hourKey = `${i.toString().padStart(2, '0')}:00`;
        const data = hourlyData[hourKey];
        
        cumulativeCalories += data.calories;
        cumulativeProtein += data.protein;
        cumulativeCarbs += data.carbs;
        cumulativeFats += data.fats;
        
        if (keyHours.includes(i) || i === 23) {
          caloriesData.push({ time: hourKey, value: cumulativeCalories });
          proteinData.push({ time: hourKey, value: cumulativeProtein });
          carbsData.push({ time: hourKey, value: cumulativeCarbs });
          fatsData.push({ time: hourKey, value: cumulativeFats });
        }
      }
      
      return { calories: caloriesData, protein: proteinData, carbs: carbsData, fats: fatsData };
    } catch (e) {
      return { calories: [], protein: [], carbs: [], fats: [] };
    }
  }, [refreshTrigger]);

  // Get macro goals
  const macroGoals = useMemo(() => {
    if (typeof window === "undefined") return { calories: 2000, protein: 150, carbs: 250, fats: 65 };
    
    const storedGoals = localStorage.getItem("macroGoals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        return {
          calories: goals.calories || 2000,
          protein: goals.protein || 150,
          carbs: goals.carbs || 250,
          fats: goals.fats || 65,
        };
      } catch (e) {
        return { calories: 2000, protein: 150, carbs: 250, fats: 65 };
      }
    }
    return { calories: 2000, protein: 150, carbs: 250, fats: 65 };
  }, []);

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

  // Get goals (up to 4)
  const goalsData = useMemo(() => {
    if (typeof window === "undefined") return [];
    
    const storedGoals = localStorage.getItem("goals");
    if (!storedGoals) return [];
    
    try {
      const goals = JSON.parse(storedGoals);
      // Get selected goals for home, or first 4 if none selected
      const storedSelected = localStorage.getItem("selectedGoalsForHome");
      let selectedIds: string[] = [];
      if (storedSelected) {
        try {
          selectedIds = JSON.parse(storedSelected);
        } catch (e) {
          selectedIds = [];
        }
      }
      
      // If there are selected goals, use those, otherwise use first 4
      const goalsToShow = selectedIds.length > 0
        ? goals.filter((g: any) => selectedIds.includes(g.id)).slice(0, 4)
        : goals.slice(0, 4);
      
      return goalsToShow;
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

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

  // Normalize macro data to percentage of goal for better comparison
  const normalizedMacroData = useMemo(() => {
    return {
      calories: todayMacroData.calories.map(d => ({
        ...d,
        value: macroGoals.calories > 0 ? (d.value / macroGoals.calories) * 100 : 0,
      })),
      protein: todayMacroData.protein.map(d => ({
        ...d,
        value: macroGoals.protein > 0 ? (d.value / macroGoals.protein) * 100 : 0,
      })),
      carbs: todayMacroData.carbs.map(d => ({
        ...d,
        value: macroGoals.carbs > 0 ? (d.value / macroGoals.carbs) * 100 : 0,
      })),
      fats: todayMacroData.fats.map(d => ({
        ...d,
        value: macroGoals.fats > 0 ? (d.value / macroGoals.fats) * 100 : 0,
      })),
    };
  }, [todayMacroData, macroGoals]);

  // Max value is 100% (goal) or slightly more if exceeded
  const maxChartValue = 120; // 120% to allow seeing if goals are exceeded

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

      {/* Macros Stacked Bar Chart */}
      <section className="mb-6 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-5 border border-white/10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white mb-1">Macros</h2>
          <p className="text-xs text-gray-400">Today&apos;s intake</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-orange-400 to-orange-500"></div>
            <span className="text-gray-300">Calories</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-400 to-blue-500"></div>
            <span className="text-gray-300">Protein</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-400 to-purple-500"></div>
            <span className="text-gray-300">Carbs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-teal-400 to-teal-500"></div>
            <span className="text-gray-300">Fats</span>
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <div className="h-32 relative">
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

            {/* Goal line at top (100%) */}
            <line
              x1="0"
              y1="8.33%"
              x2="100%"
              y2="8.33%"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.8"
            />

            {/* Vertical skinny lines for each time period */}
            {normalizedMacroData.calories.length > 0 && normalizedMacroData.calories.map((_, timeIndex) => {
              const barWidth = 100 / normalizedMacroData.calories.length;
              const barCenter = (timeIndex * barWidth) + (barWidth / 2);
              const lineSpacing = barWidth * 0.15; // Space between lines
              const lineWidth = barWidth * 0.12; // Width of each skinny line
              
              // Get values for this time period
              const calValue = normalizedMacroData.calories[timeIndex]?.value || 0;
              const proValue = normalizedMacroData.protein[timeIndex]?.value || 0;
              const carbValue = normalizedMacroData.carbs[timeIndex]?.value || 0;
              const fatValue = normalizedMacroData.fats[timeIndex]?.value || 0;
              
              // Calculate heights (as percentage of maxChartValue)
              const calHeight = (calValue / maxChartValue) * 90;
              const proHeight = (proValue / maxChartValue) * 90;
              const carbHeight = (carbValue / maxChartValue) * 90;
              const fatHeight = (fatValue / maxChartValue) * 90;
              
              // Calculate x positions for each line (centered around barCenter)
              const calX = barCenter - (lineSpacing * 1.5);
              const proX = barCenter - (lineSpacing * 0.5);
              const carbX = barCenter + (lineSpacing * 0.5);
              const fatX = barCenter + (lineSpacing * 1.5);
              
              return (
                <g key={timeIndex}>
                  {/* Calories line (Orange) - leftmost */}
                  {calHeight > 0 && (
                    <rect
                      x={`${calX - lineWidth / 2}%`}
                      y={`${100 - calHeight}%`}
                      width={`${lineWidth}%`}
                      height={`${calHeight}%`}
                      fill="url(#caloriesGradient)"
                      rx="1"
                    />
                  )}
                  
                  {/* Protein line (Blue) */}
                  {proHeight > 0 && (
                    <rect
                      x={`${proX - lineWidth / 2}%`}
                      y={`${100 - proHeight}%`}
                      width={`${lineWidth}%`}
                      height={`${proHeight}%`}
                      fill="url(#proteinGradient)"
                      rx="1"
                    />
                  )}
                  
                  {/* Carbs line (Purple) */}
                  {carbHeight > 0 && (
                    <rect
                      x={`${carbX - lineWidth / 2}%`}
                      y={`${100 - carbHeight}%`}
                      width={`${lineWidth}%`}
                      height={`${carbHeight}%`}
                      fill="url(#carbsGradient)"
                      rx="1"
                    />
                  )}
                  
                  {/* Fats line (Teal) - rightmost */}
                  {fatHeight > 0 && (
                    <rect
                      x={`${fatX - lineWidth / 2}%`}
                      y={`${100 - fatHeight}%`}
                      width={`${lineWidth}%`}
                      height={`${fatHeight}%`}
                      fill="url(#fatsGradient)"
                      rx="1"
                    />
                  )}
                </g>
              );
            })}

            {/* Gradient definitions */}
            <defs>
              <linearGradient id="caloriesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="proteinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="carbsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="fatsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Time labels */}
        {normalizedMacroData.calories.length > 0 && (
          <div className="flex justify-between mt-2 text-[10px] text-gray-500">
            {normalizedMacroData.calories.map((d, i) => (
              <span key={i} className="flex-1 text-center">{d.time.substring(0, 5)}</span>
            ))}
          </div>
        )}
      </section>

      {/* Goals */}
      <section className="mb-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium text-gray-300">Goals</span>
          </div>
        </div>

        {goalsData.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-lg font-semibold text-white mb-2">No active goals</div>
            <div className="text-xs text-gray-400 mb-4">Define what you&apos;re working toward this week.</div>
            <Link
              href="/goals"
              className="inline-block bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 text-sm"
            >
              + Create goal
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {goalsData.map((goal: any) => {
                const percentage = goal.target > 0 
                  ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                  : 0;
                
                return (
                  <div key={goal.id} className="bg-[rgba(10,15,20,0.6)] rounded-lg p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-white">{goal.title}</div>
                      <div className="text-xs text-gray-400">
                        {goal.current} / {goal.target} {goal.unit}
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{percentage}% complete</div>
                  </div>
                );
              })}
            </div>
            <Link
              href="/goals"
              className="block w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded-lg font-semibold transition-all text-center text-sm"
            >
              View all goals
            </Link>
          </>
        )}
      </section>

      {/* Reminders */}
      <section className="mb-6">
        <Link href="/calendar" className="block bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10 hover:border-teal-400/50 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium text-gray-300">Reminders</span>
          </div>
          <div className="text-xl font-bold text-white mb-1">
            {remindersData.completed}/{remindersData.today}
          </div>
          <div className="text-xs text-gray-400">Completed today</div>
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
