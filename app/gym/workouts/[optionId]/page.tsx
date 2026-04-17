"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import ExerciseNameInput from "@/components/ExerciseNameInput";

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

    // Each option is one workout - user names it (e.g. "Chest and Tri") and adds exercises
    const day1Exercises = convertedExercises;
    const day2Exercises: any[] = [];
    const day3Exercises: any[] = [];

    const updatedOptions = workoutOptions.map(opt =>
      opt.id === optionId
        ? { ...opt, name: workoutName, days: { day1: day1Exercises, day2: day2Exercises, day3: day3Exercises } }
        : opt
    );
    setWorkoutOptions(updatedOptions);
    if (typeof window !== "undefined") {
      localStorage.setItem("workoutOptions", JSON.stringify(updatedOptions));
      // Auto-select this option so exercises show on main workout page
      const current = JSON.parse(localStorage.getItem("selectedWorkoutOptions") || "[]");
      const next = current.includes(optionId) ? current : [...current, optionId];
      localStorage.setItem("selectedWorkoutOptions", JSON.stringify(next));
      localStorage.setItem("selectedWorkoutOption", optionId);
    }

    router.push("/gym/workout?schedulePrompt=1");
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
            <div>
              <h2 className="text-base font-bold text-white">Exercises</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {exercises.filter(e => e.name.trim()).length} exercise{exercises.filter(e => e.name.trim()).length !== 1 ? "s" : ""} added
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setExercises([...exercises, { name: "", sets: 3, reps: 10 }]);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-400 hover:bg-teal-500 text-black text-sm font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {exercises.length === 0 ? (
            <button
              type="button"
              onClick={() => setExercises([{ name: "", sets: 3, reps: 10 }])}
              className="w-full py-8 border-2 border-dashed border-teal-500/30 rounded-2xl text-teal-400/60 text-sm font-medium hover:border-teal-500/50 hover:text-teal-400 transition-colors"
            >
              <Plus className="w-5 h-5 mx-auto mb-1" />
              Add your first exercise
            </button>
          ) : (
            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="bg-[#0c1422] border border-white/10 rounded-2xl p-4"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-teal-400/70 uppercase tracking-widest">
                      Exercise {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = exercises.filter((_, i) => i !== index);
                        setExercises(updated);
                      }}
                      className="p-1 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Exercise name — full width */}
                  <div className="mb-3">
                    <ExerciseNameInput
                      value={exercise.name}
                      onChange={(name) => {
                        const updated = [...exercises];
                        updated[index].name = name;
                        setExercises(updated);
                      }}
                      placeholder="e.g. Bench Press"
                      className="w-full bg-black/50 text-white px-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-teal-400 text-sm placeholder:text-gray-600"
                    />
                  </div>

                  {/* Sets + Reps — equal columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                        Sets
                      </label>
                      <input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => {
                          const updated = [...exercises];
                          updated[index].sets = parseInt(e.target.value) || 0;
                          setExercises(updated);
                        }}
                        min="1"
                        inputMode="numeric"
                        className="w-full bg-black/50 text-white px-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-teal-400 text-sm text-center font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                        Reps
                      </label>
                      <input
                        type="number"
                        value={exercise.reps}
                        onChange={(e) => {
                          const updated = [...exercises];
                          updated[index].reps = parseInt(e.target.value) || 0;
                          setExercises(updated);
                        }}
                        min="1"
                        inputMode="numeric"
                        className="w-full bg-black/50 text-white px-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-teal-400 text-sm text-center font-semibold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
