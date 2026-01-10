"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Dumbbell, Save, TrendingUp, AlertCircle, X, Plus, Trash2 } from "lucide-react";
import { requestNotificationPermission, registerServiceWorker, showWorkoutReminder } from "@/app/utils/notifications";

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

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  notes?: string;
}

export default function GymPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Normalize today to start of day for consistent comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanByDay>({
    pushDay: [],
    pullDay: [],
    legsDay: [],
  });
  const [workoutSchedule, setWorkoutSchedule] = useState<WorkoutSchedule[]>([]);
  const [showMissedWorkoutAlert, setShowMissedWorkoutAlert] = useState(false);
  const [missedWorkoutDate, setMissedWorkoutDate] = useState<string | null>(null);
  const [showCustomWorkoutModal, setShowCustomWorkoutModal] = useState(false);
  const [customWorkoutPlan, setCustomWorkoutPlan] = useState<CustomWorkoutPlan>({
    pushDay: [{ name: "", sets: 3, reps: 10 }],
    pullDay: [{ name: "", sets: 3, reps: 10 }],
    legsDay: [{ name: "", sets: 3, reps: 10 }],
  });
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState({ weight: "", bodyFat: "", notes: "" });
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1M" | "3M" | "1Y">("1Y");

  const [isLoaded, setIsLoaded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [notificationShown, setNotificationShown] = useState(false);

  // Register service worker and request notification permission on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const setupNotifications = async () => {
      // Register service worker
      await registerServiceWorker();
      
      // Request notification permission
      await requestNotificationPermission();
      setNotificationPermission(Notification.permission);
    };

    setupNotifications();
    
    // Update permission status if it changes
    const checkPermission = () => {
      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
    };
    
    // Check permission periodically
    const interval = setInterval(checkPermission, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Load weight entries from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("weightEntries");
    if (stored) {
      try {
        setWeightEntries(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading weight entries:", e);
      }
    }
  }, []);

  // Save weight entries to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    localStorage.setItem("weightEntries", JSON.stringify(weightEntries));
  }, [weightEntries, isLoaded]);

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
        setNotificationShown(false); // Reset notification flag for next day
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
        
        // Show push notification if permission is granted and we haven't shown it yet today
        if (notificationPermission === "granted" && !notificationShown) {
          showWorkoutReminder(scheduledWorkout.workoutName).catch(err => {
            console.error("Failed to show notification:", err);
          });
          setNotificationShown(true);
        }
      } else {
        // No workout scheduled, rest day, no exercises, completed, or doesn't exist - hide alert
        setShowMissedWorkoutAlert(false);
        setMissedWorkoutDate(null);
        // Reset notification flag when workout is completed or outside window
        if (workoutStatus === "completed" || hasCompletedExercises(todayStr)) {
          setNotificationShown(false);
        }
      }
    };

    // Check immediately
    checkMissedWorkout();

    // Set up interval to check every minute during the alert window
    const interval = setInterval(checkMissedWorkout, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [workoutScheduleKey, workoutPlan.pushDay.length, workoutPlan.pullDay.length, workoutPlan.legsDay.length]);


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
          setNotificationShown(false); // Reset notification flag
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

  // Calculate weight progress
  // Sort weight entries by date
  const sortedWeightEntries = useMemo(() => {
    return [...weightEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weightEntries]);

  const latestWeight = sortedWeightEntries.length > 0 ? sortedWeightEntries[sortedWeightEntries.length - 1].weight : null;
  
  // Calculate weight change from one year ago (or oldest entry if less than a year)
  const weightChange = useMemo(() => {
    if (!latestWeight || sortedWeightEntries.length === 0) return null;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split("T")[0];
    
    // Find the oldest entry or entry from one year ago
    const oldestEntry = sortedWeightEntries[0];
    const oneYearAgoEntry = sortedWeightEntries.find(e => e.date <= oneYearAgoStr);
    const referenceEntry = oneYearAgoEntry || oldestEntry;
    
    if (referenceEntry && referenceEntry.weight) {
      return latestWeight - referenceEntry.weight;
    }
    return null;
  }, [latestWeight, sortedWeightEntries]);

  // Calculate average weight
  const averageWeight = useMemo(() => {
    if (sortedWeightEntries.length === 0) return null;
    const sum = sortedWeightEntries.reduce((acc, entry) => acc + entry.weight, 0);
    return sum / sortedWeightEntries.length;
  }, [sortedWeightEntries]);

  // Calculate BMI (if height is available from onboarding)
  const bmi = useMemo(() => {
    if (!latestWeight) return null;
    if (typeof window === "undefined") return null;
    const onboardingData = localStorage.getItem("onboardingData");
    if (!onboardingData) return null;
    try {
      const data = JSON.parse(onboardingData);
      const heightInMeters = data.height ? data.height / 100 : null;
      if (!heightInMeters) return null;
      const bmiValue = latestWeight / (heightInMeters * heightInMeters);
      return bmiValue;
    } catch {
      return null;
    }
  }, [latestWeight]);

  const handleAddWeight = () => {
    if (!newWeight.weight) return;
    const entry: WeightEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      weight: parseFloat(newWeight.weight),
      bodyFat: newWeight.bodyFat ? parseFloat(newWeight.bodyFat) : undefined,
      notes: newWeight.notes || undefined,
    };
    setWeightEntries([...weightEntries, entry]);
    setNewWeight({ weight: "", bodyFat: "", notes: "" });
    setShowWeightModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white px-4 pt-4 pb-28">
      <div className="max-w-md mx-auto">
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
                  className="bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Skip for Now
                </button>
                <button
                  onClick={handleReschedulePlan}
                  className="bg-teal-400 hover:bg-teal-500 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
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


        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center justify-end mb-2">
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/consultation")}
                className="px-3 py-1.5 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black rounded-lg text-xs font-bold transition-all shadow-lg shadow-teal-500/30"
              >
                Fitness AI
              </button>
            </div>
          </div>
        </div>

        {/* Workout Header - Image Style */}
        {currentDayWorkoutName !== "Rest Day" && (
          <div className="mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
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
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${totals.progress}%` }}
                />
              </div>
              <span className="text-green-400 font-bold text-xs min-w-[3rem] text-right">{totals.progress}% {totals.totalVolume} kg</span>
            </div>
            {currentDayExercises.length > 0 && (
              <Link
                href={`/gym/workout?date=${selectedDate.toISOString().split("T")[0]}`}
                className="block w-full"
              >
                <button className="w-full px-4 py-3 bg-gradient-to-r from-teal-400 to-cyan-500 text-black rounded-lg text-sm font-bold hover:from-teal-500 hover:to-cyan-600 transition-all shadow-lg shadow-teal-500/30">
                  Start Workout
                </button>
              </Link>
            )}
          </div>
        )}


        {/* Weight Tracking Section - Image Style */}
        <div className="mb-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Body Weight</h3>
            <div className="flex gap-1">
              {(["1M", "3M", "1Y"] as const).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    selectedTimeframe === timeframe
                      ? "bg-teal-400 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>
          {latestWeight ? (
            <>
              <div className="mb-3">
                <p className="text-2xl font-bold text-white mb-1">{latestWeight} kg</p>
                {weightChange !== null && (
                  <p className={`text-sm ${weightChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)} kg last year
                  </p>
                )}
              </div>
              {sortedWeightEntries.length > 1 && (() => {
                const displayEntries = sortedWeightEntries.slice(-10);
                const sortedEntries = [...displayEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const minWeight = Math.min(...sortedEntries.map(e => e.weight));
                const maxWeight = Math.max(...sortedEntries.map(e => e.weight));
                const range = maxWeight - minWeight || 1;
                const padding = 10;
                const chartWidth = 300;
                const chartHeight = 100;
                const graphHeight = chartHeight - padding * 2;
                const graphWidth = chartWidth - padding * 2;
                
                // Generate points for the line
                const points = sortedEntries.map((entry, idx) => {
                  const x = padding + (idx / Math.max(sortedEntries.length - 1, 1)) * graphWidth;
                  const y = padding + graphHeight - ((entry.weight - minWeight) / range) * graphHeight;
                  return { x, y, weight: entry.weight, date: entry.date };
                });
                
                // Generate area polygon points
                const areaPoints = `M${padding},${padding + graphHeight} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${padding + graphWidth},${padding + graphHeight} Z`;
                
                // Generate line path
                const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                
                // Calculate Y-axis labels
                const yStep = range / 3;
                const yLabels = [
                  Math.round(maxWeight),
                  Math.round(maxWeight - yStep),
                  Math.round(minWeight)
                ];
                
                // Generate X-axis labels (first, middle, last dates)
                const xLabels = [];
                if (sortedEntries.length > 0) {
                  xLabels.push(new Date(sortedEntries[0].date));
                  if (sortedEntries.length > 2) {
                    xLabels.push(new Date(sortedEntries[Math.floor(sortedEntries.length / 2)].date));
                  }
                  xLabels.push(new Date(sortedEntries[sortedEntries.length - 1].date));
                }
                
                return (
                  <div className="h-32 relative mt-2">
                    <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="weightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      
                      {/* Grid lines */}
                      {[0, 1, 2].map((i) => {
                        const y = padding + (i / 2) * graphHeight;
                        return (
                          <line
                            key={i}
                            x1={padding}
                            y1={y}
                            x2={padding + graphWidth}
                            y2={y}
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="1"
                          />
                        );
                      })}
                      
                      {/* Area under curve */}
                      <path
                        d={areaPoints}
                        fill="url(#weightGradient)"
                      />
                      
                      {/* Graph line */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#14b8a6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#glow)"
                      />
                      
                      {/* Data points */}
                      {points.map((point, idx) => (
                        <g key={idx}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="3"
                            fill="#14b8a6"
                            stroke="#0c1422"
                            strokeWidth="1.5"
                            className="drop-shadow-lg"
                          />
                        </g>
                      ))}
                    </svg>
                    
                    {/* X-axis labels */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-gray-500 px-2 pb-1">
                      {xLabels.map((date, idx) => (
                        <span key={idx}>
                          {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      ))}
                    </div>
                    
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[9px] text-gray-500 py-2 pl-1">
                      {yLabels.map((label, idx) => (
                        <span key={idx}>{label}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Statistics Row */}
              {sortedWeightEntries.length > 1 && (
                <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    <span className="text-gray-400">Avg: <span className="text-white font-semibold">{averageWeight?.toFixed(1)} kg</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className={`w-4 h-4 ${weightChange && weightChange >= 0 ? 'text-red-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className={`${weightChange && weightChange >= 0 ? 'text-red-400' : 'text-red-400'}`}>
                      Change: <span className="font-semibold">{weightChange !== null ? (weightChange >= 0 ? '+' : '') + weightChange.toFixed(1) : '0.0'} kg</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className={`w-4 h-4 ${bmi && bmi >= 18.5 && bmi <= 24.9 ? 'text-green-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-400">
                      BMI: <span className="text-white font-semibold">{bmi?.toFixed(1) || 'N/A'} {bmi && bmi >= 18.5 && bmi <= 24.9 ? 'Normal' : bmi && bmi < 18.5 ? 'Underweight' : bmi && bmi > 24.9 ? 'Overweight' : ''}</span>
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">No weight entries yet</p>
          )}
          <button
            onClick={() => setShowWeightModal(true)}
            className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black rounded-lg text-xs font-bold transition-all shadow-lg shadow-teal-500/30"
          >
            Log Weight
          </button>
        </div>

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
                  className="flex-1 bg-teal-400 hover:bg-teal-500 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Save Workout Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Weight Entry Modal */}
        {showWeightModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-5 max-w-md w-full border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add Weight Entry</h2>
                <button
                  onClick={() => {
                    setShowWeightModal(false);
                    setNewWeight({ weight: "", bodyFat: "", notes: "" });
                  }}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
      </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Weight (kg)</label>
                  <input
                    type="number"
                    value={newWeight.weight}
                    onChange={(e) => setNewWeight({ ...newWeight, weight: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-teal-400"
                    placeholder="70.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Body Fat % (optional)</label>
                  <input
                    type="number"
                    value={newWeight.bodyFat}
                    onChange={(e) => setNewWeight({ ...newWeight, bodyFat: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-teal-400"
                    placeholder="15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
                  <textarea
                    value={newWeight.notes}
                    onChange={(e) => setNewWeight({ ...newWeight, notes: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-teal-400 resize-none"
                    rows={2}
                    placeholder="Morning weight, after workout, etc."
                  />
                </div>
                <button
                  onClick={handleAddWeight}
                  className="w-full py-2.5 bg-teal-400 text-black rounded-lg font-semibold hover:bg-teal-500 transition-colors text-sm"
                >
                  Add Entry
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

// Muscle Recovery Component
function MuscleRecoveryView({ 
  workoutSchedule, 
  workoutPlan 
}: { 
  workoutSchedule: WorkoutSchedule[]; 
  workoutPlan: WorkoutPlanByDay;
}) {
  // Map workout types to muscle groups
  const workoutToMuscles: Record<string, string[]> = {
    "Push Day": ["Chest", "Shoulders", "Triceps", "Abs"],
    "Pull Day": ["Upper Back", "Lower Back", "Shoulders", "Triceps"],
    "Legs Day": ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
  };

  // Get muscle recovery status
  const getMuscleRecoveryStatus = useMemo(() => {
    const muscleStatus: Record<string, { lastTrained: Date | null; status: "ready" | "recovering"; hoursLeft?: number; daysLeft?: number }> = {
      "Chest": { lastTrained: null, status: "ready" },
      "Shoulders": { lastTrained: null, status: "ready" },
      "Triceps": { lastTrained: null, status: "ready" },
      "Upper Back": { lastTrained: null, status: "ready" },
      "Lower Back": { lastTrained: null, status: "ready" },
      "Biceps": { lastTrained: null, status: "ready" },
      "Abs": { lastTrained: null, status: "ready" },
      "Quadriceps": { lastTrained: null, status: "ready" },
      "Hamstrings": { lastTrained: null, status: "ready" },
      "Glutes": { lastTrained: null, status: "ready" },
      "Calves": { lastTrained: null, status: "ready" },
    };

    const now = new Date();
    const recoveryTimeHours = 48; // 48 hours recovery time

    // Check completed workouts from schedule
    workoutSchedule.forEach((workout) => {
      if (workout.completed && workout.workoutName !== "Rest Day") {
        const workoutDate = new Date(workout.date);
        const muscles = workoutToMuscles[workout.workoutName] || [];
        
        muscles.forEach((muscle) => {
          if (muscleStatus[muscle]) {
            const hoursSinceWorkout = (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60);
            
            // If this muscle was trained more recently, update it
            if (!muscleStatus[muscle].lastTrained || 
                workoutDate > (muscleStatus[muscle].lastTrained || new Date(0))) {
              muscleStatus[muscle].lastTrained = workoutDate;
              
              if (hoursSinceWorkout < recoveryTimeHours) {
                const hoursRemaining = recoveryTimeHours - hoursSinceWorkout;
                const daysRemaining = Math.floor(hoursRemaining / 24);
                const hoursLeft = Math.ceil(hoursRemaining % 24);
                
                muscleStatus[muscle].status = "recovering";
                muscleStatus[muscle].hoursLeft = hoursLeft;
                muscleStatus[muscle].daysLeft = daysRemaining;
              } else {
                muscleStatus[muscle].status = "ready";
              }
            }
          }
        });
      }
    });

    return muscleStatus;
  }, [workoutSchedule]);

  const recoveringMuscles = Object.entries(getMuscleRecoveryStatus)
    .filter(([_, status]) => status.status === "recovering")
    .sort((a, b) => (a[1].hoursLeft || 0) - (b[1].hoursLeft || 0));

  const readyMuscles = Object.entries(getMuscleRecoveryStatus)
    .filter(([_, status]) => status.status === "ready")
    .sort();

  // Muscle paths from provided design - exact paths
  const getMuscleColor = (muscleId: string, isRecovering: boolean) => {
    if (isRecovering) return "#FF4D4F";
    return "#2F80FF";
  };

  const musclePaths: Record<string, { front?: string; back?: string }> = {
    chest: {
      front: "M90 80 C60 130,60 200,150 210 C240 200,240 130,210 80 Z"
    },
    abs: {
      front: "M120 210 L180 210 L190 360 L110 360 Z"
    },
    delts_left: {
      front: "M40 90 C10 120,10 160,50 190 C80 170,80 120,70 90 Z"
    },
    delts_right: {
      front: "M260 90 C290 120,290 160,250 190 C220 170,220 120,230 90 Z"
    },
    biceps_left: {
      front: "M50 190 C30 260,40 330,70 350 C100 330,95 250,80 190 Z"
    },
    biceps_right: {
      front: "M250 190 C270 260,260 330,230 350 C200 330,205 250,220 190 Z"
    },
    quads_left: {
      front: "M120 360 C90 470,100 620,140 650 C180 620,180 470,160 360 Z"
    },
    quads_right: {
      front: "M160 360 C180 470,180 620,220 650 C260 620,250 470,200 360 Z"
    },
    traps: {
      back: "M90 60 C50 110,50 160,150 170 C250 160,250 110,210 60 Z"
    },
    lats: {
      back: "M60 170 C30 280,60 380,150 390 C240 380,270 280,240 170 Z"
    },
    glutes: {
      back: "M100 390 C60 440,80 520,150 520 C220 520,240 440,200 390 Z"
    },
    hamstrings_left: {
      back: "M110 520 C90 620,100 720,130 760 C160 720,160 620,140 520 Z"
    },
    hamstrings_right: {
      back: "M160 520 C180 620,180 720,210 760 C240 720,230 620,190 520 Z"
    },
  };

  const muscleToIdMap: Record<string, string[]> = {
    "Chest": ["chest"],
    "Shoulders": ["delts_left", "delts_right"],
    "Biceps": ["biceps_left", "biceps_right"],
    "Triceps": ["triceps_left", "triceps_right"],
    "Upper Back": ["traps"],
    "Lower Back": ["lats"],
    "Abs": ["abs"],
    "Quadriceps": ["quads_left", "quads_right"],
    "Hamstrings": ["hamstrings_left", "hamstrings_right"],
    "Glutes": ["glutes"],
    "Calves": ["calves_left", "calves_right"],
  };

  return (
    <div className="space-y-6">
      {/* Body Diagrams - Matching the exact shape provided */}
      <div className="flex gap-6 justify-center flex-wrap">
        {/* BACK (LEFT) */}
        <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 text-center">Back View</h3>
          <svg viewBox="0 0 300 800" width="200" className="mx-auto">
            {/* Back view - using provided design paths with transform */}
            <g transform="translate(0,0)">
            
              {/* Show ALL muscles - back view with colors based on recovery status */}
              {Object.entries(getMuscleRecoveryStatus).map(([muscle, status]) => {
                const muscleIds = muscleToIdMap[muscle] || [];
                const isRecovering = status.status === "recovering";
                return muscleIds.map((muscleId) => {
                  const path = musclePaths[muscleId]?.back;
                  if (path) {
                    return (
                      <path
                        key={`back-${muscleId}`}
                        id={muscleId}
                        d={path}
                        fill={getMuscleColor(muscleId, isRecovering)}
                        stroke="none"
                        strokeLinejoin="round"
                      />
                    );
                  }
                  return null;
                });
              })}
            </g>
          </svg>
        </div>

        {/* FRONT (RIGHT) */}
        <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 text-center">Front View</h3>
          <svg viewBox="0 0 300 800" width="200" className="mx-auto">
            {/* Front view - using provided design paths with transform */}
            <g transform="translate(0,0)">
            
              {/* Show ALL muscles - front view with colors based on recovery status */}
              {Object.entries(getMuscleRecoveryStatus).map(([muscle, status]) => {
                const muscleIds = muscleToIdMap[muscle] || [];
                const isRecovering = status.status === "recovering";
                return muscleIds.map((muscleId) => {
                  const path = musclePaths[muscleId]?.front;
                  if (path) {
                    return (
                      <path
                        key={`front-${muscleId}`}
                        id={muscleId}
                        d={path}
                        fill={getMuscleColor(muscleId, isRecovering)}
                        stroke="none"
                        strokeLinejoin="round"
                      />
                    );
                  }
                  return null;
                });
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Needs Recovery Section */}
      {recoveringMuscles.length > 0 && (
        <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <h3 className="text-base font-semibold text-white">Needs Recovery</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {recoveringMuscles.map(([muscle, status]) => (
              <button
                key={muscle}
                className="text-left p-2.5 bg-red-900/40 border border-red-800/50 rounded-lg hover:bg-red-900/50 transition-colors flex flex-col"
              >
                <span className="text-white font-medium text-xs">{muscle}</span>
                <span className="text-red-300 text-[10px] mt-1">
                  {status.daysLeft && status.daysLeft > 0 
                    ? `${status.daysLeft}d ${status.hoursLeft || 0}h`
                    : status.hoursLeft 
                    ? `${status.hoursLeft}h`
                    : "Recovering"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ready to Train Muscles List */}
      {readyMuscles.length > 0 && (
        <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h3 className="text-base font-semibold text-white">Ready to Train</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {readyMuscles.map(([muscle, _]) => (
              <button
                key={muscle}
                className="text-left p-2.5 bg-green-900/40 border border-green-800/50 rounded-lg hover:bg-green-900/50 transition-colors"
              >
                <span className="text-white font-medium text-xs">{muscle}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No recovering muscles message */}
      {recoveringMuscles.length === 0 && readyMuscles.length > 0 && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">All muscles are recovered and ready to train! 💪</p>
        </div>
      )}
    </div>
  );
}
