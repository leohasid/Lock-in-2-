"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { X, Plus, Trash2, MoreVertical, Clock, BarChart3, RefreshCw, ChevronRight, ChevronLeft, Dumbbell, TrendingUp, Target, Zap, Calendar, Activity, Sparkles } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  goalSets: number;
  goalReps: number;
  goalWeight: number;
  imageUrl?: string;
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
  imageUrl?: string;
}

const CircularProgress = ({ percentage, size = 120, color = "#f97316", label }: { percentage: number; size?: number; color?: string; label?: string }) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = isNaN(percentage) || !isFinite(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
  const offset = circumference - (safePercentage / 100) * circumference;

  const percentageTextSize = size >= 120 ? "text-xl" : size >= 90 ? "text-lg" : "text-sm";
  const labelTextSize = size >= 120 ? "text-xs" : "text-[10px]";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90 absolute">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1f2937"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={isNaN(offset) || !isFinite(offset) ? circumference : offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className={`${percentageTextSize} font-bold text-white leading-tight`}>
          {Math.round(safePercentage)}%
        </div>
        {label && (
          <div className={`${labelTextSize} text-gray-400 leading-tight mt-0.5`}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
};

const fallbackPlan: Exercise[] = [
  {
    id: "bench",
    name: "Barbell Bench Press",
    goalSets: 4,
    goalReps: 10,
    goalWeight: 60,
    sets: Array.from({ length: 4 }, () => ({
      reps: 10,
      weight: 60,
      completed: true,
    })),
  },
  {
    id: "squat",
    name: "Back Squat",
    goalSets: 5,
    goalReps: 5,
    goalWeight: 90,
    sets: Array.from({ length: 5 }, () => ({
      reps: 5,
      weight: 90,
      completed: true,
    })),
  },
];

export default function WorkoutPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"workout" | "progress">("workout");
  const [weeklyVolume, setWeeklyVolume] = useState<number[]>(Array(7).fill(0));
  const [totalWorkoutsLogged, setTotalWorkoutsLogged] = useState(0);
  const [activeStreak, setActiveStreak] = useState(0);
  
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
  const [showSchedulePromptModal, setShowSchedulePromptModal] = useState(false);
  const [showManualScheduleModal, setShowManualScheduleModal] = useState(false);
  const [manualSchedule, setManualSchedule] = useState<{
    pushDays: number[];
    pullDays: number[];
    legsDays: number[];
  }>({ pushDays: [1, 4], pullDays: [2, 5], legsDays: [3, 6] }); // Mon,Thu | Tue,Fri | Wed,Sat (0=Sun)
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
  const imageInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Show schedule prompt when redirected from workout save (e.g. from /gym/workouts/[id])
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("schedulePrompt") === "1") {
      setShowSchedulePromptModal(true);
      router.replace("/gym/workout", { scroll: false });
    }
  }, [typeof window !== "undefined" ? window.location.search : ""]);

  // Update selectedDate when URL changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlDateParam = params.get("date");
    if (urlDateParam) {
      try {
        const newDate = new Date(urlDateParam + "T00:00:00");
        if (!isNaN(newDate.getTime())) {
          const currentDateStr = selectedDate.toISOString().split("T")[0];
          const newDateStr = newDate.toISOString().split("T")[0];
          // Only update if date actually changed
          if (currentDateStr !== newDateStr) {
            setSelectedDate(newDate);
          }
        }
      } catch (e) {
        console.error("Error parsing date:", e);
      }
    }
  }, [typeof window !== "undefined" ? window.location.search : ""]);

  // Handle option parameter - separate effect to avoid infinite loop
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const optionParam = params.get("option");
    
    if (optionParam && optionParam !== selectedWorkoutOption) {
      setSelectedWorkoutOption(optionParam);
      setShowWorkoutOptions(false);
      setShowCustomWorkoutModal(true);
      
      // Load the exercises for this option - combine all days into one
      const storedOptions = localStorage.getItem("workoutOptions");
      if (storedOptions) {
        try {
          const options = JSON.parse(storedOptions);
          const option = options.find((o: WorkoutOption) => o.id === optionParam);
          if (option) {
            const convertToCustom = (exercises: any[]): any[] => {
              if (!exercises || exercises.length === 0) return [];
              return exercises.map(ex => ({
                name: ex.name || "",
                sets: ex.goalSets || ex.sets || 3,
                reps: ex.goalReps || ex.reps || 10,
                imageUrl: ex.imageUrl,
              }));
            };
            // Combine all exercises from all three days
            const allExercises = [
              ...convertToCustom(option.days.day1),
              ...convertToCustom(option.days.day2),
              ...convertToCustom(option.days.day3),
            ];
            // Put all exercises into pushDay so they all show up
            setCustomWorkoutPlan({
              pushDay: allExercises.length > 0 ? allExercises : [{ name: "", sets: 3, reps: 10 }],
              pullDay: [],
              legsDay: [],
            });
            
            // Also automatically apply to workoutPlan so they show up on the main page
            if (allExercises.length > 0) {
              const workoutType = getWorkoutTypeForDate(selectedDate);
              if (workoutType) {
                const convertedExercises = allExercises.map((ex: any) => ({
                  id: ex.id || `ex-${Date.now()}-${Math.random()}`,
                  name: ex.name || "",
                  goalSets: ex.goalSets || ex.sets || 3,
                  goalReps: ex.goalReps || ex.reps || 10,
                  goalWeight: ex.goalWeight || 0,
                  imageUrl: ex.imageUrl,
                  sets: ex.sets || Array.from({ length: ex.goalSets || ex.sets || 3 }, () => ({
                    reps: ex.goalReps || ex.reps || 10,
                    weight: ex.goalWeight || 0,
                    completed: false,
                  })),
                }));
                
                setWorkoutPlan((prev) => {
                  const updated = {
                    ...prev,
                    [workoutType]: convertedExercises,
                  };
                  // Save to localStorage
                  if (typeof window !== "undefined") {
                    localStorage.setItem("workoutPlan", JSON.stringify(updated));
                  }
                  return updated;
                });
              }
            }
          }
        } catch (e) {
          console.error("Error loading workout option:", e);
        }
      }
    }
  }, [typeof window !== "undefined" ? window.location.search : "", selectedDate, selectedWorkoutOption]);

  // Load workout plan and schedule
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPlan = localStorage.getItem("workoutPlan");
    if (storedPlan) {
      try {
        const plan = JSON.parse(storedPlan);
        setWorkoutPlan(plan);
        
        // Also check workoutOptions and sync if needed
        const storedOptions = localStorage.getItem("workoutOptions");
        if (storedOptions) {
          try {
            const options = JSON.parse(storedOptions);
            // Find options with exercises and ensure they're in workoutPlan
            options.forEach((option: WorkoutOption) => {
              const allExercises = [
                ...(option.days.day1 || []),
                ...(option.days.day2 || []),
                ...(option.days.day3 || []),
              ];
              if (allExercises.length > 0) {
                // Determine day type from option name
                const optionNameLower = option.name.toLowerCase();
                let targetDayType: "pushDay" | "pullDay" | "legsDay" = "pushDay";
                if (optionNameLower.includes("pull") || optionNameLower.includes("back")) {
                  targetDayType = "pullDay";
                } else if (optionNameLower.includes("leg") || optionNameLower.includes("lower")) {
                  targetDayType = "legsDay";
                }
                
                // If the target day is empty or has fewer exercises, update it
                if (!plan[targetDayType] || plan[targetDayType].length < allExercises.length) {
                  const updatedPlan = {
                    ...plan,
                    [targetDayType]: allExercises,
                  };
                  setWorkoutPlan(updatedPlan);
                  localStorage.setItem("workoutPlan", JSON.stringify(updatedPlan));
                }
              }
            });
          } catch (e) {
            console.error("Error syncing workout options:", e);
          }
        }
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

  // Get current day's exercises - prioritize workoutOptions if available
  const currentDayExercises = useMemo(() => {
    const workoutType = getWorkoutTypeForDate(selectedDate);
    if (!workoutType) return [];
    
    // Load saved exercise images
    let savedImages: Record<string, string> = {};
    if (typeof window !== "undefined") {
      try {
        const storedImages = localStorage.getItem("exerciseImages");
        if (storedImages) {
          savedImages = JSON.parse(storedImages);
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Helper to get image for exercise
    const getImageUrl = (ex: any): string | undefined => {
      return ex.imageUrl || savedImages[ex.name?.toLowerCase()];
    };
    
    // First, check if there's a selected workout option from URL
    if (selectedWorkoutOption && workoutOptions.length > 0) {
      const option = workoutOptions.find((o: WorkoutOption) => o.id === selectedWorkoutOption);
      if (option && option.days.day1.length > 0) {
        // Combine all exercises from the option (they're all in day1 now)
        const allExercises = [
          ...(option.days.day1 || []),
          ...(option.days.day2 || []),
          ...(option.days.day3 || []),
        ];
        // Convert to Exercise format
        return allExercises.map((ex: any) => ({
          id: ex.id || `ex-${Date.now()}-${Math.random()}`,
          name: ex.name || "",
          goalSets: ex.goalSets || ex.sets || 3,
          goalReps: ex.goalReps || ex.reps || 10,
          goalWeight: ex.goalWeight || 0,
          imageUrl: getImageUrl(ex),
          sets: ex.sets || Array.from({ length: ex.goalSets || ex.sets || 3 }, () => ({
            reps: ex.goalReps || ex.reps || 10,
            weight: ex.goalWeight || 0,
            completed: false,
          })),
        }));
      }
    }
    
    // If no option selected, try to find the option that matches current workout type
    // and has exercises
    if (workoutOptions.length > 0 && workoutPlan[workoutType]?.length === 0) {
      // Find the first option that has exercises for this day type
      for (const option of workoutOptions) {
        const allExercises = [
          ...(option.days.day1 || []),
          ...(option.days.day2 || []),
          ...(option.days.day3 || []),
        ];
        if (allExercises.length > 0) {
          // Convert to Exercise format
          return allExercises.map((ex: any) => ({
            id: ex.id || `ex-${Date.now()}-${Math.random()}`,
            name: ex.name || "",
            goalSets: ex.goalSets || ex.sets || 3,
            goalReps: ex.goalReps || ex.reps || 10,
            goalWeight: ex.goalWeight || 0,
            imageUrl: getImageUrl(ex),
            sets: ex.sets || Array.from({ length: ex.goalSets || ex.sets || 3 }, () => ({
              reps: ex.goalReps || ex.reps || 10,
              weight: ex.goalWeight || 0,
              completed: false,
            })),
          }));
        }
      }
    }
    
    // Fall back to workoutPlan
    const exercises = workoutPlan[workoutType] || [];
    return exercises.map((ex: Exercise) => ({
      ...ex,
      imageUrl: ex.imageUrl || savedImages[ex.name?.toLowerCase()],
    }));
  }, [selectedDate, workoutPlan, workoutSchedule, selectedWorkoutOption, workoutOptions]);

  // Get workout name for any date
  const getWorkoutNameForDate = (date: Date): string => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = normalizedDate.toISOString().split("T")[0];
    const scheduledWorkout = workoutSchedule.find((w) => w.date === dateStr);
    if (scheduledWorkout) return scheduledWorkout.workoutName;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayIndex = Math.floor((normalizedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const workoutNames = ["Push Day", "Pull Day", "Legs Day", "Rest Day", "Push Day", "Pull Day", "Legs Day"];
    return workoutNames[((dayIndex % 7) + 7) % 7];
  };

  // Week days for date strip (Mon-Sun of current week)
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  }, [selectedDate]);

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

  const calculateVolumeFromData = (data: any[]) => {
    let volume = 0;
    data.forEach((ex) => {
      ex.sets?.forEach((set: any) => {
        if (set.completed) {
          volume += (Number(set.reps) || 0) * (Number(set.weight) || 0);
        }
      });
    });
    return volume;
  };

  const loadWeeklyStats = () => {
    if (typeof window === "undefined") return;
    const today = new Date();
    const volumes: number[] = [];

    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const dateStr = date.toISOString().split("T")[0];
      const raw = localStorage.getItem(`workout_data_${dateStr}`);
      let volume = 0;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          volume = calculateVolumeFromData(parsed);
        } catch (err) {
          console.error("Error parsing workout data", err);
        }
      }
      volumes.push(volume);
    }

    setWeeklyVolume(volumes);

    const workoutEntries = Object.keys(localStorage).filter((key) =>
      key.startsWith("workout_data_")
    );
    setTotalWorkoutsLogged(workoutEntries.length);

    let streak = 0;
    for (let offset = 0; offset < 30; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const dateStr = date.toISOString().split("T")[0];
      const raw = localStorage.getItem(`workout_data_${dateStr}`);
      const hasVolume = (() => {
        if (!raw) return false;
        try {
          const parsed = JSON.parse(raw);
          return calculateVolumeFromData(parsed) > 0;
        } catch {
          return false;
        }
      })();
      if (hasVolume) {
        streak++;
      } else {
        break;
      }
    }
    setActiveStreak(streak);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    loadWeeklyStats();

    const refresh = () => {
      loadWeeklyStats();
    };

    const interval = setInterval(refresh, 5000);
    window.addEventListener("storage", refresh);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
    loadWeeklyStats(); // Refresh stats after saving
    
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, dayType: "pushDay" | "pullDay" | "legsDay", index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const updated = [...customWorkoutPlan[dayType]];
      updated[index] = { ...updated[index], imageUrl: base64String };
      setCustomWorkoutPlan({ ...customWorkoutPlan, [dayType]: updated });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (dayType: "pushDay" | "pullDay" | "legsDay", index: number) => {
    const updated = [...customWorkoutPlan[dayType]];
    updated[index] = { ...updated[index], imageUrl: undefined };
    setCustomWorkoutPlan({ ...customWorkoutPlan, [dayType]: updated });
  };

  const exercises = useMemo(() => {
    const merged = [
      ...workoutPlan.pushDay,
      ...workoutPlan.pullDay,
      ...workoutPlan.legsDay,
    ];
    return merged.length > 0 ? merged : fallbackPlan;
  }, [workoutPlan]);

  const progressTotals = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    let completedSets = 0;
    exercises.forEach((ex) => {
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
  }, [exercises]);

  const goalVolume = useMemo(() => {
    return exercises.reduce((sum, ex) => {
      return sum + ex.goalSets * ex.goalReps * (ex.goalWeight || 0);
    }, 0);
  }, [exercises]);

  const volumeProgress = goalVolume
    ? Math.min((progressTotals.totalVolume / goalVolume) * 100, 100)
    : 0;

  const weeklyData = weeklyVolume;
  const maxVolume = Math.max(...weeklyData, 1);

  const workoutsThisWeek = weeklyData.filter((value) => value > 0).length;
  const averageSetVolume = progressTotals.totalSets
    ? Math.round(progressTotals.totalVolume / progressTotals.totalSets)
    : 0;

  const heaviestSet = exercises.reduce((max, ex) => {
    const heaviestInExercise = ex.sets.reduce(
      (innerMax, set) => Math.max(innerMax, Number(set.weight) || 0),
      0
    );
    return Math.max(max, heaviestInExercise);
  }, 0);

  const lastWeekAverage =
    weeklyData.length > 1
      ? Math.round(
          weeklyData.slice(0, weeklyData.length - 1).reduce((a, b) => a + b, 0) /
            (weeklyData.length - 1)
        )
      : 0;
  const todayVolume = weeklyData[weeklyData.length - 1] || 0;
  const volumeDelta = lastWeekAverage
    ? Math.round(((todayVolume - lastWeekAverage) / Math.max(lastWeekAverage, 1)) * 100)
    : 0;

  const activeExercise = useMemo(() => {
    if (!activeExerciseId) return null;
    return currentDayExercises.find((ex) => ex.id === activeExerciseId) || null;
  }, [activeExerciseId, currentDayExercises]);

  const totals = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    let completedSets = 0;
    currentDayExercises.forEach((ex) => {
      ex.sets.forEach((s: { reps: number; weight: number; completed: boolean }) => {
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
      <div className="max-w-md mx-auto px-3 py-3">
        {/* Tab Selection Bar - Always visible at the top */}
        <div className="flex gap-2 mb-5 border-b border-teal-500/30 pt-2">
          <button
            onClick={() => setActiveTab("workout")}
            className={`flex-1 px-4 py-2 font-semibold transition-all transform hover:scale-105 ${
              activeTab === "workout"
                ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent"
                : "text-gray-400 hover:text-teal-300"
            }`}
          >
            My Workout
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`flex-1 px-4 py-2 font-semibold transition-all transform hover:scale-105 ${
              activeTab === "progress"
                ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent"
                : "text-gray-400 hover:text-teal-300"
            }`}
          >
            Progress
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === "progress" ? (
          <div className="space-y-4 pb-20">
            {/* Main Progress Circles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <h3 className="text-sm font-semibold mb-2">Workout Completion</h3>
                <div className="flex justify-center mb-2">
                  <CircularProgress percentage={progressTotals.progress} size={100} color="#f97316" />
                </div>
                <p className="text-gray-400 text-xs">
                  {progressTotals.completedSets} / {progressTotals.totalSets} sets
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <h3 className="text-sm font-semibold mb-2">Volume Progress</h3>
                <div className="flex justify-center mb-2">
                  <CircularProgress percentage={volumeProgress} size={100} color="#22c55e" />
                </div>
                <p className="text-gray-400 text-xs">
                  {progressTotals.totalVolume} kg
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Volume Delta */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${volumeDelta >= 0 ? "text-green-400" : "text-red-400"}`} />
                <p className={`text-lg font-bold ${volumeDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {volumeDelta >= 0 ? "+" : ""}
                  {volumeDelta}%
                </p>
                <p className="text-[10px] text-gray-400">Volume change</p>
              </div>

              {/* Heaviest Set */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-400">{heaviestSet} kg</p>
                <p className="text-[10px] text-gray-400">Heaviest set</p>
              </div>

              {/* Average Set Volume */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <Activity className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-yellow-400">
                  {averageSetVolume} kg
                </p>
                <p className="text-[10px] text-gray-400">Avg set volume</p>
              </div>

              {/* Active Streak */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1">
                  <CircularProgress
                    percentage={Math.min((activeStreak / 7) * 100, 100)}
                    size={70}
                    color="#22c55e"
                  />
                </div>
                <p className="text-base font-bold text-green-400 mt-1">{activeStreak} days</p>
                <p className="text-[10px] text-gray-400">Active streak</p>
              </div>
            </div>

            {/* Weekly Volume Chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" />
                Weekly Volume Trend
              </h2>
              <div className="flex items-end justify-between h-24 gap-1.5">
                {weeklyData.map((value, i) => {
                  const heightPercent = (value / maxVolume) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-800 rounded-t relative" style={{ height: "70px" }}>
                        <div
                          className="w-full bg-orange-500 rounded-t absolute bottom-0 transition-all duration-500"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {i === weeklyData.length - 1 ? "Today" : `D${i + 1}`}
                      </span>
                      <span className="text-[9px] text-gray-500">{value}kg</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Exercise Progress - Compact */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold mb-3">Exercise Progress</h2>
              <div className="space-y-2.5">
                {exercises.slice(0, 3).map((ex) => {
                  const completedSets = ex.sets.filter(s => s.completed).length;
                  const progress = (completedSets / ex.goalSets) * 100;
                  return (
                    <div key={ex.id} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">{ex.name}</h3>
                        <span className="text-xs text-gray-400">
                          {completedSets} / {ex.goalSets}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CircularProgress percentage={progress} size={70} color="#f97316" />
                        <div className="flex-1">
                          <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {ex.goalSets}×{ex.goalReps} @ {ex.goalWeight}kg
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Stats - Compact */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <TrendingUp className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{workoutsThisWeek}</p>
                <p className="text-[10px] text-gray-400">This Week</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <Target className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{totalWorkoutsLogged}</p>
                <p className="text-[10px] text-gray-400">Total</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <Calendar className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{activeStreak}</p>
                <p className="text-[10px] text-gray-400">Streak</p>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="flex items-center justify-end mb-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                alert("AI Coach feature coming soon!");
              }}
              className="px-2 py-1 bg-gradient-to-b from-[#0c1422] to-black border border-white/10 text-white rounded-lg text-[10px] font-medium hover:bg-[rgba(20,30,35,1)] transition-colors"
            >
              AI Coach
            </button>
            <Link
              href="/gym/workouts"
              className="px-2 py-1 bg-gradient-to-b from-[#0c1422] to-black border border-white/10 text-white rounded-lg text-[10px] font-medium hover:bg-[rgba(20,30,35,1)] transition-colors"
            >
              View Workout
            </Link>
          </div>
        </div>

        {/* Week Date Strip - shows workout per day */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setShowManualScheduleModal(true)}
            className="p-1 text-gray-400 hover:text-teal-400 shrink-0"
            title="Edit schedule"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              const prev = new Date(selectedDate);
              prev.setDate(prev.getDate() - 7);
              setSelectedDate(prev);
              const dateStr = prev.toISOString().split("T")[0];
              router.push(`/gym/workout?date=${dateStr}`);
            }}
            className="p-1 text-gray-400 hover:text-white shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-1.5 flex-1 min-w-0 justify-between">
            {weekDays.map((day) => {
              const dateStr = day.toISOString().split("T")[0];
              const workoutName = getWorkoutNameForDate(day);
              const isSelected = selectedDate.toISOString().split("T")[0] === dateStr;
              const isToday =
                new Date().toISOString().split("T")[0] === dateStr;
              const dayLabel = ["M", "T", "W", "T", "F", "S", "S"][day.getDay() === 0 ? 6 : day.getDay() - 1];
              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(day);
                    router.push(`/gym/workout?date=${dateStr}`);
                  }}
                  className={`flex flex-col items-center py-2 px-2 rounded-lg min-w-[44px] transition-colors ${
                    isSelected
                      ? "bg-teal-500/30 border border-teal-400/50"
                      : "bg-white/5 border border-transparent hover:bg-white/10"
                  }`}
                >
                  <span className={`text-[10px] font-medium ${isToday ? "text-teal-400" : "text-gray-400"}`}>
                    {dayLabel}
                  </span>
                  <span className="text-[9px] text-gray-500 mt-0.5">{day.getDate()}</span>
                  <span className="text-[8px] text-gray-500 mt-1 truncate w-full text-center" title={workoutName}>
                    {workoutName.replace(" Day", "")}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              const next = new Date(selectedDate);
              next.setDate(next.getDate() + 7);
              setSelectedDate(next);
              const dateStr = next.toISOString().split("T")[0];
              router.push(`/gym/workout?date=${dateStr}`);
            }}
            className="p-1 text-gray-400 hover:text-white shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
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
          <div className="space-y-2">
            {/* Workout day name header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white">{currentDayWorkoutName}</h2>
              <button className="text-cyan-400 hover:text-cyan-300">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Exercise List - 2 column grid */}
            <div className="grid grid-cols-2 gap-2">
              {currentDayExercises.map((ex) => {
                const completedSets = ex.sets.filter((s: { reps: number; weight: number; completed: boolean }) => s.completed).length;
                const totalSets = ex.sets.length;
                const firstSet = ex.sets[0];
                const weightDisplay = firstSet?.weight || ex.goalWeight || 0;
                
                return (
                  <div
                    key={ex.id}
                    onClick={() => setActiveExerciseId(ex.id)}
                    className="bg-black/40 border border-white/10 rounded-lg p-2 cursor-pointer hover:bg-black/60 transition-colors"
                  >
                    {/* Exercise thumbnail */}
                    <div className="w-full h-20 bg-gray-800 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                      {ex.imageUrl ? (
                        <img 
                          src={ex.imageUrl} 
                          alt={ex.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Dumbbell className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    
                    {/* Exercise info */}
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-white mb-1 truncate">{ex.name}</h3>
                      <p className="text-[10px] text-gray-400">
                        {totalSets} sets • {ex.goalReps} reps
                      </p>
                      {weightDisplay > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {weightDisplay} lb
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
              {/* Exercise image */}
              <div className="w-full h-48 bg-gray-900 flex items-center justify-center relative overflow-hidden">
                {activeExercise.imageUrl ? (
                  <img 
                    src={activeExercise.imageUrl} 
                    alt={activeExercise.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Dumbbell className="w-20 h-20 text-gray-700" />
                )}
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
                  {activeExercise.sets.map((set: { reps: number; weight: number; completed: boolean }, setIndex: number) => {
                    const isCompleted = set.completed;
                    const isActive = !isCompleted && setIndex === activeExercise.sets.findIndex((s: { reps: number; weight: number; completed: boolean }) => !s.completed);
                    
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
                          // Load the exercises for this option - combine all days into one
                          const convertToCustom = (exercises: Exercise[]): any[] => {
                            if (!exercises || exercises.length === 0) return [];
                            return exercises.map(ex => ({
                              name: ex.name,
                              sets: ex.goalSets,
                              reps: ex.goalReps,
                              imageUrl: ex.imageUrl,
                            }));
                          };
                          // Combine all exercises from all three days
                          const allExercises = [
                            ...convertToCustom(option.days.day1),
                            ...convertToCustom(option.days.day2),
                            ...convertToCustom(option.days.day3),
                          ];
                          // Put all exercises into pushDay so they all show up
                          setCustomWorkoutPlan({
                            pushDay: allExercises.length > 0 ? allExercises : [{ name: "", sets: 3, reps: 10 }],
                            pullDay: [],
                            legsDay: [],
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
                  <span>← Back to Options</span>
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
              
                {/* Buttons - only show when editing workout plan */}
                <div className="flex gap-4 mt-6">
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
                      if (!selectedWorkoutOption) return;
                      
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
                            imageUrl: ex.imageUrl,
                            sets: Array.from({ length: ex.sets }, () => ({
                              reps: ex.reps,
                              weight: 0,
                              completed: false,
                            })),
                          }));
                      };

                      const day1Exercises = convertExercises(customWorkoutPlan.pushDay);
                      const day2Exercises = convertExercises(customWorkoutPlan.pullDay);
                      const day3Exercises = convertExercises(customWorkoutPlan.legsDay);

                      // Update the selected workout option
                      const updatedOptions = workoutOptions.map(opt => 
                        opt.id === selectedWorkoutOption
                          ? {
                              ...opt,
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
                      setWorkoutPlan(newPlan);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("workoutPlan", JSON.stringify(newPlan));
                      }
                      
                      setShowCustomWorkoutModal(false);
                      setShowWorkoutOptions(true);
                      setSelectedWorkoutOption(null);
                      setCustomWorkoutPlan({
                        pushDay: [{ name: "", sets: 3, reps: 10 }],
                        pullDay: [{ name: "", sets: 3, reps: 10 }],
                        legsDay: [{ name: "", sets: 3, reps: 10 }],
                      });
                      setShowSchedulePromptModal(true);
                    }}
                    className="flex-1 bg-teal-400 hover:bg-teal-500 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Save Workout Plan
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Prompt Modal - after saving workout */}
        {showSchedulePromptModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-sm w-full border border-white/10">
              <h2 className="text-xl font-bold text-white mb-2">Schedule your workouts?</h2>
              <p className="text-gray-400 text-sm mb-4">
                Do you want to schedule your workouts? Speak to the AI Coach or manually select what days you want to train.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowSchedulePromptModal(false);
                    alert("AI Coach feature coming soon!");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-teal-500/20 border border-teal-400/50 text-teal-400 rounded-xl font-semibold hover:bg-teal-500/30 transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Speak to AI Coach
                </button>
                <button
                  onClick={() => {
                    setShowSchedulePromptModal(false);
                    setShowManualScheduleModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/15 transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                  Manually select days
                </button>
                <button
                  onClick={() => setShowSchedulePromptModal(false)}
                  className="w-full py-3 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Schedule Modal */}
        {showManualScheduleModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto border border-white/10">
              <h2 className="text-xl font-bold text-white mb-2">Select training days</h2>
              <p className="text-gray-400 text-sm mb-4">
                Choose which days you want to do each workout.
              </p>
              <div className="space-y-4">
                {[
                  { key: "pushDays" as const, label: "Push Day", color: "teal" },
                  { key: "pullDays" as const, label: "Pull Day", color: "cyan" },
                  { key: "legsDays" as const, label: "Legs Day", color: "orange" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-sm font-medium text-white mb-2">{label}</p>
                    <div className="flex flex-wrap gap-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => {
                        const isSelected = manualSchedule[key].includes(i);
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setManualSchedule((prev) => ({
                                ...prev,
                                [key]: isSelected
                                  ? prev[key].filter((d) => d !== i)
                                  : [...prev[key], i].sort((a, b) => a - b),
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-teal-500/30 border border-teal-400/50 text-teal-300"
                                : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowManualScheduleModal(false)}
                  className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl font-semibold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const newSchedule: WorkoutSchedule[] = [];
                    for (let i = 0; i < 28; i++) {
                      const d = new Date(today);
                      d.setDate(today.getDate() + i);
                      const dateStr = d.toISOString().split("T")[0];
                      const dayOfWeek = d.getDay();
                      let workoutName = "Rest Day";
                      if (manualSchedule.pushDays.includes(dayOfWeek)) workoutName = "Push Day";
                      else if (manualSchedule.pullDays.includes(dayOfWeek)) workoutName = "Pull Day";
                      else if (manualSchedule.legsDays.includes(dayOfWeek)) workoutName = "Legs Day";
                      newSchedule.push({ date: dateStr, workoutName, completed: false });
                    }
                    const existingByDate = new Map(workoutSchedule.map((w) => [w.date, w]));
                    newSchedule.forEach((entry) => {
                      const existing = existingByDate.get(entry.date);
                      existingByDate.set(entry.date, { ...entry, completed: existing?.completed ?? false });
                    });
                    const merged = Array.from(existingByDate.values()).sort(
                      (a, b) => a.date.localeCompare(b.date)
                    );
                    setWorkoutSchedule(merged);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("workoutSchedule", JSON.stringify(merged));
                    }
                    setShowManualScheduleModal(false);
                  }}
                  className="flex-1 py-3 bg-teal-400 hover:bg-teal-500 text-black rounded-xl font-semibold transition-colors"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

