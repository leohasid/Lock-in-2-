"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface CustomExercise {
  name: string;
  sets: number;
  reps: number;
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState("");
  const [day1Name, setDay1Name] = useState("Day 1");
  const [day2Name, setDay2Name] = useState("Day 2");
  const [day3Name, setDay3Name] = useState("Day 3");
  const [customWorkoutPlan, setCustomWorkoutPlan] = useState<{
    day1: CustomExercise[];
    day2: CustomExercise[];
    day3: CustomExercise[];
  }>({
    day1: [{ name: "", sets: 3, reps: 10 }],
    day2: [{ name: "", sets: 3, reps: 10 }],
    day3: [{ name: "", sets: 3, reps: 10 }],
  });

  const handleSave = () => {
    if (!workoutName.trim()) {
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

    // Load existing options
    const storedOptions = localStorage.getItem("workoutOptions");
    const existingOptions = storedOptions ? JSON.parse(storedOptions) : [];
    
    // Create new option
    const newOption = {
      id: `option-${Date.now()}`,
      name: workoutName,
      days: {
        day1: day1Exercises,
        day2: day2Exercises,
        day3: day3Exercises,
      },
      dayNames: {
        day1: day1Name,
        day2: day2Name,
        day3: day3Name,
      },
    };

    // Save to localStorage
    const updatedOptions = [...existingOptions, newOption];
    localStorage.setItem("workoutOptions", JSON.stringify(updatedOptions));

    // Also save to the main workout plan (for backward compatibility)
    const newPlan = {
      pushDay: day1Exercises,
      pullDay: day2Exercises,
      legsDay: day3Exercises,
    };
    localStorage.setItem("workoutPlan", JSON.stringify(newPlan));
    
    router.push("/gym/workouts");
  };

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
            Add Workout
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

        {/* Day Names */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">
              Day 1 Name
            </label>
            <input
              type="text"
              value={day1Name}
              onChange={(e) => setDay1Name(e.target.value)}
              placeholder="Day 1"
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">
              Day 2 Name
            </label>
            <input
              type="text"
              value={day2Name}
              onChange={(e) => setDay2Name(e.target.value)}
              placeholder="Day 2"
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">
              Day 3 Name
            </label>
            <input
              type="text"
              value={day3Name}
              onChange={(e) => setDay3Name(e.target.value)}
              placeholder="Day 3"
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Day Sections */}
        <div className="space-y-6 mb-6">
          {/* Day 1 */}
          <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
            <h3 className="text-base font-bold text-teal-400 mb-4">
              {day1Name}
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
              {day2Name}
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
              {day3Name}
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
