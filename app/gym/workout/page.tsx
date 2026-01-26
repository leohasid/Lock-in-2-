"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, X, Plus, Trash2, MoreVertical, Clock, BarChart3, RefreshCw, ChevronRight, Dumbbell } from "lucide-react";

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

interface WorkoutOption {
  id: string;
  name: string;
  days: {
    day1: Exercise[];
    day2: Exercise[];
    day3: Exercise[];
  };
  dayNames: {
    day1: string;
    day2: string;
    day3: string;
  };
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
  const [showWorkoutOptions, setShowWorkoutOptions] = useState(true);
  const [selectedWorkoutOption, setSelectedWorkoutOption] = useState<string | null>(null);
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
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
    // Load workout options
    const storedOptions = localStorage.getItem("workoutOptions");
    if (storedOptions) {
      try {
        setWorkoutOptions(JSON.parse(storedOptions));
      } catch (e) {
        console.error("Error loading workout options:", e);
      }
    } else {
      // Initialize with default options
      const defaultOptions: WorkoutOption[] = [
        {
          id: "option1",
          name: "Option 1",
          days: {
            day1: [],
            day2: [],
            day3: [],
          },
          dayNames: {
            day1: "Push Day",
            day2: "Pull Day",
            day3: "Legs Day",
          },
        },
        {
          id: "option2",
          name: "Option 2",
          days: {
            day1: [],
            day2: [],
            day3: [],
          },
          dayNames: {
            day1: "Back & Triceps",
            day2: "Chest & Biceps",
            day3: "Legs Day",
          },
        },
        {
          id: "option3",
          name: "Option 3",
          days: {
            day1: [],
            day2: [],
            day3: [],
          },
          dayNames: {
            day1: "Upper Body",
            day2: "Lower Body",
            day3: "Full Body",
          },
        },
      ];
      setWorkoutOptions(defaultOptions);
      localStorage.setItem("workoutOptions", JSON.stringify(defaultOptions));
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
            View Workouts
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
          <div className="space-y-4">
            {/* Exercise count header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{currentDayExercises.length} exercises</h2>
              <button className="text-cyan-400 hover:text-cyan-300">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* Exercise List */}
            {currentDayExercises.map((ex) => {
              const completedSets = ex.sets.filter(s => s.completed).length;
              const totalSets = ex.sets.length;
              const firstSet = ex.sets[0];
              const weightDisplay = firstSet?.weight || ex.goalWeight || 0;
              
              return (
                <div
                  key={ex.id}
                  onClick={() => setActiveExerciseId(ex.id)}
                  className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-black/60 transition-colors"
                >
                  {/* Exercise thumbnail placeholder */}
                  <div className="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <Dumbbell className="w-8 h-8 text-gray-600" />
                  </div>
                  
                  {/* Exercise info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white mb-1 truncate">{ex.name}</h3>
                    <p className="text-xs text-gray-400">
                      {totalSets} sets • {ex.goalReps} reps • {weightDisplay} {weightDisplay > 0 ? 'lb' : ''}
                    </p>
                  </div>
                  
                  {/* Three dot menu */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveExerciseId(ex.id);
                    }}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Strength Progress Section */}
        {currentDayWorkoutName !== "Rest Day" && (
          <section className="mb-4 mt-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-white/10 rounded-xl p-3">
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
          <div className="fixed inset-0 bg-black flex flex-col z-50">
            {/* Header with close button */}
            <div className="flex items-center justify-end p-4">
              <button
                onClick={() => setActiveExerciseId(null)}
                className="w-10 h-10 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-black/60"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Exercise image placeholder */}
              <div className="w-full h-48 bg-gray-900 flex items-center justify-center relative">
                <Dumbbell className="w-20 h-20 text-gray-700" />
                <button className="absolute top-4 right-4 w-8 h-8 bg-black/80 rounded-full flex items-center justify-center text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Exercise name and How-To */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{activeExercise.name}</h2>
                  <button className="flex items-center gap-1 text-cyan-400 text-sm font-medium">
                    How-To
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black/40 border border-white/10 rounded-lg text-white text-sm">
                    <Clock className="w-4 h-4" />
                    Rest timer: On
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black/40 border border-white/10 rounded-lg text-white text-sm">
                    <BarChart3 className="w-4 h-4" />
                    History
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black/40 border border-white/10 rounded-lg text-white text-sm">
                    <RefreshCw className="w-4 h-4" />
                    Replace
                  </button>
                </div>

                {/* Sets */}
                <div className="space-y-3">
                  {activeExercise.sets.map((set, setIndex) => {
                    const isCompleted = set.completed;
                    const isActive = !isCompleted && setIndex === activeExercise.sets.findIndex(s => !s.completed);
                    
                    return (
                      <div
                        key={setIndex}
                        className={`p-4 rounded-lg ${
                          isCompleted
                            ? "bg-cyan-500/20 border border-cyan-500/50"
                            : isActive
                            ? "bg-cyan-500/10 border-2 border-cyan-400"
                            : "bg-black/40 border border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {isCompleted ? (
                            <div className="w-8 h-8 rounded-full bg-cyan-400 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isActive ? "bg-cyan-400 text-black" : "bg-gray-700 text-gray-400"
                            }`}>
                              <span className="text-sm font-semibold">{setIndex + 1}</span>
                            </div>
                          )}
                          
                          {isCompleted ? (
                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="text-lg font-semibold text-white">{set.reps}</span>
                                  <span className="text-xs text-gray-400 ml-1">reps</span>
                                </div>
                                <div>
                                  <span className="text-lg font-semibold text-white">{set.weight}</span>
                                  <span className="text-xs text-gray-400 ml-1">lb</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Reps</label>
                                <input
                                  type="number"
                                  value={set.reps}
                                  onChange={(e) => {
                                    updateSet(activeExercise.id, setIndex, { reps: parseInt(e.target.value) || 0 });
                                  }}
                                  className="w-full bg-black/60 text-white p-2 rounded border border-white/20 focus:outline-none focus:border-cyan-400 text-base font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Weight (lb)</label>
                                <input
                                  type="number"
                                  value={set.weight}
                                  onChange={(e) => {
                                    updateSet(activeExercise.id, setIndex, { weight: parseFloat(e.target.value) || 0 });
                                  }}
                                  className="w-full bg-black/60 text-white p-2 rounded border border-white/20 focus:outline-none focus:border-cyan-400 text-base font-semibold"
                                />
                                <p className="text-xs text-gray-500 mt-1">Bar + Plates</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Set button */}
                <button
                  onClick={() => {
                    const workoutType = getWorkoutTypeForDate(selectedDate);
                    if (!workoutType) return;
                    
                    setWorkoutPlan((prev) => {
                      const updated = {
                        ...prev,
                        [workoutType]: prev[workoutType].map((ex) =>
                          ex.id === activeExercise.id
                            ? {
                                ...ex,
                                sets: [...ex.sets, { reps: ex.goalReps, weight: 0, completed: false }],
                              }
                            : ex
                        ),
                      };
                      return updated;
                    });
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 text-cyan-400 hover:text-cyan-300"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add Set</span>
                </button>

                {/* Log All Sets button */}
                <button
                  onClick={() => {
                    saveExercise(activeExercise.id);
                    setActiveExerciseId(null);
                  }}
                  className="w-full py-4 bg-cyan-400 hover:bg-cyan-500 text-black font-bold rounded-lg transition-colors"
                >
                  Log All Sets
                </button>
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
                  {showWorkoutOptions ? "Select Workout Option" : "Edit Your Workout Plan"}
                </h2>
                <button
                  onClick={() => {
                    setShowCustomWorkoutModal(false);
                    setShowWorkoutOptions(true);
                    setSelectedWorkoutOption(null);
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

              {/* Workout Options Selection */}
              {showWorkoutOptions ? (
                <div className="space-y-4">
                  <p className="text-gray-400 mb-4">Choose a workout split that fits your training style:</p>
                  <div className="grid grid-cols-1 gap-4">
                    {workoutOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSelectedWorkoutOption(option.id);
                          setShowWorkoutOptions(false);
                          // Load the exercises for this option
                          const convertToCustom = (exercises: Exercise[]): any[] => {
                            return exercises.map(ex => ({
                              name: ex.name,
                              sets: ex.goalSets,
                              reps: ex.goalReps,
                            }));
                          };
                          setCustomWorkoutPlan({
                            pushDay: option.days.day1.length > 0 
                              ? convertToCustom(option.days.day1)
                              : [{ name: "", sets: 3, reps: 10 }],
                            pullDay: option.days.day2.length > 0
                              ? convertToCustom(option.days.day2)
                              : [{ name: "", sets: 3, reps: 10 }],
                            legsDay: option.days.day3.length > 0
                              ? convertToCustom(option.days.day3)
                              : [{ name: "", sets: 3, reps: 10 }],
                          });
                        }}
                        className="p-4 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-white/10 rounded-xl hover:border-cyan-400/50 transition-colors text-left"
                      >
                        <h3 className="text-lg font-bold text-white mb-2">{option.name}</h3>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p>• {option.dayNames.day1}</p>
                          <p>• {option.dayNames.day2}</p>
                          <p>• {option.dayNames.day3}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
              <div className="space-y-6 mb-6">
                {/* Back button */}
                <button
                  onClick={() => {
                    setShowWorkoutOptions(true);
                    setSelectedWorkoutOption(null);
                  }}
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Options</span>
                </button>

                {/* Day 1 Section */}
                <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
                  <h3 className="text-xl font-bold text-teal-400 mb-4">
                    💪 {selectedWorkoutOption ? workoutOptions.find(o => o.id === selectedWorkoutOption)?.dayNames.day1 || "Day 1" : "Day 1"}
                  </h3>
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

                {/* Day 2 Section */}
                <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">
                    🏋️ {selectedWorkoutOption ? workoutOptions.find(o => o.id === selectedWorkoutOption)?.dayNames.day2 || "Day 2" : "Day 2"}
                  </h3>
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

                {/* Day 3 Section */}
                <div className="bg-[rgba(20,30,35,0.85)] rounded-lg p-4 border border-white/10">
                  <h3 className="text-xl font-bold text-green-400 mb-4">
                    🦵 {selectedWorkoutOption ? workoutOptions.find(o => o.id === selectedWorkoutOption)?.dayNames.day3 || "Day 3" : "Day 3"}
                  </h3>
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
                    setShowWorkoutOptions(true);
                    setSelectedWorkoutOption(null);
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
              )}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

