"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { 
  Target, Flame, TrendingUp, TrendingDown, Award, Sparkles, 
  Calendar, CheckCircle2, Circle, ArrowRight, Lightbulb,
  Activity, Zap, Heart, Brain, Clock, Star, Loader2, BarChart3,
  ChevronRight, Minus
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
      
      const currentDay = currentDate.getDay();
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
      const mondayDate = new Date(currentDate);
      mondayDate.setDate(currentDate.getDate() - daysFromMonday);
      mondayDate.setHours(0, 0, 0, 0);
      
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

  const maxChartValue = 120;

  // Refresh data periodically
  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Tab selector component
  const TabSelector = () => (
    <div className="flex gap-1 mb-6 bg-[#0a0a0a] rounded-lg p-1 border border-[#1a1a1a]">
      {(["daily", "goals", "progress", "insights"] as TabType[]).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex-1 py-2.5 px-3 rounded-md font-medium text-sm transition-all capitalize ${
            activeTab === tab
              ? "bg-[#1a1a1a] text-white shadow-sm"
              : "text-[#666] hover:text-[#999]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  // Daily Tab Content
  const DailyTab = () => (
    <div className="space-y-6">
      {/* Today's Overview - Large Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a]">
          <div className="text-[11px] text-[#666] uppercase tracking-wide mb-2">Calories</div>
          <div className="text-2xl font-semibold text-white mb-1">{caloriesData.current}</div>
          <div className="text-[11px] text-[#666]">of {caloriesData.goal}</div>
          <div className="mt-3 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all"
              style={{ width: `${Math.min(caloriesData.percentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a]">
          <div className="text-[11px] text-[#666] uppercase tracking-wide mb-2">Workout</div>
          <div className="text-2xl font-semibold text-white mb-1">
            {gymStats.today ? "Done" : "—"}
          </div>
          <div className="text-[11px] text-[#666]">{gymStats.thisWeek} this week</div>
          {!gymStats.today && (
            <Link href="/gym" className="mt-3 text-[11px] text-[#888] hover:text-white transition-colors flex items-center gap-1">
              Log <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a]">
          <div className="text-[11px] text-[#666] uppercase tracking-wide mb-2">Tasks</div>
          <div className="text-2xl font-semibold text-white mb-1">{tasksData.completed}</div>
          <div className="text-[11px] text-[#666]">of {tasksData.today}</div>
          {tasksData.remaining > 0 && (
            <div className="mt-3 text-[11px] text-[#888]">{tasksData.remaining} remaining</div>
          )}
        </div>
      </div>

      {/* Macros Chart */}
      <div className="bg-[#0a0a0a] rounded-lg p-5 border border-[#1a1a1a]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Macro Trends</h3>
            <p className="text-xs text-[#666]">7-day overview</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-orange-500"></div>
            <span className="text-[#888]">Calories</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-blue-500"></div>
            <span className="text-[#888]">Protein</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-purple-500"></div>
            <span className="text-[#888]">Carbs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded bg-teal-500"></div>
            <span className="text-[#888]">Fats</span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-24 relative">
          <svg width="100%" height="100%" className="overflow-visible">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((p) => (
              <line
                key={p}
                x1="0"
                y1={`${p}%`}
                x2="100%"
                y2={`${p}%`}
                stroke="#1a1a1a"
                strokeWidth="1"
              />
            ))}

            {/* Goal line */}
            <line
              x1="0"
              y1="8.33%"
              x2="100%"
              y2="8.33%"
              stroke="#444"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.5"
            />

            {/* Bars */}
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
                      fill="#f97316"
                      rx="1"
                    />
                  )}
                  {proHeight > 0 && (
                    <rect
                      x={`${proX - lineWidth / 2}%`}
                      y={`${100 - proHeight}%`}
                      width={`${lineWidth}%`}
                      height={`${proHeight}%`}
                      fill="#3b82f6"
                      rx="1"
                    />
                  )}
                  {carbHeight > 0 && (
                    <rect
                      x={`${carbX - lineWidth / 2}%`}
                      y={`${100 - carbHeight}%`}
                      width={`${lineWidth}%`}
                      height={`${carbHeight}%`}
                      fill="#8b5cf6"
                      rx="1"
                    />
                  )}
                  {fatHeight > 0 && (
                    <rect
                      x={`${fatX - lineWidth / 2}%`}
                      y={`${100 - fatHeight}%`}
                      width={`${lineWidth}%`}
                      height={`${fatHeight}%`}
                      fill="#14b8a6"
                      rx="1"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Day labels */}
        {normalizedMacroData.calories.length > 0 && (
          <div className="flex justify-between mt-3 text-[10px] text-[#666]">
            {normalizedMacroData.calories.map((d, i) => (
              <span key={i} className="flex-1 text-center">{d.day}</span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/nutrition"
          className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors group"
        >
          <div className="text-xs text-[#666] mb-1">Log Meal</div>
          <div className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">Add Food</div>
        </Link>
        <Link
          href="/gym"
          className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors group"
        >
          <div className="text-xs text-[#666] mb-1">Track Workout</div>
          <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">Log Exercise</div>
        </Link>
        <Link
          href="/calendar"
          className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors group"
        >
          <div className="text-xs text-[#666] mb-1">Add Reminder</div>
          <div className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">Schedule</div>
        </Link>
        <Link
          href="/reflections"
          className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors group"
        >
          <div className="text-xs text-[#666] mb-1">Daily Reflection</div>
          <div className="text-sm font-medium text-white group-hover:text-teal-400 transition-colors">Reflect</div>
        </Link>
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
      <div className="space-y-6">
        {/* Summary */}
        {allGoals.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] text-center">
              <div className="text-2xl font-semibold text-white mb-1">{allGoals.length}</div>
              <div className="text-[11px] text-[#666] uppercase tracking-wide">Total</div>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] text-center">
              <div className="text-2xl font-semibold text-white mb-1">{completedGoals.length}</div>
              <div className="text-[11px] text-[#666] uppercase tracking-wide">Completed</div>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a] text-center">
              <div className="text-2xl font-semibold text-white mb-1">{inProgressGoals.length}</div>
              <div className="text-[11px] text-[#666] uppercase tracking-wide">In Progress</div>
            </div>
          </div>
        )}

        {/* Goals List */}
        <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
          <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
            <h3 className="text-base font-semibold text-white">Goals</h3>
            <Link
              href="/goals"
              className="text-xs text-[#666] hover:text-white transition-colors flex items-center gap-1"
            >
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          {allGoals.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="w-12 h-12 text-[#333] mx-auto mb-4" />
              <p className="text-sm text-[#666] mb-2">No goals yet</p>
              <Link
                href="/goals"
                className="inline-block text-xs text-white hover:text-teal-400 transition-colors"
              >
                Create your first goal →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {allGoals.map((goal: any, idx: number) => {
                const percentage = goal.target > 0 
                  ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                  : 0;
                const isLongTerm = goal.goalType === "long-term" || !goal.goalType;
                const isCompleted = percentage >= 100;
                
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
                    className="block p-5 hover:bg-[#0f0f0f] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#444]" />
                          )}
                          <span className="text-sm font-medium text-white">{goal.title}</span>
                          {isLongTerm && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] text-[#888] rounded">
                              Long-term
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#666] ml-6">
                          {goal.current} {goal.unit} / {goal.target} {goal.unit}
                        </div>
                        {daysRemaining !== null && (
                          <div className="text-[10px] text-[#555] ml-6 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                          </div>
                        )}
                      </div>
                      <div className={`text-lg font-semibold ${
                        isCompleted ? "text-green-500" : "text-white"
                      }`}>
                        {percentage}%
                      </div>
                    </div>
                    <div className="ml-6 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCompleted
                            ? "bg-green-500"
                            : "bg-white"
                        }`}
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
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a]">
            <div className="text-[11px] text-[#666] uppercase tracking-wide mb-2">Avg Calories</div>
            <div className="text-xl font-semibold text-white">{weeklyCalories}</div>
            <div className="text-[11px] text-[#666] mt-1">Last 7 days</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a]">
            <div className="text-[11px] text-[#666] uppercase tracking-wide mb-2">Workouts</div>
            <div className="text-xl font-semibold text-white">{gymStats.thisWeek}</div>
            <div className="text-[11px] text-[#666] mt-1">This week</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a]">
            <div className="text-[11px] text-[#666] uppercase tracking-wide mb-2">Task Rate</div>
            <div className="text-xl font-semibold text-white">
              {tasksData.today > 0 ? Math.round((tasksData.completed / tasksData.today) * 100) : 0}%
            </div>
            <div className="text-[11px] text-[#666] mt-1">Completion</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1a1a1a]">
            <div className="text-[11px] text-[#666] uppercase tracking-wide mb-2">Total</div>
            <div className="text-xl font-semibold text-white">{gymStats.total}</div>
            <div className="text-[11px] text-[#666] mt-1">All time</div>
          </div>
        </div>

        {/* Progress Trends */}
        <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
          <div className="p-5 border-b border-[#1a1a1a]">
            <h3 className="text-base font-semibold text-white">This Week</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-[#666]" />
                <span className="text-sm text-[#888]">Workouts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{gymStats.thisWeek}</span>
                {gymStats.thisWeek > 0 && (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="w-4 h-4 text-[#666]" />
                <span className="text-sm text-[#888]">Avg Calories</span>
              </div>
              <span className="text-sm font-medium text-white">{weeklyCalories}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#666]" />
                <span className="text-sm text-[#888]">Tasks Completed</span>
              </div>
              <span className="text-sm font-medium text-white">{tasksData.completed}/{tasksData.today}</span>
            </div>
          </div>
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

    const generateAIEvaluation = async () => {
      setIsLoadingEvaluation(true);
      setEvaluationError("");
      
      try {
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
        
        const prompt = `You are a professional lifestyle coach. Evaluate the user's progress today and provide a concise, motivating assessment.

**User's Today's Data:**
- Workout completed: ${gymStats.today ? "Yes" : "No"}
- Workouts this week: ${gymStats.thisWeek}
- Total workouts: ${gymStats.total}
- Calories consumed: ${caloriesToday} (${caloriesData.percentage}% of goal)
- Meals logged: ${mealsToday}
- Tasks completed: ${tasksCompleted} out of ${tasksToday}
- Daily goals: ${dailyGoalsData.length}
- Long-term goals: ${longTermGoalsData.length}

**Your Task:**
Provide a brief, professional evaluation (2-3 sentences) that:
1. Acknowledges what they've accomplished today
2. Gives one specific, actionable tip for improvement
3. Motivates them to keep going

Be concise, professional, and helpful.`;

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

    useEffect(() => {
      if (!hasGenerated && !isLoadingEvaluation) {
        generateAIEvaluation();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="space-y-6">
        {/* AI Evaluation */}
        <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
          <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-white" />
              <h3 className="text-base font-semibold text-white">AI Evaluation</h3>
            </div>
            <button
              onClick={generateAIEvaluation}
              disabled={isLoadingEvaluation}
              className="text-xs text-[#666] hover:text-white disabled:opacity-50 transition-colors"
            >
              {isLoadingEvaluation ? "Analyzing..." : "Refresh"}
            </button>
          </div>
          
          <div className="p-5">
            {isLoadingEvaluation ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-[#666] animate-spin" />
              </div>
            ) : evaluationError ? (
              <div className="text-sm text-red-400">
                {evaluationError}
              </div>
            ) : aiEvaluation ? (
              <p className="text-sm text-[#ccc] leading-relaxed">
                {aiEvaluation}
              </p>
            ) : (
              <div className="text-sm text-[#666]">
                Click refresh to get your evaluation
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
          <div className="p-5 border-b border-[#1a1a1a]">
            <h3 className="text-base font-semibold text-white">Tips</h3>
          </div>
          <div className="p-5 space-y-3 text-sm text-[#888]">
            <div className="flex items-start gap-3">
              <Minus className="w-4 h-4 text-[#555] mt-0.5 flex-shrink-0" />
              <span>Consistency beats intensity. Small daily actions compound over time.</span>
            </div>
            <div className="flex items-start gap-3">
              <Minus className="w-4 h-4 text-[#555] mt-0.5 flex-shrink-0" />
              <span>Track your progress to stay motivated and identify patterns.</span>
            </div>
            <div className="flex items-start gap-3">
              <Minus className="w-4 h-4 text-[#555] mt-0.5 flex-shrink-0" />
              <span>Set both daily and long-term goals to balance immediate wins with big vision.</span>
            </div>
            <div className="flex items-start gap-3">
              <Minus className="w-4 h-4 text-[#555] mt-0.5 flex-shrink-0" />
              <span>Reflect daily on what went well and what you can improve.</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-xs text-[#666]">
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
