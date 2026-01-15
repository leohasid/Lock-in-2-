"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { TrendingUp, TrendingDown, Target, Flame, Dumbbell, Calendar, CheckSquare2, Plus, X } from "lucide-react";
import ActivityHeatmap from "@/components/ActivityHeatmap";

export default function Home() {
  const [today, setToday] = useState(new Date());
  const [userName, setUserName] = useState("Leo");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAddHabitForm, setShowAddHabitForm] = useState(false);
  const [habitName, setHabitName] = useState("");

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

  // Get tasks (from routine) count
  const tasksData = useMemo(() => {
    if (typeof window === "undefined") return { today: 0, completed: 0, remaining: 0, tasks: [] };
    
    const todayStr = new Date().toISOString().split("T")[0];
    const reminders = localStorage.getItem("reminders");
    if (!reminders) return { today: 0, completed: 0, remaining: 0, tasks: [] };
    
    try {
      const parsed = JSON.parse(reminders);
      // Filter for tasks only (type "task")
      const allTasks = parsed.filter((r: any) => r.type === "task");
      const todayTasks = allTasks.filter((r: any) => r.date === todayStr);
      const completed = todayTasks.filter((r: any) => r.completed).length;
      const remaining = todayTasks.length - completed;
      return { today: todayTasks.length, completed, remaining, tasks: todayTasks.slice(0, 3) };
    } catch (e) {
      return { today: 0, completed: 0, remaining: 0, tasks: [] };
    }
  }, [refreshTrigger]);


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
      
      return dailyGoals.slice(0, 3);
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
      
      // If there are selected goals, use those, otherwise use first 3
      const goalsToShow = selectedIds.length > 0
        ? longTermGoals.filter((g: any) => selectedIds.includes(g.id)).slice(0, 3)
        : longTermGoals.slice(0, 3);
      
      return goalsToShow;
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

  // Get all habits for tracker
  const allHabitsData = useMemo(() => {
    if (typeof window === "undefined") return [];
    
    const storedHabits = localStorage.getItem("allHabits");
    if (!storedHabits) return [];
    
    let allHabits: Array<{ id: string; name: string }> = [];
    try {
      allHabits = JSON.parse(storedHabits);
    } catch (e) {
      return [];
    }
    
    if (allHabits.length === 0) return [];
    
    const today = new Date();
    const total = 91; // 91 days shown in ActivityHeatmap
    
    return allHabits.map((habit) => {
      let streak = 0;
      let completed = 0;
      
      // Calculate streak (consecutive days from today backwards)
      for (let i = 0; i < 91; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        let isCompleted = false;
        if (habit.id === "gym") {
          isCompleted = localStorage.getItem(`workout_${dateStr}`) === "completed";
        } else {
          isCompleted = localStorage.getItem(`habit_${habit.id}_${dateStr}`) === "completed";
        }
        
        if (isCompleted) {
          streak++;
        } else {
          break;
        }
      }
      
      // Calculate total completed days in the 91-day period
      for (let i = 0; i < 91; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        let isCompleted = false;
        if (habit.id === "gym") {
          isCompleted = localStorage.getItem(`workout_${dateStr}`) === "completed";
        } else {
          isCompleted = localStorage.getItem(`habit_${habit.id}_${dateStr}`) === "completed";
        }
        
        if (isCompleted) {
          completed++;
        }
      }
      
      // Function to check if habit was completed on a date
      const getHabitCompletion = (date: Date): boolean => {
        const dateStr = date.toISOString().split("T")[0];
        if (habit.id === "gym") {
          return localStorage.getItem(`workout_${dateStr}`) === "completed";
        } else {
          return localStorage.getItem(`habit_${habit.id}_${dateStr}`) === "completed";
        }
      };
      
      return { habit, streak, completed, total, getHabitCompletion };
    });
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

  // Handle adding a new habit
  const handleAddHabit = () => {
    if (!habitName.trim()) {
      alert("Please enter a habit name");
      return;
    }

    if (typeof window === "undefined") return;
    
    const storedHabits = localStorage.getItem("allHabits");
    let allHabits: Array<{ id: string; name: string }> = [];
    if (storedHabits) {
      try {
        allHabits = JSON.parse(storedHabits);
      } catch (e) {
        // Ignore parse errors
      }
    }

    const newHabit = {
      id: `habit_${Date.now()}`,
      name: habitName.trim(),
    };

    const updatedHabits = [...allHabits, newHabit];
    localStorage.setItem("allHabits", JSON.stringify(updatedHabits));
    
    setHabitName("");
    setShowAddHabitForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

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

      {/* Goals - One Box Split in Half */}
      <section className="mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-3 border border-white/10">
        <div className="flex gap-3 mb-2">
          <div className="flex-1 flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-medium text-gray-300">Daily Goals</span>
          </div>
          <div className="w-px bg-white/10"></div>
          <div className="flex-1 flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-medium text-gray-300">Long-term Goals</span>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Daily Goals - Left Half */}
          <div className="flex-1">
            {dailyGoalsData.length === 0 ? (
              <div className="text-center py-2">
                <div className="text-[10px] text-gray-400 mb-1">No daily goals</div>
                <Link
                  href="/goals"
                  className="text-[9px] text-teal-400 hover:text-teal-300"
                >
                  + Add
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {dailyGoalsData.map((goal: any) => {
                  const percentage = goal.target > 0 
                    ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                    : 0;
                  
                  return (
                    <Link key={goal.id} href="/goals" className="block bg-[rgba(10,15,20,0.6)] rounded-lg p-1.5 border border-white/5 hover:border-teal-400/50 transition-all">
                      <div className="text-[10px] font-semibold text-white mb-0.5 truncate">{goal.title}</div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vertical Divider */}
          <div className="w-px bg-white/10"></div>

          {/* Long-term Goals - Right Half */}
          <div className="flex-1">
            {longTermGoalsData.length === 0 ? (
              <div className="text-center py-2">
                <div className="text-[10px] text-gray-400 mb-1">No long-term goals</div>
                <Link
                  href="/goals"
                  className="text-[9px] text-teal-400 hover:text-teal-300"
                >
                  + Add
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {longTermGoalsData.map((goal: any) => {
                  const percentage = goal.target > 0 
                    ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                    : 0;
                  
                  return (
                    <Link key={goal.id} href="/goals" className="block bg-[rgba(10,15,20,0.6)] rounded-lg p-1.5 border border-white/5 hover:border-teal-400/50 transition-all">
                      <div className="text-[10px] font-semibold text-white mb-0.5 truncate">{goal.title}</div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tasks Section */}
      <section className="mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare2 className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white">Tasks</h2>
          </div>
          {tasksData.today > 0 && (
            <Link
              href="/tasks"
              className="text-xs text-teal-400 hover:text-teal-300 font-medium"
            >
              View All
            </Link>
          )}
        </div>
        {tasksData.tasks.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-400">No tasks today</p>
            <p className="text-[10px] text-gray-500 mt-1">Tasks from your routine will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasksData.tasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-2 bg-[rgba(10,15,20,0.6)] rounded-lg p-2 border border-white/5"
              >
                <div className={`w-2 h-2 rounded-full ${task.completed ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className={`text-xs flex-1 ${task.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                  {task.title}
                </span>
                <span className="text-[10px] text-gray-400">{task.time}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Habit Tracker Section */}
      <section className="mb-3 bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Habit Tracker</h2>
          <Link
            href="/habits"
            className="text-xs text-teal-400 hover:text-teal-300 font-medium"
          >
            View All
          </Link>
        </div>
        {allHabitsData.length > 0 ? (
          <ActivityHeatmap
            title={allHabitsData[0].habit.name}
            streak={allHabitsData[0].streak}
            completed={allHabitsData[0].completed}
            total={allHabitsData[0].total}
            getActivityData={allHabitsData[0].getHabitCompletion}
            color="#14b8a6"
            showLegend={false}
          />
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-gray-400">No habits yet</p>
            <p className="text-[10px] text-gray-500 mt-1">Add habits to track your progress</p>
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
