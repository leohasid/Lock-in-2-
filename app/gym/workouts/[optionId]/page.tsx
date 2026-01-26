"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface WorkoutOption {
  id: string;
  name: string;
  days: {
    day1: any[];
    day2: any[];
    day3: any[];
  };
  dayNames: {
    day1: string;
    day2: string;
    day3: string;
  };
}

interface CustomExercise {
  name: string;
  sets: number;
  reps: number;
}

export default function WorkoutOptionPage() {
  const router = useRouter();
  const params = useParams();
  const optionId = params?.optionId as string;
  
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [currentOption, setCurrentOption] = useState<WorkoutOption | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempWorkoutName, setTempWorkoutName] = useState("");
  const [exercises, setExercises] = useState<CustomExercise[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !optionId) return;
    
    // Load workout options
    const storedOptions = localStorage.getItem("workoutOptions");
    if (storedOptions) {
      try {
        const options = JSON.parse(storedOptions);
        setWorkoutOptions(options);
        const option = options.find((o: WorkoutOption) => o.id === optionId);
        if (option) {
          setCurrentOption(option);
          setWorkoutName(option.name);
          setTempWorkoutName(option.name);
          
          // Load exercises for this option - combine all days into one list
          const convertToCustom = (exercises: any[]): CustomExercise[] => {
            if (!exercises || exercises.length === 0) return [];
            return exercises.map(ex => ({
              name: ex.name || "",
              sets: ex.goalSets || ex.sets || 3,
              reps: ex.goalReps || ex.reps || 10,
            }));
          };
          
          // Combine all exercises from all days into one list
          const allExercises = [
            ...convertToCustom(option.days.day1),
            ...convertToCustom(option.days.day2),
            ...convertToCustom(option.days.day3),
          ];
          
          setExercises(allExercises.length > 0 ? allExercises : [{ name: "", sets: 3, reps: 10 }]);
        }
      } catch (e) {
        console.error("Error loading workout options:", e);
      }
    }
  }, [optionId]);

  const handleSave = () => {
    if (!currentOption || !workoutName.trim()) {
      alert("Please enter a workout name");
      return;
    }

    // Save the workout name if it was edited
    if (isEditingName) {
      setIsEditingName(false);
    }

    // Convert exercises to Exercise format
    const convertExercises = (exercises: CustomExercise[]): any[] => {
      return exercises
        .filter((ex) => ex.name.trim() !== "")
        .map((ex, index) => ({
          id: `custom-${Date.now()}-${index}`,
          name: ex.name,
          goalSets: ex.sets,
          goalReps: ex.reps,
          goalWeight: 0,
          sets: Array.from({ length: ex.sets }, () => ({
            reps: ex.reps,
            weight: 0,
            completed: false,
          })),
        }));
    };

    const convertedExercises = convertExercises(exercises);

    // Put all exercises into day1 for this workout option
    // This way all exercises will be available when the workout is selected
    const day1Exercises = convertedExercises;
    const day2Exercises: any[] = [];
    const day3Exercises: any[] = [];

    // Update the workout option
    const updatedOptions = workoutOptions.map(opt => 
      opt.id === optionId
        ? {
            ...opt,
            name: workoutName,
            days: {
              day1: day1Exercises,
              day2: day2Exercises,
              day3: day3Exercises,
            },
          }
        : opt
    );
    setWorkoutOptions(updatedOptions);
    if (typeof window !== "undefined") {
      localStorage.setItem("workoutOptions", JSON.stringify(updatedOptions));
    }

    // Also save to the main workout plan - put all exercises in pushDay so they show up
    // The workout page will load from workoutOptions when an option is selected anyway
    const newPlan = {
      pushDay: day1Exercises,
      pullDay: day2Exercises,
      legsDay: day3Exercises,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("workoutPlan", JSON.stringify(newPlan));
    }
    
    router.push("/gym/workouts");
  };

  if (!currentOption) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white pb-20">
        <div className="max-w-md mx-auto px-4 py-6">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/gym/workouts"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1 mx-4">
              <input
                type="text"
                value={tempWorkoutName}
                onChange={(e) => setTempWorkoutName(e.target.value)}
                placeholder="e.g., Push Day, Chest & Biceps"
                className="flex-1 bg-black/40 border border-cyan-400 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-cyan-400"
                autoFocus
              />
              <button
                onClick={() => {
                  setWorkoutName(tempWorkoutName);
                  setIsEditingName(false);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-green-400"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setTempWorkoutName(workoutName);
                  setIsEditingName(false);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent flex-1 text-center">
              {workoutName || "Workout"}
            </h1>
          )}
          {!isEditingName && (
            <button
              onClick={() => {
                setTempWorkoutName(workoutName);
                setIsEditingName(true);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Exercises Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Exercises</h2>
            <button
              type="button"
              onClick={() => {
                setExercises([...exercises, { name: "", sets: 3, reps: 10 }]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400 hover:bg-cyan-500 text-black text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Exercise
            </button>
          </div>
          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <div key={index} className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-3 border border-white/10">
                <div className="flex items-center justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = exercises.filter((_, i) => i !== index);
                      setExercises(updated);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(e) => {
                      const updated = [...exercises];
                      updated[index].name = e.target.value;
                      setExercises(updated);
                    }}
                    placeholder="Exercise name"
                    className="col-span-3 bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                  />
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">Sets</label>
                    <input
                      type="number"
                      value={exercise.sets}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[index].sets = parseInt(e.target.value) || 0;
                        setExercises(updated);
                      }}
                      min="1"
                      className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 text-xs">Reps</label>
                    <input
                      type="number"
                      value={exercise.reps}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[index].reps = parseInt(e.target.value) || 0;
                        setExercises(updated);
                      }}
                      min="1"
                      className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            {exercises.length === 0 && (
              <div className="p-4 bg-black/60 rounded-lg text-gray-400 text-center text-sm">
                No exercises yet. Click "Add Exercise" to get started.
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-lg transition-colors"
        >
          Save Workout
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
