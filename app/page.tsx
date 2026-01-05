"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Flame, Dumbbell, UtensilsCrossed, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ActivityHeatmap from "@/components/ActivityHeatmap";

export default function LockedInApp() {
  const [today] = useState(new Date());
  const [workoutDay, setWorkoutDay] = useState<string>("Push Day");
  const [phoneUsage, setPhoneUsage] = useState({ current: 0, limit: 120, percentage: 0 });
  const [calories, setCalories] = useState({ current: 0, goal: 2000, percentage: 0 });
  const [workoutCompleted, setWorkoutCompleted] = useState(false);

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
        <h1 className="text-5xl font-bold mb-2">Mogifi AI</h1>
        <p className="text-gray-400 text-sm">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
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
