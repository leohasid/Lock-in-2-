"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Flame, Dumbbell, UtensilsCrossed, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import HabitCard from "@/components/HabitCard";
import GoalProgressCard from "@/components/GoalProgressCard";

export default function LockedInApp() {
  const [today] = useState(new Date());
  const [workoutDay, setWorkoutDay] = useState<string>("Push Day");
  const [phoneUsage, setPhoneUsage] = useState({ current: 0, limit: 120, percentage: 0 });
  const [calories, setCalories] = useState({ current: 0, goal: 2000, percentage: 0 });
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [habitsState, setHabitsState] = useState<Record<string, boolean>>({});
  const [allHabits, setAllHabits] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedHabits, setSelectedHabits] = useState<Array<{ id: string; name: string }>>([]);
  const [goals, setGoals] = useState<Array<{ id: string; title: string; current: number; target: number; unit: string }>>([]);
  const [selectedGoals, setSelectedGoals] = useState<Array<{ id: string; title: string; current: number; target: number; unit: string }>>([]);
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
    if (storedGoals) {
      try {
        const parsedGoals = JSON.parse(storedGoals);
        setGoals(parsedGoals);
      } catch (e) {
        setGoals([]);
      }
    } else {
      setGoals([]);
    }
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
      {/* Title - Top Left and Daily Reflections Button - Top Right */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Mogifi AI</h1>
          <p className="text-gray-400 text-xs">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link 
          href="/reflections"
          className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Daily Reflections
        </Link>
      </div>

      {/* Activity Heatmaps - Combined in one box, side by side */}
      <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 mb-3">
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Link href="/gym" className="block">
            <ActivityHeatmap
              title="Gym"
              streak={gymStreak}
              completed={gymActivityStats.completed}
              total={gymActivityStats.total}
              getActivityData={getGymActivity}
              color="#10b981"
              showLegend={false}
            />
          </Link>
          
          <Link href="/nutrition" className="block">
            <ActivityHeatmap
              title="Calories"
              streak={caloriesStreak}
              completed={caloriesActivityStats.completed}
              total={caloriesActivityStats.total}
              getActivityData={getCaloriesActivity}
              color="#10b981"
              showLegend={false}
            />
          </Link>
        </div>
        {/* Shared Legend */}
        <div className="flex items-center justify-end gap-2 text-[9px] text-gray-500 pt-2 border-t border-gray-800">
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-gray-700 opacity-20" />
            <span>Incomplete</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: "#10b981" }}
            />
            <span>Completed</span>
          </div>
        </div>
      </div>

      {/* Habits Section */}
      <div className="mb-3">
        <div className="bg-gray-900 rounded-xl p-2.5 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white uppercase">Habits</h2>
            <Link 
              href="/habits"
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-1.5">
            {selectedHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                name={habit.name}
                completed={habitsState[habit.id] || false}
                onToggle={() => {
                  if (typeof window === "undefined") return;
                  const todayStr = today.toISOString().split("T")[0];
                  
                  if (habit.id === "gym") {
                    const isCompleted = localStorage.getItem(`workout_${todayStr}`) === "completed";
                    localStorage.setItem(`workout_${todayStr}`, isCompleted ? "" : "completed");
                    setWorkoutCompleted(!isCompleted);
                    setHabitsState(prev => ({ ...prev, [habit.id]: !isCompleted }));
                  } else {
                    const habitKey = `habit_${habit.id}_${todayStr}`;
                    const isCompleted = localStorage.getItem(habitKey) === "completed";
                    localStorage.setItem(habitKey, isCompleted ? "" : "completed");
                    setHabitsState(prev => ({ ...prev, [habit.id]: !isCompleted }));
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="mb-3">
        <div className="bg-gray-900 rounded-xl p-2.5 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white uppercase">Goals</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteMode(!showDeleteMode)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {showDeleteMode ? "Done" : "Delete"}
              </button>
              <Link 
                href="/goals"
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="space-y-1.5">
            {selectedGoals.length > 0 ? (
              selectedGoals.map((goal) => (
                <GoalProgressCard
                  key={goal.id}
                  title={goal.title}
                  current={goal.current}
                  target={goal.target}
                  unit={goal.unit}
                  showDelete={showDeleteMode}
                  onClick={() => {
                    if (showDeleteMode) return;
                    if (typeof window === "undefined") return;
                    const newCurrent = prompt(`Update progress for "${goal.title}" (current: ${goal.current}${goal.unit}):`, goal.current.toString());
                    if (newCurrent !== null && !isNaN(Number(newCurrent))) {
                      const updatedGoals = goals.map(g =>
                        g.id === goal.id ? { ...g, current: Math.max(0, Math.min(Number(newCurrent), g.target)) } : g
                      );
                      setGoals(updatedGoals);
                      localStorage.setItem("goals", JSON.stringify(updatedGoals));
                      
                      // Update selected goals
                      const updatedSelected = selectedGoals.map(g =>
                        g.id === goal.id ? { ...g, current: Math.max(0, Math.min(Number(newCurrent), g.target)) } : g
                      );
                      setSelectedGoals(updatedSelected);
                    }
                  }}
                  onDelete={() => {
                    if (typeof window === "undefined") return;
                    // Remove from all goals
                    const updatedGoals = goals.filter(g => g.id !== goal.id);
                    setGoals(updatedGoals);
                    localStorage.setItem("goals", JSON.stringify(updatedGoals));
                    
                    // Remove from selected
                    const updatedSelected = selectedGoals.filter(g => g.id !== goal.id);
                    setSelectedGoals(updatedSelected);
                    
                    // Remove from selected goals for home
                    const storedSelected = localStorage.getItem("selectedGoalsForHome");
                    if (storedSelected) {
                      try {
                        const selectedIds = JSON.parse(storedSelected);
                        const updatedIds = selectedIds.filter((id: string) => id !== goal.id);
                        localStorage.setItem("selectedGoalsForHome", JSON.stringify(updatedIds));
                      } catch (e) {
                        // Ignore
                      }
                    }
                  }}
                />
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">No goals yet. Add some in View all.</p>
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
