"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { 
  Target, Flame, TrendingUp, TrendingDown, Award, Sparkles, 
  Calendar, CheckCircle2, Circle, ArrowRight, Lightbulb,
  Activity, Zap, Heart, Brain, Clock, Star
} from "lucide-react";

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
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center justify-between mb-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-xs text-gray-400">Calories</span>
          </div>
          <div className="text-2xl font-bold text-white">{caloriesData.current}</div>
          <div className="text-xs text-gray-400">of {caloriesData.goal}</div>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
              style={{ width: `${caloriesData.percentage}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-gray-400">Workouts</span>
          </div>
          <div className="text-2xl font-bold text-white">{gymStats.streak}</div>
          <div className="text-xs text-gray-400">day streak</div>
          <div className="mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-400">{gymStats.thisWeek} this week</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-gray-400">Tasks</span>
          </div>
          <div className="text-2xl font-bold text-white">{tasksData.completed}</div>
          <div className="text-xs text-gray-400">of {tasksData.today} completed</div>
          {tasksData.remaining > 0 && (
            <div className="mt-2 text-xs text-purple-400">{tasksData.remaining} remaining</div>
          )}
        </div>

        <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 rounded-xl p-4 border border-teal-500/30">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-teal-400" />
            <span className="text-xs text-gray-400">Goals</span>
          </div>
          <div className="text-2xl font-bold text-white">{dailyGoalsData.length}</div>
          <div className="text-xs text-gray-400">daily goals</div>
          <Link href="/goals" className="mt-2 text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Active Streaks */}
      {habitsData.activeStreaks.length > 0 && (
        <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Active Streaks
            </h3>
            <Link href="/habits" className="text-xs text-teal-400 hover:text-teal-300">
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {habitsData.activeStreaks.map((habit: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-[rgba(10,15,20,0.6)] rounded-lg p-2.5 border border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-xs text-white">{habit.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-400">{habit.streak} days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    
    return (
      <div className="space-y-4">
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
              <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-2">No goals yet</p>
              <Link
                href="/goals"
                className="text-xs text-teal-400 hover:text-teal-300"
              >
                Create your first goal →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {allGoals.map((goal: any) => {
                const percentage = goal.target > 0 
                  ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                  : 0;
                const isLongTerm = goal.goalType === "long-term" || !goal.goalType;
                
                return (
                  <div
                    key={goal.id}
                    className="bg-[rgba(10,15,20,0.6)] rounded-lg p-3 border border-white/5 hover:border-teal-400/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white">{goal.title}</span>
                          {isLongTerm && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                              Long-term
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {goal.current} {goal.unit} / {goal.target} {goal.unit}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-teal-400">{percentage}%</div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {isLongTerm && goal.targetDate && (
                      <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
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
            <div className="space-y-2 text-xs text-gray-300">
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
                <div className="flex items-start gap-2">
                  <Star className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>You're close to completing a goal! Keep pushing!</span>
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
      
      if (gymStats.streak === 0) {
        tips.push({
          icon: Activity,
          color: "blue",
          title: "Fitness Reminder",
          message: "Start a workout streak today! Even 15 minutes makes a difference.",
        });
      } else if (gymStats.streak >= 3) {
        tips.push({
          icon: Zap,
          color: "green",
          title: "Great Job!",
          message: `You're on a ${gymStats.streak}-day workout streak! Keep the momentum going.`,
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
        {/* Personalized Insights */}
        <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Personalized Insights
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
            <Lightbulb className="w-4 h-4 text-yellow-400" />
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

        {/* Quick Links */}
        <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3">Explore More</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/consultation"
              className="bg-[rgba(10,15,20,0.6)] rounded-lg p-3 border border-white/5 hover:border-teal-400/30 transition-all"
            >
              <div className="text-xs font-semibold text-white mb-1">AI Consultation</div>
              <div className="text-[10px] text-gray-400">Get personalized advice</div>
            </Link>
            <Link
              href="/reflections"
              className="bg-[rgba(10,15,20,0.6)] rounded-lg p-3 border border-white/5 hover:border-teal-400/30 transition-all"
            >
              <div className="text-xs font-semibold text-white mb-1">Daily Reflection</div>
              <div className="text-[10px] text-gray-400">Track your thoughts</div>
            </Link>
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
