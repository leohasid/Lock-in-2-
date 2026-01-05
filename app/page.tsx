"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Flame, Dumbbell, UtensilsCrossed, TrendingUp, Zap, Droplet, DollarSign, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import WorkoutCard from "@/components/WorkoutCard";
import CaloriesCard from "@/components/CaloriesCard";
import GoalItemCard from "@/components/GoalItemCard";

export default function LockedInApp() {
  const [today] = useState(new Date());
  const [workoutDay, setWorkoutDay] = useState<string>("Push Day");
  const [phoneUsage, setPhoneUsage] = useState({ current: 0, limit: 120, percentage: 0 });
  const [calories, setCalories] = useState({ current: 0, goal: 2000, percentage: 0 });
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [habitsState, setHabitsState] = useState<Record<string, boolean>>({});
  const [allHabits, setAllHabits] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedHabits, setSelectedHabits] = useState<Array<{ id: string; name: string }>>([]);
  const [goals, setGoals] = useState<Array<{ id: string; title: string; current: number; target: number; unit: string; targetDate: string }>>([]);
  const [selectedGoals, setSelectedGoals] = useState<Array<{ id: string; title: string; current: number; target: number; unit: string; targetDate: string }>>([]);
  const [showDeleteMode, setShowDeleteMode] = useState(false);

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

  // Load habits and selected habits
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load all habits
    const storedHabits = localStorage.getItem("allHabits");
    let habits: Array<{ id: string; name: string }> = [];
    if (storedHabits) {
      try {
        habits = JSON.parse(storedHabits);
      } catch (e) {
        habits = [
          { id: "drink_water", name: "Drink water" },
          { id: "run", name: "Run" },
          { id: "gym", name: "Gym" },
        ];
        localStorage.setItem("allHabits", JSON.stringify(habits));
      }
    } else {
      habits = [
        { id: "drink_water", name: "Drink water" },
        { id: "run", name: "Run" },
        { id: "gym", name: "Gym" },
      ];
      localStorage.setItem("allHabits", JSON.stringify(habits));
    }
    setAllHabits(habits);

    // Load selected habits for home screen
    const storedSelected = localStorage.getItem("selectedHabitsForHome");
    let selectedIds: string[] = [];
    if (storedSelected) {
      try {
        selectedIds = JSON.parse(storedSelected);
      } catch (e) {
        selectedIds = ["drink_water", "run", "gym"];
        localStorage.setItem("selectedHabitsForHome", JSON.stringify(selectedIds));
      }
    } else {
      selectedIds = ["drink_water", "run", "gym"];
      localStorage.setItem("selectedHabitsForHome", JSON.stringify(selectedIds));
    }

    // Filter habits to show only selected ones
    const habitsToShow = habits.filter(h => selectedIds.includes(h.id));
    setSelectedHabits(habitsToShow);

    // Check habit completion states
    const todayStr = today.toISOString().split("T")[0];
    const completed = localStorage.getItem(`workout_${todayStr}`) === "completed";
    const states: Record<string, boolean> = {};
    habitsToShow.forEach(habit => {
      if (habit.id === "gym") {
        states[habit.id] = completed;
      } else {
        states[habit.id] = localStorage.getItem(`habit_${habit.id}_${todayStr}`) === "completed";
      }
    });
    setHabitsState(states);

    // Load goals
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
    }
  }, [today]);

  // Get weekly workout data (last 7 days)
  const weeklyWorkoutData = useMemo(() => {
    if (typeof window === "undefined") return [0, 0, 0, 0, 0, 0, 0];
    
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const completed = localStorage.getItem(`workout_${dateStr}`) === "completed";
      data.push(completed ? 1 : 0);
    }
    return data;
  }, [today]);

  // Get weekly calories data (last 7 days)
  const weeklyCaloriesData = useMemo(() => {
    if (typeof window === "undefined") return [0, 0, 0, 0, 0, 0, 0];
    
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return [0, 0, 0, 0, 0, 0, 0];
    
    try {
      const meals = JSON.parse(storedMeals);
      const data: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayMeals = meals.filter((m: any) => m.date === dateStr);
        const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        data.push(dayCalories);
      }
      return data;
    } catch (e) {
      return [0, 0, 0, 0, 0, 0, 0];
    }
  }, [today]);

  // Get workout completion stats for this week
  const workoutStats = useMemo(() => {
    const completed = weeklyWorkoutData.filter(v => v > 0).length;
    return { completed, total: 7, goal: 4 };
  }, [weeklyWorkoutData]);

  // Get average calories
  const averageCalories = useMemo(() => {
    const sum = weeklyCaloriesData.reduce((a, b) => a + b, 0);
    return sum > 0 ? Math.round(sum / weeklyCaloriesData.length) : 0;
  }, [weeklyCaloriesData]);

  // Get gym streak and activity data (last 70 days for 10 weeks)
  const gymStreak = useMemo(() => {
    if (typeof window === "undefined") return 0;
    
    let streak = 0;
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 70; i++) {
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

  // Get gym activity completion stats (last 70 days)
  const gymActivityStats = useMemo(() => {
    if (typeof window === "undefined") return { completed: 0, total: 70 };
    
    let completed = 0;
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 70; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      if (localStorage.getItem(`workout_${dateStr}`) === "completed") {
        completed++;
      }
    }
    return { completed, total: 70 };
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
      for (let i = 0; i < 70; i++) {
        const date = new Date(todayDate);
        date.setDate(todayDate.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayMeals = meals.filter((m: any) => m.date === dateStr);
        const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        
        if (dayCalories >= caloriesGoal * 0.8) {
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

  // Get calories activity completion stats (last 70 days)
  const caloriesActivityStats = useMemo(() => {
    if (typeof window === "undefined") return { completed: 0, total: 70 };
    
    let completed = 0;
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return { completed: 0, total: 70 };
    
    try {
      const meals = JSON.parse(storedMeals);
      for (let i = 0; i < 70; i++) {
        const date = new Date(todayDate);
        date.setDate(todayDate.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayMeals = meals.filter((m: any) => m.date === dateStr);
        const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        
        if (dayCalories >= caloriesGoal * 0.8) {
          completed++;
        }
      }
    } catch (e) {
      return { completed: 0, total: 70 };
    }
    return { completed, total: 70 };
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
      return dayCalories >= caloriesGoal * 0.8;
    } catch (e) {
      return false;
    }
  }, [caloriesGoal]);

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col">
      {/* Header - Smaller for iPhone */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold mb-0.5 text-white">Mogifi AI</h1>
          <p className="text-gray-400 text-xs">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link 
          href="/reflections"
          className="px-2 py-1 bg-gray-800 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
        >
          Daily Reflections
        </Link>
      </div>

      {/* Workouts and Calories Cards - Smaller for iPhone */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Link href="/gym" className="block">
          <WorkoutCard
            streak={gymStreak}
            completed={gymActivityStats.completed}
            total={gymActivityStats.total}
            getActivityData={getGymActivity}
          />
        </Link>
        
        <Link href="/nutrition" className="block">
          <CaloriesCard
            current={calories.current}
            goal={calories.goal}
            average={averageCalories}
            weeklyData={weeklyCaloriesData}
          />
        </Link>
      </div>

      {/* Goals Section - Smaller for iPhone */}
      <div className="mb-3">
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white">Goals</h2>
            <Link 
              href="/goals"
              className="text-xs text-gray-400 hover:text-green-400 transition-colors"
            >
              View all &gt;
            </Link>
          </div>
          <div className="space-y-1.5">
            {selectedGoals.length > 0 ? (
              selectedGoals.map((goal) => {
                const isCompleted = goal.current >= goal.target;
                // Determine icon based on goal title
                let icon = <DollarSign className="w-5 h-5" />;
                if (goal.title.toLowerCase().includes("workout") || goal.title.toLowerCase().includes("gym")) {
                  icon = <Dumbbell className="w-5 h-5" />;
                } else if (goal.title.toLowerCase().includes("run") || goal.title.toLowerCase().includes("mile")) {
                  icon = <TrendingUp className="w-5 h-5" />;
                } else if (goal.title.toLowerCase().includes("water") || goal.title.toLowerCase().includes("drink")) {
                  icon = <Droplet className="w-5 h-5" />;
                } else if (goal.title.toLowerCase().includes("10k") || goal.title.toLowerCase().includes("money") || goal.title.toLowerCase().includes("make")) {
                  icon = <DollarSign className="w-5 h-5" />;
                }

                return (
                  <GoalItemCard
                    key={goal.id}
                    title={goal.title}
                    current={goal.current}
                    target={goal.target}
                    unit={goal.unit}
                    icon={icon}
                    completed={isCompleted}
                  />
                );
              })
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">No goals yet. Add some in View all.</p>
                <Link
                  href="/goals"
                  className="inline-block px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg text-sm font-semibold transition-colors"
                >
                  + Add New Goal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}
