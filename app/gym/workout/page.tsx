"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { getBuiltInImageUrl, getExerciseImagePosition } from "@/lib/built-in-exercise-images";
import { X, Plus, Trash2, MoreVertical, Clock, BarChart3, RefreshCw, ChevronRight, ChevronLeft, Dumbbell, TrendingUp, Calendar, Sparkles, Play, Flame, Lightbulb, Trophy } from "lucide-react";
import {
  collectWorkoutDaysFromStorage,
  buildProgressionTips,
  computeGoalBasedBests,
  computeStrengthVolumeTrends,
  type GoalBestRow,
  type StrengthTrendRow,
  type StrengthTrendPeriodId,
} from "@/lib/workout-progress-analytics";
import GuidedWorkoutView from "@/components/GuidedWorkoutView";
import ExerciseNameInput from "@/components/ExerciseNameInput";
import {
  scheduleWorkoutNotification,
  scheduleGym1HourBeforeNotification,
  scheduleGym1HourAfterNotification,
} from "@/app/utils/notifications";
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

// ── Progress tab: lift chart types + component ──
interface ProgressLiftData {
  name: string;
  weights: number[];
  dates: string[];
  first: number;
  latest: number;
  best: number;
  delta: number;
  sessions: number;
}
interface ProgressPR { exercise: string; weight: number; reps: number; date: string; }

function fmtProgressDate(dateStr: string): string {
  try { return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }
  catch { return dateStr; }
}

function ProgressLiftChart({ lift, idx }: { lift: ProgressLiftData; idx: number }) {
  const pts_n = Math.min(lift.weights.length, 12);
  const wts = lift.weights.slice(-pts_n);
  const dts = lift.dates.slice(-pts_n);
  const rawMin = Math.min(...wts), rawMax = Math.max(...wts);
  const pad = Math.max((rawMax - rawMin) * 0.25, rawMax * 0.06, 2);
  const yMin = Math.max(0, rawMin - pad), yMax = rawMax + pad * 0.4, yRange = yMax - yMin || 1;
  const W = 320, H = 90, ML = 32, MR = 6, MT = 8, MB = 18;
  const cW = W - ML - MR, cH = H - MT - MB;
  const toX = (i: number) => ML + (i / Math.max(wts.length - 1, 1)) * cW;
  const toY = (v: number) => MT + (1 - (v - yMin) / yRange) * cH;
  const pts = wts.map((v, i) => ({ x: toX(i), y: toY(v) }));
  let line = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i-1].x + pts[i].x) / 2;
    line += ` C ${cx},${pts[i-1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  const area = `${line} L ${pts[pts.length-1].x},${MT+cH} L ${pts[0].x},${MT+cH} Z`;
  const yTicks = [Math.round(yMin+yRange*0.15), Math.round(yMin+yRange*0.55), Math.round(yMin+yRange*0.9)];
  const gId = `plg_${idx}`;
  const isUp = lift.delta > 0, isFlat = lift.delta === 0;
  const pctChange = lift.first > 0 ? Math.round(Math.abs((lift.delta / lift.first) * 100)) : 0;
  return (
    <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{lift.name}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">{lift.sessions} sessions · best {lift.best}kg</p>
        </div>
        <div className="text-right ml-3 shrink-0">
          <p className="text-xl font-black text-white leading-none">{lift.latest}<span className="text-xs font-normal text-gray-600 ml-0.5">kg</span></p>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-lg ${isFlat ? "bg-white/6 text-gray-500" : isUp ? "bg-teal-500/15 text-teal-400" : "bg-red-500/15 text-red-400"}`}>
            {isFlat ? "No change" : `${isUp ? "+" : ""}${lift.delta}kg (${pctChange}%)`}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => { const y = toY(t); return (
          <g key={i}>
            <line x1={ML} y1={y} x2={W-MR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.7" />
            <text x={ML-4} y={y+3} textAnchor="end" fontSize="7" fill="rgba(156,163,175,0.4)">{t}</text>
          </g>
        );})}
        <path d={area} fill={`url(#${gId})`} />
        <path d={line} fill="none" stroke="#2dd4bf" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length-1 ? 3.5 : 2} fill={i === pts.length-1 ? "#2dd4bf" : "rgba(45,212,191,0.45)"} />)}
        <text x={pts[0].x} y={H-3} textAnchor="middle" fontSize="7" fill="rgba(156,163,175,0.35)">{fmtProgressDate(dts[0])}</text>
        {pts.length > 1 && <text x={pts[pts.length-1].x} y={H-3} textAnchor="middle" fontSize="7" fill="rgba(156,163,175,0.55)">{fmtProgressDate(dts[dts.length-1])}</text>}
      </svg>
    </div>
  );
}

// ── Muscle body diagram ──
const LEVEL_COLORS: Record<string, string> = {
  none: "#1e293b",
  beginner: "#3b82f6",
  intermediate: "#f59e0b",
  advanced: "#10b981",
};

function getMuscleGroups(name: string): string[] {
  const n = name.toLowerCase();
  const out: string[] = [];
  if (/bench|chest|push.?up|pec|fly|cable cross/.test(n)) out.push("chest");
  if (/pull.?up|chin.?up|lat|row|deadlift|pull.?down|t.bar/.test(n)) out.push("back");
  if (/shoulder|delt|overhead press|ohp|lateral raise|face pull|military/.test(n)) out.push("shoulders");
  if (/bicep|curl|hammer/.test(n)) out.push("biceps");
  if (/tricep|skull|pushdown|dip|close grip/.test(n)) out.push("triceps");
  if (/squat|leg press|lunge|quad|hack|bulgarian|front squat/.test(n)) out.push("quads");
  if (/rdl|romanian|hamstring|leg curl/.test(n)) out.push("hamstrings");
  if (/glute|hip thrust|deadlift/.test(n)) out.push("glutes");
  if (/calf|calves/.test(n)) out.push("calves");
  if (/crunch|plank|sit.?up|\bab\b|core|oblique/.test(n)) out.push("abs");
  return out;
}

function getMuscleLevel(sessions: number): "none" | "beginner" | "intermediate" | "advanced" {
  if (sessions === 0) return "none";
  if (sessions <= 4) return "beginner";
  if (sessions <= 12) return "intermediate";
  return "advanced";
}

function BodyDiagram({ levels, view }: { levels: Record<string, string>; view: "front" | "back" }) {
  const c = (m: string) => LEVEL_COLORS[levels[m] ?? "none"] ?? LEVEL_COLORS.none;
  if (view === "front") return (
    <svg viewBox="0 0 120 280" style={{ width: 120, height: 280 }}>
      <ellipse cx="60" cy="19" rx="14" ry="17" fill="#1e293b" />
      <rect x="55" y="34" width="10" height="9" rx="3" fill="#1e293b" />
      {/* shoulders */}
      <ellipse cx="38" cy="51" rx="13" ry="8" fill={c("shoulders")} />
      <ellipse cx="82" cy="51" rx="13" ry="8" fill={c("shoulders")} />
      {/* chest */}
      <ellipse cx="50" cy="63" rx="12" ry="11" fill={c("chest")} />
      <ellipse cx="70" cy="63" rx="12" ry="11" fill={c("chest")} />
      {/* upper arms / biceps */}
      <rect x="23" y="52" width="14" height="40" rx="6" fill={c("biceps")} />
      <rect x="83" y="52" width="14" height="40" rx="6" fill={c("biceps")} />
      {/* forearms */}
      <rect x="21" y="93" width="12" height="34" rx="5" fill="#1e293b" />
      <rect x="87" y="93" width="12" height="34" rx="5" fill="#1e293b" />
      {/* hands */}
      <ellipse cx="27" cy="132" rx="7" ry="4" fill="#1e293b" />
      <ellipse cx="93" cy="132" rx="7" ry="4" fill="#1e293b" />
      {/* abs */}
      <rect x="46" y="75" width="28" height="42" rx="5" fill={c("abs")} />
      {/* hips */}
      <rect x="42" y="115" width="36" height="13" rx="5" fill="#1e293b" />
      {/* quads */}
      <rect x="43" y="126" width="15" height="52" rx="7" fill={c("quads")} />
      <rect x="62" y="126" width="15" height="52" rx="7" fill={c("quads")} />
      {/* knees */}
      <ellipse cx="51" cy="181" rx="8" ry="5" fill="#1e293b" />
      <ellipse cx="70" cy="181" rx="8" ry="5" fill="#1e293b" />
      {/* calves */}
      <rect x="44" y="185" width="13" height="42" rx="6" fill={c("calves")} />
      <rect x="63" y="185" width="13" height="42" rx="6" fill={c("calves")} />
      {/* feet */}
      <ellipse cx="51" cy="231" rx="11" ry="4" fill="#1e293b" />
      <ellipse cx="70" cy="231" rx="11" ry="4" fill="#1e293b" />
    </svg>
  );
  return (
    <svg viewBox="0 0 120 280" style={{ width: 120, height: 280 }}>
      <ellipse cx="60" cy="19" rx="14" ry="17" fill="#1e293b" />
      <rect x="55" y="34" width="10" height="9" rx="3" fill="#1e293b" />
      {/* traps / upper back */}
      <ellipse cx="38" cy="51" rx="13" ry="8" fill={c("back")} />
      <ellipse cx="82" cy="51" rx="13" ry="8" fill={c("back")} />
      {/* lats */}
      <path d="M 37 58 L 83 58 L 76 118 L 44 118 Z" rx="4" fill={c("back")} />
      {/* triceps */}
      <rect x="23" y="52" width="14" height="40" rx="6" fill={c("triceps")} />
      <rect x="83" y="52" width="14" height="40" rx="6" fill={c("triceps")} />
      {/* forearms */}
      <rect x="21" y="93" width="12" height="34" rx="5" fill="#1e293b" />
      <rect x="87" y="93" width="12" height="34" rx="5" fill="#1e293b" />
      {/* hands */}
      <ellipse cx="27" cy="132" rx="7" ry="4" fill="#1e293b" />
      <ellipse cx="93" cy="132" rx="7" ry="4" fill="#1e293b" />
      {/* glutes */}
      <rect x="42" y="115" width="36" height="20" rx="6" fill={c("glutes")} />
      {/* hamstrings */}
      <rect x="43" y="133" width="15" height="48" rx="7" fill={c("hamstrings")} />
      <rect x="62" y="133" width="15" height="48" rx="7" fill={c("hamstrings")} />
      {/* knees */}
      <ellipse cx="51" cy="183" rx="8" ry="5" fill="#1e293b" />
      <ellipse cx="70" cy="183" rx="8" ry="5" fill="#1e293b" />
      {/* calves back */}
      <rect x="44" y="187" width="13" height="40" rx="6" fill={c("calves")} />
      <rect x="63" y="187" width="13" height="40" rx="6" fill={c("calves")} />
      {/* feet */}
      <ellipse cx="51" cy="231" rx="11" ry="4" fill="#1e293b" />
      <ellipse cx="70" cy="231" rx="11" ry="4" fill="#1e293b" />
    </svg>
  );
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
  const [strengthTrendPeriod, setStrengthTrendPeriod] = useState<StrengthTrendPeriodId>("month");
  const [weeklyVolume, setWeeklyVolume] = useState<number[]>(Array(7).fill(0));
  const [totalWorkoutsLogged, setTotalWorkoutsLogged] = useState(0);
  const [activeStreak, setActiveStreak] = useState(0);
  const [lastWorkout, setLastWorkout] = useState<{ name: string; daysAgo: number } | null>(null);
  const [caloriesBurnedThisMonth, setCaloriesBurnedThisMonth] = useState(0);
  const [gymAiMsg, setGymAiMsg] = useState("");
  const [gymAiFetching, setGymAiFetching] = useState(false);
  const [liftChartData, setLiftChartData] = useState<ProgressLiftData[]>([]);
  const [progressPRs, setProgressPRs] = useState<ProgressPR[]>([]);
  const [progressSubTab, setProgressSubTab] = useState<"overview" | "lifts" | "records">("overview");
  const [progressDates, setProgressDates] = useState<Set<string>>(new Set());
  const [muscleData, setMuscleData] = useState<Record<string, "none" | "beginner" | "intermediate" | "advanced">>({});
  const [bodyView, setBodyView] = useState<"front" | "back">("front");

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

  // Calendar is Mon–Sun: user assigns a saved *plan* (or Rest) per weekday. That plan’s exercise list is what we load.
  // (Data file still uses legacy `days.day1/2/3` arrays; the editor stores everything the user added in `day1`.)
  const optionExercisesList = (option: WorkoutOption | undefined): any[] => {
    if (!option) return [];
    const primary = option.days.day1 || [];
    if (primary.length > 0) return primary;
    return [...(option.days.day2 || []), ...(option.days.day3 || [])];
  };

  /** Which saved plan (option id) is on this calendar day, or null if Rest / nothing. */
  const getWorkoutInfoForDate = (date: Date): { optionId: string } | null => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const dateStr = toLocalDateString(normalizedDate);
    const dayOfWeek = normalizedDate.getDay();

    const scheduledWorkout = workoutSchedule.find((w) => w.date === dateStr);
    if (scheduledWorkout && scheduledWorkout.workoutName !== "Rest Day") {
      const optId = scheduledWorkout.optionId
        ? scheduledWorkout.optionId
        : workoutOptions.find((o) => o.name === scheduledWorkout.workoutName)?.id;
      if (optId) return { optionId: optId };
    }

    if (selectedWorkoutOptions.length > 0) {
      for (const optId of selectedWorkoutOptions) {
        const days = (manualScheduleByPlan[optId] ?? { days: [] }).days || [];
        if (days.includes(dayOfWeek)) return { optionId: optId };
      }
    }

    return null;
  };

  const getWorkoutTypeForDate = (date: Date): "pushDay" | "pullDay" | "legsDay" | null => {
    const info = getWorkoutInfoForDate(date);
    return info ? "pushDay" : null;
  };

  // Exercises for the plan assigned to this calendar day (same as in Workout plans editor).
  const currentDayExercises: Exercise[] = useMemo(() => {
    const selectedDateStr = toLocalDateString(selectedDate);

    const info = getWorkoutInfoForDate(selectedDate);
    if (!info) return [];

    const option = workoutOptions.find((o: WorkoutOption) => o.id === info.optionId);
    const dayExercises = optionExercisesList(option);

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

  // Schedule workout reminder notifications for today if user has a workout
  useEffect(() => {
    if (typeof window === "undefined" || workoutSchedule.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateString(today);
    const todayWorkout = workoutSchedule.find((w) => w.date === todayStr && w.workoutName !== "Rest Day");
    if (todayWorkout) {
      scheduleWorkoutNotification(today, todayWorkout.workoutName);
      scheduleGym1HourBeforeNotification(today, todayWorkout.workoutName);
      scheduleGym1HourAfterNotification(today, todayWorkout.workoutName);
    }
  }, [workoutSchedule]);

  // Sync current day's exercises into workoutPlan.pushDay for updateSet/save - so we have the right list to edit
  useEffect(() => {
    if (typeof window === "undefined" || !getWorkoutInfoForDate(selectedDate)) return;
    const raw = localStorage.getItem(`workout_data_${selectedDateStr}`);
    const info = getWorkoutInfoForDate(selectedDate);
    const option = info ? workoutOptions.find((o) => o.id === info.optionId) : null;
    const baseExercises = option && info ? optionExercisesList(option) : [];

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

    let workoutsWithVolume = 0;
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith("workout_data_")) return;
      try {
        const raw = localStorage.getItem(key);
        if (raw && calculateVolumeFromData(JSON.parse(raw)) > 0) workoutsWithVolume++;
      } catch {}
    });
    setTotalWorkoutsLogged(workoutsWithVolume);

    let streak = 0;
    let lastWorkoutDate: string | null = null;
    let lastWorkoutName = "";
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
        if (!lastWorkoutDate) {
          lastWorkoutDate = dateStr;
          const schedule = JSON.parse(localStorage.getItem("workoutSchedule") || "[]");
          const entry = schedule.find((w: { date: string }) => w.date === dateStr);
          lastWorkoutName = entry?.workoutName?.replace(" Day", "") || "Workout";
        }
      } else {
        break;
      }
    }
    setActiveStreak(streak);
    if (lastWorkoutDate) {
      const lastDate = new Date(lastWorkoutDate + "T00:00:00");
      const daysAgo = Math.floor((today.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
      setLastWorkout({ name: lastWorkoutName, daysAgo });
    } else {
      setLastWorkout(null);
    }

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let monthVolume = 0;
    for (let d = 0; d < 31; d++) {
      const date = new Date(startOfMonth);
      date.setDate(startOfMonth.getDate() + d);
      if (date.getMonth() !== today.getMonth()) break;
      const dateStr = toLocalDateString(date);
      const raw = localStorage.getItem(`workout_data_${dateStr}`);
      if (raw) {
        try {
          monthVolume += calculateVolumeFromData(JSON.parse(raw));
        } catch {}
      }
    }
    setCaloriesBurnedThisMonth(Math.round(monthVolume * 0.04));
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

  // Load chart data + AI when user opens the progress tab
  useEffect(() => {
    if (activeTab !== "progress" || typeof window === "undefined") return;
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith("workout_data_")).sort();
    const exerciseMap: Record<string, { date: string; maxWeight: number; maxReps: number }[]> = {};
    const prMap: Record<string, { weight: number; reps: number; date: string }> = {};
    const datesSet = new Set<string>();
    allKeys.forEach(k => {
      const date = k.replace("workout_data_", "");
      try {
        const data = JSON.parse(localStorage.getItem(k) || "[]");
        let hasData = false;
        (data as any[]).forEach((ex: any) => {
          if (!ex.name?.trim()) return;
          const name = ex.name.trim();
          let maxW = 0, maxR = 0;
          (ex.sets || []).forEach((s: any) => {
            if (s.completed) {
              hasData = true;
              const w = Number(s.weight) || 0, r = Number(s.reps) || 0;
              if (w > maxW) { maxW = w; maxR = r; }
              if (!prMap[name] || w > prMap[name].weight) prMap[name] = { weight: w, reps: r, date };
            }
          });
          if (maxW > 0) {
            if (!exerciseMap[name]) exerciseMap[name] = [];
            exerciseMap[name].push({ date, maxWeight: maxW, maxReps: maxR });
          }
        });
        if (hasData) datesSet.add(date);
      } catch {}
    });
    setProgressDates(datesSet);

    // Muscle group session counts → levels
    const muscleSessions: Record<string, number> = {};
    Object.entries(exerciseMap).forEach(([exName, history]) => {
      getMuscleGroups(exName).forEach(m => {
        muscleSessions[m] = (muscleSessions[m] || 0) + history.length;
      });
    });
    const muscleResult: Record<string, "none" | "beginner" | "intermediate" | "advanced"> = {};
    ["chest","back","shoulders","biceps","triceps","abs","quads","hamstrings","glutes","calves"]
      .forEach(m => { muscleResult[m] = getMuscleLevel(muscleSessions[m] || 0); });
    setMuscleData(muscleResult);

    const lifts: ProgressLiftData[] = Object.entries(exerciseMap)
      .filter(([, h]) => h.length >= 2)
      .map(([name, h]) => {
        const weights = h.map(x => x.maxWeight), dates = h.map(x => x.date);
        const first = weights[0], latest = weights[weights.length - 1], best = Math.max(...weights);
        return { name, weights, dates, first, latest, best, delta: latest - first, sessions: weights.length };
      })
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);
    setLiftChartData(lifts);
    setProgressPRs(
      Object.entries(prMap)
        .map(([exercise, v]) => ({ exercise, ...v }))
        .filter(pr => pr.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8)
    );
    // Weekly AI (cached)
    const today = new Date();
    const dow = today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    const weekKey = mon.toISOString().split("T")[0];
    const cacheKey = `gymAI_week_${weekKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setGymAiMsg(cached); return; }
    if (allKeys.length === 0) return;
    const improving = Object.entries(exerciseMap)
      .filter(([, h]) => h.length >= 2)
      .map(([name, h]) => ({ name, delta: h[h.length-1].maxWeight - h[0].maxWeight, sessions: h.length }))
      .filter(l => l.delta > 0).sort((a, b) => b.delta - a.delta);
    const stagnant = Object.entries(exerciseMap)
      .filter(([, h]) => h.length >= 3)
      .map(([name, h]) => { const r = h.slice(-3).map(x => x.maxWeight); return { name, spread: Math.max(...r) - Math.min(...r) }; })
      .filter(l => l.spread === 0);
    const prompt = `You are a gym coach analysing a user's training data. Give a 2-3 sentence performance summary.
Sessions: ${allKeys.length} total, ${activeStreak} day streak.
Improving lifts: ${improving.length > 0 ? improving.slice(0,3).map(l => `${l.name} +${l.delta}kg`).join(", ") : "none yet"}.
Stagnant lifts (no change last 3 sessions): ${stagnant.length > 0 ? stagnant.slice(0,2).map(l => l.name).join(", ") : "none"}.
PRs: ${Object.entries(prMap).filter(([,v]) => v.weight > 0).sort(([,a],[,b]) => b.weight - a.weight).slice(0,3).map(([n,v]) => `${n} ${v.weight}kg`).join(", ")}.
Rules: Reference specific numbers. If improving, acknowledge with numbers. If stagnant, give ONE specific actionable tip. Direct coach tone. No emojis. Max 40 words.`;
    setGymAiFetching(true);
    fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "general", data: { prompt } }) })
      .then(r => r.json())
      .then(d => {
        const msg = d.result || d.message || "";
        if (msg) {
          setGymAiMsg(msg);
          localStorage.setItem(cacheKey, msg);
          Object.keys(localStorage).filter(k => k.startsWith("gymAI_week_") && k !== cacheKey).forEach(k => localStorage.removeItem(k));
        }
      })
      .catch(() => {})
      .finally(() => setGymAiFetching(false));
  }, [activeTab]);

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

  const hasAnyWorkoutData = totalWorkoutsLogged > 0;

  const weeklyVolumeKey = weeklyVolume.join(",");

  /** Mon–Sun week: days with logged volume vs days that are workout days on your calendar (non–Rest), with fallback to plan weekdays. */
  const weeklySessionProgress = useMemo(() => {
    if (typeof window === "undefined") {
      return { completed: 0, target: 0, hasPlan: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const jsDow = today.getDay();
    const mondayOffset = jsDow === 0 ? 6 : jsDow - 1;

    let target = 0;
    let completed = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - mondayOffset + i);
      const dateStr = toLocalDateString(d);
      const dow = d.getDay();

      const entry = workoutSchedule.find((w) => w.date === dateStr);
      let isTrainDay: boolean;
      if (entry) {
        isTrainDay = entry.workoutName !== "Rest Day";
      } else {
        isTrainDay = selectedWorkoutOptions.some((optId) =>
          (manualScheduleByPlan[optId]?.days ?? []).some((x) => Number(x) === dow)
        );
      }

      if (!isTrainDay) continue;
      target++;

      const raw = localStorage.getItem(`workout_data_${dateStr}`);
      let vol = 0;
      if (raw) {
        try {
          vol = calculateVolumeFromData(JSON.parse(raw));
        } catch {
          /* ignore */
        }
      }
      if (vol > 0) completed++;
    }

    return { completed, target, hasPlan: target > 0 };
  }, [workoutSchedule, selectedWorkoutOptions, manualScheduleByPlan, weeklyVolumeKey]);

  const progressAnalytics = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        goalBests: [] as GoalBestRow[],
        progressionTips: [] as ReturnType<typeof buildProgressionTips>,
        strengthTrends: [] as StrengthTrendRow[],
      };
    }
    const history = collectWorkoutDaysFromStorage(
      (k) => localStorage.getItem(k),
      Object.keys(localStorage)
    );
    const planExercises = [
      ...workoutPlan.pushDay,
      ...workoutPlan.pullDay,
      ...workoutPlan.legsDay,
    ].map((ex) => ({ name: ex.name, goalReps: ex.goalReps, goalSets: ex.goalSets }));
    const goalBests = computeGoalBasedBests(history, planExercises);
    const progressionTips = buildProgressionTips(history, planExercises).slice(0, 2);
    const strengthTrends = computeStrengthVolumeTrends(history, new Date());
    return { goalBests, progressionTips, strengthTrends };
  }, [workoutPlan, weeklyVolumeKey, totalWorkoutsLogged]);

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
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto px-3 py-3">
        {/* Tab Selection Bar - Always visible at the top */}
        <div className="flex gap-1 mb-5 bg-white/5 border border-white/8 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab("workout")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
              activeTab === "workout" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            My Workout
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
              activeTab === "progress" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Progress
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === "progress" ? (
          <div className="space-y-4 pb-20">

            {/* AI Coach */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f2a2a 60%, #071a14 100%)" }}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400/70">AI Coach Analysis</span>
                </div>
                {gymAiFetching ? (
                  <div className="flex gap-1 py-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400/40 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}</div>
                ) : gymAiMsg ? (
                  <p className="text-[13px] text-gray-300 leading-relaxed">{gymAiMsg}</p>
                ) : (
                  <p className="text-[12px] text-gray-600 leading-relaxed">Log sessions with weights to unlock your AI analysis.</p>
                )}
              </div>
            </div>

            {/* Stats row — no streak */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-white leading-none mb-1">{totalWorkoutsLogged}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Total</p>
              </div>
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-teal-400 leading-none mb-1">{weeklySessionProgress.completed}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">This Week</p>
              </div>
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-violet-400 leading-none mb-1">
                  {[...progressDates].filter(d => d.startsWith(new Date().toISOString().slice(0,7))).length}
                </p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">This Month</p>
              </div>
            </div>

            {/* Muscle body diagram */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-white">Muscle Development</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Based on your training history</p>
                </div>
                <div className="flex gap-1 bg-white/5 border border-white/8 rounded-xl p-0.5">
                  {(["front","back"] as const).map(v => (
                    <button key={v} onClick={() => setBodyView(v)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${bodyView === v ? "bg-teal-400 text-black" : "text-gray-500"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex justify-center" style={{ minWidth: 120 }}>
                  <BodyDiagram levels={muscleData} view={bodyView} />
                </div>
                <div className="flex-1 pt-2 space-y-4">
                  {/* Legend */}
                  <div className="space-y-1.5">
                    {[
                      { level: "advanced",     label: "Advanced",     color: "#10b981" },
                      { level: "intermediate", label: "Intermediate", color: "#f59e0b" },
                      { level: "beginner",     label: "Beginner",     color: "#3b82f6" },
                      { level: "none",         label: "Not trained",  color: "#1e293b" },
                    ].map(item => (
                      <div key={item.level} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: item.color, border: item.level === "none" ? "1px solid rgba(255,255,255,0.12)" : "none" }} />
                        <span className="text-[11px] text-gray-400">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Muscle list for this view */}
                  <div className="space-y-1.5 border-t border-white/5 pt-3">
                    {(bodyView === "front"
                      ? ["Chest","Shoulders","Biceps","Abs","Quads","Calves"]
                      : ["Back","Triceps","Glutes","Hamstrings","Calves"]
                    ).map(m => {
                      const lv = muscleData[m.toLowerCase()] ?? "none";
                      return (
                        <div key={m} className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500">{m}</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: LEVEL_COLORS[lv] }} />
                            <span className="text-[10px] font-semibold capitalize" style={{ color: LEVEL_COLORS[lv] }}>{lv === "none" ? "—" : lv}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* This week dots */}
            <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
              <p className="text-sm font-bold text-white mb-3">This week</p>
              <div className="flex gap-2 justify-between">
                {weekDays.map((day, i) => {
                  const ds = toLocalDateString(day);
                  const todayStr = toLocalDateString(new Date());
                  const isFuture = ds > todayStr;
                  const isToday = ds === todayStr;
                  const hasWorkout = progressDates.has(ds);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className={`w-full aspect-square rounded-lg max-w-[36px] ${
                        isFuture ? "bg-white/3"
                        : hasWorkout ? isToday ? "bg-teal-400 ring-2 ring-teal-300/50 ring-offset-1 ring-offset-[#0c1422]" : "bg-teal-500/70"
                        : isToday ? "ring-1 ring-teal-500/40 ring-offset-1 ring-offset-[#0c1422] bg-transparent" : "bg-white/6"
                      }`} />
                      <span className={`text-[9px] font-bold ${isFuture ? "text-gray-700" : isToday ? "text-teal-400" : "text-gray-600"}`}>
                        {["M","T","W","T","F","S","S"][i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Volume bar chart */}
            {weeklyVolume.some(v => v > 0) && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-white">Weekly volume</p>
                  <span className="text-[10px] text-gray-600">total kg lifted</span>
                </div>
                <div className="flex items-end gap-1.5" style={{ height: 68 }}>
                  {weeklyVolume.map((vol, i) => {
                    const maxVol = Math.max(...weeklyVolume, 1);
                    const pct = (vol / maxVol) * 100;
                    const todayIdx = weekDays.findIndex(d => toLocalDateString(d) === toLocalDateString(new Date()));
                    const isToday = i === todayIdx;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        {vol > 0 && <span className="text-[8px] text-gray-600 tabular-nums">{vol >= 1000 ? `${Math.round(vol/1000)}k` : vol}</span>}
                        <div className="w-full rounded-md" style={{
                          height: Math.max(3, (pct/100) * 46),
                          background: isToday ? "linear-gradient(to top,#0d9488,#5eead4)" : vol > 0 ? "rgba(45,212,191,0.28)" : "rgba(255,255,255,0.04)",
                        }} />
                        <span className={`text-[8px] font-bold ${isToday ? "text-teal-400" : "text-gray-700"}`}>{["M","T","W","T","F","S","S"][i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strength progress charts */}
            {liftChartData.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold px-0.5">Strength progress · max weight per session</p>
                {liftChartData.map((lift, i) => <ProgressLiftChart key={lift.name} lift={lift} idx={i} />)}
              </div>
            )}

            {/* Personal Records */}
            {progressPRs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <p className="text-[11px] text-yellow-400/70 font-semibold uppercase tracking-widest">Personal Records</p>
                </div>
                {progressPRs.map((pr, i) => (
                  <div key={i} className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${i===0?"bg-yellow-400/15 border border-yellow-400/25":i===1?"bg-gray-400/10 border border-gray-400/20":i===2?"bg-amber-700/15 border border-amber-700/25":"bg-white/5 border border-white/8"}`}>
                      <span className={`text-[11px] font-black ${i===0?"text-yellow-400":i===1?"text-gray-400":i===2?"text-amber-600":"text-gray-600"}`}>#{i+1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{pr.exercise}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{fmtProgressDate(pr.date)}{pr.reps > 0 ? ` · ${pr.reps} reps` : ""}</p>
                    </div>
                    <p className="text-xl font-black text-yellow-400 leading-none shrink-0">
                      {pr.weight}<span className="text-xs font-normal text-yellow-600/50 ml-0.5">kg</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {totalWorkoutsLogged === 0 && (
              <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-8 text-center">
                <Dumbbell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Log your first workout to see progress charts.</p>
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Content-width only (no flex-1); same compact height as before */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <Link
            href="/gym/workouts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-[11px] font-medium text-gray-300 hover:bg-white/10 transition-colors shrink-0"
          >
            <Dumbbell className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Workout plans</span>
          </Link>
          <Link
            href="/gym/ai-coach"
            className="inline-flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-[11px] font-medium transition-colors shrink-0"
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
          <div className="bg-[#0c1422] rounded-xl p-6 border border-white/8 text-center space-y-4">
            <div className="text-4xl">😴</div>
            <div>
              <p className="text-base font-bold text-gray-300 mb-1">Rest Day</p>
              <p className="text-gray-400 text-xs">Take a break and recover. Want to train instead?</p>
            </div>
            <Link
              href="/gym/workouts"
              className="block w-full py-3 rounded-xl bg-white/10 border border-white/8 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              Open workout plans
            </Link>
          </div>
        ) : (currentDayExercises ?? []).length === 0 ? (
          <div className="bg-[#0c1422] rounded-xl p-6 border border-white/8 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">💪</div>
              <p className="text-sm font-bold text-gray-200 mb-1">No exercises in {currentDayWorkoutName}</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                In <span className="text-teal-400">Workout plans</span>, tap this plan, add moves, save. Then tap{" "}
                <span className="text-teal-400">Use</span> and choose which weekdays it runs — or set those days to{" "}
                <span className="text-gray-300">Rest</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/gym/workouts"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-sm font-bold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add exercises to a plan
              </Link>
              <Link
                href="/gym/ai-coach"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 border border-white/8 text-sm font-semibold text-teal-300 hover:bg-white/10 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Ask AI Coach for a plan
              </Link>
            </div>
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
                    className="bg-black/40 border border-white/8 rounded-lg p-2 cursor-pointer hover:bg-black/60 transition-colors"
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
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black/40 border border-white/8 rounded-lg text-white text-sm">
                    <Clock className="w-4 h-4" />
                    Rest timer: On
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black/40 border border-white/8 rounded-lg text-white text-sm">
                    <BarChart3 className="w-4 h-4" />
                    History
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-black/40 border border-white/8 rounded-lg text-white text-sm">
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
                            : "bg-black/40 border border-white/8"
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
            <div className="bg-[#0c1422] rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/8">
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
                        className="p-4 bg-[#0c1422] border border-white/8 rounded-xl hover:border-cyan-400/50 transition-colors text-left"
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
                <div className="bg-white/5 rounded-lg p-4 border border-white/8">
                  <h3 className="text-xl font-bold text-teal-400 mb-4">
                    💪 {selectedWorkoutOption ? workoutOptions.find(o => o.id === selectedWorkoutOption)?.dayNames.day1 || "Day 1" : "Day 1"}
                  </h3>
                  <div className="space-y-3">
                    {customWorkoutPlan.pushDay.length === 0 ? (
                      <div className="bg-[#0c1422] rounded-lg p-4 border border-white/8 text-center">
                        <p className="text-gray-400 text-sm mb-3">No exercises added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkoutPlan({
                              ...customWorkoutPlan,
                              pushDay: [{ name: "", sets: 3, reps: 10 }],
                            });
                          }}
                          className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      customWorkoutPlan.pushDay.map((exercise, index) => (
                      <div key={index} className="bg-[#0c1422] rounded-lg p-3 border border-white/8">
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
                            className="w-full bg-black text-white p-2 rounded border border-white/8 focus:outline-none focus:border-teal-400 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-white/8 focus:outline-none focus:border-teal-400 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-white/8 focus:outline-none focus:border-teal-400 text-sm"
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
                        className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>
                    )}
                  </div>
                </div>

                {/* Day 2 Section */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/8">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">
                    🏋️ {selectedWorkoutOption ? workoutOptions.find(o => o.id === selectedWorkoutOption)?.dayNames.day2 || "Day 2" : "Day 2"}
                  </h3>
                  <div className="space-y-3">
                    {customWorkoutPlan.pullDay.length === 0 ? (
                      <div className="bg-[#0c1422] rounded-lg p-4 border border-white/8 text-center">
                        <p className="text-gray-400 text-sm mb-3">No exercises added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkoutPlan({
                              ...customWorkoutPlan,
                              pullDay: [{ name: "", sets: 3, reps: 10 }],
                            });
                          }}
                          className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      customWorkoutPlan.pullDay.map((exercise, index) => (
                      <div key={index} className="bg-[#0c1422] rounded-lg p-3 border border-white/8">
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
                            className="w-full bg-black text-white p-2 rounded border border-white/8 focus:outline-none focus:border-teal-400 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-white/8 focus:outline-none focus:border-teal-400 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-white/8 focus:outline-none focus:border-teal-400 text-sm"
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
                        className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>
                    )}
                  </div>
                </div>

                {/* Day 3 Section */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/8">
                  <h3 className="text-xl font-bold text-green-400 mb-4">
                    🦵 {selectedWorkoutOption ? workoutOptions.find(o => o.id === selectedWorkoutOption)?.dayNames.day3 || "Day 3" : "Day 3"}
                  </h3>
                  <div className="space-y-3">
                    {customWorkoutPlan.legsDay.length === 0 ? (
                      <div className="bg-[#0c1422] rounded-lg p-4 border border-white/8 text-center">
                        <p className="text-gray-400 text-sm mb-3">No exercises added yet</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkoutPlan({
                              ...customWorkoutPlan,
                              legsDay: [{ name: "", sets: 3, reps: 10 }],
                            });
                          }}
                          className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      customWorkoutPlan.legsDay.map((exercise, index) => (
                      <div key={index} className="bg-[#0c1422] rounded-lg p-3 border border-white/8">
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
                            className="w-full bg-black text-white p-2 rounded border border-white/8 focus:outline-none focus:border-teal-400 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-white/8 focus:outline-none focus:border-teal-400 text-sm"
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
                              className="w-full bg-black text-white p-2 rounded border border-white/8 focus:outline-none focus:border-teal-400 text-sm"
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
                        className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
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
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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
            <div className="bg-[#0c1422] rounded-2xl p-6 max-w-sm w-full border border-white/8">
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

