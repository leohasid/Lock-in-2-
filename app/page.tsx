"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Flame, Dumbbell, Smartphone, UtensilsCrossed, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";

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

      {/* Today's Workout */}
      <Link href="/gym">
        <div className={`mb-4 bg-gray-900 rounded-2xl p-6 cursor-pointer hover:bg-gray-800 transition-all border-2 ${
          workoutCompleted ? "border-green-600/50" : "border-gray-800"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl text-orange-300 font-semibold">Today's Workout</h2>
            {workoutCompleted && (
              <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full">✓ Completed</span>
            )}
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-orange-500/20 rounded-full p-2">
              <Dumbbell className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-3xl font-bold">{workoutDay}</h3>
              <p className="text-gray-400 text-sm">
                {workoutStats.completed} of {workoutStats.total} workouts this week
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <TrendingUp className="w-4 h-4" />
              <span>Tap to view your workout plan</span>
            </div>
          </div>
        </div>
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

      {/* Calories */}
      <Link href="/nutrition">
        <div className="flex-1 bg-gray-900 rounded-2xl p-6 cursor-pointer hover:bg-gray-800 transition-colors border-2 border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl text-orange-300 font-semibold">Calories Today</h3>
            <div className="bg-orange-500/20 rounded-full p-2">
              <UtensilsCrossed className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-4xl font-bold mb-1">{calories.current.toLocaleString()} kcal</p>
              <p className="text-gray-400 text-sm">
                {calories.current >= calories.goal 
                  ? "Goal reached! 🎉" 
                  : `${calories.goal - calories.current} kcal left to goal`}
              </p>
            </div>
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="#374151"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="#f97316"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${isNaN(calories.percentage) || !isFinite(calories.percentage) ? 2 * Math.PI * 36 : 2 * Math.PI * 36 * (1 - Math.max(0, Math.min(100, calories.percentage)) / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">{calories.percentage}%</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(calories.percentage, 100)}%` }}
            />
          </div>
        </div>
      </Link>

      {/* Bottom Navigation */}
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}
