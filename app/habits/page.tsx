"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import HabitCard from "@/components/HabitCard";
import GoalCard from "@/components/GoalCard";
import { ArrowLeft, Edit2, Check, X, Plus, Trash2 } from "lucide-react";

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState({ name: "" });

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
      setSelectedHabitIds(prev => [...prev, habitId]);
    }
  };

  const handleSaveSelection = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedHabitsForHome", JSON.stringify(selectedHabitIds));
    setIsEditing(false);
  };

  const handleAddHabit = () => {
    if (!formData.name.trim()) {
      alert("Please enter a habit name");
      return;
    }

    const newHabit: Habit = {
      id: `habit_${Date.now()}`,
      name: formData.name.trim(),
    };

    const updatedHabits = [...allHabits, newHabit];
    setAllHabits(updatedHabits);
    localStorage.setItem("allHabits", JSON.stringify(updatedHabits));
    
    setFormData({ name: "" });
    setShowAddForm(false);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({ name: habit.name });
    setShowAddForm(true);
  };

  const handleUpdateHabit = () => {
    if (!editingHabit || !formData.name.trim()) {
      alert("Please enter a habit name");
      return;
    }

    const updatedHabits = allHabits.map(h =>
      h.id === editingHabit.id ? { ...h, name: formData.name.trim() } : h
    );

    setAllHabits(updatedHabits);
    localStorage.setItem("allHabits", JSON.stringify(updatedHabits));
    
    setFormData({ name: "" });
    setEditingHabit(null);
    setShowAddForm(false);
  };

  const handleDeleteHabit = (habitId: string) => {
    if (confirm("Are you sure you want to delete this habit?")) {
      const updatedHabits = allHabits.filter(h => h.id !== habitId);
      setAllHabits(updatedHabits);
      localStorage.setItem("allHabits", JSON.stringify(updatedHabits));
      
      // Remove from selected if it was selected
      setSelectedHabitIds(prev => prev.filter(id => id !== habitId));
    }
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
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingHabit(null);
                  setFormData({ name: "" });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            </>
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
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
          <h3 className="text-lg font-bold mb-4">
            {editingHabit ? "Edit Habit" : "Add New Habit"}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Habit Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600"
                placeholder="e.g., Drink water"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    editingHabit ? handleUpdateHabit() : handleAddHabit();
                  }
                }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={editingHabit ? handleUpdateHabit : handleAddHabit}
                className="flex-1 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                {editingHabit ? "Update" : "Add Habit"}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingHabit(null);
                  setFormData({ name: "" });
                }}
                className="flex-1 py-3 bg-gray-800 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Habits Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4 uppercase">Habits</h2>
        <div className="space-y-2">
          {allHabits.length > 0 ? (
            allHabits.map((habit) => (
              <div key={habit.id} className="relative">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <HabitCard
                      name={habit.name}
                      completed={habitsState[habit.id] || false}
                      onToggle={() => !isEditing && handleToggleHabit(habit.id)}
                    />
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSelection(habit.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedHabitIds.includes(habit.id)
                            ? "bg-green-500 border-green-500"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedHabitIds.includes(habit.id) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="p-2 bg-red-600 rounded hover:bg-red-700 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No habits yet. Click "Add" to create one.</p>
          )}
        </div>
        {isEditing && (
          <p className="text-sm text-gray-400 mt-4">
            Select habits to show on the home screen ({selectedHabitIds.length} selected)
          </p>
        )}
      </div>


      {/* Bottom Navigation */}
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}

