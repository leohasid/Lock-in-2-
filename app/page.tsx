"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { TrendingUp, TrendingDown, Target, Flame, Dumbbell, Calendar, Shield } from "lucide-react";

export default function Home() {
  const [today, setToday] = useState(new Date());
  const [userName, setUserName] = useState("Leo");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedAddictionId, setSelectedAddictionId] = useState<string | null>(null);
  const [showAddictionSelector, setShowAddictionSelector] = useState(false);

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

  // Get Monday to Sunday weekly macro data
  const dailyMacroData = useMemo(() => {
    if (typeof window === "undefined") return { calories: [], protein: [], carbs: [], fats: [] };
    
    const currentDate = new Date();
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return { calories: [], protein: [], carbs: [], fats: [] };
    
    try {
      const meals = JSON.parse(storedMeals);
      const caloriesData: Array<{ day: string; value: number }> = [];
      const proteinData: Array<{ day: string; value: number }> = [];
      const carbsData: Array<{ day: string; value: number }> = [];
      const fatsData: Array<{ day: string; value: number }> = [];
      
      // Find Monday of current week (Monday = 1, Sunday = 0)
      const currentDay = currentDate.getDay();
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days
      const mondayDate = new Date(currentDate);
      mondayDate.setDate(currentDate.getDate() - daysFromMonday);
      mondayDate.setHours(0, 0, 0, 0);
      
      // Get data for Monday through Sunday
      for (let i = 0; i < 7; i++) {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        
        // Get all meals for this day
        const dayMeals = meals.filter((m: any) => m.date === dateStr);
        
        // Sum macros for the day
        const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        const dayProtein = dayMeals.reduce((sum: number, meal: any) => sum + (meal.protein || 0), 0);
        const dayCarbs = dayMeals.reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0);
        const dayFats = dayMeals.reduce((sum: number, meal: any) => sum + (meal.fats || 0), 0);
        
        // Format day label (e.g., "Mon 5")
        const dayLabel = date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
        
        caloriesData.push({ day: dayLabel, value: dayCalories });
        proteinData.push({ day: dayLabel, value: dayProtein });
        carbsData.push({ day: dayLabel, value: dayCarbs });
        fatsData.push({ day: dayLabel, value: dayFats });
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
  }, [refreshTrigger]);

  // Get addictions
  const addictions = useMemo(() => {
    if (typeof window === "undefined") return [];
    
    const stored = localStorage.getItem("addictions");
    if (!stored) return [];
    
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

  // Get selected addiction for home page
  const selectedAddiction = useMemo(() => {
    if (!selectedAddictionId) return null;
    return addictions.find((a: any) => a.id === selectedAddictionId) || null;
  }, [addictions, selectedAddictionId]);

  // Load selected addiction from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("selectedAddictionForHome");
    if (stored) {
      try {
        const id = JSON.parse(stored);
        setSelectedAddictionId(id);
      } catch (e) {
        // If no addiction selected, use first one if available
        const storedAddictions = localStorage.getItem("addictions");
        if (storedAddictions) {
          try {
            const parsed = JSON.parse(storedAddictions);
            if (parsed.length > 0) {
              setSelectedAddictionId(parsed[0].id);
              localStorage.setItem("selectedAddictionForHome", JSON.stringify(parsed[0].id));
            }
          } catch (e) {}
        }
      }
    } else {
      // If no selection stored, use first addiction if available
      const storedAddictions = localStorage.getItem("addictions");
      if (storedAddictions) {
        try {
          const parsed = JSON.parse(storedAddictions);
          if (parsed.length > 0) {
            setSelectedAddictionId(parsed[0].id);
            localStorage.setItem("selectedAddictionForHome", JSON.stringify(parsed[0].id));
          }
        } catch (e) {}
      }
    }
  }, []);

  // Save selected addiction to localStorage
  const handleSelectAddiction = (id: string) => {
    setSelectedAddictionId(id);
    localStorage.setItem("selectedAddictionForHome", JSON.stringify(id));
    setShowAddictionSelector(false);
  };

  // Get daily goals
  const dailyGoalsData = useMemo(() => {
    if (typeof window === "undefined") return [];
    
    const storedGoals = localStorage.getItem("goals");
    if (!storedGoals) return [];
    
    try {
      const goals = JSON.parse(storedGoals);
      const todayStr = new Date().toISOString().split("T")[0];
      
      // Filter daily goals and reset if needed
      const dailyGoals = goals.filter((g: any) => g.goalType === "daily").map((goal: any) => {
        // Reset daily goals if it's a new day
        if (goal.lastUpdated !== todayStr) {
          const updatedGoal = { ...goal, current: 0, lastUpdated: todayStr };
          // Update in localStorage
          const allGoals = JSON.parse(storedGoals);
          const updatedAllGoals = allGoals.map((g: any) => g.id === goal.id ? updatedGoal : g);
          localStorage.setItem("goals", JSON.stringify(updatedAllGoals));
          return updatedGoal;
        }
        return goal;
      });
      
      return dailyGoals.slice(0, 4);
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

  // Get long-term goals (up to 4)
  const longTermGoalsData = useMemo(() => {
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
      
      // Filter long-term goals only
      const longTermGoals = goals.filter((g: any) => g.goalType === "long-term" || !g.goalType);
      
      // If there are selected goals, use those, otherwise use first 4
      const goalsToShow = selectedIds.length > 0
        ? longTermGoals.filter((g: any) => selectedIds.includes(g.id)).slice(0, 4)
        : longTermGoals.slice(0, 4);
      
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
      calories: dailyMacroData.calories.map(d => ({
        ...d,
        value: macroGoals.calories > 0 ? (d.value / macroGoals.calories) * 100 : 0,
      })),
      protein: dailyMacroData.protein.map(d => ({
        ...d,
        value: macroGoals.protein > 0 ? (d.value / macroGoals.protein) * 100 : 0,
      })),
      carbs: dailyMacroData.carbs.map(d => ({
        ...d,
        value: macroGoals.carbs > 0 ? (d.value / macroGoals.carbs) * 100 : 0,
      })),
      fats: dailyMacroData.fats.map(d => ({
        ...d,
        value: macroGoals.fats > 0 ? (d.value / macroGoals.fats) * 100 : 0,
      })),
    };
  }, [dailyMacroData, macroGoals]);

  // Max value is 100% (goal) or slightly more if exceeded
  const maxChartValue = 120; // 120% to allow seeing if goals are exceeded

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white px-4 pt-4 pb-24">
      {/* Header */}
      <header className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white mb-0.5">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-xs text-gray-400">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          href="/reflections"
          className="bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black px-3 py-1.5 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 text-xs"
        >
          Reflection
        </Link>
      </header>

      {/* Macros Stacked Bar Chart */}
      <section className="mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-3 border border-white/10">
        <div className="mb-2">
          <h2 className="text-base font-semibold text-white mb-0.5">Macros</h2>
          <p className="text-[10px] text-gray-400">7-day overview</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-2 text-[10px]">
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
        <div className="h-20 relative">
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

        {/* Day labels */}
        {normalizedMacroData.calories.length > 0 && (
          <div className="flex justify-between mt-1 text-[9px] text-gray-500">
            {normalizedMacroData.calories.map((d, i) => (
              <span key={i} className="flex-1 text-center">{d.day}</span>
            ))}
          </div>
        )}
      </section>

      {/* Daily Goals */}
      {dailyGoalsData.length > 0 && (
        <section className="mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-3 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-medium text-gray-300">Daily Goals</span>
            </div>
          </div>
          <div className="space-y-2">
            {dailyGoalsData.map((goal: any) => {
              const percentage = goal.target > 0 
                ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                : 0;
              
              return (
                <Link key={goal.id} href="/goals" className="block bg-[rgba(10,15,20,0.6)] rounded-lg p-2 border border-white/5 hover:border-teal-400/50 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-white">{goal.title}</div>
                    <div className="text-[10px] text-gray-400">
                      {goal.current} / {goal.target} {goal.unit}
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{percentage}% complete</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Long-term Goals */}
      <section className="mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-3 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-medium text-gray-300">Long-term Goals</span>
          </div>
        </div>

        {longTermGoalsData.length === 0 ? (
          <div className="text-center py-3">
            <div className="text-sm font-semibold text-white mb-1">No long-term goals</div>
            <div className="text-[10px] text-gray-400 mb-2">Set goals for the future.</div>
            <Link
              href="/goals"
              className="inline-block bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black px-3 py-1.5 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 text-xs"
            >
              + Create goal
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-2">
              {longTermGoalsData.map((goal: any) => {
                const percentage = goal.target > 0 
                  ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                  : 0;
                
                return (
                  <Link key={goal.id} href="/goals" className="block bg-[rgba(10,15,20,0.6)] rounded-lg p-2 border border-white/5 hover:border-teal-400/50 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-white">{goal.title}</div>
                      <div className="text-[10px] text-gray-400">
                        {goal.current} / {goal.target} {goal.unit}
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{percentage}% complete</div>
                  </Link>
                );
              })}
            </div>
            <Link
              href="/goals"
              className="block w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 rounded-lg font-semibold transition-all text-center text-xs"
            >
              View all goals
            </Link>
          </>
        )}
      </section>

      {/* Reminders and Addiction Side by Side */}
      <section className="mb-3 flex gap-2">
        {/* Reminders - Left Half */}
        <div className="flex-1">
          <Link href="/calendar" className="block bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-3 border border-white/10 hover:border-teal-400/50 transition-all h-full">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-medium text-gray-300">Reminders</span>
            </div>
            <div className="text-lg font-bold text-white mb-0.5">
              {remindersData.completed}/{remindersData.today}
            </div>
            <div className="text-[10px] text-gray-400">Completed today</div>
          </Link>
        </div>

        {/* Addiction - Right Half */}
        <div className="flex-1 relative">
          {selectedAddiction ? (
            <div 
              onClick={() => setShowAddictionSelector(true)}
              className="block bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-3 border border-white/10 hover:border-teal-400/50 transition-all h-full cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-medium text-gray-300">{selectedAddiction.name}</span>
              </div>
              {("apps" in selectedAddiction || (selectedAddiction as any).type === "phone") ? (
                <>
                  <div className="text-lg font-bold text-white mb-0.5">
                    {Math.floor(((selectedAddiction as any).totalCurrentUsage || 0) / 60)}h {((selectedAddiction as any).totalCurrentUsage || 0) % 60}m
                  </div>
                  <div className="text-[10px] text-gray-400">Today&apos;s usage</div>
                </>
              ) : ((selectedAddiction as any).type === "vape" || (selectedAddiction as any).type === "goon") ? (
                <>
                  <div className="text-lg font-bold text-white mb-0.5">
                    ${(selectedAddiction as any).weeklySpend || 0}
                  </div>
                  <div className="text-[10px] text-gray-400">Weekly spend</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-white mb-0.5">
                    Active
                  </div>
                  <div className="text-[10px] text-gray-400">Tracking</div>
                </>
              )}
            </div>
          ) : addictions.length > 0 ? (
            <div 
              onClick={() => setShowAddictionSelector(true)}
              className="block bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-3 border border-white/10 hover:border-teal-400/50 transition-all h-full cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-medium text-gray-300">Select Addiction</span>
              </div>
              <div className="text-sm text-gray-400">Tap to choose</div>
            </div>
          ) : (
            <Link 
              href="/addictions"
              className="block bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-3 border border-white/10 hover:border-teal-400/50 transition-all h-full"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-medium text-gray-300">Addiction</span>
              </div>
              <div className="text-sm text-gray-400">Add one to track</div>
            </Link>
          )}
        </div>
      </section>

      {/* Addiction Selector Modal */}
      {showAddictionSelector && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-6 max-w-md w-full border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Select Addiction to Display</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {addictions.map((addiction: any) => (
                <button
                  key={addiction.id}
                  onClick={() => handleSelectAddiction(addiction.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedAddictionId === addiction.id
                      ? "bg-teal-500/20 border-teal-400"
                      : "bg-white/5 border-white/10 hover:border-teal-400/50"
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{addiction.name}</div>
                  {addiction.type && (
                    <div className="text-xs text-gray-400 mt-1">{addiction.type}</div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddictionSelector(false)}
              className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold transition-all text-white text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
