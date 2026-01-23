"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { 
  Target, Flame, TrendingUp, TrendingDown, Award, Sparkles, 
  Calendar, CheckCircle2, Circle, ArrowRight, Lightbulb,
  Activity, Zap, Heart, Brain, Clock, Star, Loader2
} from "lucide-react";
import { callRailwayAI } from "@/lib/api";

type TabType = "daily" | "goals" | "progress" | "insights";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [userName, setUserName] = useState("Leo");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [today] = useState(new Date());

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

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

  // Get today's calories
  const caloriesData = useMemo(() => {
    if (typeof window === "undefined") return { current: 0, goal: 2000, percentage: 0 };
    const todayStr = new Date().toISOString().split("T")[0];
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

  // Get gym stats
  const gymStats = useMemo(() => {
    if (typeof window === "undefined") return { today: false, thisWeek: 0, total: 0 };
    let today = false;
    let thisWeek = 0;
    let total = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayStr = todayDate.toISOString().split("T")[0];
    const weekAgo = new Date(todayDate);
    weekAgo.setDate(todayDate.getDate() - 7);
    
    // Check if today's workout is completed
    today = localStorage.getItem(`workout_${todayStr}`) === "completed" || 
            (localStorage.getItem(`workout_${todayStr}`) && localStorage.getItem(`workout_${todayStr}`) !== "null");
    
    for (let i = 0; i < 31; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const completed = localStorage.getItem(`workout_${dateStr}`) === "completed" || 
                       (localStorage.getItem(`workout_${dateStr}`) && localStorage.getItem(`workout_${dateStr}`) !== "null");
      
      if (completed) {
        total++;
        if (date >= weekAgo) thisWeek++;
      }
    }
    
    return { today, thisWeek, total };
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
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
      const mondayDate = new Date(currentDate);
      mondayDate.setDate(currentDate.getDate() - daysFromMonday);
      mondayDate.setHours(0, 0, 0, 0);
      
      // Get data for Monday through Sunday
      for (let i = 0; i < 7; i++) {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        
        const dayMeals = meals.filter((m: any) => m.date === dateStr);
        const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        const dayProtein = dayMeals.reduce((sum: number, meal: any) => sum + (meal.protein || 0), 0);
        const dayCarbs = dayMeals.reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0);
        const dayFats = dayMeals.reduce((sum: number, meal: any) => sum + (meal.fats || 0), 0);
        
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

  // Normalize macro data to percentage of goal
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

  const maxChartValue = 120; // 120% to allow seeing if goals are exceeded

  // Get today's tasks
  const tasksData = useMemo(() => {
    if (typeof window === "undefined") return { today: 0, completed: 0, remaining: 0 };
    const todayStr = new Date().toISOString().split("T")[0];
    const reminders = localStorage.getItem("reminders");
    if (!reminders) return { today: 0, completed: 0, remaining: 0 };
    
    try {
      const parsed = JSON.parse(reminders);
      const allTasks = parsed.filter((r: any) => r.type === "task");
      const todayTasks = allTasks.filter((r: any) => r.date === todayStr);
      const completed = todayTasks.filter((r: any) => r.completed).length;
      const remaining = todayTasks.length - completed;
      return { today: todayTasks.length, completed, remaining };
    } catch (e) {
      return { today: 0, completed: 0, remaining: 0 };
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
      const dailyGoals = goals.filter((g: any) => g.goalType === "daily");
      return dailyGoals.slice(0, 3);
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

  // Get long-term goals
  const longTermGoalsData = useMemo(() => {
    if (typeof window === "undefined") return [];
    const storedGoals = localStorage.getItem("goals");
    if (!storedGoals) return [];
    
    try {
      const goals = JSON.parse(storedGoals);
      const longTermGoals = goals.filter((g: any) => g.goalType === "long-term" || !g.goalType);
      return longTermGoals.slice(0, 4);
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

  // Get habits streak
  const habitsData = useMemo(() => {
    if (typeof window === "undefined") return { total: 0, activeStreaks: [] };
    const storedHabits = localStorage.getItem("allHabits");
    if (!storedHabits) return { total: 0, activeStreaks: [] };
    
    try {
      const allHabits = JSON.parse(storedHabits);
      const activeStreaks = allHabits.map((habit: any) => {
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 91; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const isCompleted = habit.id === "gym" 
            ? localStorage.getItem(`workout_${dateStr}`) === "completed"
            : localStorage.getItem(`habit_${habit.id}_${dateStr}`) === "completed";
          if (isCompleted) {
            streak++;
          } else {
            break;
          }
        }
        return { name: habit.name, streak };
      }).filter((h: any) => h.streak > 0).slice(0, 3);
      
      return { total: allHabits.length, activeStreaks };
    } catch (e) {
      return { total: 0, activeStreaks: [] };
    }
  }, [refreshTrigger]);

  // Refresh data periodically
  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Tab selector component
  const TabSelector = () => (
    <div className="flex gap-2 mb-4 bg-[#0a0f1a] rounded-xl p-1 border border-white/10">
      <button
        onClick={() => setActiveTab("daily")}
        className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
          activeTab === "daily"
            ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-black shadow-lg shadow-teal-500/30"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Daily
      </button>
      <button
        onClick={() => setActiveTab("goals")}
        className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
          activeTab === "goals"
            ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-black shadow-lg shadow-teal-500/30"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Goals
      </button>
      <button
        onClick={() => setActiveTab("progress")}
        className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
          activeTab === "progress"
            ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-black shadow-lg shadow-teal-500/30"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Progress
      </button>
      <button
        onClick={() => setActiveTab("insights")}
        className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
          activeTab === "insights"
            ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-black shadow-lg shadow-teal-500/30"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Insights
      </button>
    </div>
  );

  // Daily Tab Content
  const DailyTab = () => (
    <div className="space-y-4">
      {/* Today's Workout Status */}
      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold text-white">Today's Workout</span>
          </div>
          {gymStats.today ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 rounded-full border border-green-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-semibold text-green-400">Completed</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-500/20 rounded-full border border-gray-500/30">
              <Circle className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-400">Not Done</span>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {gymStats.thisWeek} workout{gymStats.thisWeek !== 1 ? 's' : ''} this week
        </div>
        {!gymStats.today && (
          <Link
            href="/gym"
            className="mt-3 inline-block text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Log workout <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Macros Chart */}
      <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-white mb-0.5">Macros</h2>
          <p className="text-[10px] text-gray-400">7-day overview</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-3 text-[10px]">
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

            {/* Vertical lines for each day */}
            {normalizedMacroData.calories.length > 0 && normalizedMacroData.calories.map((_, timeIndex) => {
              const barWidth = 100 / normalizedMacroData.calories.length;
              const barCenter = (timeIndex * barWidth) + (barWidth / 2);
              const lineSpacing = barWidth * 0.15;
              const lineWidth = barWidth * 0.12;
              
              const calValue = normalizedMacroData.calories[timeIndex]?.value || 0;
              const proValue = normalizedMacroData.protein[timeIndex]?.value || 0;
              const carbValue = normalizedMacroData.carbs[timeIndex]?.value || 0;
              const fatValue = normalizedMacroData.fats[timeIndex]?.value || 0;
              
              const calHeight = (calValue / maxChartValue) * 90;
              const proHeight = (proValue / maxChartValue) * 90;
              const carbHeight = (carbValue / maxChartValue) * 90;
              const fatHeight = (fatValue / maxChartValue) * 90;
              
              const calX = barCenter - (lineSpacing * 1.5);
              const proX = barCenter - (lineSpacing * 0.5);
              const carbX = barCenter + (lineSpacing * 0.5);
              const fatX = barCenter + (lineSpacing * 1.5);
              
              return (
                <g key={timeIndex}>
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
      </div>

      {/* Tasks Section */}
      <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Tasks</h3>
          </div>
          {tasksData.today > 0 && (
            <Link
              href="/tasks"
              className="text-xs text-purple-400 hover:text-purple-300 font-medium"
            >
              View All
            </Link>
          )}
        </div>
        {tasksData.today === 0 ? (
          <div className="text-center py-2">
            <p className="text-xs text-gray-400">No tasks today</p>
          </div>
        ) : (
          <div>
            <div className="text-2xl font-bold text-white mb-1">{tasksData.completed}/{tasksData.today}</div>
            <div className="text-xs text-gray-400">completed</div>
            {tasksData.remaining > 0 && (
              <div className="mt-2 text-xs text-purple-400">{tasksData.remaining} remaining</div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/nutrition"
            className="bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-lg p-3 hover:from-orange-500/30 hover:to-orange-600/20 transition-all"
          >
            <div className="text-xs text-gray-400 mb-1">Log Meal</div>
            <div className="text-sm font-semibold text-white">Add Food</div>
          </Link>
          <Link
            href="/gym"
            className="bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-3 hover:from-blue-500/30 hover:to-blue-600/20 transition-all"
          >
            <div className="text-xs text-gray-400 mb-1">Track Workout</div>
            <div className="text-sm font-semibold text-white">Log Exercise</div>
          </Link>
          <Link
            href="/calendar"
            className="bg-gradient-to-r from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-3 hover:from-purple-500/30 hover:to-purple-600/20 transition-all"
          >
            <div className="text-xs text-gray-400 mb-1">Add Reminder</div>
            <div className="text-sm font-semibold text-white">Schedule</div>
          </Link>
          <Link
            href="/reflections"
            className="bg-gradient-to-r from-teal-500/20 to-teal-600/10 border border-teal-500/30 rounded-lg p-3 hover:from-teal-500/30 hover:to-teal-600/20 transition-all"
          >
            <div className="text-xs text-gray-400 mb-1">Daily Reflection</div>
            <div className="text-sm font-semibold text-white">Reflect</div>
          </Link>
        </div>
      </div>
    </div>
  );

  // Goals Tab Content
  const GoalsTab = () => {
    const allGoals = [...dailyGoalsData, ...longTermGoalsData];
    const completedGoals = allGoals.filter((g: any) => {
      const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
      return pct >= 100;
    });
    const inProgressGoals = allGoals.filter((g: any) => {
      const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
      return pct > 0 && pct < 100;
    });
    
    return (
      <div className="space-y-4">
        {/* Goals Summary Cards */}
        {allGoals.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 rounded-xl p-3 border border-teal-500/30">
              <div className="text-xs text-gray-400 mb-1">Total</div>
              <div className="text-xl font-bold text-white">{allGoals.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-3 border border-green-500/30">
              <div className="text-xs text-gray-400 mb-1">Completed</div>
              <div className="text-xl font-bold text-white">{completedGoals.length}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-3 border border-blue-500/30">
              <div className="text-xs text-gray-400 mb-1">In Progress</div>
              <div className="text-xl font-bold text-white">{inProgressGoals.length}</div>
            </div>
          </div>
        )}

        {/* Goals Overview */}
        <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-teal-400" />
              Your Goals
            </h3>
            <Link
              href="/goals"
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          {allGoals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center border border-teal-500/30">
                <Target className="w-8 h-8 text-teal-400" />
              </div>
              <p className="text-sm text-gray-400 mb-2">No goals yet</p>
              <p className="text-xs text-gray-500 mb-4">Start tracking your progress today</p>
              <Link
                href="/goals"
                className="inline-block bg-gradient-to-r from-teal-500 to-cyan-500 text-black px-4 py-2 rounded-lg text-xs font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all"
              >
                Create Your First Goal
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {allGoals.map((goal: any) => {
                const percentage = goal.target > 0 
                  ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                  : 0;
                const isLongTerm = goal.goalType === "long-term" || !goal.goalType;
                const isCompleted = percentage >= 100;
                const isClose = percentage >= 80 && percentage < 100;
                
                // Calculate days remaining for long-term goals
                let daysRemaining = null;
                if (isLongTerm && goal.targetDate) {
                  const targetDate = new Date(goal.targetDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  targetDate.setHours(0, 0, 0, 0);
                  const diffTime = targetDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays > 0) {
                    daysRemaining = diffDays;
                  }
                }
                
                return (
                  <Link
                    key={goal.id}
                    href="/goals"
                    className={`block rounded-xl p-4 border transition-all ${
                      isCompleted
                        ? "bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30"
                        : isClose
                        ? "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30"
                        : "bg-gradient-to-br from-[rgba(10,15,20,0.8)] to-[rgba(20,30,40,0.6)] border-white/10 hover:border-teal-400/30"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Target className="w-4 h-4 text-teal-400" />
                          )}
                          <span className="text-sm font-bold text-white">{goal.title}</span>
                          {isLongTerm && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-500/30 text-blue-300 rounded-full font-medium">
                              Long-term
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] px-2 py-0.5 bg-green-500/30 text-green-300 rounded-full font-medium">
                              ✓ Done
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-300 mb-1">
                          {goal.current} {goal.unit} / {goal.target} {goal.unit}
                        </div>
                        {daysRemaining !== null && (
                          <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                          </div>
                        )}
                      </div>
                      <div className={`text-2xl font-bold ${
                        isCompleted ? "text-green-400" : isClose ? "text-yellow-400" : "text-teal-400"
                      }`}>
                        {percentage}%
                      </div>
                    </div>
                    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCompleted
                            ? "bg-gradient-to-r from-green-400 to-green-500"
                            : isClose
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                            : "bg-gradient-to-r from-teal-400 to-cyan-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                      {isClose && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Goal Insights */}
        {allGoals.length > 0 && (
          <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Goal Insights
            </h3>
            <div className="space-y-2.5 text-xs text-gray-300">
              {completedGoals.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                  <Award className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-green-300">🎉 {completedGoals.length} goal{completedGoals.length > 1 ? 's' : ''} completed! Amazing work!</span>
                </div>
              )}
              {dailyGoalsData.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>You have {dailyGoalsData.length} daily goal{dailyGoalsData.length > 1 ? 's' : ''} to focus on today</span>
                </div>
              )}
              {longTermGoalsData.length > 0 && (
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>{longTermGoalsData.length} long-term goal{longTermGoalsData.length > 1 ? 's' : ''} in progress</span>
                </div>
              )}
              {allGoals.some((g: any) => {
                const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
                return pct >= 80 && pct < 100;
              }) && (
                <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <Star className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="text-yellow-300">You're close to completing a goal! Keep pushing! 🔥</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Progress Tab Content
  const ProgressTab = () => {
    const weeklyCalories = useMemo(() => {
      if (typeof window === "undefined") return 0;
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const storedMeals = localStorage.getItem("meals");
      if (!storedMeals) return 0;
      
      try {
        const meals = JSON.parse(storedMeals);
        let total = 0;
        for (let i = 0; i < 7; i++) {
          const date = new Date(weekAgo);
          date.setDate(weekAgo.getDate() + i);
          const dateStr = date.toISOString().split("T")[0];
          const dayMeals = meals.filter((m: any) => m.date === dateStr);
          total += dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        }
        return Math.round(total / 7);
      } catch (e) {
        return 0;
      }
    }, [refreshTrigger]);

    return (
      <div className="space-y-4">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/30">
            <div className="text-xs text-gray-400 mb-1">Avg Daily Calories</div>
            <div className="text-xl font-bold text-white">{weeklyCalories}</div>
            <div className="text-xs text-gray-500 mt-1">Last 7 days</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
            <div className="text-xs text-gray-400 mb-1">Workouts This Week</div>
            <div className="text-xl font-bold text-white">{gymStats.thisWeek}</div>
            <div className="text-xs text-gray-500 mt-1">Total: {gymStats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/30">
            <div className="text-xs text-gray-400 mb-1">Task Completion</div>
            <div className="text-xl font-bold text-white">
              {tasksData.today > 0 ? Math.round((tasksData.completed / tasksData.today) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">{tasksData.completed}/{tasksData.today} tasks</div>
          </div>
          <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 rounded-xl p-4 border border-teal-500/30">
            <div className="text-xs text-gray-400 mb-1">Active Habits</div>
            <div className="text-xl font-bold text-white">{habitsData.total}</div>
            <div className="text-xs text-gray-500 mt-1">{habitsData.activeStreaks.length} with streaks</div>
          </div>
        </div>

        {/* Progress Trends */}
        <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            This Week's Progress
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-300">Workouts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white font-semibold">{gymStats.thisWeek}</span>
                {gymStats.thisWeek > 0 && (
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-300">Avg Calories</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white font-semibold">{weeklyCalories}</span>
                <span className="text-xs text-gray-500">cal/day</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-300">Tasks Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white font-semibold">{tasksData.completed}</span>
                <span className="text-xs text-gray-500">of {tasksData.today}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            Recent Achievements
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {gymStats.streak >= 7 && (
              <div className="bg-[rgba(10,15,20,0.6)] rounded-lg p-3 border border-yellow-500/30">
                <div className="text-lg mb-1">🔥</div>
                <div className="text-xs font-semibold text-white">7 Day Streak</div>
                <div className="text-[10px] text-gray-400">Keep it up!</div>
              </div>
            )}
            {gymStats.total >= 10 && (
              <div className="bg-[rgba(10,15,20,0.6)] rounded-lg p-3 border border-blue-500/30">
                <div className="text-lg mb-1">💪</div>
                <div className="text-xs font-semibold text-white">10 Workouts</div>
                <div className="text-[10px] text-gray-400">Great progress!</div>
              </div>
            )}
            {tasksData.completed === tasksData.today && tasksData.today > 0 && (
              <div className="bg-[rgba(10,15,20,0.6)] rounded-lg p-3 border border-green-500/30">
                <div className="text-lg mb-1">✅</div>
                <div className="text-xs font-semibold text-white">All Tasks Done</div>
                <div className="text-[10px] text-gray-400">Perfect day!</div>
              </div>
            )}
            {caloriesData.percentage >= 100 && (
              <div className="bg-[rgba(10,15,20,0.6)] rounded-lg p-3 border border-orange-500/30">
                <div className="text-lg mb-1">🎯</div>
                <div className="text-xs font-semibold text-white">Calorie Goal Met</div>
                <div className="text-[10px] text-gray-400">Well done!</div>
              </div>
            )}
          </div>
          {gymStats.streak < 7 && gymStats.total < 10 && tasksData.completed < tasksData.today && caloriesData.percentage < 100 && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">Keep going to unlock achievements!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Insights Tab Content
  const InsightsTab = () => {
    const [aiEvaluation, setAiEvaluation] = useState<string>("");
    const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
    const [evaluationError, setEvaluationError] = useState<string>("");
    const [hasGenerated, setHasGenerated] = useState(false);

    // Generate AI evaluation
    const generateAIEvaluation = async () => {
      setIsLoadingEvaluation(true);
      setEvaluationError("");
      
      try {
        // Gather user data for context
        const todayStr = new Date().toISOString().split("T")[0];
        const storedMeals = localStorage.getItem("meals");
        const storedGoals = localStorage.getItem("goals");
        const reminders = localStorage.getItem("reminders");
        
        let mealsToday = 0;
        let caloriesToday = 0;
        if (storedMeals) {
          try {
            const meals = JSON.parse(storedMeals);
            const todayMeals = meals.filter((m: any) => m.date === todayStr);
            mealsToday = todayMeals.length;
            caloriesToday = todayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
          } catch (e) {}
        }
        
        let goalsCount = 0;
        let completedGoals = 0;
        if (storedGoals) {
          try {
            const goals = JSON.parse(storedGoals);
            goalsCount = goals.length;
            completedGoals = goals.filter((g: any) => {
              const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
              return pct >= 100;
            }).length;
          } catch (e) {}
        }
        
        let tasksToday = 0;
        let tasksCompleted = 0;
        if (reminders) {
          try {
            const parsed = JSON.parse(reminders);
            const allTasks = parsed.filter((r: any) => r.type === "task");
            const todayTasks = allTasks.filter((r: any) => r.date === todayStr);
            tasksToday = todayTasks.length;
            tasksCompleted = todayTasks.filter((r: any) => r.completed).length;
          } catch (e) {}
        }
        
        const prompt = `You are a friendly and encouraging lifestyle coach. Evaluate the user's progress today and provide a personalized, motivating assessment.

**User's Today's Data:**
- Workout completed: ${gymStats.today ? "Yes" : "No"}
- Workouts this week: ${gymStats.thisWeek}
- Total workouts: ${gymStats.total}
- Calories consumed: ${caloriesToday} (${caloriesData.percentage}% of goal)
- Meals logged: ${mealsToday}
- Tasks completed: ${tasksCompleted} out of ${tasksToday}
- Daily goals: ${dailyGoalsData.length}
- Long-term goals: ${longTermGoalsData.length}
- Active habits: ${habitsData.total}

**Your Task:**
Provide a brief, encouraging evaluation (2-3 sentences) that:
1. Acknowledges what they've accomplished today
2. Gives one specific, actionable tip for improvement
3. Motivates them to keep going

Be positive, specific, and helpful. Keep it concise and friendly.`;

        const response = await callRailwayAI(prompt);
        setAiEvaluation(response);
        setHasGenerated(true);
      } catch (error: any) {
        console.error("Error generating AI evaluation:", error);
        setEvaluationError(error.message || "Failed to generate evaluation. Please try again.");
      } finally {
        setIsLoadingEvaluation(false);
      }
    };

    // Auto-generate evaluation when tab is opened (only once)
    useEffect(() => {
      if (!hasGenerated && !isLoadingEvaluation) {
        generateAIEvaluation();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const insights = useMemo(() => {
      const tips = [];
      
      if (caloriesData.percentage < 50) {
        tips.push({
          icon: Heart,
          color: "orange",
          title: "Nutrition Tip",
          message: "You're below 50% of your calorie goal. Consider adding a healthy snack or meal.",
        });
      }
      
      if (!gymStats.today) {
        tips.push({
          icon: Activity,
          color: "blue",
          title: "Fitness Reminder",
          message: "Haven't logged a workout today? Even 15 minutes makes a difference!",
        });
      } else {
        tips.push({
          icon: Zap,
          color: "green",
          title: "Great Job!",
          message: `You completed your workout today! Keep the momentum going.`,
        });
      }
      
      if (tasksData.remaining > 0) {
        tips.push({
          icon: Clock,
          color: "purple",
          title: "Task Reminder",
          message: `You have ${tasksData.remaining} task${tasksData.remaining > 1 ? 's' : ''} remaining today.`,
        });
      }
      
      if (habitsData.total === 0) {
        tips.push({
          icon: Target,
          color: "teal",
          title: "Habit Tracking",
          message: "Start tracking habits to build consistency and see your progress over time.",
        });
      }
      
      if (longTermGoalsData.length === 0) {
        tips.push({
          icon: Star,
          color: "yellow",
          title: "Long-term Goals",
          message: "Set long-term goals to stay focused on your bigger vision and track meaningful progress.",
        });
      }
      
      return tips;
    }, [caloriesData, gymStats, tasksData, habitsData, longTermGoalsData]);

    return (
      <div className="space-y-4">
        {/* AI Evaluation */}
        <div className="bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-purple-500/20 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              AI Evaluation
            </h3>
            <button
              onClick={generateAIEvaluation}
              disabled={isLoadingEvaluation}
              className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50 flex items-center gap-1"
            >
              {isLoadingEvaluation ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Refresh
                </>
              )}
            </button>
          </div>
          
          {isLoadingEvaluation ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : evaluationError ? (
            <div className="text-xs text-red-400 py-2">
              {evaluationError}
            </div>
          ) : aiEvaluation ? (
            <div className="text-sm text-gray-200 leading-relaxed">
              {aiEvaluation}
            </div>
          ) : (
            <div className="text-xs text-gray-400 py-2">
              Click refresh to get your personalized evaluation
            </div>
          )}
        </div>

        {/* Personalized Insights */}
        <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            Quick Tips
          </h3>
          {insights.length === 0 ? (
            <div className="text-center py-4">
              <Sparkles className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Keep using the app to get personalized insights!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, idx) => {
                const Icon = insight.icon;
                const colorClasses = {
                  orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400",
                  blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
                  green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
                  purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
                  teal: "from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400",
                  yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400",
                };
                
                return (
                  <div
                    key={idx}
                    className={`bg-gradient-to-br ${colorClasses[insight.color as keyof typeof colorClasses]} rounded-lg p-3 border`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-white mb-1">{insight.title}</div>
                        <div className="text-xs text-gray-300">{insight.message}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lifestyle Tips */}
        <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            Lifestyle Tips
          </h3>
          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
              <span>Consistency beats intensity. Small daily actions compound over time.</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
              <span>Track your progress to stay motivated and identify patterns.</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
              <span>Set both daily and long-term goals to balance immediate wins with big vision.</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
              <span>Reflect daily on what went well and what you can improve.</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white px-4 pt-4 pb-24">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-1">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-xs text-gray-400">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      {/* Tab Selector */}
      <TabSelector />

      {/* Tab Content */}
      {activeTab === "daily" && <DailyTab />}
      {activeTab === "goals" && <GoalsTab />}
      {activeTab === "progress" && <ProgressTab />}
      {activeTab === "insights" && <InsightsTab />}

      <BottomNav />
    </main>
  );
}
