"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { getBuiltInImageUrl, getExerciseImagePosition } from "@/lib/built-in-exercise-images";
import { X, Plus, Trash2, MoreVertical, Clock, BarChart3, RefreshCw, ChevronRight, ChevronLeft, Dumbbell, TrendingUp, Target, Zap, Calendar, Activity, Sparkles, Play } from "lucide-react";
import GuidedWorkoutView from "@/components/GuidedWorkoutView";
import ExerciseNameInput from "@/components/ExerciseNameInput";
import { scheduleWorkoutNotification } from "@/app/utils/notifications";
import { toLocalDateString } from "@/lib/date-utils";

interface Exercise {
  id: string;
  name: string;
  goalSets: number;
  goalReps: number;
  goalWeight: number;
  imageUrl?: string;
  restSeconds?: number;
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
  optionId?: string;
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

export default function WorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshParam = searchParams.get("refresh");
  const [activeTab, setActiveTab] = useState<"workout" | "progress">("workout");
  const [weeklyVolume, setWeeklyVolume] = useState<number[]>(Array(7).fill(0));
  const [weeklyVolumesLast4Weeks, setWeeklyVolumesLast4Weeks] = useState<number[]>([]);
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
  const [workoutMode, setWorkoutMode] = useState<"browse" | "active">("browse");
  const [guidedExercises, setGuidedExercises] = useState<Exercise[] | null>(null);
  const [workoutSchedule, setWorkoutSchedule] = useState<WorkoutSchedule[]>([]);
  const [manualScheduleByPlan, setManualScheduleByPlan] = useState<Record<string, { days: number[] }>>({});
  const [showCustomWorkoutModal, setShowCustomWorkoutModal] = useState(false);
  const [showWorkoutOptions, setShowWorkoutOptions] = useState(true);
  const [selectedWorkoutOption, setSelectedWorkoutOption] = useState<string | null>(null);
  const [selectedWorkoutOptions, setSelectedWorkoutOptions] = useState<string[]>([]);
  const [showSchedulePromptModal, setShowSchedulePromptModal] = useState(false);
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

  // Update selectedDate when URL changes (use searchParams so it reacts to client-side nav)
  const urlDateParam = searchParams.get("date");
  useEffect(() => {
    if (urlDateParam) {
      try {
        const newDate = new Date(urlDateParam + "T00:00:00");
        if (!isNaN(newDate.getTime())) {
          setSelectedDate((prev) => {
            const currentDateStr = toLocalDateString(prev);
            const newDateStr = toLocalDateString(newDate);
            return currentDateStr !== newDateStr ? newDate : prev;
          });
        }
      } catch (e) {
        console.error("Error parsing date:", e);
      }
    }
  }, [urlDateParam]);

  // Handle option parameter - separate effect to avoid infinite loop
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const optionParam = params.get("option");
    
    if (optionParam && optionParam !== selectedWorkoutOption) {
      setSelectedWorkoutOption(optionParam);
      localStorage.setItem("selectedWorkoutOption", optionParam);
      setShowWorkoutOptions(false);
      
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

  // When arriving from "Use" on workouts page, open Training days modal (after plan loads)

  const reloadScheduleFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const storedSchedule = localStorage.getItem("workoutSchedule");
    const storedManual = localStorage.getItem("manualScheduleByPlan");
    if (storedSchedule) {
      try {
        setWorkoutSchedule(JSON.parse(storedSchedule));
      } catch (e) {
        console.error("Error reloading workout schedule:", e);
      }
    }
    if (storedManual) {
      try {
        const parsed = JSON.parse(storedManual);
        if (parsed && typeof parsed === "object") {
          const migrated: Record<string, { days: number[] }> = {};
          for (const [k, v] of Object.entries(parsed)) {
            const old = v as any;
            if (old && "days" in old && Array.isArray(old.days)) {
              migrated[k] = { days: old.days };
            }
          }
          setManualScheduleByPlan(migrated);
        }
      } catch { /* ignore */ }
    }
  }, []);

  // Reload schedule when returning from schedule modal (refresh param)
  useEffect(() => {
    if (typeof window === "undefined" || !refreshParam) return;
    reloadScheduleFromStorage();
    router.replace("/gym/workout", { scroll: false });
  }, [refreshParam, router]);

  // Reload schedule when tab becomes visible or storage changes (keeps display in sync)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") reloadScheduleFromStorage();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "workoutSchedule" || e.key === "manualScheduleByPlan") reloadScheduleFromStorage();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [reloadScheduleFromStorage]);

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
    const storedManual = localStorage.getItem("manualScheduleByPlan");
    if (storedManual) {
      try {
        const parsed = JSON.parse(storedManual);
        if (parsed && typeof parsed === "object") {
          const migrated: Record<string, { days: number[] }> = {};
          for (const [k, v] of Object.entries(parsed)) {
            const old = v as any;
            if (old && "days" in old && Array.isArray(old.days)) {
              migrated[k] = { days: old.days };
            }
            // Do NOT migrate old day1/day2/day3 or pushDays/pullDays/legsDays - different semantics
          }
          setManualScheduleByPlan(migrated);
        }
      } catch { /* ignore */ }
    }
    // Load workout options
    const storedOptions = localStorage.getItem("workoutOptions");
    if (storedOptions) {
      try {
        setWorkoutOptions(JSON.parse(storedOptions));
      } catch (e) {
        console.error("Error loading workout options:", e);
      }
    }
    // Load selected workout options - use plans user selected with "Use" only
    const storedSelected = localStorage.getItem("selectedWorkoutOptions");
    if (storedSelected) {
      try {
        const arr = JSON.parse(storedSelected);
        if (Array.isArray(arr) && arr.length > 0) {
          setSelectedWorkoutOptions(arr);
          const activeId = arr[arr.length - 1];
          setSelectedWorkoutOption(activeId);
          localStorage.setItem("selectedWorkoutOption", activeId);
        } else {
          setSelectedWorkoutOptions([]);
          setSelectedWorkoutOption(null);
          localStorage.removeItem("selectedWorkoutOption");
        }
      } catch { /* ignore */ }
    } else {
      const storedOption = localStorage.getItem("selectedWorkoutOption");
      setSelectedWorkoutOption(storedOption || null);
      setSelectedWorkoutOptions(storedOption ? [storedOption] : []);
    }
    if (!storedOptions) {
      // Initialize with 10 default options
      const defaultOptions: WorkoutOption[] = [
        { id: "option1", name: "Option 1", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Push Day", day2: "Pull Day", day3: "Legs Day" } },
        { id: "option2", name: "Option 2", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Back & Triceps", day2: "Chest & Biceps", day3: "Legs Day" } },
        { id: "option3", name: "Option 3", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Upper Body", day2: "Lower Body", day3: "Full Body" } },
        { id: "option4", name: "Option 4", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option5", name: "Option 5", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option6", name: "Option 6", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option7", name: "Option 7", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option8", name: "Option 8", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option9", name: "Option 9", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option10", name: "Option 10", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
      ];
      setWorkoutOptions(defaultOptions);
      localStorage.setItem("workoutOptions", JSON.stringify(defaultOptions));
    }
  }, []);

  // Get which day of the option (day1/day2/day3) applies for this date based on weekday rotation
  const getScheduledDayKey = (optionId: string, date: Date): "day1" | "day2" | "day3" => {
    const dayOfWeek = date.getDay();
    const days = (manualScheduleByPlan[optionId] ?? { days: [] }).days || [];
    const sortedDays = [...days].sort((a, b) => a - b);
    const index = sortedDays.indexOf(dayOfWeek);
    if (index < 0) return "day1";
    if (index === 0) return "day1";
    if (index === 1) return "day2";
    return "day3";
  };

  // Get workout info for date - which option (workout) is scheduled for this day
  const getWorkoutInfoForDate = (date: Date): { optionId: string; dayKey: "day1" | "day2" | "day3" } | null => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = toLocalDateString(normalizedDate);
    const dayOfWeek = normalizedDate.getDay();

    // 1. workoutSchedule - use optionId when stored, or match by workout name (for old schedules)
    const scheduledWorkout = workoutSchedule.find((w) => w.date === dateStr);
    if (scheduledWorkout && scheduledWorkout.workoutName !== "Rest Day") {
      const optId = scheduledWorkout.optionId
        ? scheduledWorkout.optionId
        : workoutOptions.find((o) => o.name === scheduledWorkout.workoutName)?.id;
      if (optId) {
        const dayKey = getScheduledDayKey(optId, normalizedDate);
        return { optionId: optId, dayKey };
      }
    }

    // 2. manualScheduleByPlan - which option runs on this weekday
    if (selectedWorkoutOptions.length > 0) {
      for (const optId of selectedWorkoutOptions) {
        const days = (manualScheduleByPlan[optId] ?? { days: [] }).days || [];
        if (days.includes(dayOfWeek)) {
          const dayKey = getScheduledDayKey(optId, normalizedDate);
          return { optionId: optId, dayKey };
        }
      }
    }

    return null;
  };

  const getWorkoutTypeForDate = (date: Date): "pushDay" | "pullDay" | "legsDay" | null => {
    const info = getWorkoutInfoForDate(date);
    return info ? "pushDay" : null;
  };

  // Get current day's exercises - ONLY from the scheduled option and the correct day (day1/day2/day3) for this date.
  const currentDayExercises: Exercise[] = useMemo(() => {
    const selectedDateStr = toLocalDateString(selectedDate);

    // 1. Get the scheduled option and which day (day1/day2/day3) for this date
    const info = getWorkoutInfoForDate(selectedDate);
    if (!info) return [];

    const option = workoutOptions.find((o: WorkoutOption) => o.id === info.optionId);
    const dayExercises = option ? (option.days[info.dayKey] || []) : [];

    // 2. If the scheduled option has no exercises, show nothing - never show workout_data from a different option
    if (dayExercises.length === 0) return [];

    // 3. Always use the OPTION's exercises as source - never use workout_data's exercise list (it may be from a different option)
    let savedImages: Record<string, string> = {};
    if (typeof window !== "undefined") {
      try {
        const storedImages = localStorage.getItem("exerciseImages");
        if (storedImages) savedImages = JSON.parse(storedImages);
      } catch (e) {}
    }
    const getImageUrl = (ex: any): string | undefined =>
      ex.imageUrl || savedImages[ex.name?.toLowerCase()] || getBuiltInImageUrl(ex.name);

    const raw = typeof window !== "undefined" ? localStorage.getItem(`workout_data_${selectedDateStr}`) : null;
    const savedData: { id?: string; name?: string; sets?: Array<{ reps?: number; weight?: number; completed?: boolean }> }[] = raw ? (() => { try { const d = JSON.parse(raw); return Array.isArray(d) ? d : []; } catch { return []; } })() : [];

    return dayExercises.map((ex: any) => {
      const savedEx = savedData.find((s: any) => s.id === ex.id);
      const sets = savedEx?.sets?.length
        ? (savedEx.sets || []).map((set: any) => ({
            reps: set.reps ?? ex.goalReps ?? 10,
            weight: set.weight ?? ex.goalWeight ?? 0,
            completed: set.completed ?? false,
          }))
        : ex.sets || Array.from({ length: ex.goalSets ?? (Array.isArray(ex.sets) ? ex.sets.length : 3) }, () => ({
            reps: ex.goalReps || ex.reps || 10,
            weight: ex.goalWeight || 0,
            completed: false,
          }));
      return {
        id: ex.id || `ex-${Date.now()}-${Math.random()}`,
        name: ex.name || "",
        goalSets: sets.length,
        goalReps: ex.goalReps || ex.reps || 10,
        goalWeight: ex.goalWeight || 0,
        imageUrl: getImageUrl(ex),
        sets,
      };
    });
  }, [selectedDate, workoutSchedule, selectedWorkoutOption, selectedWorkoutOptions, manualScheduleByPlan, workoutOptions, workoutPlan]);

  const getWorkoutNameForDate = (date: Date): string => {
    const scheduledWorkout = workoutSchedule.find((w) => w.date === toLocalDateString(date));
    if (scheduledWorkout && scheduledWorkout.workoutName !== "Rest Day") return scheduledWorkout.workoutName;
    const info = getWorkoutInfoForDate(date);
    if (info) {
      const opt = workoutOptions.find((o) => o.id === info.optionId);
      if (opt) return opt.name;
    }
    return "Rest Day";
  };

  // Get display name for date - shows option name only (e.g. "Option 1", "Option 2")
  const getWorkoutDisplayNameForDate = (date: Date): string => {
    const info = getWorkoutInfoForDate(date);
    if (info) {
      const opt = workoutOptions.find((o) => o.id === info.optionId);
      if (opt) return opt.name;
    }
    return getWorkoutNameForDate(date);
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

  // Get current day's workout display name - option name (e.g. "Option 2") or "Rest Day"
  const currentDayWorkoutName = useMemo(() => {
    return getWorkoutDisplayNameForDate(selectedDate);
  }, [selectedDate, workoutSchedule, workoutOptions, selectedWorkoutOption, selectedWorkoutOptions, manualScheduleByPlan]);

  // Load workout data for selected date
  const selectedDateStr = useMemo(() => toLocalDateString(selectedDate), [selectedDate]);

  // Schedule workout reminder notification for today if user has a workout
  useEffect(() => {
    if (typeof window === "undefined" || workoutSchedule.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateString(today);
    const todayWorkout = workoutSchedule.find((w) => w.date === todayStr && w.workoutName !== "Rest Day");
    if (todayWorkout) {
      scheduleWorkoutNotification(today, todayWorkout.workoutName);
    }
  }, [workoutSchedule]);

  // Sync current day's exercises into workoutPlan.pushDay for updateSet/save - so we have the right list to edit
  useEffect(() => {
    if (typeof window === "undefined" || !getWorkoutInfoForDate(selectedDate)) return;
    const raw = localStorage.getItem(`workout_data_${selectedDateStr}`);
    const info = getWorkoutInfoForDate(selectedDate);
    const option = info ? workoutOptions.find((o) => o.id === info.optionId) : null;
    const baseExercises = option && info ? (option.days[info.dayKey] || []) : [];

    if (raw) {
      try {
        const savedData = JSON.parse(raw);
        if (Array.isArray(savedData) && savedData.length > 0) {
          const converted = savedData.map((s: any) => ({
            id: s.id || `ex-${Date.now()}-${Math.random()}`,
            name: s.name || "",
            goalSets: s.sets?.length || 3,
            goalReps: 10,
            goalWeight: 0,
            sets: (s.sets || []).map((set: any) => ({
              reps: set.reps ?? 10,
              weight: set.weight ?? 0,
              completed: set.completed ?? false,
            })),
          }));
          setWorkoutPlan((prev) => ({ ...prev, pushDay: converted, pullDay: [], legsDay: [] }));
          return;
        }
      } catch (e) {}
    }
    setWorkoutPlan((prev) => ({
      ...prev,
      pushDay: baseExercises.map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        goalSets: ex.goalSets ?? (ex.sets?.length || 3),
        goalReps: ex.goalReps || ex.reps || 10,
        goalWeight: ex.goalWeight || 0,
        sets: ex.sets || Array.from({ length: ex.goalSets ?? 3 }, () => ({ reps: 10, weight: 0, completed: false })),
      })),
      pullDay: [],
      legsDay: [],
    }));
  }, [selectedDateStr, selectedDate, workoutOptions, workoutSchedule, selectedWorkoutOptions, manualScheduleByPlan]);

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
        const dateStr = toLocalDateString(selectedDate);
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
      const dateStr = toLocalDateString(date);
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

    // Last 4 weeks volume (each week = 7 days)
    const fourWeeks: number[] = [];
    for (let w = 3; w >= 0; w--) {
      let weekVol = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const dateStr = toLocalDateString(date);
        const raw = localStorage.getItem(`workout_data_${dateStr}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            weekVol += calculateVolumeFromData(parsed);
          } catch {}
        }
      }
      fourWeeks.push(weekVol);
    }
    setWeeklyVolumesLast4Weeks(fourWeeks);

    const workoutEntries = Object.keys(localStorage).filter((key) =>
      key.startsWith("workout_data_")
    );
    setTotalWorkoutsLogged(workoutEntries.length);

    let streak = 0;
    for (let offset = 0; offset < 30; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const dateStr = toLocalDateString(date);
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

  const handleSwapExercise = (exId: string, newName: string) => {
    const workoutType = getWorkoutTypeForDate(selectedDate);
    if (!workoutType) return;
    setWorkoutPlan((prev) => ({
      ...prev,
      [workoutType]: prev[workoutType].map((ex) =>
        ex.id === exId ? { ...ex, name: newName } : ex
      ),
    }));
  };

  const handleUpdateRest = (exId: string, restSeconds: number) => {
    const workoutType = getWorkoutTypeForDate(selectedDate);
    if (!workoutType) return;
    setWorkoutPlan((prev) => ({
      ...prev,
      [workoutType]: prev[workoutType].map((ex) =>
        ex.id === exId ? { ...ex, restSeconds } : ex
      ),
    }));
  };

  const saveExercise = (exId: string) => {
    const workoutType = getWorkoutTypeForDate(selectedDate);
    if (!workoutType) return;
    
    const dateStr = toLocalDateString(selectedDate);
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
    return merged.length > 0 ? merged : [];
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
  const max4Week = weeklyVolumesLast4Weeks.length > 0 ? Math.max(...weeklyVolumesLast4Weeks, 1) : 1;

  const workoutsThisWeek = weeklyData.filter((value) => value > 0).length;
  const thisWeekVolume = weeklyData.reduce((a, b) => a + b, 0);
  const lastWeekVolume = weeklyVolumesLast4Weeks.length >= 2 ? weeklyVolumesLast4Weeks[weeklyVolumesLast4Weeks.length - 2] : 0;

  const milestones = [10, 25, 50, 100, 250, 500];
  const nextMilestone = milestones.find((m) => m > totalWorkoutsLogged);
  const workoutsToNext = nextMilestone ? nextMilestone - totalWorkoutsLogged : 0;
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

  const volumeDelta =
    lastWeekVolume > 0
      ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
      : 0;

  const activeExercise = useMemo(() => {
    if (!activeExerciseId) return null;
    return (currentDayExercises ?? []).find((ex) => ex.id === activeExerciseId) || null;
  }, [activeExerciseId, currentDayExercises]);

  const totals = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    let completedSets = 0;
    (currentDayExercises ?? []).forEach((ex) => {
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
            {/* Journey Snapshot */}
            <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-400/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-teal-400 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Your Journey
              </h2>
              <p className="text-white text-sm leading-relaxed">
                {totalWorkoutsLogged === 0
                  ? "Start your first workout to begin tracking your journey."
                  : `${totalWorkoutsLogged} workout${totalWorkoutsLogged === 1 ? "" : "s"} completed.`}
                {nextMilestone && totalWorkoutsLogged > 0 && (
                  <span className="block mt-1 text-gray-400 text-xs">
                    {workoutsToNext} more until {nextMilestone} workouts!
                  </span>
                )}
              </p>
            </div>

            {/* Momentum */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
              <TrendingUp className={`w-6 h-6 mx-auto mb-1 ${volumeDelta >= 0 ? "text-green-400" : "text-red-400"}`} />
              <p className={`text-2xl font-bold ${volumeDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {volumeDelta >= 0 ? "+" : ""}{volumeDelta}%
              </p>
              <p className="text-xs text-gray-500">vs last week</p>
            </div>

            {/* 4-Week Trend */}
            {weeklyVolumesLast4Weeks.length > 0 && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold mb-3">4-Week Progress</h2>
                <div className="flex items-end justify-between h-20 gap-2">
                  {weeklyVolumesLast4Weeks.map((val, i) => {
                    const h = Math.max((val / max4Week) * 100, 2);
                    const weekLabel = i === weeklyVolumesLast4Weeks.length - 1 ? "This" : `${4 - i}w ago`;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-gray-800 rounded-t relative" style={{ height: "70px" }}>
                          <div
                            className="w-full bg-teal-500 rounded-t absolute bottom-0 transition-all"
                            style={{ height: `${h}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1">{weekLabel}</span>
                        <span className="text-[9px] text-gray-600">{val}kg</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* This Week */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold mb-3">This Week</h2>
              <div className="flex items-end justify-between h-20 gap-1.5">
                {weeklyData.map((value, i) => {
                  const heightPercent = (value / maxVolume) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-800 rounded-t relative" style={{ height: "70px" }}>
                        <div
                          className="w-full bg-teal-500 rounded-t absolute bottom-0 transition-all"
                          style={{ height: `${Math.max(heightPercent, 2)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1">
                        {i === weeklyData.length - 1 ? "Today" : `D${i + 1}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">{thisWeekVolume} kg total</p>
            </div>

            {/* Personal Best & Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
                <Target className="w-5 h-5 text-teal-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-teal-400">{heaviestSet} kg</p>
                <p className="text-[10px] text-gray-500">Heaviest set</p>
              </div>
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
                <Activity className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-yellow-400">{workoutsThisWeek}</p>
                <p className="text-[10px] text-gray-500">This week</p>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Header - Workout plan | AI Coach */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/gym/workouts"
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] font-medium hover:bg-white/10 transition-colors"
            >
              <Dumbbell className="w-4 h-4 text-teal-400" />
              <span className="text-gray-400">Workout plan</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </Link>
          </div>
          <Link
            href="/gym/ai-coach"
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-[11px] font-medium transition-colors shrink-0 inline-block"
          >
            AI Coach
          </Link>
        </div>

        {/* Week strip - driven by Training days (Rest if none selected) */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1 flex-1 min-w-0 justify-between overflow-x-auto pb-1">
            {weekDays.map((day) => {
              const dateStr = toLocalDateString(day);
              const displayName = getWorkoutDisplayNameForDate(day);
              const isSelected = toLocalDateString(selectedDate) === dateStr;
              const isToday = toLocalDateString(new Date()) === dateStr;
              const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
              const dayLabel = dayLabels[day.getDay() === 0 ? 6 : day.getDay() - 1];
              const workoutShort = displayName === "Rest Day" ? "Rest" : displayName;
              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(day);
                    router.push(`/gym/workout?date=${dateStr}`);
                  }}
                  className={`flex flex-col items-center py-2 px-1.5 rounded-lg min-w-[48px] shrink-0 transition-colors ${
                    isSelected
                      ? "bg-teal-500/30 border border-teal-400/50"
                      : "bg-white/5 border border-transparent hover:bg-white/10"
                  }`}
                >
                  <span className={`text-[10px] font-medium ${isToday ? "text-teal-400" : "text-gray-400"}`}>
                    {dayLabel}
                  </span>
                  <span className="text-[8px] text-gray-500 mt-1 truncate w-full text-center" title={displayName}>
                    {workoutShort}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercises List */}
        {currentDayWorkoutName === "Rest Day" ? (
          <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-6 border border-white/10 text-center">
            <div className="text-4xl mb-2">😴</div>
            <p className="text-base font-bold text-gray-300 mb-1">Rest Day</p>
            <p className="text-gray-400 text-xs">Take a break and recover!</p>
          </div>
        ) : (currentDayExercises ?? []).length === 0 ? (
          <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-6 border border-white/10 text-center">
            <div className="text-4xl mb-2">💪</div>
            <p className="text-sm font-bold text-gray-300 mb-1">No exercises for {currentDayWorkoutName}</p>
            <p className="text-gray-400 text-[10px]">Add your own workout or use AI to get started!</p>
          </div>
        ) : (
          <div className="space-y-2 pb-24">
            {/* Workout day name header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">{currentDayWorkoutName}</h2>
            </div>
            
            {/* Exercise List - 2 column grid */}
            <div className="grid grid-cols-2 gap-2">
              {(currentDayExercises ?? []).map((ex) => {
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
                    <div className="w-full h-16 bg-gray-800 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                      {ex.imageUrl ? (
                        <img 
                          src={ex.imageUrl} 
                          alt={ex.name}
                          className={`w-full h-full object-cover ${getExerciseImagePosition(ex.name)}`}
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

        {/* Fixed Start Workout button - only when exercises exist */}
        {currentDayWorkoutName !== "Rest Day" && (currentDayExercises ?? []).length > 0 && (
          <div className="fixed bottom-20 left-0 right-0 flex justify-center px-4 z-40">
            <button
              onClick={() => {
                setWorkoutMode("active");
                setGuidedExercises(
                  (currentDayExercises ?? []).map((ex) => ({
                    ...ex,
                    sets: ex.sets.map((s) => ({ ...s })),
                  }))
                );
              }}
              className="w-full max-w-md flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-base shadow-lg"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Workout
            </button>
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
              {/* Exercise image - show full image when expanded */}
              <div className="w-full h-64 bg-gray-900 flex items-center justify-center relative overflow-hidden">
                {activeExercise.imageUrl ? (
                  <img 
                    src={activeExercise.imageUrl} 
                    alt={activeExercise.name}
                    className="w-full h-full object-contain"
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

        {/* Guided Workout Flow */}
        {workoutMode === "active" && guidedExercises && guidedExercises.length > 0 && (
          <GuidedWorkoutView
            exercises={guidedExercises.map((ex) => ({
              ...ex,
              restSeconds: ex.restSeconds ?? 90,
            }))}
            onUpdateSet={(exId, setIndex, patch) => {
              setGuidedExercises((prev) =>
                prev
                  ? prev.map((ex) =>
                      ex.id === exId
                        ? {
                            ...ex,
                            sets: ex.sets.map((s, i) =>
                              i === setIndex ? { ...s, ...patch } : s
                            ),
                          }
                        : ex
                    )
                  : prev
              );
            }}
            onSwapExercise={(exId, newName) => {
              setGuidedExercises((prev) =>
                prev ? prev.map((ex) => (ex.id === exId ? { ...ex, name: newName } : ex)) : prev
              );
            }}
            onUpdateRest={(exId, restSeconds) => {
              setGuidedExercises((prev) =>
                prev ? prev.map((ex) => (ex.id === exId ? { ...ex, restSeconds } : ex)) : prev
              );
            }}
            onExit={() => {
              const workoutType = getWorkoutTypeForDate(selectedDate);
              if (workoutType && guidedExercises) {
                setWorkoutPlan((prev) => ({
                  ...prev,
                  [workoutType]: guidedExercises,
                }));
                const dateStr = toLocalDateString(selectedDate);
                const workoutData = guidedExercises.map((ex) => ({
                  id: ex.id,
                  name: ex.name,
                  sets: ex.sets,
                }));
                localStorage.setItem(`workout_data_${dateStr}`, JSON.stringify(workoutData));
                loadWeeklyStats();
              }
              setWorkoutMode("browse");
              setGuidedExercises(null);
            }}
            onFinish={() => {
              const workoutType = getWorkoutTypeForDate(selectedDate);
              if (workoutType && guidedExercises) {
                setWorkoutPlan((prev) => ({
                  ...prev,
                  [workoutType]: guidedExercises,
                }));
                const dateStr = toLocalDateString(selectedDate);
                const workoutData = guidedExercises.map((ex) => ({
                  id: ex.id,
                  name: ex.name,
                  sets: ex.sets,
                }));
                localStorage.setItem(`workout_data_${dateStr}`, JSON.stringify(workoutData));
                const allCompleted = guidedExercises.every((ex) =>
                  ex.sets.every((s) => s.completed)
                );
                if (allCompleted) {
                  localStorage.setItem(`workout_${dateStr}`, "completed");
                  setWorkoutSchedule((prev) =>
                    prev.map((w) => (w.date === dateStr ? { ...w, completed: true } : w))
                  );
                }
                loadWeeklyStats();
              }
              setWorkoutMode("browse");
              setGuidedExercises(null);
            }}
          />
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
                          <ExerciseNameInput
                            value={exercise.name}
                            onChange={(name) => {
                              const updated = [...customWorkoutPlan.pushDay];
                              updated[index].name = name;
                              setCustomWorkoutPlan({ ...customWorkoutPlan, pushDay: updated });
                            }}
                            placeholder="e.g. Bench Press"
                            className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
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
                          <ExerciseNameInput
                            value={exercise.name}
                            onChange={(name) => {
                              const updated = [...customWorkoutPlan.pullDay];
                              updated[index].name = name;
                              setCustomWorkoutPlan({ ...customWorkoutPlan, pullDay: updated });
                            }}
                            placeholder="e.g. Lat Pulldown"
                            className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
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
                          <ExerciseNameInput
                            value={exercise.name}
                            onChange={(name) => {
                              const updated = [...customWorkoutPlan.legsDay];
                              updated[index].name = name;
                              setCustomWorkoutPlan({ ...customWorkoutPlan, legsDay: updated });
                            }}
                            placeholder="e.g. Squat"
                            className="w-full bg-black text-white p-2 rounded border border-white/10 focus:outline-none focus:border-teal-400 text-sm"
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
                <Link
                  href="/gym/ai-coach"
                  onClick={() => setShowSchedulePromptModal(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-teal-500/20 border border-teal-400/50 text-teal-400 rounded-xl font-semibold hover:bg-teal-500/30 transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  Speak to AI Coach
                </Link>
                <Link
                  href="/gym/workouts"
                  onClick={() => setShowSchedulePromptModal(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/15 transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                  Assign days to plans
                </Link>
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

          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

