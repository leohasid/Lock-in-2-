"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Flame, Dumbbell, Smartphone, UtensilsCrossed, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ActivityHeatmap from "@/components/ActivityHeatmap";

export default function LockedInApp() {
  const [today] = useState(new Date());
  const [workoutDay, setWorkoutDay] = useState<string>("Push Day");
  const [phoneUsage, setPhoneUsage] = useState({ current: 0, limit: 120, percentage: 0 });
  const [calories, setCalories] = useState({ current: 0, goal: 2000, percentage: 0 });
  const [workoutCompleted, setWorkoutCompleted] = useState(false);

  // Generate dynamic week calendar
  const weekDays = useMemo(() => {
    const days = [];
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
    
    // Get the start of the week (Sunday)
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const isToday = date.toDateString() === today.toDateString();
      
      days.push({
        day: dayNames[i],
        date: date.getDate(),
        fullDate: date,
        active: isToday,
      });
    }
    
    return days;
  }, [today]);

  // Get today's workout day
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const workoutNames = ["Push Day", "Pull Day", "Legs Day", "Rest Day", "Push Day", "Pull Day", "Legs Day"];
    const dayIndex = today.getDay();
    const workoutIndex = (dayIndex % 7);
    setWorkoutDay(workoutNames[workoutIndex]);
    
    // Check if workout is completed
    const todayStr = today.toISOString().split("T")[0];
    const completed = localStorage.getItem(`workout_${todayStr}`) === "completed";
    setWorkoutCompleted(completed);
  }, [today]);

  // Get phone usage data
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Try to get from localStorage or use defaults
    const storedPhoneData = localStorage.getItem("phoneAddictionData");
    if (storedPhoneData) {
      try {
        const data = JSON.parse(storedPhoneData);
        const percentage = data.totalDailyLimit > 0 
          ? Math.round((data.totalCurrentUsage / data.totalDailyLimit) * 100) 
          : 0;
        setPhoneUsage({
          current: data.totalCurrentUsage || 0,
          limit: data.totalDailyLimit || 120,
          percentage,
        });
      } catch (e) {
        // Use defaults
      }
    }
  }, []);

  // Get calories data
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedMeals = localStorage.getItem("meals");
    if (storedMeals) {
      try {
        const meals = JSON.parse(storedMeals);
        const todayStr = today.toISOString().split("T")[0];
        const todayMeals = meals.filter((m: any) => m.date === todayStr);
        const totalCalories = todayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        const percentage = Math.round((totalCalories / 2000) * 100);
        setCalories({
          current: totalCalories,
          goal: 2000,
          percentage: Math.min(percentage, 100),
        });
      } catch (e) {
        // Use defaults
      }
    }
  }, [today]);

  // Get workout completion stats
  const workoutStats = useMemo(() => {
    if (typeof window === "undefined") return { completed: 0, total: 7 };
    
    let completed = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      if (localStorage.getItem(`workout_${dateStr}`) === "completed") {
        completed++;
      }
    }
    return { completed, total: 7 };
  }, [today]);

  // Get gym streak and activity data (last 91 days)
  const gymStreak = useMemo(() => {
    if (typeof window === "undefined") return 0;
    
    let streak = 0;
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 91; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      if (localStorage.getItem(`workout_${dateStr}`) === "completed") {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [today]);

  // Get gym activity completion stats (last 91 days)
  const gymActivityStats = useMemo(() => {
    if (typeof window === "undefined") return { completed: 0, total: 91 };
    
    let completed = 0;
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 91; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      if (localStorage.getItem(`workout_${dateStr}`) === "completed") {
        completed++;
      }
    }
    return { completed, total: 91 };
  }, [today]);

  // Function to check if workout was completed on a date
  const getGymActivity = useCallback((date: Date): boolean => {
    if (typeof window === "undefined") return false;
    const dateStr = date.toISOString().split("T")[0];
    return localStorage.getItem(`workout_${dateStr}`) === "completed";
  }, []);

  // Get calories goal from localStorage
  const caloriesGoal = useMemo(() => {
    if (typeof window === "undefined") return 2000;
    const storedGoals = localStorage.getItem("macroGoals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        return goals.calories || 2000;
      } catch (e) {
        return 2000;
      }
    }
    return 2000;
  }, []);

  // Get calories streak (days meeting calorie goal)
  const caloriesStreak = useMemo(() => {
    if (typeof window === "undefined") return 0;
    
    let streak = 0;
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return 0;
    
    try {
      const meals = JSON.parse(storedMeals);
      for (let i = 0; i < 91; i++) {
        const date = new Date(todayDate);
        date.setDate(todayDate.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayMeals = meals.filter((m: any) => m.date === dateStr);
        const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        
        if (dayCalories >= caloriesGoal * 0.8) { // 80% of goal counts as success
          streak++;
        } else {
          break;
        }
      }
    } catch (e) {
      return 0;
    }
    return streak;
  }, [today, caloriesGoal]);

  // Get calories activity completion stats (last 91 days)
  const caloriesActivityStats = useMemo(() => {
    if (typeof window === "undefined") return { completed: 0, total: 91 };
    
    let completed = 0;
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return { completed: 0, total: 91 };
    
    try {
      const meals = JSON.parse(storedMeals);
      for (let i = 0; i < 91; i++) {
        const date = new Date(todayDate);
        date.setDate(todayDate.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayMeals = meals.filter((m: any) => m.date === dateStr);
        const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        
        if (dayCalories >= caloriesGoal * 0.8) { // 80% of goal counts as success
          completed++;
        }
      }
    } catch (e) {
      return { completed: 0, total: 91 };
    }
    return { completed, total: 91 };
  }, [today, caloriesGoal]);

  // Function to check if calorie goal was met on a date
  const getCaloriesActivity = useCallback((date: Date): boolean => {
    if (typeof window === "undefined") return false;
    const dateStr = date.toISOString().split("T")[0];
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return false;
    
    try {
      const meals = JSON.parse(storedMeals);
      const dayMeals = meals.filter((m: any) => m.date === dateStr);
      const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
      return dayCalories >= caloriesGoal * 0.8; // 80% of goal counts as success
    } catch (e) {
      return false;
    }
  }, [caloriesGoal]);


  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2">Locked In</h1>
        <p className="text-gray-400 text-sm">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Week Calendar */}
      <div className="flex justify-between mb-8 px-2">
        {weekDays.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <span
              className={`text-sm mb-2 ${item.active ? "text-orange-400 font-semibold" : "text-gray-500"}`}
            >
              {item.day}
            </span>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold transition-all ${
                item.active
                  ? "bg-orange-500 text-black scale-110"
                  : "bg-gray-900 text-gray-400 border border-gray-800"
              }`}
            >
              {item.date}
            </div>
          </div>
        ))}
      </div>

      {/* Gym Activity Heatmap */}
      <Link href="/gym" className="block mb-4">
        <ActivityHeatmap
          title="Gym"
          streak={gymStreak}
          completed={gymActivityStats.completed}
          total={gymActivityStats.total}
          getActivityData={getGymActivity}
          color="#10b981"
        />
      </Link>

      {/* Phone Usage */}
      <Link href="/addictions">
        <div className={`mb-4 bg-gray-900 rounded-2xl p-6 cursor-pointer hover:bg-gray-800 transition-all border-2 ${
          phoneUsage.percentage >= 100 ? "border-red-600/50" : phoneUsage.percentage >= 80 ? "border-yellow-600/50" : "border-gray-800"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl text-orange-300 font-semibold">Phone Usage</h3>
            {phoneUsage.percentage >= 100 && (
              <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full">Blocked</span>
            )}
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-500/20 rounded-full p-2">
              <Smartphone className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-4xl font-bold mb-1">
                {Math.floor(phoneUsage.current / 60)}h {phoneUsage.current % 60}m
              </p>
              <p className="text-sm text-gray-400 mb-1">
                {(() => {
                  const hours = Math.floor(phoneUsage.current / 60);
                  const minutes = phoneUsage.current % 60;
                  if (hours === 0) {
                    return `You were on your phone ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} today`;
                  } else if (minutes === 0) {
                    return `You were on your phone ${hours} ${hours === 1 ? 'hour' : 'hours'} today`;
                  } else {
                    return `You were on your phone ${hours} ${hours === 1 ? 'hour' : 'hours'} and ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} today`;
                  }
                })()}
              </p>
              <p className="text-sm text-gray-400 mb-2">
                You have used {phoneUsage.current} out of {phoneUsage.limit} minutes
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${
                phoneUsage.percentage >= 100
                  ? "bg-red-600"
                  : phoneUsage.percentage >= 80
                  ? "bg-yellow-600"
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(phoneUsage.percentage, 100)}%` }}
            />
          </div>
          {phoneUsage.percentage >= 80 && phoneUsage.percentage < 100 && (
            <p className="text-yellow-400 text-xs">⚠️ Warning: {phoneUsage.percentage}% limit reached</p>
          )}
        </div>
      </Link>

      {/* Calories Activity Heatmap */}
      <Link href="/nutrition" className="block mb-4">
        <ActivityHeatmap
          title="Calories"
          streak={caloriesStreak}
          completed={caloriesActivityStats.completed}
          total={caloriesActivityStats.total}
          getActivityData={getCaloriesActivity}
          color="#10b981"
        />
      </Link>

      {/* Bottom Navigation */}
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}
