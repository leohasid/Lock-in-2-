"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, X, Plus, Trash2 } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  goalSets: number;
  goalReps: number;
  goalWeight: number;
  sets: Array<{
    reps: number;
    weight: number;
    completed: boolean;
  }>;
}

interface WorkoutPlanByDay {
  pushDay: Exercise[];
  pullDay: Exercise[];
  legsDay: Exercise[];
}

interface WorkoutSchedule {
  date: string;
  workoutName: string;
  completed: boolean;
}

interface CustomExercise {
  name: string;
  sets: number;
  reps: number;
}

export default function WorkoutPage() {
  const router = useRouter();
  
  // Get date from URL on client side
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get("date");
      if (dateParam) {
        const date = new Date(dateParam + "T00:00:00");
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanByDay>({
    pushDay: [],
    pullDay: [],
    legsDay: [],
  });
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [workoutSchedule, setWorkoutSchedule] = useState<WorkoutSchedule[]>([]);
  const [showCustomWorkoutModal, setShowCustomWorkoutModal] = useState(false);
  const [customWorkoutPlan, setCustomWorkoutPlan] = useState<{
    pushDay: CustomExercise[];
    pullDay: CustomExercise[];
    legsDay: CustomExercise[];
  }>({
    pushDay: [{ name: "", sets: 3, reps: 10 }],
    pullDay: [{ name: "", sets: 3, reps: 10 }],
    legsDay: [{ name: "", sets: 3, reps: 10 }],
  });

  // Update selectedDate when URL changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlDateParam = params.get("date");
    if (urlDateParam) {
      try {
        const newDate = new Date(urlDateParam + "T00:00:00");
        if (!isNaN(newDate.getTime())) {
          setSelectedDate(newDate);
        }
      } catch (e) {
        console.error("Error parsing date:", e);
      }
    }
  }, [typeof window !== "undefined" ? window.location.search : ""]);

  // Load workout plan and schedule
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPlan = localStorage.getItem("workoutPlan");
    if (storedPlan) {
      try {
        setWorkoutPlan(JSON.parse(storedPlan));
      } catch (e) {
        console.error("Error loading workout plan:", e);
      }
    }
    const storedSchedule = localStorage.getItem("workoutSchedule");
    if (storedSchedule) {
      try {
        setWorkoutSchedule(JSON.parse(storedSchedule));
      } catch (e) {
        console.error("Error loading workout schedule:", e);
      }
    }
  }, []);

  // Get workout type for selected date - must match main page logic exactly
  const getWorkoutTypeForDate = (date: Date): "pushDay" | "pullDay" | "legsDay" | null => {
    // Normalize date to start of day for consistent comparison
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = normalizedDate.toISOString().split("T")[0];
    
    const scheduledWorkout = workoutSchedule.find(w => w.date === dateStr);
    
    if (!scheduledWorkout) {
      // Calculate based on day of week if not in schedule - must match main page
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayIndex = Math.floor((normalizedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const workoutNames = ["Push Day", "Pull Day", "Legs Day", "Rest Day", "Push Day", "Pull Day", "Legs Day"];
      const workoutName = workoutNames[((dayIndex % 7) + 7) % 7];
      
      if (workoutName === "Push Day") return "pushDay";
      if (workoutName === "Pull Day") return "pullDay";
      if (workoutName === "Legs Day") return "legsDay";
      return null;
    }
    
    if (scheduledWorkout.workoutName === "Push Day") return "pushDay";
    if (scheduledWorkout.workoutName === "Pull Day") return "pullDay";
    if (scheduledWorkout.workoutName === "Legs Day") return "legsDay";
    return null;
  };

  // Get current day's exercises
  const currentDayExercises = useMemo(() => {
    const workoutType = getWorkoutTypeForDate(selectedDate);
    if (!workoutType) return [];
    return workoutPlan[workoutType] || [];
  }, [selectedDate, workoutPlan, workoutSchedule]);

  // Get current day's workout name - must match main page logic exactly
  const currentDayWorkoutName = useMemo(() => {
    // Normalize date to start of day for consistent comparison
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = normalizedDate.toISOString().split("T")[0];
    
    const scheduledWorkout = workoutSchedule.find(w => w.date === dateStr);
    if (scheduledWorkout) return scheduledWorkout.workoutName;
    
    // Calculate based on day of week if not in schedule - must match main page
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayIndex = Math.floor((normalizedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const workoutNames = ["Push Day", "Pull Day", "Legs Day", "Rest Day", "Push Day", "Pull Day", "Legs Day"];
    return workoutNames[((dayIndex % 7) + 7) % 7];
  }, [selectedDate, workoutSchedule]);

  // Load workout data for selected date
  const selectedDateStr = useMemo(() => selectedDate.toISOString().split("T")[0], [selectedDate]);
  const selectedDateWorkoutType = useMemo(() => getWorkoutTypeForDate(selectedDate), [selectedDate, workoutSchedule]);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedDateWorkoutType) return;
    const workoutData = localStorage.getItem(`workout_data_${selectedDateStr}`);
    
    if (workoutData) {
      try {
        const savedData = JSON.parse(workoutData);
        
        setWorkoutPlan((prev) => {
          const dayExercises = prev[selectedDateWorkoutType] || [];
          const updatedExercises = dayExercises.map(ex => {
            const savedEx = savedData.find((s: any) => s.id === ex.id);
            if (savedEx && savedEx.sets) {
              return {
                ...ex,
                sets: ex.sets.map((s, i) => {
                  const savedSet = savedEx.sets[i];
                  if (savedSet) {
                    return {
                      ...s,
                      completed: savedSet.completed || s.completed,
                      reps: savedSet.reps !== undefined ? savedSet.reps : s.reps,
                      weight: savedSet.weight !== undefined ? savedSet.weight : s.weight,
                    };
                  }
                  return s;
                }),
              };
            }
            return ex;
          });
          
          return {
            ...prev,
            [selectedDateWorkoutType]: updatedExercises,
          };
        });
      } catch (e) {
        console.error("Error loading workout data:", e);
      }
    }
  }, [selectedDateStr, selectedDateWorkoutType]);

  // Handle set updates
  function updateSet(exId: string, setIndex: number, patch: Partial<{ reps: number; weight: number; completed: boolean }>) {
    const workoutType = getWorkoutTypeForDate(selectedDate);
    if (!workoutType) return;
    
    setWorkoutPlan((prev) => {
      const updated = {
        ...prev,
        [workoutType]: prev[workoutType].map((ex) =>
          ex.id !== exId
            ? ex
            : {
                ...ex,
                sets: ex.sets.map((s, i) =>
                  i === setIndex ? { ...s, ...patch } : s
                ),
              }
        ),
      };
      
      if (typeof window !== "undefined") {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const dayExercises = updated[workoutType] || [];
        const workoutData = dayExercises.map(ex => ({
          id: ex.id,
          name: ex.name,
          sets: ex.sets,
        }));
        localStorage.setItem(`workout_data_${dateStr}`, JSON.stringify(workoutData));
      }
      
      return updated;
    });
  }

  const saveExercise = (exId: string) => {
    const workoutType = getWorkoutTypeForDate(selectedDate);
    if (!workoutType) return;
    
    const dateStr = selectedDate.toISOString().split("T")[0];
    const dayExercises = workoutPlan[workoutType] || [];
    
    const workoutData = dayExercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      sets: ex.sets,
    }));
    localStorage.setItem(`workout_data_${dateStr}`, JSON.stringify(workoutData));
    
    const allCompleted = dayExercises.every(ex => 
      ex.sets.every(s => s.completed)
    );
    
    if (allCompleted) {
      localStorage.setItem(`workout_${dateStr}`, "completed");
      setWorkoutSchedule(prev =>
        prev.map(w => w.date === dateStr ? { ...w, completed: true } : w)
      );
    }
  };

  const activeExercise = useMemo(() => {
    if (!activeExerciseId) return null;
    return currentDayExercises.find((ex) => ex.id === activeExerciseId) || null;
  }, [activeExerciseId, currentDayExercises]);

  const totals = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    let completedSets = 0;
    currentDayExercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        totalSets++;
        if (s.completed) {
          completedSets++;
          totalVolume += (Number(s.reps) || 0) * (Number(s.weight) || 0);
        }
      });
    });
    return {
      progress: totalSets ? Math.round((completedSets / totalSets) * 100) : 0,
      totalVolume,
      completedSets,
      totalSets,
    };
  }, [currentDayExercises]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push("/gym")}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            {currentDayWorkoutName}
          </h1>
          <button
            onClick={() => {
              const convertToCustom = (exercises: Exercise[]): any[] => {
                return exercises.map(ex => ({
                  name: ex.name,
                  sets: ex.goalSets,
                  reps: ex.goalReps,
                }));
              };
              setCustomWorkoutPlan({
                pushDay: workoutPlan.pushDay.length > 0 
                  ? convertToCustom(workoutPlan.pushDay)
                  : [{ name: "", sets: 3, reps: 10 }],
                pullDay: workoutPlan.pullDay.length > 0
                  ? convertToCustom(workoutPlan.pullDay)
                  : [{ name: "", sets: 3, reps: 10 }],
                legsDay: workoutPlan.legsDay.length > 0
                  ? convertToCustom(workoutPlan.legsDay)
                  : [{ name: "", sets: 3, reps: 10 }],
              });
              setShowCustomWorkoutModal(true);
            }}
            className="px-3 py-1.5 bg-gradient-to-b from-[#0c1422] to-black border border-white/10 text-white rounded-lg text-xs font-medium hover:bg-[rgba(20,30,35,1)] transition-colors"
          >
            + Workout
          </button>
        </div>

        {/* Date Selector with Left/Right Arrows */}
        <div className="mb-4 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              const prevDate = new Date(selectedDate);
              prevDate.setDate(prevDate.getDate() - 1);
              prevDate.setHours(0, 0, 0, 0);
              setSelectedDate(prevDate);
              // Update URL
              const dateStr = prevDate.toISOString().split("T")[0];
              router.push(`/gym/workout?date=${dateStr}`);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex flex-col items-center min-w-[140px] px-3 py-2 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-lg border border-white/10">
            <span className="text-sm font-semibold text-white">
              {selectedDate.toLocaleDateString("en-GB", { weekday: "long" })}
            </span>
            <span className="text-xs text-gray-400">
              {selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <button
            onClick={() => {
              const nextDate = new Date(selectedDate);
              nextDate.setDate(nextDate.getDate() + 1);
              nextDate.setHours(0, 0, 0, 0);
              setSelectedDate(nextDate);
              // Update URL
              const dateStr = nextDate.toISOString().split("T")[0];
              router.push(`/gym/workout?date=${dateStr}`);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Workout Overview */}
        {currentDayWorkoutName !== "Rest Day" && (
          <div className="mb-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-1">{currentDayWorkoutName}</h2>
            <p className="text-sm text-gray-400 mb-3">
              {selectedDate.toLocaleDateString("en-GB", { weekday: "long" })} • {
                currentDayWorkoutName === "Push Day" ? "Chest / Shoulders / Triceps" :
                currentDayWorkoutName === "Pull Day" ? "Back / Biceps" :
                currentDayWorkoutName === "Legs Day" ? "Quads / Hamstrings / Glutes / Calves" :
                ""
              }
            </p>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400">Progress</span>
              <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-teal-400 to-cyan-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${totals.progress}%` }}
                />
              </div>
              <span className="text-teal-400 font-bold text-xs min-w-[3rem] text-right">{totals.progress}% {totals.totalVolume} kg</span>
            </div>
          </div>
        )}

        {/* Exercises List */}
        {currentDayWorkoutName === "Rest Day" ? (
          <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-6 border border-white/10 text-center">
            <div className="text-4xl mb-2">😴</div>
            <p className="text-base font-bold text-gray-300 mb-1">Rest Day</p>
            <p className="text-gray-400 text-xs">Take a break and recover!</p>
          </div>
        ) : currentDayExercises.length === 0 ? (
          <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-6 border border-white/10 text-center">
            <div className="text-4xl mb-2">💪</div>
            <p className="text-sm font-bold text-gray-300 mb-1">No exercises for {currentDayWorkoutName}</p>
            <p className="text-gray-400 text-[10px]">Add your own workout or use AI to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Exercises</p>
            {currentDayExercises.map((ex) => {
              const completedSets = ex.sets.filter(s => s.completed).length;
              const totalSets = ex.sets.length;
              const nextIncompleteSet = ex.sets.findIndex(s => !s.completed);
              
              return (
                <div
                  key={ex.id}
                  className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-white/10 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h2 className="text-sm font-bold text-white mb-1">{ex.name}</h2>
                      <p className="text-xs text-gray-400">
                        {ex.goalSets} x {ex.goalReps} • {completedSets} / {totalSets} sets
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (nextIncompleteSet >= 0) {
                          setActiveExerciseId(ex.id);
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 text-black rounded-lg text-xs font-bold hover:from-teal-500 hover:to-cyan-600 transition-all shadow-lg shadow-teal-500/30"
                    >
                      START SET
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Strength Progress Section */}
        {currentDayWorkoutName !== "Rest Day" && (
          <section className="mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white">Progress</h2>
              <Link href="/gym/stats" className="text-[10px] text-teal-400 hover:text-teal-300">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <p className="text-base font-bold text-teal-400 mb-0.5">+12%</p>
                <p className="text-[9px] text-gray-400">Volume</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <p className="text-base font-bold text-teal-400 mb-0.5">+5 kg</p>
                <p className="text-[9px] text-gray-400">Bench PB</p>
              </div>
            </div>
          </section>
        )}

        {/* Exercise Modal */}
        {activeExercise && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-md w-full border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">{activeExercise.name}</h2>
                <button
                  onClick={() => setActiveExerciseId(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-3">
                {activeExercise.sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className={`p-3 rounded-lg border ${
                      set.completed
                        ? "bg-green-900/30 border-green-600/50"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">Set {setIndex + 1}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={set.completed}
                          onChange={(e) => {
                            updateSet(activeExercise.id, setIndex, { completed: e.target.checked });
                            if (e.target.checked) {
                              saveExercise(activeExercise.id);
                            }
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-transparent text-teal-400 focus:ring-teal-400"
                        />
                        <span className="text-xs text-gray-400">Completed</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Reps</label>
                        <input
                          type="number"
                          value={set.reps}
                          onChange={(e) => {
                            updateSet(activeExercise.id, setIndex, { reps: parseInt(e.target.value) || 0 });
                          }}
                          className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          value={set.weight}
                          onChange={(e) => {
                            updateSet(activeExercise.id, setIndex, { weight: parseFloat(e.target.value) || 0 });
                          }}
                          className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Custom Workout Plan Modal */}
        {showCustomWorkoutModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {workoutPlan.pushDay.length > 0 || workoutPlan.pullDay.length > 0 || workoutPlan.legsDay.length > 0
                    ? "Edit Your Workout Plan"
                    : "Create Your Workout Plan"}
                </h2>
                <button
                  onClick={() => {
                    setShowCustomWorkoutModal(false);
                    setCustomWorkoutPlan({
                      pushDay: [{ name: "", sets: 3, reps: 10 }],
                      pullDay: [{ name: "", sets: 3, reps: 10 }],
                      legsDay: [{ name: "", sets: 3, reps: 10 }],
                    });
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 mb-6">
                {/* Push Day Section */}
                <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
                  <h3 className="text-xl font-bold text-teal-400 mb-4">💪 Push Day</h3>
                  <div className="space-y-3">
                    {customWorkoutPlan.pushDay.length === 0 ? (
                      <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-4 border border-white/10 text-center">
                        <p className="text-gray-400 text-sm mb-3">No exercises added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkoutPlan({
                              ...customWorkoutPlan,
                              pushDay: [{ name: "", sets: 3, reps: 10 }],
                            });
                          }}
                          className="bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      customWorkoutPlan.pushDay.map((exercise, index) => (
                      <div key={index} className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-end mb-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const updated = customWorkoutPlan.pushDay.filter((_, i) => i !== index);
                              setCustomWorkoutPlan({
                                ...customWorkoutPlan,
                                pushDay: updated,
                              });
                            }}
                            className="text-red-400 hover:text-red-300"
                            title="Delete exercise"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(e) => {
                              const updated = [...customWorkoutPlan.pushDay];
                              updated[index].name = e.target.value;
                              setCustomWorkoutPlan({ ...customWorkoutPlan, pushDay: updated });
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
                                const updated = [...customWorkoutPlan.pushDay];
                                updated[index].sets = parseInt(e.target.value) || 0;
                                setCustomWorkoutPlan({ ...customWorkoutPlan, pushDay: updated });
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
                                const updated = [...customWorkoutPlan.pushDay];
                                updated[index].reps = parseInt(e.target.value) || 0;
                                setCustomWorkoutPlan({ ...customWorkoutPlan, pushDay: updated });
                              }}
                              min="1"
                              className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            {/* Add button removed - now at bottom of list */}
                          </div>
                        </div>
                      </div>
                      ))
                    )}
                    {customWorkoutPlan.pushDay.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomWorkoutPlan({
                            ...customWorkoutPlan,
                            pushDay: [...customWorkoutPlan.pushDay, { name: "", sets: 3, reps: 10 }],
                          });
                        }}
                        className="w-full bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>
                    )}
                  </div>
                </div>

                {/* Pull Day Section */}
                <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">🏋️ Pull Day</h3>
                  <div className="space-y-3">
                    {customWorkoutPlan.pullDay.length === 0 ? (
                      <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-4 border border-white/10 text-center">
                        <p className="text-gray-400 text-sm mb-3">No exercises added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkoutPlan({
                              ...customWorkoutPlan,
                              pullDay: [{ name: "", sets: 3, reps: 10 }],
                            });
                          }}
                          className="bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      customWorkoutPlan.pullDay.map((exercise, index) => (
                      <div key={index} className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-end mb-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const updated = customWorkoutPlan.pullDay.filter((_, i) => i !== index);
                              setCustomWorkoutPlan({
                                ...customWorkoutPlan,
                                pullDay: updated,
                              });
                            }}
                            className="text-red-400 hover:text-red-300"
                            title="Delete exercise"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(e) => {
                              const updated = [...customWorkoutPlan.pullDay];
                              updated[index].name = e.target.value;
                              setCustomWorkoutPlan({ ...customWorkoutPlan, pullDay: updated });
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
                                const updated = [...customWorkoutPlan.pullDay];
                                updated[index].sets = parseInt(e.target.value) || 0;
                                setCustomWorkoutPlan({ ...customWorkoutPlan, pullDay: updated });
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
                                const updated = [...customWorkoutPlan.pullDay];
                                updated[index].reps = parseInt(e.target.value) || 0;
                                setCustomWorkoutPlan({ ...customWorkoutPlan, pullDay: updated });
                              }}
                              min="1"
                              className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            {/* Add button removed - now at bottom of list */}
                          </div>
                        </div>
                      </div>
                      ))
                    )}
                    {customWorkoutPlan.pullDay.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomWorkoutPlan({
                            ...customWorkoutPlan,
                            pullDay: [...customWorkoutPlan.pullDay, { name: "", sets: 3, reps: 10 }],
                          });
                        }}
                        className="w-full bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>
                    )}
                  </div>
                </div>

                {/* Legs Day Section */}
                <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
                  <h3 className="text-xl font-bold text-green-400 mb-4">🦵 Legs Day</h3>
                  <div className="space-y-3">
                    {customWorkoutPlan.legsDay.length === 0 ? (
                      <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-4 border border-white/10 text-center">
                        <p className="text-gray-400 text-sm mb-3">No exercises added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkoutPlan({
                              ...customWorkoutPlan,
                              legsDay: [{ name: "", sets: 3, reps: 10 }],
                            });
                          }}
                          className="bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      customWorkoutPlan.legsDay.map((exercise, index) => (
                      <div key={index} className="bg-gradient-to-b from-[#0c1422] to-black rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-end mb-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const updated = customWorkoutPlan.legsDay.filter((_, i) => i !== index);
                              setCustomWorkoutPlan({
                                ...customWorkoutPlan,
                                legsDay: updated,
                              });
                            }}
                            className="text-red-400 hover:text-red-300"
                            title="Delete exercise"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(e) => {
                              const updated = [...customWorkoutPlan.legsDay];
                              updated[index].name = e.target.value;
                              setCustomWorkoutPlan({ ...customWorkoutPlan, legsDay: updated });
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
                                const updated = [...customWorkoutPlan.legsDay];
                                updated[index].sets = parseInt(e.target.value) || 0;
                                setCustomWorkoutPlan({ ...customWorkoutPlan, legsDay: updated });
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
                                const updated = [...customWorkoutPlan.legsDay];
                                updated[index].reps = parseInt(e.target.value) || 0;
                                setCustomWorkoutPlan({ ...customWorkoutPlan, legsDay: updated });
                              }}
                              min="1"
                              className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            {/* Add button removed - now at bottom of list */}
                          </div>
                        </div>
                      </div>
                      ))
                    )}
                    {customWorkoutPlan.legsDay.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomWorkoutPlan({
                            ...customWorkoutPlan,
                            legsDay: [...customWorkoutPlan.legsDay, { name: "", sets: 3, reps: 10 }],
                          });
                        }}
                        className="w-full bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowCustomWorkoutModal(false);
                    setCustomWorkoutPlan({
                      pushDay: [{ name: "", sets: 3, reps: 10 }],
                      pullDay: [{ name: "", sets: 3, reps: 10 }],
                      legsDay: [{ name: "", sets: 3, reps: 10 }],
                    });
                  }}
                  className="flex-1 bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Convert exercises to Exercise format for each day type
                    const convertExercises = (exercises: CustomExercise[]): Exercise[] => {
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

                    const pushDayExercises = convertExercises(customWorkoutPlan.pushDay);
                    const pullDayExercises = convertExercises(customWorkoutPlan.pullDay);
                    const legsDayExercises = convertExercises(customWorkoutPlan.legsDay);

                    // Save the workout plan
                    const newPlan = {
                      pushDay: pushDayExercises,
                      pullDay: pullDayExercises,
                      legsDay: legsDayExercises,
                    };
                    setWorkoutPlan(newPlan);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("workoutPlan", JSON.stringify(newPlan));
                    }
                    setShowCustomWorkoutModal(false);
                    setCustomWorkoutPlan({
                      pushDay: [{ name: "", sets: 3, reps: 10 }],
                      pullDay: [{ name: "", sets: 3, reps: 10 }],
                      legsDay: [{ name: "", sets: 3, reps: 10 }],
                    });
                  }}
                  className="flex-1 bg-teal-400 hover:bg-teal-500 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Save Workout Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

