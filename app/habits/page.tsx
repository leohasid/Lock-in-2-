"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import HabitCard from "@/components/HabitCard";
import GoalCard from "@/components/GoalCard";
import { ArrowLeft, Edit2, Check, X } from "lucide-react";

interface Habit {
  id: string;
  name: string;
}

export default function HabitsPage() {
  const router = useRouter();
  const [today] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [habitsState, setHabitsState] = useState<Record<string, boolean>>({});

  // Load habits from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedHabits = localStorage.getItem("allHabits");
    if (storedHabits) {
      try {
        const habits = JSON.parse(storedHabits);
        setAllHabits(habits);
      } catch (e) {
        // Initialize with default habits
        const defaultHabits = [
          { id: "drink_water", name: "Drink water" },
          { id: "run", name: "Run" },
          { id: "gym", name: "Gym" },
        ];
        setAllHabits(defaultHabits);
        localStorage.setItem("allHabits", JSON.stringify(defaultHabits));
      }
    } else {
      // Initialize with default habits
      const defaultHabits = [
        { id: "drink_water", name: "Drink water" },
        { id: "run", name: "Run" },
        { id: "gym", name: "Gym" },
      ];
      setAllHabits(defaultHabits);
      localStorage.setItem("allHabits", JSON.stringify(defaultHabits));
    }

    // Load selected habits for home screen
    const storedSelected = localStorage.getItem("selectedHabitsForHome");
    if (storedSelected) {
      try {
        const selected = JSON.parse(storedSelected);
        setSelectedHabitIds(selected);
      } catch (e) {
        // Default to first 5
        const defaultSelected = ["drink_water", "run", "gym"];
        setSelectedHabitIds(defaultSelected);
        localStorage.setItem("selectedHabitsForHome", JSON.stringify(defaultSelected));
      }
    } else {
      // Default to first 5
      const defaultSelected = ["drink_water", "run", "gym"];
      setSelectedHabitIds(defaultSelected);
      localStorage.setItem("selectedHabitsForHome", JSON.stringify(defaultSelected));
    }

  }, [today]);

  // Load habit completion states
  useEffect(() => {
    if (typeof window === "undefined" || allHabits.length === 0) return;
    
    const todayStr = today.toISOString().split("T")[0];
    const states: Record<string, boolean> = {};
    allHabits.forEach(habit => {
      if (habit.id === "gym") {
        states[habit.id] = localStorage.getItem(`workout_${todayStr}`) === "completed";
      } else {
        states[habit.id] = localStorage.getItem(`habit_${habit.id}_${todayStr}`) === "completed";
      }
    });
    setHabitsState(states);
  }, [today, allHabits]);

  const handleToggleHabit = (habitId: string) => {
    if (typeof window === "undefined") return;
    const todayStr = today.toISOString().split("T")[0];
    
    if (habitId === "gym") {
      const isCompleted = localStorage.getItem(`workout_${todayStr}`) === "completed";
      localStorage.setItem(`workout_${todayStr}`, isCompleted ? "" : "completed");
    } else {
      const habitKey = `habit_${habitId}_${todayStr}`;
      const isCompleted = localStorage.getItem(habitKey) === "completed";
      localStorage.setItem(habitKey, isCompleted ? "" : "completed");
    }
    
    setHabitsState(prev => ({
      ...prev,
      [habitId]: !prev[habitId],
    }));
  };

  const handleToggleSelection = (habitId: string) => {
    if (selectedHabitIds.includes(habitId)) {
      setSelectedHabitIds(prev => prev.filter(id => id !== habitId));
    } else {
      if (selectedHabitIds.length < 5) {
        setSelectedHabitIds(prev => [...prev, habitId]);
      }
    }
  };

  const handleSaveSelection = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedHabitsForHome", JSON.stringify(selectedHabitIds));
    setIsEditing(false);
  };

  // Get calories data for goals
  const [calories, setCalories] = useState({ current: 0, goal: 2000 });

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
        });
      } catch (e) {
        // Use defaults
      }
    }
  }, [today]);

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </button>
        )}
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSaveSelection}
              className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Habits Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4 uppercase">Habits</h2>
        <div className="space-y-2">
          {allHabits.map((habit) => (
            <div key={habit.id} className="relative">
              <HabitCard
                name={habit.name}
                completed={habitsState[habit.id] || false}
                onToggle={() => !isEditing && handleToggleHabit(habit.id)}
              />
              {isEditing && (
                <button
                  onClick={() => handleToggleSelection(habit.id)}
                  className={`absolute right-16 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedHabitIds.includes(habit.id)
                      ? "bg-green-500 border-green-500"
                      : "border-gray-500"
                  }`}
                >
                  {selectedHabitIds.includes(habit.id) && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
        {isEditing && (
          <p className="text-sm text-gray-400 mt-4">
            Select up to 5 habits to show on the home screen ({selectedHabitIds.length}/5 selected)
          </p>
        )}
      </div>

      {/* Goals Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4 uppercase">Goals</h2>
        <GoalCard
          title={`${calories.goal} Calories`}
          targetDate={new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          current={calories.current}
          target={calories.goal}
          unit=" kcal"
          color="#3b82f6"
        />
      </div>

      {/* Bottom Navigation */}
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}

