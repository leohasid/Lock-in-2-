"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

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
  const [customWorkoutPlan, setCustomWorkoutPlan] = useState<{
    day1: CustomExercise[];
    day2: CustomExercise[];
    day3: CustomExercise[];
  }>({
    day1: [{ name: "", sets: 3, reps: 10 }],
    day2: [{ name: "", sets: 3, reps: 10 }],
    day3: [{ name: "", sets: 3, reps: 10 }],
  });

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
          
          // Load exercises for this option
          const convertToCustom = (exercises: any[]): CustomExercise[] => {
            if (!exercises || exercises.length === 0) return [{ name: "", sets: 3, reps: 10 }];
            return exercises.map(ex => ({
              name: ex.name || "",
              sets: ex.goalSets || ex.sets || 3,
              reps: ex.goalReps || ex.reps || 10,
            }));
          };
          
          setCustomWorkoutPlan({
            day1: option.days.day1.length > 0 
              ? convertToCustom(option.days.day1)
              : [{ name: "", sets: 3, reps: 10 }],
            day2: option.days.day2.length > 0
              ? convertToCustom(option.days.day2)
              : [{ name: "", sets: 3, reps: 10 }],
            day3: option.days.day3.length > 0
              ? convertToCustom(option.days.day3)
              : [{ name: "", sets: 3, reps: 10 }],
          });
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

    const day1Exercises = convertExercises(customWorkoutPlan.day1);
    const day2Exercises = convertExercises(customWorkoutPlan.day2);
    const day3Exercises = convertExercises(customWorkoutPlan.day3);

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

    // Also save to the main workout plan (for backward compatibility)
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
          <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Edit Workout
          </h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Workout Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-white mb-2">
            Workout Name
          </label>
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="e.g., Push Day, Chest & Biceps"
            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Day Sections */}
        <div className="space-y-6 mb-6">
          {/* Day 1 */}
          <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
            <h3 className="text-base font-bold text-teal-400 mb-4">
              {currentOption.dayNames.day1}
            </h3>
            <div className="space-y-3">
              {customWorkoutPlan.day1.map((exercise, index) => (
                <div key={index} className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-end mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = customWorkoutPlan.day1.filter((_, i) => i !== index);
                        setCustomWorkoutPlan({ ...customWorkoutPlan, day1: updated });
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
                        const updated = [...customWorkoutPlan.day1];
                        updated[index].name = e.target.value;
                        setCustomWorkoutPlan({ ...customWorkoutPlan, day1: updated });
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
                          const updated = [...customWorkoutPlan.day1];
                          updated[index].sets = parseInt(e.target.value) || 0;
                          setCustomWorkoutPlan({ ...customWorkoutPlan, day1: updated });
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
                          const updated = [...customWorkoutPlan.day1];
                          updated[index].reps = parseInt(e.target.value) || 0;
                          setCustomWorkoutPlan({ ...customWorkoutPlan, day1: updated });
                        }}
                        min="1"
                        className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setCustomWorkoutPlan({
                    ...customWorkoutPlan,
                    day1: [...customWorkoutPlan.day1, { name: "", sets: 3, reps: 10 }],
                  });
                }}
                className="w-full bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Exercise
              </button>
            </div>
          </div>

          {/* Day 2 */}
          <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
            <h3 className="text-base font-bold text-blue-400 mb-4">
              {currentOption.dayNames.day2}
            </h3>
            <div className="space-y-3">
              {customWorkoutPlan.day2.map((exercise, index) => (
                <div key={index} className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-end mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = customWorkoutPlan.day2.filter((_, i) => i !== index);
                        setCustomWorkoutPlan({ ...customWorkoutPlan, day2: updated });
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
                        const updated = [...customWorkoutPlan.day2];
                        updated[index].name = e.target.value;
                        setCustomWorkoutPlan({ ...customWorkoutPlan, day2: updated });
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
                          const updated = [...customWorkoutPlan.day2];
                          updated[index].sets = parseInt(e.target.value) || 0;
                          setCustomWorkoutPlan({ ...customWorkoutPlan, day2: updated });
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
                          const updated = [...customWorkoutPlan.day2];
                          updated[index].reps = parseInt(e.target.value) || 0;
                          setCustomWorkoutPlan({ ...customWorkoutPlan, day2: updated });
                        }}
                        min="1"
                        className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setCustomWorkoutPlan({
                    ...customWorkoutPlan,
                    day2: [...customWorkoutPlan.day2, { name: "", sets: 3, reps: 10 }],
                  });
                }}
                className="w-full bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Exercise
              </button>
            </div>
          </div>

          {/* Day 3 */}
          <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
            <h3 className="text-base font-bold text-green-400 mb-4">
              {currentOption.dayNames.day3}
            </h3>
            <div className="space-y-3">
              {customWorkoutPlan.day3.map((exercise, index) => (
                <div key={index} className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-end mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = customWorkoutPlan.day3.filter((_, i) => i !== index);
                        setCustomWorkoutPlan({ ...customWorkoutPlan, day3: updated });
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
                        const updated = [...customWorkoutPlan.day3];
                        updated[index].name = e.target.value;
                        setCustomWorkoutPlan({ ...customWorkoutPlan, day3: updated });
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
                          const updated = [...customWorkoutPlan.day3];
                          updated[index].sets = parseInt(e.target.value) || 0;
                          setCustomWorkoutPlan({ ...customWorkoutPlan, day3: updated });
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
                          const updated = [...customWorkoutPlan.day3];
                          updated[index].reps = parseInt(e.target.value) || 0;
                          setCustomWorkoutPlan({ ...customWorkoutPlan, day3: updated });
                        }}
                        min="1"
                        className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setCustomWorkoutPlan({
                    ...customWorkoutPlan,
                    day3: [...customWorkoutPlan.day3, { name: "", sets: 3, reps: 10 }],
                  });
                }}
                className="w-full bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Exercise
              </button>
            </div>
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
