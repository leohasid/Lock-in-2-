"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { 
  Target, TrendingUp, Calendar, CheckCircle2,
  Activity, Brain, Loader2, ChevronRight, Dumbbell, Scale
} from "lucide-react";
import { callRailwayAI } from "@/lib/api";

export default function Home() {
  const [userName, setUserName] = useState("Leo");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [today] = useState(new Date());
  const [aiEvaluation, setAiEvaluation] = useState<string>("");
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string>("");
  const [hasGenerated, setHasGenerated] = useState(false);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Load user name
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onboardingData = localStorage.getItem("onboardingData");
    if (onboardingData) {
      try {
        const data = JSON.parse(onboardingData);
        if (data.name) setUserName(data.name);
      } catch (e) {}
    }
  }, []);

  // Get weight data
  const weightData = useMemo(() => {
    if (typeof window === "undefined") return { current: null, entries: [] };
    
    // Try to get from weight entries first
    const storedWeightEntries = localStorage.getItem("weightEntries");
    if (storedWeightEntries) {
      try {
        const entries = JSON.parse(storedWeightEntries);
        if (entries.length > 0) {
          const sorted = entries.sort((a: any, b: any) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          return { current: sorted[0].weight, entries: sorted };
        }
      } catch (e) {}
    }
    
    // Fallback to onboarding data
    const onboardingData = localStorage.getItem("onboardingData");
    if (onboardingData) {
      try {
        const data = JSON.parse(onboardingData);
        if (data.weight) {
          return { current: data.weight, entries: [] };
        }
      } catch (e) {}
    }
    
    return { current: null, entries: [] };
  }, [refreshTrigger]);

  // Get workout stats
  const workoutStats = useMemo(() => {
    if (typeof window === "undefined") return { daysSinceLast: null, thisWeek: 0, total: 0, freshMuscleGroups: 0 };
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayStr = todayDate.toISOString().split("T")[0];
    
    let daysSinceLast = null;
    let thisWeek = 0;
    let total = 0;
    const weekAgo = new Date(todayDate);
    weekAgo.setDate(todayDate.getDate() - 7);
    
    // Find last workout
    for (let i = 0; i < 30; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const completed = localStorage.getItem(`workout_${dateStr}`) === "completed" || 
                       (localStorage.getItem(`workout_${dateStr}`) && localStorage.getItem(`workout_${dateStr}`) !== "null");
      
      if (completed) {
        if (daysSinceLast === null) {
          daysSinceLast = i;
        }
        total++;
        if (date >= weekAgo) thisWeek++;
      }
    }
    
    // Calculate fresh muscle groups (simplified: if no workout in last 3 days, all groups are fresh)
    const freshMuscleGroups = daysSinceLast === null || daysSinceLast >= 3 ? 5 : Math.max(0, 5 - thisWeek);
    
    return { daysSinceLast, thisWeek, total, freshMuscleGroups };
  }, [refreshTrigger]);

  // Get today's calories
  const caloriesData = useMemo(() => {
    if (typeof window === "undefined") return { current: 0, goal: 2000, percentage: 0 };
    const todayStr = new Date().toISOString().split("T")[0];
    const storedMeals = localStorage.getItem("meals");
    if (storedMeals) {
      try {
        const meals = JSON.parse(storedMeals);
        const todayMeals = meals.filter((m: any) => m.date === todayStr);
        const totalCalories = todayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        const storedGoals = localStorage.getItem("macroGoals");
        const goal = storedGoals ? JSON.parse(storedGoals).calories || 2000 : 2000;
        return {
          current: totalCalories,
          goal,
          percentage: Math.min(Math.round((totalCalories / goal) * 100), 100),
        };
      } catch (e) {
        return { current: 0, goal: 2000, percentage: 0 };
      }
    }
    return { current: 0, goal: 2000, percentage: 0 };
  }, [refreshTrigger]);

  // Get Monday to Sunday weekly macro data
  const dailyMacroData = useMemo(() => {
    if (typeof window === "undefined") return { calories: [], protein: [], carbs: [], fats: [] };
    
    const currentDate = new Date();
    const storedMeals = localStorage.getItem("meals");
    if (!storedMeals) return { calories: [], protein: [], carbs: [], fats: [] };
    
    try {
      const meals = JSON.parse(storedMeals);
      const caloriesData: Array<{ day: string; value: number }> = [];
      const proteinData: Array<{ day: string; value: number }> = [];
      const carbsData: Array<{ day: string; value: number }> = [];
      const fatsData: Array<{ day: string; value: number }> = [];
      
      const currentDay = currentDate.getDay();
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
      const mondayDate = new Date(currentDate);
      mondayDate.setDate(currentDate.getDate() - daysFromMonday);
      mondayDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(mondayDate);
        date.setDate(mondayDate.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        
        const dayMeals = meals.filter((m: any) => m.date === dateStr);
        const dayCalories = dayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        const dayProtein = dayMeals.reduce((sum: number, meal: any) => sum + (meal.protein || 0), 0);
        const dayCarbs = dayMeals.reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0);
        const dayFats = dayMeals.reduce((sum: number, meal: any) => sum + (meal.fats || 0), 0);
        
        const dayLabel = date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
        
        caloriesData.push({ day: dayLabel, value: dayCalories });
        proteinData.push({ day: dayLabel, value: dayProtein });
        carbsData.push({ day: dayLabel, value: dayCarbs });
        fatsData.push({ day: dayLabel, value: dayFats });
      }
      
      return { calories: caloriesData, protein: proteinData, carbs: carbsData, fats: fatsData };
    } catch (e) {
      return { calories: [], protein: [], carbs: [], fats: [] };
    }
  }, [refreshTrigger]);

  // Get macro goals
  const macroGoals = useMemo(() => {
    if (typeof window === "undefined") return { calories: 2000, protein: 150, carbs: 250, fats: 65 };
    const storedGoals = localStorage.getItem("macroGoals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        return {
          calories: goals.calories || 2000,
          protein: goals.protein || 150,
          carbs: goals.carbs || 250,
          fats: goals.fats || 65,
        };
      } catch (e) {
        return { calories: 2000, protein: 150, carbs: 250, fats: 65 };
      }
    }
    return { calories: 2000, protein: 150, carbs: 250, fats: 65 };
  }, []);

  // Normalize macro data to percentage of goal
  const normalizedMacroData = useMemo(() => {
    return {
      calories: dailyMacroData.calories.map(d => ({
        ...d,
        value: macroGoals.calories > 0 ? (d.value / macroGoals.calories) * 100 : 0,
      })),
      protein: dailyMacroData.protein.map(d => ({
        ...d,
        value: macroGoals.protein > 0 ? (d.value / macroGoals.protein) * 100 : 0,
      })),
      carbs: dailyMacroData.carbs.map(d => ({
        ...d,
        value: macroGoals.carbs > 0 ? (d.value / macroGoals.carbs) * 100 : 0,
      })),
      fats: dailyMacroData.fats.map(d => ({
        ...d,
        value: macroGoals.fats > 0 ? (d.value / macroGoals.fats) * 100 : 0,
      })),
    };
  }, [dailyMacroData, macroGoals]);

  const maxChartValue = 120;

  // Get daily goals
  const dailyGoalsData = useMemo(() => {
    if (typeof window === "undefined") return [];
    const storedGoals = localStorage.getItem("goals");
    if (!storedGoals) return [];
    
    try {
      const goals = JSON.parse(storedGoals);
      const todayStr = new Date().toISOString().split("T")[0];
      const dailyGoals = goals.filter((g: any) => g.goalType === "daily");
      return dailyGoals.slice(0, 3);
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

  // Get long-term goals
  const longTermGoalsData = useMemo(() => {
    if (typeof window === "undefined") return [];
    const storedGoals = localStorage.getItem("goals");
    if (!storedGoals) return [];
    
    try {
      const goals = JSON.parse(storedGoals);
      const longTermGoals = goals.filter((g: any) => g.goalType === "long-term" || !g.goalType);
      return longTermGoals.slice(0, 3);
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

  // Generate AI evaluation
  const generateAIEvaluation = async () => {
    setIsLoadingEvaluation(true);
    setEvaluationError("");
    
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const storedMeals = localStorage.getItem("meals");
      const storedGoals = localStorage.getItem("goals");
      const reminders = localStorage.getItem("reminders");
      
      let mealsToday = 0;
      let caloriesToday = 0;
      if (storedMeals) {
        try {
          const meals = JSON.parse(storedMeals);
          const todayMeals = meals.filter((m: any) => m.date === todayStr);
          mealsToday = todayMeals.length;
          caloriesToday = todayMeals.reduce((sum: number, meal: any) => sum + (meal.calories || 0), 0);
        } catch (e) {}
      }
      
      let tasksToday = 0;
      let tasksCompleted = 0;
      if (reminders) {
        try {
          const parsed = JSON.parse(reminders);
          const allTasks = parsed.filter((r: any) => r.type === "task");
          const todayTasks = allTasks.filter((r: any) => r.date === todayStr);
          tasksToday = todayTasks.length;
          tasksCompleted = todayTasks.filter((r: any) => r.completed).length;
        } catch (e) {}
      }
      
      const prompt = `You are a professional lifestyle coach. Evaluate the user's progress today and provide a concise, motivating assessment.

**User's Today's Data:**
- Workout completed: ${workoutStats.daysSinceLast === 0 ? "Yes" : "No"}
- Days since last workout: ${workoutStats.daysSinceLast ?? "Never"}
- Workouts this week: ${workoutStats.thisWeek}
- Calories consumed: ${caloriesToday} (${caloriesData.percentage}% of goal)
- Meals logged: ${mealsToday}
- Tasks completed: ${tasksCompleted} out of ${tasksToday}
- Current weight: ${weightData.current ? `${weightData.current}kg` : "Not set"}

**Your Task:**
Provide a brief, professional evaluation (2-3 sentences) that:
1. Acknowledges what they've accomplished today
2. Gives one specific, actionable tip for improvement
3. Motivates them to keep going

Be concise, professional, and helpful.`;

      const response = await callRailwayAI(prompt);
      setAiEvaluation(response);
      setHasGenerated(true);
    } catch (error: any) {
      console.error("Error generating AI evaluation:", error);
      setEvaluationError(error.message || "Failed to generate evaluation. Please try again.");
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  // Auto-generate evaluation on mount
  useEffect(() => {
    if (!hasGenerated && !isLoadingEvaluation) {
      generateAIEvaluation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh data periodically
  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Body diagram component - exact match to reference image
  const BodyDiagram = () => {
    // Highlight fresh muscle groups in red if no workout in 3+ days
    const shouldHighlight = workoutStats.daysSinceLast === null || workoutStats.daysSinceLast >= 3;
    const lightRed = "#ff9999"; // Lighter pinkish-red for chest/abs
    const darkRed = "#ff4444"; // Darker red for biceps, triceps, quads  
    const baseColor = "#333333"; // Dark grey base
    
    return (
      <div className="relative w-full flex justify-center items-center py-8">
        <svg width="160" height="340" viewBox="0 0 160 340" className="w-full max-w-[160px]">
          {/* Head - rounded oval */}
          <ellipse cx="80" cy="18" rx="16" ry="20" fill={baseColor} />
          
          {/* Neck */}
          <rect x="74" y="38" width="12" height="8" rx="1" fill={baseColor} />
          
          {/* Shoulders - horizontal, dark grey */}
          <ellipse cx="55" cy="52" rx="14" ry="8" fill={baseColor} />
          <ellipse cx="105" cy="52" rx="14" ry="8" fill={baseColor} />
          
          {/* Chest - lighter pinkish-red when fresh, wider */}
          <ellipse cx="80" cy="75" rx="26" ry="16" fill={shouldHighlight ? lightRed : baseColor} />
          
          {/* Biceps - darker red when fresh, upper arm */}
          <ellipse cx="38" cy="75" rx="7" ry="20" fill={shouldHighlight ? darkRed : baseColor} />
          <ellipse cx="122" cy="75" rx="7" ry="20" fill={shouldHighlight ? darkRed : baseColor} />
          
          {/* Triceps - darker red when fresh, back of arm */}
          <ellipse cx="38" cy="98" rx="6" ry="16" fill={shouldHighlight ? darkRed : baseColor} />
          <ellipse cx="122" cy="98" rx="6" ry="16" fill={shouldHighlight ? darkRed : baseColor} />
          
          {/* Forearms - dark grey, not highlighted */}
          <ellipse cx="38" cy="120" rx="5" ry="18" fill={baseColor} />
          <ellipse cx="122" cy="120" rx="5" ry="18" fill={baseColor} />
          
          {/* Abs/Six-pack - lighter pinkish-red when fresh */}
          <rect x="58" y="93" width="44" height="28" rx="2" fill={shouldHighlight ? lightRed : baseColor} />
          {/* Six-pack lines when highlighted */}
          {shouldHighlight && (
            <>
              <line x1="66" y1="99" x2="94" y2="99" stroke="#ffaaaa" strokeWidth="0.7" opacity="0.4" />
              <line x1="66" y1="105" x2="94" y2="105" stroke="#ffaaaa" strokeWidth="0.7" opacity="0.4" />
              <line x1="66" y1="111" x2="94" y2="111" stroke="#ffaaaa" strokeWidth="0.7" opacity="0.4" />
              <line x1="80" y1="93" x2="80" y2="121" stroke="#ffaaaa" strokeWidth="0.7" opacity="0.4" />
            </>
          )}
          
          {/* Waist/Hips */}
          <ellipse cx="80" cy="125" rx="22" ry="8" fill={baseColor} />
          
          {/* Quadriceps/Thighs - darker red when fresh */}
          <ellipse cx="68" cy="160" rx="9" ry="35" fill={shouldHighlight ? darkRed : baseColor} />
          <ellipse cx="92" cy="160" rx="9" ry="35" fill={shouldHighlight ? darkRed : baseColor} />
          
          {/* Lower legs - dark grey, not highlighted */}
          <ellipse cx="68" cy="205" rx="7" ry="35" fill={baseColor} />
          <ellipse cx="92" cy="205" rx="7" ry="35" fill={baseColor} />
          
          {/* Feet */}
          <ellipse cx="68" cy="245" rx="5" ry="8" fill={baseColor} />
          <ellipse cx="92" cy="245" rx="5" ry="8" fill={baseColor} />
        </svg>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-black text-white px-5 pt-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-xs text-[#666]">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      <div className="space-y-6">
        {/* Body Progress Section */}
        <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] overflow-hidden">
          <div className="p-5 border-b border-[#1a1a1a]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Body Progress</h3>
              <Link
                href="/gym"
                className="text-xs text-[#666] hover:text-white transition-colors flex items-center gap-1"
              >
                View Details <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            
            {/* Stats above body */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  {workoutStats.daysSinceLast !== null ? workoutStats.daysSinceLast : "—"}
                </div>
                <div className="text-[10px] text-[#666] uppercase tracking-wide">
                  Days Since Last Workout
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  {workoutStats.freshMuscleGroups}
                </div>
                <div className="text-[10px] text-[#666] uppercase tracking-wide">
                  Fresh Muscle Groups
                </div>
              </div>
            </div>
          </div>
          
          {/* Body Diagram */}
          <BodyDiagram />
          
          {/* Progress Info at Bottom */}
          <div className="p-5 border-t border-[#1a1a1a] bg-[#0f0f0f]">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-[#666]" />
                <div>
                  <div className="text-xs text-[#666] mb-0.5">Weight</div>
                  <div className="text-sm font-semibold text-white">
                    {weightData.current ? `${weightData.current}kg` : "Not set"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-[#666]" />
                <div>
                  <div className="text-xs text-[#666] mb-0.5">Total Workouts</div>
                  <div className="text-sm font-semibold text-white">{workoutStats.total}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-[#666]" />
                <div>
                  <div className="text-xs text-[#666] mb-0.5">This Week</div>
                  <div className="text-sm font-semibold text-white">{workoutStats.thisWeek}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-[#666]" />
                <div>
                  <div className="text-xs text-[#666] mb-0.5">Calories Today</div>
                  <div className="text-sm font-semibold text-white">
                    {caloriesData.current} / {caloriesData.goal}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Macros Chart */}
        <div className="bg-[#0a0a0a] rounded-lg p-5 border border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Macro Trends</h3>
              <p className="text-xs text-[#666]">7-day overview</p>
            </div>
            <Link
              href="/nutrition"
              className="text-xs text-[#666] hover:text-white transition-colors flex items-center gap-1"
            >
              View Details <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded bg-orange-500"></div>
              <span className="text-[#888]">Calories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded bg-blue-500"></div>
              <span className="text-[#888]">Protein</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded bg-purple-500"></div>
              <span className="text-[#888]">Carbs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded bg-teal-500"></div>
              <span className="text-[#888]">Fats</span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-24 relative">
            <svg width="100%" height="100%" className="overflow-visible">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((p) => (
                <line
                  key={p}
                  x1="0"
                  y1={`${p}%`}
                  x2="100%"
                  y2={`${p}%`}
                  stroke="#1a1a1a"
                  strokeWidth="1"
                />
              ))}

              {/* Goal line */}
              <line
                x1="0"
                y1="8.33%"
                x2="100%"
                y2="8.33%"
                stroke="#444"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.5"
              />

              {/* Bars */}
              {normalizedMacroData.calories.length > 0 && normalizedMacroData.calories.map((_, timeIndex) => {
                const barWidth = 100 / normalizedMacroData.calories.length;
                const barCenter = (timeIndex * barWidth) + (barWidth / 2);
                const lineSpacing = barWidth * 0.15;
                const lineWidth = barWidth * 0.12;
                
                const calValue = normalizedMacroData.calories[timeIndex]?.value || 0;
                const proValue = normalizedMacroData.protein[timeIndex]?.value || 0;
                const carbValue = normalizedMacroData.carbs[timeIndex]?.value || 0;
                const fatValue = normalizedMacroData.fats[timeIndex]?.value || 0;
                
                const calHeight = (calValue / maxChartValue) * 90;
                const proHeight = (proValue / maxChartValue) * 90;
                const carbHeight = (carbValue / maxChartValue) * 90;
                const fatHeight = (fatValue / maxChartValue) * 90;
                
                const calX = barCenter - (lineSpacing * 1.5);
                const proX = barCenter - (lineSpacing * 0.5);
                const carbX = barCenter + (lineSpacing * 0.5);
                const fatX = barCenter + (lineSpacing * 1.5);
                
                return (
                  <g key={timeIndex}>
                    {calHeight > 0 && (
                      <rect
                        x={`${calX - lineWidth / 2}%`}
                        y={`${100 - calHeight}%`}
                        width={`${lineWidth}%`}
                        height={`${calHeight}%`}
                        fill="#f97316"
                        rx="1"
                      />
                    )}
                    {proHeight > 0 && (
                      <rect
                        x={`${proX - lineWidth / 2}%`}
                        y={`${100 - proHeight}%`}
                        width={`${lineWidth}%`}
                        height={`${proHeight}%`}
                        fill="#3b82f6"
                        rx="1"
                      />
                    )}
                    {carbHeight > 0 && (
                      <rect
                        x={`${carbX - lineWidth / 2}%`}
                        y={`${100 - carbHeight}%`}
                        width={`${lineWidth}%`}
                        height={`${carbHeight}%`}
                        fill="#8b5cf6"
                        rx="1"
                      />
                    )}
                    {fatHeight > 0 && (
                      <rect
                        x={`${fatX - lineWidth / 2}%`}
                        y={`${100 - fatHeight}%`}
                        width={`${lineWidth}%`}
                        height={`${fatHeight}%`}
                        fill="#14b8a6"
                        rx="1"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Day labels */}
          {normalizedMacroData.calories.length > 0 && (
            <div className="flex justify-between mt-3 text-[10px] text-[#666]">
              {normalizedMacroData.calories.map((d, i) => (
                <span key={i} className="flex-1 text-center">{d.day}</span>
              ))}
            </div>
          )}
        </div>

        {/* Goals Overview */}
        {(dailyGoalsData.length > 0 || longTermGoalsData.length > 0) && (
          <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
            <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
              <h3 className="text-base font-semibold text-white">Goals</h3>
              <Link
                href="/goals"
                className="text-xs text-[#666] hover:text-white transition-colors flex items-center gap-1"
              >
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="divide-y divide-[#1a1a1a]">
              {[...dailyGoalsData, ...longTermGoalsData].slice(0, 4).map((goal: any) => {
                const percentage = goal.target > 0 
                  ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                  : 0;
                const isLongTerm = goal.goalType === "long-term" || !goal.goalType;
                const isCompleted = percentage >= 100;
                
                return (
                  <Link
                    key={goal.id}
                    href="/goals"
                    className="block p-5 hover:bg-[#0f0f0f] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Target className="w-4 h-4 text-[#666]" />
                          )}
                          <span className="text-sm font-medium text-white">{goal.title}</span>
                          {isLongTerm && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] text-[#888] rounded">
                              Long-term
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#666] ml-6">
                          {goal.current} {goal.unit} / {goal.target} {goal.unit}
                        </div>
                      </div>
                      <div className={`text-lg font-semibold ${
                        isCompleted ? "text-green-500" : "text-white"
                      }`}>
                        {percentage}%
                      </div>
                    </div>
                    <div className="ml-6 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCompleted ? "bg-green-500" : "bg-white"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Evaluation */}
        <div className="bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
          <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-white" />
              <h3 className="text-base font-semibold text-white">AI Evaluation</h3>
            </div>
            <button
              onClick={generateAIEvaluation}
              disabled={isLoadingEvaluation}
              className="text-xs text-[#666] hover:text-white disabled:opacity-50 transition-colors"
            >
              {isLoadingEvaluation ? "Analyzing..." : "Refresh"}
            </button>
          </div>
          
          <div className="p-5">
            {isLoadingEvaluation ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-[#666] animate-spin" />
              </div>
            ) : evaluationError ? (
              <div className="text-sm text-red-400">
                {evaluationError}
              </div>
            ) : aiEvaluation ? (
              <p className="text-sm text-[#ccc] leading-relaxed">
                {aiEvaluation}
              </p>
            ) : (
              <div className="text-sm text-[#666]">
                Generating evaluation...
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
