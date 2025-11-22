"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Dumbbell, Save, TrendingUp, AlertCircle, X, Plus, Trash2 } from "lucide-react";

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

// Workout plan organized by day type
interface WorkoutPlanByDay {
  pushDay: Exercise[];
  pullDay: Exercise[];
  legsDay: Exercise[];
}

interface WorkoutSchedule {
  date: string; // YYYY-MM-DD
  workoutName: string;
  completed: boolean;
}

interface CustomExercise {
  name: string;
  sets: number;
  reps: number;
}

interface CustomWorkoutPlan {
  pushDay: CustomExercise[];
  pullDay: CustomExercise[];
  legsDay: CustomExercise[];
}

export default function GymPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanByDay>({
    pushDay: [],
    pullDay: [],
    legsDay: [],
  });
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [workoutSchedule, setWorkoutSchedule] = useState<WorkoutSchedule[]>([]);
  const [showMissedWorkoutAlert, setShowMissedWorkoutAlert] = useState(false);
  const [missedWorkoutDate, setMissedWorkoutDate] = useState<string | null>(null);
  const [showCustomWorkoutModal, setShowCustomWorkoutModal] = useState(false);
  const [customWorkoutPlan, setCustomWorkoutPlan] = useState<CustomWorkoutPlan>({
    pushDay: [{ name: "", sets: 3, reps: 10 }],
    pullDay: [{ name: "", sets: 3, reps: 10 }],
    legsDay: [{ name: "", sets: 3, reps: 10 }],
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load workout plan from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // First check for existing workout plan
    const storedPlan = localStorage.getItem("workoutPlan");
    if (storedPlan) {
      try {
        const parsed = JSON.parse(storedPlan);
        // Only use if it has exercises
        if (parsed.pushDay?.length > 0 || parsed.pullDay?.length > 0 || parsed.legsDay?.length > 0) {
          setWorkoutPlan(parsed);
          setIsLoaded(true);
          return;
        }
      } catch (e) {
        console.error("Error loading workout plan:", e);
      }
    }

    // If no existing plan, check for custom gym plan from onboarding
    const customGymPlan = localStorage.getItem("customGymPlan");
    if (customGymPlan) {
      try {
        const plan = JSON.parse(customGymPlan);
        if (plan.weeklySchedule && plan.weeklySchedule.length > 0) {
          // Convert AI plan format to gym page format
          const workoutPlanByDay: WorkoutPlanByDay = {
            pushDay: [],
            pullDay: [],
            legsDay: [],
          };

          interface AIExercise {
            name: string;
            sets: number;
            reps: string | number;
            rest?: string;
            notes?: string;
          }

          interface AIWorkoutDay {
            day: string;
            workoutName: string;
            exercises: AIExercise[];
          }

          (plan.weeklySchedule as AIWorkoutDay[]).forEach((day: AIWorkoutDay) => {
            const workoutName = day.workoutName?.toLowerCase() || "";
            const exercises = (day.exercises || []).map((ex: AIExercise) => ({
              id: `${ex.name}-${Date.now()}-${Math.random()}`,
              name: ex.name,
              goalSets: ex.sets || 3,
              goalReps: typeof ex.reps === "string" ? parseInt(String(ex.reps).replace(/[^0-9]/g, "")) || 10 : ex.reps || 10,
              goalWeight: 0,
              sets: [],
            }));

            if (workoutName.includes("push")) {
              workoutPlanByDay.pushDay.push(...exercises);
            } else if (workoutName.includes("pull")) {
              workoutPlanByDay.pullDay.push(...exercises);
            } else if (workoutName.includes("leg") || workoutName.includes("lower")) {
              workoutPlanByDay.legsDay.push(...exercises);
            } else {
              // Try to categorize by exercise names
              exercises.forEach((ex) => {
                const name = ex.name.toLowerCase();
                if (name.includes("bench") || name.includes("press") || name.includes("push") || 
                    name.includes("chest") || name.includes("shoulder") || name.includes("tricep")) {
                  workoutPlanByDay.pushDay.push(ex);
                } else if (name.includes("pull") || name.includes("row") || name.includes("lat") || 
                          name.includes("bicep") || name.includes("back")) {
                  workoutPlanByDay.pullDay.push(ex);
                } else if (name.includes("squat") || name.includes("leg") || name.includes("deadlift") || 
                          name.includes("calf") || name.includes("quad") || name.includes("hamstring")) {
                  workoutPlanByDay.legsDay.push(ex);
                } else {
                  // Default to push day
                  workoutPlanByDay.pushDay.push(ex);
                }
              });
            }
          });

          // Only set if we have exercises
          if (workoutPlanByDay.pushDay.length > 0 || 
              workoutPlanByDay.pullDay.length > 0 || 
              workoutPlanByDay.legsDay.length > 0) {
            setWorkoutPlan(workoutPlanByDay);
            localStorage.setItem("workoutPlan", JSON.stringify(workoutPlanByDay));
          }
        }
      } catch (e) {
        console.error("Error loading custom gym plan:", e);
      }
    }
    
    setIsLoaded(true);
  }, []);

  // Save workout plan to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    localStorage.setItem("workoutPlan", JSON.stringify(workoutPlan));
  }, [workoutPlan, isLoaded]);

  // Initialize workout schedule based on plan
  useEffect(() => {
    const today = new Date();
    const schedule: WorkoutSchedule[] = [];
    
    // Create a schedule with Push Day, Pull Day, Legs Day rotation (14 days total)
    const workoutNames = ["Push Day", "Pull Day", "Legs Day", "Rest Day", "Push Day", "Pull Day", "Legs Day"];
    
    // Start from 7 days ago to 7 days ahead
    for (let i = -7; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      
      // Check if there's a completed workout for this date
      const completed = localStorage.getItem(`workout_${dateStr}`) === "completed";
      
      // Calculate workout name based on day index
      const dayIndex = ((i % 7) + 7) % 7;
      const workoutName = workoutNames[dayIndex];
      
      schedule.push({
        date: dateStr,
        workoutName,
        completed,
      });
    }
    
    setWorkoutSchedule(schedule);
  }, []);

  // Check if any exercises were completed for a given date
  const hasCompletedExercises = (dateStr: string): boolean => {
    const workoutType = getWorkoutTypeForDate(new Date(dateStr));
    if (!workoutType) return false;
    
    const dayExercises = workoutPlan[workoutType] || [];
    if (dayExercises.length === 0) return false;
    
    // Check if any sets were completed for this date
    const workoutData = localStorage.getItem(`workout_data_${dateStr}`);
    if (workoutData) {
      try {
        const data = JSON.parse(workoutData) as Exercise[];
        // Check if any exercise has completed sets
        return data.some((ex) => ex.sets?.some((s) => s.completed === true));
      } catch {
        return false;
      }
    }
    
    return false;
  };

  // Create a stable reference for workout schedule
  const workoutScheduleKey = useMemo(() => {
    const dates = workoutSchedule.map(w => w.date).sort().join(",");
    const names = workoutSchedule.map(w => w.workoutName).join(",");
    return `${workoutSchedule.length}-${dates}-${names}`;
  }, [workoutSchedule]);

  // Check for missed workouts - only shows between 11:45 AM and 12:00 PM if workout not completed
  useEffect(() => {
    const checkMissedWorkout = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute; // Time in minutes since midnight
      
      // Only show alert between 11:45 AM (705 minutes) and 12:00 PM (720 minutes)
      const alertStartTime = 11 * 60 + 45; // 11:45 AM
      const alertEndTime = 12 * 60; // 12:00 PM
      
      if (currentTime < alertStartTime || currentTime >= alertEndTime) {
        // Outside the alert window, hide the alert
        setShowMissedWorkoutAlert(false);
        setMissedWorkoutDate(null);
        return;
      }
      
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      
      // Check today's workout - only show if it hasn't been completed
      const workoutStatus = localStorage.getItem(`workout_${todayStr}`);
      const scheduledWorkout = workoutSchedule.find(w => w.date === todayStr);
      
      // If no workout is scheduled for today, hide the alert
      if (!scheduledWorkout) {
        setShowMissedWorkoutAlert(false);
        setMissedWorkoutDate(null);
        return;
      }
      
      // Get the workout type for today to check if there are exercises
      let workoutType: "pushDay" | "pullDay" | "legsDay" | null = null;
      if (scheduledWorkout.workoutName === "Push Day") {
        workoutType = "pushDay";
      } else if (scheduledWorkout.workoutName === "Pull Day") {
        workoutType = "pullDay";
      } else if (scheduledWorkout.workoutName === "Legs Day") {
        workoutType = "legsDay";
      }
      
      const hasExercises = workoutType && workoutPlan[workoutType] && workoutPlan[workoutType].length > 0;
      
      // Check if workout was scheduled, not a rest day, has exercises, not rescheduled, and has no completed exercises
      if (scheduledWorkout.workoutName !== "Rest Day" &&
          hasExercises &&
          workoutStatus !== "rescheduled" &&
          workoutStatus !== "completed" &&
          !hasCompletedExercises(todayStr)) {
        setMissedWorkoutDate(todayStr);
        setShowMissedWorkoutAlert(true);
      } else {
        // No workout scheduled, rest day, no exercises, completed, or doesn't exist - hide alert
        setShowMissedWorkoutAlert(false);
        setMissedWorkoutDate(null);
      }
    };

    // Check immediately
    checkMissedWorkout();

    // Set up interval to check every minute during the alert window
    const interval = setInterval(checkMissedWorkout, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [workoutScheduleKey, workoutPlan.pushDay.length, workoutPlan.pullDay.length, workoutPlan.legsDay.length]);

  // Generate dates for the scroll wheel (show past 7 days and future 7 days)
  const days = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 7 + i);
    return d;
  });

  // Get the workout type for the selected date
  const getWorkoutTypeForDate = (date: Date): "pushDay" | "pullDay" | "legsDay" | null => {
    const dateStr = date.toISOString().split("T")[0];
    const scheduledWorkout = workoutSchedule.find(w => w.date === dateStr);
    
    if (!scheduledWorkout) {
      // Calculate based on day of week if not in schedule
      const dayIndex = Math.floor((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
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

  // Get selected date as string (stable reference)
  const selectedDateStr = useMemo(() => selectedDate.toISOString().split("T")[0], [selectedDate]);

  // Get workout type for selected date (memoized)
  const selectedDateWorkoutType = useMemo(() => {
    const scheduledWorkout = workoutSchedule.find(w => w.date === selectedDateStr);
    
    if (scheduledWorkout) {
      if (scheduledWorkout.workoutName === "Push Day") return "pushDay";
      if (scheduledWorkout.workoutName === "Pull Day") return "pullDay";
      if (scheduledWorkout.workoutName === "Legs Day") return "legsDay";
    } else {
      // Calculate based on day of week if not in schedule
      const today = new Date();
      const dayIndex = Math.floor((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const workoutNames = ["Push Day", "Pull Day", "Legs Day", "Rest Day", "Push Day", "Pull Day", "Legs Day"];
      const workoutName = workoutNames[((dayIndex % 7) + 7) % 7];
      if (workoutName === "Push Day") return "pushDay";
      if (workoutName === "Pull Day") return "pullDay";
      if (workoutName === "Legs Day") return "legsDay";
    }
    return null;
  }, [selectedDateStr, workoutScheduleKey]);

  // Load workout data for selected date
  useEffect(() => {
    if (typeof window === "undefined" || !selectedDateWorkoutType) return;
    const workoutData = localStorage.getItem(`workout_data_${selectedDateStr}`);
    
    if (workoutData) {
      try {
        const savedData = JSON.parse(workoutData);
        
        // Restore completed sets from saved data
        setWorkoutPlan((prev) => {
          const dayExercises = prev[selectedDateWorkoutType] || [];
          const updatedExercises = dayExercises.map(ex => {
            const savedEx = savedData.find((s: any) => s.id === ex.id);
            if (savedEx && savedEx.sets) {
              // Restore sets with completion status
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

  // Get current day's exercises
  const currentDayExercises = useMemo(() => {
    const workoutType = getWorkoutTypeForDate(selectedDate);
    if (!workoutType) return [];
    return workoutPlan[workoutType] || [];
  }, [selectedDate, workoutPlan, workoutSchedule]);

  const activeExercise = useMemo(() => {
    if (!activeExerciseId) return null;
    return currentDayExercises.find((ex) => ex.id === activeExerciseId) || null;
  }, [activeExerciseId, currentDayExercises]);

  // Get current day's workout name
  const currentDayWorkoutName = useMemo(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    const scheduledWorkout = workoutSchedule.find(w => w.date === dateStr);
    if (scheduledWorkout) return scheduledWorkout.workoutName;
    
    // Calculate based on day of week if not in schedule
    const dayIndex = Math.floor((selectedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const workoutNames = ["Push Day", "Pull Day", "Legs Day", "Rest Day", "Push Day", "Pull Day", "Legs Day"];
    return workoutNames[((dayIndex % 7) + 7) % 7];
  }, [selectedDate, workoutSchedule]);

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
      
      // Save workout data to localStorage when sets are updated
      if (typeof window !== "undefined") {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const dayExercises = updated[workoutType] || [];
        const workoutData = dayExercises.map(ex => ({
          id: ex.id,
          name: ex.name,
          sets: ex.sets,
        }));
        localStorage.setItem(`workout_data_${dateStr}`, JSON.stringify(workoutData));
        
        // If a set was marked as completed and we're on today's date, hide the missed workout alert
        if (patch.completed === true && dateStr === new Date().toISOString().split("T")[0]) {
          setShowMissedWorkoutAlert(false);
          setMissedWorkoutDate(null);
        }
      }
      
      return updated;
    });
  }

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

  const saveExercise = (exId: string) => {
    const workoutType = getWorkoutTypeForDate(selectedDate);
    if (!workoutType) return;
    
    const dateStr = selectedDate.toISOString().split("T")[0];
    const dayExercises = workoutPlan[workoutType] || [];
    
    // Save workout data with exercise completion status
    const workoutData = dayExercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      sets: ex.sets,
    }));
    localStorage.setItem(`workout_data_${dateStr}`, JSON.stringify(workoutData));
    
    // Check if all exercises are completed
    const allCompleted = dayExercises.every(ex => 
      ex.sets.every(s => s.completed)
    );
    
    if (allCompleted) {
      localStorage.setItem(`workout_${dateStr}`, "completed");
      // Update schedule
      setWorkoutSchedule(prev =>
        prev.map(w => w.date === dateStr ? { ...w, completed: true } : w)
      );
    }
  };

  const handleSkipMissedWorkout = () => {
    if (missedWorkoutDate) {
      // Mark as skipped (but don't mark as rescheduled, so alert will show again)
      localStorage.setItem(`workout_${missedWorkoutDate}`, "skipped");
      setWorkoutSchedule(prev =>
        prev.map(w => w.date === missedWorkoutDate ? { ...w, completed: true } : w)
      );
    }
    setShowMissedWorkoutAlert(false);
    setMissedWorkoutDate(null);
  };

  const handleReschedulePlan = () => {
    if (missedWorkoutDate) {
      // Mark the missed workout as rescheduled so it won't show the alert again
      localStorage.setItem(`workout_${missedWorkoutDate}`, "rescheduled");
      
      // Shift all future workouts forward by one day
      const today = new Date();
      const missedDate = new Date(missedWorkoutDate);
      
      setWorkoutSchedule(prev => {
        const newSchedule = [...prev];
        const workoutNames = ["Push Day", "Pull Day", "Legs Day", "Rest Day", "Push Day", "Pull Day", "Legs Day"];
        
        // Find the missed workout index
        const missedIndex = newSchedule.findIndex(w => w.date === missedWorkoutDate);
        
        if (missedIndex !== -1) {
          // Get the workout type of the missed day
          const missedWorkoutName = newSchedule[missedIndex].workoutName;
          
          // Remove the missed workout
          newSchedule.splice(missedIndex, 1);
          
          // Shift all future dates forward by one day
          for (let i = missedIndex; i < newSchedule.length; i++) {
            const currentDate = new Date(newSchedule[i].date);
            currentDate.setDate(currentDate.getDate() - 1);
            newSchedule[i] = {
              ...newSchedule[i],
              date: currentDate.toISOString().split("T")[0],
            };
          }
          
          // Add the missed workout to the end of the schedule (7 days from the last date)
          const lastDate = new Date(newSchedule[newSchedule.length - 1].date);
          lastDate.setDate(lastDate.getDate() + 1);
          
          // Calculate the correct workout name for the new date
          const daysFromToday = Math.floor((lastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const workoutIndex = ((daysFromToday % 7) + 7) % 7;
          
          newSchedule.push({
            date: lastDate.toISOString().split("T")[0],
            workoutName: workoutNames[workoutIndex],
            completed: false,
          });
        }
        
        return newSchedule;
      });
    }
    setShowMissedWorkoutAlert(false);
    setMissedWorkoutDate(null);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Missed Workout Alert */}
        {showMissedWorkoutAlert && missedWorkoutDate && (
          <div className="mb-4 bg-yellow-900/50 border border-yellow-600 rounded-xl p-4 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Missed Workout Detected</h3>
              <p className="text-gray-300 text-sm mb-3">
                You missed a workout on {new Date(missedWorkoutDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}. Would you like to reschedule and adjust your workout plan?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSkipMissedWorkout}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Skip for Now
                </button>
                <button
                  onClick={handleReschedulePlan}
                  className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Reschedule & Adjust Plan
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setShowMissedWorkoutAlert(false);
                setMissedWorkoutDate(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {activeExercise && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setActiveExerciseId(null)}
          >
            <div
              className="bg-gray-900 rounded-2xl p-6 w-full max-w-xl border border-gray-800 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    {currentDayWorkoutName}
                  </p>
                  <h2 className="text-2xl font-bold text-white">{activeExercise.name}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Target: {activeExercise.goalSets} sets × {activeExercise.goalReps} reps
                  </p>
                </div>
                <button
                  onClick={() => setActiveExerciseId(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {activeExercise.sets.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                      s.completed ? "border-green-600 bg-gray-800" : "border-gray-700 bg-gray-900"
                    }`}
                  >
                    <span className="text-gray-400 w-6 text-xs">Set {i + 1}</span>
                    <input
                      type="number"
                      value={s.reps}
                      onChange={(e) =>
                        updateSet(activeExercise.id, i, { reps: Number(e.target.value) || 0 })
                      }
                      className="w-16 bg-black border border-gray-700 rounded px-2 py-1 text-right text-xs"
                    />
                    <span className="text-gray-500 text-xs">reps</span>
                    <input
                      type="number"
                      value={s.weight}
                      onChange={(e) =>
                        updateSet(activeExercise.id, i, { weight: Number(e.target.value) || 0 })
                      }
                      className="w-20 bg-black border border-gray-700 rounded px-2 py-1 text-right text-xs"
                    />
                    <span className="text-gray-400 text-xs">kg</span>
                    <button
                      onClick={() =>
                        updateSet(activeExercise.id, i, { completed: !s.completed })
                      }
                      className={`ml-auto px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                        s.completed
                          ? "bg-green-600 text-white"
                          : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                      }`}
                    >
                      {s.completed ? "Done" : "Mark"}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  saveExercise(activeExercise.id);
                  setActiveExerciseId(null);
                }}
                className="w-full mt-4 bg-orange-500 text-black px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Exercise
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col items-start mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-orange-500 text-black rounded-full p-2">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold">{currentDayWorkoutName}</h1>
          </div>
          <p className="text-gray-400 text-xs">
            {selectedDate.toLocaleDateString("en-GB")}
          </p>
        </header>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => {
              // Load existing workout plan into the modal
              const convertToCustom = (exercises: Exercise[]): CustomExercise[] => {
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
            className="flex-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white px-4 py-3 rounded-lg font-semibold transition-colors text-sm"
          >
            {workoutPlan.pushDay.length > 0 || workoutPlan.pullDay.length > 0 || workoutPlan.legsDay.length > 0
              ? "Edit Workout Plan"
              : "Add My Own Workout Plan"}
          </button>
          <button
            onClick={() => {
              router.push("/consultation");
            }}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-black px-4 py-3 rounded-lg font-semibold transition-colors text-sm"
          >
            AI Consultation & Evaluation
          </button>
        </div>

        {/* Date Scroll Wheel */}
        <div className="flex overflow-x-auto gap-2 mb-4 py-2 scrollbar-hide">
          {days.map((day) => {
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const formatted = day.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-orange-500 text-black"
                    : "bg-gray-900 text-gray-300 hover:bg-gray-800"
                }`}
              >
                {formatted}
              </button>
            );
          })}
        </div>

        {/* Workout Cards - Grid Layout */}
        {currentDayWorkoutName === "Rest Day" ? (
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center mb-6">
            <p className="text-2xl text-gray-400">Rest Day</p>
            <p className="text-gray-500 mt-2">Take a break and recover!</p>
          </div>
        ) : currentDayExercises.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center mb-6">
            <p className="text-xl text-gray-400 mb-2">No exercises for {currentDayWorkoutName}</p>
            <p className="text-gray-500 text-sm">Add your own workout plan or get an AI consultation to get started!</p>
          </div>
        ) : (
          <main className="grid grid-cols-3 gap-3 mb-6">
            {currentDayExercises.map((ex) => {
            const completedSets = ex.sets.filter(s => s.completed).length;
            const totalSets = ex.sets.length;
            
            return (
              <section
                key={ex.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-3 cursor-pointer transition-transform hover:-translate-y-1"
                onClick={() => setActiveExerciseId(ex.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold mb-1">{ex.name}</h2>
                    <p className="text-xs text-gray-400">
                      {ex.goalSets}×{ex.goalReps}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Progress</div>
                    <div className="text-xs font-semibold text-orange-400">
                      {completedSets}/{totalSets}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
          </main>
        )}

        {/* Strength Progress Section */}
        <section className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <h2 className="text-lg font-semibold mb-4">Strength Progress Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-orange-400">+12%</p>
              <p className="text-sm text-gray-400">Total Volume Increase</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">+5 kg</p>
              <p className="text-sm text-gray-400">Bench Press PB</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">+8%</p>
              <p className="text-sm text-gray-400">Avg Set Volume</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">7 days</p>
              <p className="text-sm text-gray-400">Active Streak</p>
            </div>
          </div>
          <Link
            href="/gym/stats"
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-black px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
            View All Stats & Charts
          </Link>
        </section>

        {/* Footer Summary - Minimal */}
        <footer className="mt-6 flex justify-between items-center border-t border-gray-800 pt-4 mb-20">
          <div>
            <p className="text-gray-400 text-xs">Progress</p>
            <p className="text-base font-bold text-orange-400">{totals.progress}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Volume</p>
            <p className="text-base font-bold text-orange-400">{totals.totalVolume} kg</p>
          </div>
        </footer>

        {/* Custom Workout Plan Modal */}
        {showCustomWorkoutModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
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
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-xl font-bold text-orange-400 mb-4">💪 Push Day</h3>
                  <div className="space-y-3">
                    {customWorkoutPlan.pushDay.length === 0 ? (
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 text-center">
                        <p className="text-gray-400 text-sm mb-3">No exercises added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkoutPlan({
                              ...customWorkoutPlan,
                              pushDay: [{ name: "", sets: 3, reps: 10 }],
                            });
                          }}
                          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      customWorkoutPlan.pushDay.map((exercise, index) => (
                      <div key={index} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
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
                            className="col-span-3 bg-black text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>
                    )}
                  </div>
                </div>

                {/* Pull Day Section */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">🏋️ Pull Day</h3>
                  <div className="space-y-3">
                    {customWorkoutPlan.pullDay.length === 0 ? (
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 text-center">
                        <p className="text-gray-400 text-sm mb-3">No exercises added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkoutPlan({
                              ...customWorkoutPlan,
                              pullDay: [{ name: "", sets: 3, reps: 10 }],
                            });
                          }}
                          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      customWorkoutPlan.pullDay.map((exercise, index) => (
                      <div key={index} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
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
                            className="col-span-3 bg-black text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>
                    )}
                  </div>
                </div>

                {/* Legs Day Section */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-xl font-bold text-green-400 mb-4">🦵 Legs Day</h3>
                  <div className="space-y-3">
                    {customWorkoutPlan.legsDay.length === 0 ? (
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 text-center">
                        <p className="text-gray-400 text-sm mb-3">No exercises added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkoutPlan({
                              ...customWorkoutPlan,
                              legsDay: [{ name: "", sets: 3, reps: 10 }],
                            });
                          }}
                          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      customWorkoutPlan.legsDay.map((exercise, index) => (
                      <div key={index} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
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
                            className="col-span-3 bg-black text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
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
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
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
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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

                    // Save the workout plan (even if some days are empty)
                    setWorkoutPlan({
                      pushDay: pushDayExercises,
                      pullDay: pullDayExercises,
                      legsDay: legsDayExercises,
                    });
                    setShowCustomWorkoutModal(false);
                    setCustomWorkoutPlan({
                      pushDay: [{ name: "", sets: 3, reps: 10 }],
                      pullDay: [{ name: "", sets: 3, reps: 10 }],
                      legsDay: [{ name: "", sets: 3, reps: 10 }],
                    });
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
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
