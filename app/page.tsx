"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { 
  Target, Calendar, CheckCircle2, Info, 
  ChevronRight, Dumbbell, Scale, TrendingUp, TrendingDown,
  FileText, Zap
} from "lucide-react";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [today] = useState(new Date());

  // Get streak count
  const streakCount = useMemo(() => {
    if (typeof window === "undefined") return 0;
    let streak = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const completed = localStorage.getItem(`workout_${dateStr}`) === "completed" || 
                       (localStorage.getItem(`workout_${dateStr}`) && localStorage.getItem(`workout_${dateStr}`) !== "null");
      
      if (completed) {
        streak++;
      } else if (i === 0) {
        break;
      }
    }
    
    return streak;
  }, [refreshTrigger]);

  // Get workout recommendation (determine which muscle groups to train)
  const workoutRecommendation = useMemo(() => {
    if (typeof window === "undefined") return { muscleGroups: "CHEST & TRICEPS", time: 42, recovered: true, fatigueRisk: "Low" };
    
    // Simple logic: if no workout in 3+ days, recommend chest & triceps
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    let daysSinceLast = null;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const completed = localStorage.getItem(`workout_${dateStr}`) === "completed" || 
                       (localStorage.getItem(`workout_${dateStr}`) && localStorage.getItem(`workout_${dateStr}`) !== "null");
      
      if (completed) {
        daysSinceLast = i;
        break;
      }
    }
    
    return {
      muscleGroups: "CHEST & TRICEPS",
      time: 42,
      recovered: daysSinceLast === null || daysSinceLast >= 3,
      fatigueRisk: "Low"
    };
  }, [refreshTrigger]);

  // Get body recovery stats
  const recoveryStats = useMemo(() => {
    if (typeof window === "undefined") return { daysSinceChest: 3, recovered: true, estFat: 45, muscleGroupsRecovered: 5 };
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    let daysSinceChest = 3; // Default
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const completed = localStorage.getItem(`workout_${dateStr}`) === "completed" || 
                       (localStorage.getItem(`workout_${dateStr}`) && localStorage.getItem(`workout_${dateStr}`) !== "null");
      
      if (completed) {
        daysSinceChest = i;
        break;
      }
    }
    
    return {
      daysSinceChest: daysSinceChest >= 3 ? 3 : daysSinceChest,
      recovered: daysSinceChest >= 3,
      estFat: 45,
      muscleGroupsRecovered: 5
    };
  }, [refreshTrigger]);

  // Get today's goals
  const todayGoals = useMemo(() => {
    if (typeof window === "undefined") return [];
    const storedGoals = localStorage.getItem("goals");
    if (!storedGoals) return [];
    
    try {
      const goals = JSON.parse(storedGoals);
      // Return first 3 goals with progress
      return goals.slice(0, 3).map((goal: any) => {
        const percentage = goal.target > 0 
          ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
          : 0;
        return { ...goal, percentage };
      });
    } catch (e) {
      return [];
    }
  }, [refreshTrigger]);

  // Get readiness score and weight change
  const readinessData = useMemo(() => {
    if (typeof window === "undefined") return { score: 78, change: 6, weightChange: -1.2 };
    
    // Calculate readiness based on recent workouts, recovery, etc.
    const score = 78; // Default
    const change = 6; // +6%
    
    // Get weight change
    const weightEntries = localStorage.getItem("weightEntries");
    let weightChange = 0;
    if (weightEntries) {
      try {
        const entries = JSON.parse(weightEntries);
        if (entries.length >= 2) {
          const sorted = entries.sort((a: any, b: any) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          weightChange = sorted[0].weight - sorted[1].weight;
        }
      } catch (e) {}
    }
    
    return { score, change, weightChange: weightChange !== 0 ? weightChange : -1.2 };
  }, [refreshTrigger]);

  // Refresh data periodically
  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Body diagram component - TEMPORARY: High-quality SVG placeholder
  // TODO: Replace with actual PNG/WebP image asset at /public/body-diagram.png
  // This SVG is a realistic placeholder until the proper image asset is added
  const BodyDiagram = ({ highlightChest = true }: { highlightChest?: boolean }) => {
    const [imageError, setImageError] = useState(false);
    
    // Try to load the image first
    if (!imageError) {
      return (
        <div className="relative w-[120px] h-[200px] flex-shrink-0 flex items-center justify-center">
          <img
            src="/body-diagram.png"
            alt="Body diagram"
            className="w-full h-full object-contain"
            style={{
              filter: highlightChest 
                ? 'drop-shadow(0 0 12px rgba(255, 68, 68, 0.4)) drop-shadow(0 0 6px rgba(255, 153, 153, 0.3))'
                : 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.3))',
              transition: 'filter 0.3s ease'
            } as React.CSSProperties}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }
    
    // High-quality realistic SVG placeholder with proper anatomy
    const baseColor = "#2a2a2a";
    const darkBase = "#1f1f1f";
    const lightRed = highlightChest ? "#ff9999" : baseColor;
    const darkRed = highlightChest ? "#ff4444" : baseColor;
    const chestColor = highlightChest ? "#ff8888" : baseColor;
    
    return (
      <div className="relative w-[120px] h-[200px] flex-shrink-0 flex items-center justify-center">
        <svg width="120" height="200" viewBox="0 0 120 200" className="w-full h-full">
          <defs>
            {/* Gradients for realistic shading */}
            <linearGradient id="chestGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={highlightChest ? "#ffaaaa" : baseColor} />
              <stop offset="50%" stopColor={chestColor} />
              <stop offset="100%" stopColor={highlightChest ? "#ff6666" : darkBase} />
            </linearGradient>
            <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={highlightChest ? "#ff5555" : baseColor} />
              <stop offset="50%" stopColor={darkRed} />
              <stop offset="100%" stopColor={highlightChest ? "#ff3333" : darkBase} />
            </linearGradient>
            <linearGradient id="absGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={highlightChest ? "#ffaaaa" : baseColor} />
              <stop offset="30%" stopColor={lightRed} />
              <stop offset="70%" stopColor={lightRed} />
              <stop offset="100%" stopColor={highlightChest ? "#ff6666" : darkBase} />
            </linearGradient>
            <radialGradient id="shoulderGrad" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#3a3a3a" />
              <stop offset="100%" stopColor={baseColor} />
            </radialGradient>
          </defs>
          
          {/* Head - rounded, realistic */}
          <ellipse cx="60" cy="15" rx="14" ry="18" fill={baseColor} />
          <ellipse cx="60" cy="18" rx="10" ry="12" fill="#252525" opacity="0.6" />
          
          {/* Neck - with subtle shading */}
          <rect x="54" y="33" width="12" height="10" rx="2" fill={baseColor} />
          <rect x="56" y="35" width="8" height="6" fill="#252525" opacity="0.4" />
          
          {/* Shoulders - realistic shape with gradient */}
          <ellipse cx="42" cy="48" rx="12" ry="8" fill="url(#shoulderGrad)" />
          <ellipse cx="78" cy="48" rx="12" ry="8" fill="url(#shoulderGrad)" />
          
          {/* Chest - highlighted with gradient when fresh */}
          <ellipse cx="60" cy="62" rx="22" ry="16" fill="url(#chestGrad)" />
          <ellipse cx="60" cy="60" rx="18" ry="12" fill={chestColor} opacity="0.7" />
          {/* Chest definition lines */}
          {highlightChest && (
            <>
              <line x1="50" y1="58" x2="70" y2="58" stroke="#ffaaaa" strokeWidth="0.5" opacity="0.4" />
              <line x1="50" y1="62" x2="70" y2="62" stroke="#ffaaaa" strokeWidth="0.5" opacity="0.4" />
            </>
          )}
          
          {/* Biceps - upper arm, highlighted */}
          <ellipse cx="32" cy="62" rx="6" ry="18" fill="url(#armGrad)" />
          <ellipse cx="88" cy="62" rx="6" ry="18" fill="url(#armGrad)" />
          {/* Bicep peak highlight */}
          {highlightChest && (
            <>
              <ellipse cx="32" cy="58" rx="4" ry="6" fill="#ff6666" opacity="0.6" />
              <ellipse cx="88" cy="58" rx="4" ry="6" fill="#ff6666" opacity="0.6" />
            </>
          )}
          
          {/* Triceps - back of arm */}
          <ellipse cx="32" cy="82" rx="5" ry="14" fill="url(#armGrad)" />
          <ellipse cx="88" cy="82" rx="5" ry="14" fill="url(#armGrad)" />
          
          {/* Forearms - dark grey, not highlighted */}
          <ellipse cx="32" cy="100" rx="4" ry="16" fill={baseColor} />
          <ellipse cx="88" cy="100" rx="4" ry="16" fill={baseColor} />
          <ellipse cx="32" cy="102" rx="3" ry="12" fill="#252525" opacity="0.5" />
          <ellipse cx="88" cy="102" rx="3" ry="12" fill="#252525" opacity="0.5" />
          
          {/* Abs/Six-pack - highlighted with gradient */}
          <rect x="48" y="80" width="24" height="24" rx="3" fill="url(#absGrad)" />
          {/* Six-pack definition - realistic lines */}
          {highlightChest ? (
            <>
              <line x1="52" y1="86" x2="68" y2="86" stroke="#ffaaaa" strokeWidth="0.8" opacity="0.5" />
              <line x1="52" y1="92" x2="68" y2="92" stroke="#ffaaaa" strokeWidth="0.8" opacity="0.5" />
              <line x1="52" y1="98" x2="68" y2="98" stroke="#ffaaaa" strokeWidth="0.8" opacity="0.5" />
              <line x1="60" y1="80" x2="60" y2="104" stroke="#ffaaaa" strokeWidth="0.8" opacity="0.5" />
            </>
          ) : (
            <>
              <line x1="52" y1="86" x2="68" y2="86" stroke="#444" strokeWidth="0.5" opacity="0.3" />
              <line x1="52" y1="92" x2="68" y2="92" stroke="#444" strokeWidth="0.5" opacity="0.3" />
              <line x1="52" y1="98" x2="68" y2="98" stroke="#444" strokeWidth="0.5" opacity="0.3" />
              <line x1="60" y1="80" x2="60" y2="104" stroke="#444" strokeWidth="0.5" opacity="0.3" />
            </>
          )}
          
          {/* Waist/Hips */}
          <ellipse cx="60" cy="108" rx="20" ry="8" fill={baseColor} />
          <ellipse cx="60" cy="110" rx="16" ry="6" fill="#252525" opacity="0.4" />
          
          {/* Quadriceps/Thighs - highlighted */}
          <ellipse cx="52" cy="135" rx="7" ry="28" fill={highlightChest ? darkRed : baseColor} />
          <ellipse cx="68" cy="135" rx="7" ry="28" fill={highlightChest ? darkRed : baseColor} />
          {/* Quad definition */}
          {highlightChest && (
            <>
              <ellipse cx="52" cy="130" rx="5" ry="8" fill="#ff5555" opacity="0.5" />
              <ellipse cx="68" cy="130" rx="5" ry="8" fill="#ff5555" opacity="0.5" />
            </>
          )}
          
          {/* Lower legs - dark grey */}
          <ellipse cx="52" cy="170" rx="6" ry="28" fill={baseColor} />
          <ellipse cx="68" cy="170" rx="6" ry="28" fill={baseColor} />
          <ellipse cx="52" cy="172" rx="4" ry="22" fill="#252525" opacity="0.5" />
          <ellipse cx="68" cy="172" rx="4" ry="22" fill="#252525" opacity="0.5" />
          
          {/* Feet */}
          <ellipse cx="52" cy="200" rx="5" ry="8" fill={baseColor} />
          <ellipse cx="68" cy="200" rx="5" ry="8" fill={baseColor} />
        </svg>
      </div>
    );
  };

  // Circular readiness gauge component
  const ReadinessGauge = ({ score, percentage }: { score: number; percentage: number }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="relative w-24 h-24">
        <svg className="transform -rotate-90" width="96" height="96">
          {/* Background circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="#1a1a1a"
            strokeWidth="6"
            fill="none"
          />
          {/* Progress circle with gradient */}
          <defs>
            <linearGradient id="readinessGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4444" />
              <stop offset="100%" stopColor="#ff9999" />
            </linearGradient>
          </defs>
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="url(#readinessGradient)"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white">{score}</div>
          <div className="text-[10px] text-[#888] mt-0.5">Readiness Score</div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 pt-4 pb-24">
      {/* Top Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Stay Locked In</h1>
            <p className="text-sm text-white/80">
              You're on a {streakCount}-day streak <ChevronRight className="w-4 h-4 inline" />
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/goals" className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-1 border border-[#2a2a2a]">
                <Target className="w-5 h-5 text-[#ff4444]" />
              </div>
              <span className="text-[10px] text-[#888]">Goals</span>
            </Link>
            <Link href="/reflections" className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-1 border border-[#2a2a2a]">
                <FileText className="w-5 h-5 text-[#ff4444]" />
              </div>
              <span className="text-[10px] text-[#888]">Reflection</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {/* Today's Recommendation Card */}
        <div className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] rounded-2xl p-5 border border-[#2a2a2a] relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff4444]/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-sm font-medium text-[#888] mb-4">Today's Recommendation</h2>
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Dumbbell className="w-5 h-5 text-[#ff4444]" />
                  <span className="text-xl font-bold text-white">{workoutRecommendation.muscleGroups}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${workoutRecommendation.recovered ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-white">Fully Recovered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-white">Fst: time: {workoutRecommendation.time} min</span>
                    <Info className="w-3 h-3 text-[#888]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-[#888]">Fatigue risk: {workoutRecommendation.fatigueRisk}</span>
                  </div>
                </div>
              </div>
              
              {/* Body diagram on right - high-quality image asset */}
              <div className="flex-shrink-0 ml-4 flex items-center justify-center">
                <BodyDiagram highlightChest={workoutRecommendation.recovered} />
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <Link
                href="/gym"
                className="flex-1 bg-gradient-to-r from-[#ff4444] to-[#ff6666] text-white font-semibold py-3 px-4 rounded-xl text-center hover:from-[#ff5555] hover:to-[#ff7777] transition-all shadow-lg shadow-[#ff4444]/20"
              >
                Start Recommended Workout
              </Link>
              <button className="px-4 py-3 border border-[#2a2a2a] rounded-xl text-white text-sm font-medium hover:border-[#3a3a3a] transition-colors">
                Change Plan
              </button>
            </div>
          </div>
        </div>

        {/* Today's Goals */}
        <div className="bg-[#0a0a0a] rounded-2xl p-5 border border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Today's Goals</h2>
            <button className="text-xs text-[#888] hover:text-white transition-colors">
              + Add Goal Based on Today <ChevronRight className="w-3 h-3 inline" />
            </button>
          </div>
          
          {todayGoals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-[#666] mb-2">No goals set for today</p>
              <Link href="/goals" className="text-xs text-[#ff4444] hover:text-[#ff6666]">
                + Add New Goal
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {todayGoals.map((goal: any, idx: number) => {
                const iconColors = ["#ff4444", "#ffaa00", "#3b82f6"];
                const icons = [Target, Dumbbell, Zap];
                const Icon = icons[idx] || Target;
                
                // Format display value based on goal type
                let displayValue = `${goal.percentage}%`;
                if (goal.unit === "kg" && goal.target > 0) {
                  displayValue = `${goal.current} / ${goal.target}`;
                } else if (goal.title.toLowerCase().includes("train") && goal.target > 0) {
                  displayValue = `${goal.current} / ${goal.target}`;
                } else if (goal.title.toLowerCase().includes("step") && goal.target > 0) {
                  const currentK = (goal.current / 1000).toFixed(1);
                  const targetK = (goal.target / 1000).toFixed(0);
                  displayValue = `${currentK}k / ${targetK}k`;
                }
                
                return (
                  <Link
                    key={goal.id}
                    href="/goals"
                    className="block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center border border-[#2a2a2a]">
                        <Icon className="w-4 h-4" style={{ color: iconColors[idx] || "#ff4444" }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white mb-2">{goal.title}</div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${goal.percentage}%`,
                              background: `linear-gradient(to right, ${iconColors[idx] || "#ff4444"}, ${iconColors[idx] || "#ff4444"}dd)`
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {displayValue} <ChevronRight className="w-3 h-3 inline" />
                      </div>
                    </div>
                  </Link>
                );
              })}
              <Link
                href="/goals"
                className="block text-center text-xs text-[#888] hover:text-white transition-colors pt-2"
              >
                + Add New Goal
              </Link>
            </div>
          )}
        </div>

        {/* Body Recovery */}
        <div className="bg-[#0a0a0a] rounded-2xl p-5 border border-[#1a1a1a]">
          <h2 className="text-base font-semibold text-white mb-4">Body Recovery</h2>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-semibold text-white mb-1">
                {recoveryStats.daysSinceChest} DAYS SINCE LAST CHEST WORKOUT
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${recoveryStats.recovered ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-sm text-white">Fully Recovered</span>
              </div>
              <div className="text-xs text-[#888]">Est. fat {recoveryStats.estFat}</div>
            </div>
            
            <div className="text-right mr-4">
              <div className="text-sm font-semibold text-white mb-1">
                {recoveryStats.muscleGroupsRecovered} MUSCLE GROUPS RECOVERED
              </div>
            </div>
            
            {/* Body diagram - high-quality image asset */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <BodyDiagram highlightChest={recoveryStats.recovered} />
            </div>
          </div>
        </div>

        {/* Readiness Score */}
        <div className="bg-[#0a0a0a] rounded-2xl p-5 border border-[#1a1a1a]">
          <div className="flex items-center gap-6">
            {/* Circular gauge */}
            <ReadinessGauge score={readinessData.score} percentage={78} />
            
            {/* Stats */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="text-lg font-bold text-white mb-0.5">
                  {readinessData.change > 0 ? '+' : ''}{readinessData.change}%
                </div>
                <div className="text-xs text-[#888]">Readiness Score</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white mb-0.5">
                  {readinessData.weightChange > 0 ? '+' : ''}{readinessData.weightChange.toFixed(1)} kg
                </div>
                <div className="text-xs text-[#888]">Body weight</div>
              </div>
            </div>
          </div>
          
          {/* Recommendation */}
          <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
            <p className="text-sm text-white">Push intensity today</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
