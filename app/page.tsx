"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import GymCard from "@/components/GymCard";
import CaloriesCardNew from "@/components/CaloriesCardNew";
import GoalsCard from "@/components/GoalsCard";

export default function Home() {
  const [today, setToday] = useState(new Date());
  const [calories, setCalories] = useState({ current: 0, goal: 2000, percentage: 0 });
  const [goals, setGoals] = useState<Array<{ id: string; title: string; current: number; target: number; unit: string; targetDate: string }>>([]);
  const [selectedGoals, setSelectedGoals] = useState<Array<{ id: string; title: string; current: number; target: number; unit: string; targetDate: string }>>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to refresh data
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Poll for changes and listen for storage events
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleStorageChange = () => {
      refreshData();
    };
    
    // Listen for storage events (works across tabs)
    window.addEventListener("storage", handleStorageChange);
    
    // Listen for custom events (works in same window)
    window.addEventListener("mealsUpdated", handleStorageChange);
    
    // Poll localStorage every 2 seconds to catch changes
    const interval = setInterval(() => {
      refreshData();
    }, 2000);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("mealsUpdated", handleStorageChange);
      clearInterval(interval);
    };
  }, [refreshData]);

  // Get calories data - refresh when trigger changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Always use current date
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
        setCalories({
          current: totalCalories,
          goal,
          percentage: Math.min(Math.round((totalCalories / goal) * 100), 100),
        });
      } catch (e) {
        // Use defaults
      }
    } else {
      // Reset if no meals
      setCalories({
        current: 0,
        goal: 2000,
        percentage: 0,
      });
    }
  }, [refreshTrigger]);

  // Get hourly calories data for today's graph - resets every day
  const weeklyCaloriesData = useMemo(() => {
    if (typeof window === "undefined") return Array(24).fill(0);
    
    // Always use current date
    const currentDate = new Date();
    const todayStr = currentDate.toISOString().split("T")[0];
    
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return Array(24).fill(0);
    
    try {
      const meals = JSON.parse(storedMeals);
      // Filter meals for today only
      const todayMeals = meals.filter((m: any) => m.date === todayStr);
      
      // Initialize array for 24 hours
      const hourlyData = Array(24).fill(0);
      
      // Group meals by hour
      todayMeals.forEach((meal: any) => {
        if (meal.time) {
          // Parse time (format: "HH:MM")
          const [hours] = meal.time.split(':').map(Number);
          if (hours >= 0 && hours < 24) {
            hourlyData[hours] += meal.calories || 0;
          }
        }
      });
      
      return hourlyData;
    } catch (e) {
      return Array(24).fill(0);
    }
  }, [refreshTrigger]);

  // Get average calories - recalculate when data changes
  const averageCalories = useMemo(() => {
    const sum = weeklyCaloriesData.reduce((a, b) => a + b, 0);
    return sum > 0 ? Math.round(sum / weeklyCaloriesData.length) : 0;
  }, [weeklyCaloriesData]);

  // Get gym streak and activity data (last 31 days)
  const gymStreak = useMemo(() => {
    if (typeof window === "undefined") return 0;
    
    let streak = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 31; i++) {
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
  }, []);

  // Get gym activity completion stats (last 31 days)
  const gymActivityStats = useMemo(() => {
    if (typeof window === "undefined") return { completed: 0, total: 31 };
    
    let completed = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 31; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      if (localStorage.getItem(`workout_${dateStr}`) === "completed") {
        completed++;
      }
    }
    return { completed, total: 31 };
  }, []);

  // Function to check if workout was completed on a date
  const getGymActivity = useCallback((date: Date): boolean => {
    if (typeof window === "undefined") return false;
    const dateStr = date.toISOString().split("T")[0];
    return localStorage.getItem(`workout_${dateStr}`) === "completed";
  }, []);

  // Load goals
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedGoals = localStorage.getItem("goals");
    let parsedGoals: any[] = [];
    if (storedGoals) {
      try {
        parsedGoals = JSON.parse(storedGoals);
        setGoals(parsedGoals);
      } catch (e) {
        parsedGoals = [];
        setGoals([]);
      }
    } else {
      parsedGoals = [];
      setGoals([]);
    }

    // Load selected goals for home screen
    const storedSelectedGoals = localStorage.getItem("selectedGoalsForHome");
    let selectedGoalIds: string[] = [];
    if (storedSelectedGoals) {
      try {
        selectedGoalIds = JSON.parse(storedSelectedGoals);
      } catch (e) {
        selectedGoalIds = [];
        localStorage.setItem("selectedGoalsForHome", JSON.stringify(selectedGoalIds));
      }
    } else {
      selectedGoalIds = [];
      localStorage.setItem("selectedGoalsForHome", JSON.stringify(selectedGoalIds));
    }
    const goalsToShow = parsedGoals.filter((g: any) => selectedGoalIds.includes(g.id));
    setSelectedGoals(goalsToShow);
  }, [today]);

  const handleAddGoal = () => {
    // Navigate to goals page to add a new goal
    window.location.href = "/goals";
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white px-4 pt-5 pb-28">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent leading-none">
            Mogifi AI
          </h1>
          <p className="mt-1.5 text-xs text-gray-400">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        <Link
          href="/reflections"
          className="px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black rounded-xl text-xs font-bold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30"
        >
          Daily Reflections
        </Link>
      </header>

      {/* Top Cards */}
      <section className="grid grid-cols-[45%_1fr] gap-3 mb-5 items-stretch">
        <Link href="/gym" className="block h-full">
          <GymCard
            streak={gymStreak}
            completed={gymActivityStats.completed}
            total={gymActivityStats.total}
            getActivityData={getGymActivity}
          />
        </Link>
        <Link href="/nutrition" className="block h-full">
          <CaloriesCardNew
            key={`calories-${refreshTrigger}-${calories.current}`}
            current={calories.current}
            goal={calories.goal}
            average={averageCalories}
            weeklyData={weeklyCaloriesData}
          />
        </Link>
      </section>

      {/* Goals */}
      <GoalsCard goals={selectedGoals} onAddGoal={handleAddGoal} />

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
