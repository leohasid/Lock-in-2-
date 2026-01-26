"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { 
  CheckCircle2, Calendar, 
  Check, Play, Sparkles, Plus, X, TrendingUp, List
} from "lucide-react";

interface Goal {
  id: string;
  type: string;
  goalType: "daily" | "long-term";
  title: string;
  current: number;
  target: number;
  unit: string;
  targetDate: string;
  lastUpdated?: string;
}

interface Task {
  id: string;
  name: string;
  completed: boolean;
}

export default function Home() {
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [strengthIncrease, setStrengthIncrease] = useState<number | null>(null);
      
  // Load goals from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedGoals = localStorage.getItem("goals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        const todayStr = new Date().toISOString().split("T")[0];
        
        const updatedGoals = goals.map((goal: Goal) => {
          if (goal.goalType === "daily" && goal.lastUpdated !== todayStr) {
            return { ...goal, current: 0, lastUpdated: todayStr };
          }
          return goal;
        });
        
        const hasChanges = updatedGoals.some((g: Goal, i: number) => 
          g.current !== goals[i]?.current || g.lastUpdated !== goals[i]?.lastUpdated
        );
        
        if (hasChanges) {
          setAllGoals(updatedGoals);
          localStorage.setItem("goals", JSON.stringify(updatedGoals));
        } else {
          setAllGoals(goals);
        }
      } catch (e) {
        setAllGoals([]);
      }
    }
  }, []);

  // Load tasks from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTasks = localStorage.getItem("scheduleTasks");
    if (storedTasks) {
      try {
        setTasks(JSON.parse(storedTasks));
      } catch (e) {
        setTasks([]);
      }
    }
  }, []);

  // Calculate strength increase from workout data
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const calculateStrengthIncrease = () => {
      // Get all workout data keys
      const workoutKeys = Object.keys(localStorage).filter(key => key.startsWith("workout_data_"));
      
      if (workoutKeys.length < 2) {
        setStrengthIncrease(null);
        return;
      }

      // Sort by date
      const sortedKeys = workoutKeys.sort();
      const firstWorkout = sortedKeys[0];
      const lastWorkout = sortedKeys[sortedKeys.length - 1];

      try {
        const firstData = JSON.parse(localStorage.getItem(firstWorkout) || "[]");
        const lastData = JSON.parse(localStorage.getItem(lastWorkout) || "[]");

        // Calculate average weight per exercise for first and last workouts
        const getAverageWeight = (data: any[]) => {
          let totalWeight = 0;
          let totalSets = 0;
          data.forEach((ex: any) => {
            ex.sets?.forEach((set: any) => {
              if (set.completed && set.weight > 0) {
                totalWeight += set.weight;
                totalSets += 1;
              }
            });
          });
          return totalSets > 0 ? totalWeight / totalSets : 0;
        };

        const firstAvg = getAverageWeight(firstData);
        const lastAvg = getAverageWeight(lastData);

        if (firstAvg > 0 && lastAvg > 0) {
          const increase = ((lastAvg - firstAvg) / firstAvg) * 100;
          setStrengthIncrease(increase);
        } else {
          setStrengthIncrease(null);
        }
      } catch (e) {
        setStrengthIncrease(null);
      }
    };

    calculateStrengthIncrease();
  }, []);

  const dailyGoals = allGoals.filter(goal => goal.goalType === "daily");
  const longTermGoals = allGoals.filter(goal => goal.goalType === "long-term");

  // Filter goals by time period
  const weeklyGoals = longTermGoals.filter(goal => {
    if (!goal.targetDate) return false;
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7 && daysDiff > 0;
  });

  const monthlyGoals = longTermGoals.filter(goal => {
    if (!goal.targetDate) return false;
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysDiff = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 30 && daysDiff > 7;
  });


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Calculate savings goal progress (mock - you can enhance this)
  const savingsGoal = longTermGoals.find(g => g.type === "financial");
  const savingsProgress = savingsGoal ? Math.min(savingsGoal.current / savingsGoal.target, 1) : 0.75;

  const handleMarkComplete = (goalId: string) => {
    const updatedGoals = allGoals.map(g => {
      if (g.id === goalId && g.goalType === "daily") {
        return { ...g, current: g.target, lastUpdated: new Date().toISOString().split("T")[0] };
      }
      return g;
    });
    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
  };

  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      name: newTaskName.trim(),
      completed: false,
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    localStorage.setItem("scheduleTasks", JSON.stringify(updatedTasks));
    setNewTaskName("");
    setShowTaskInput(false);
  };

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    localStorage.setItem("scheduleTasks", JSON.stringify(updatedTasks));
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem("scheduleTasks", JSON.stringify(updatedTasks));
  };


  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto pb-20">
      {/* Header */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <Link
            href="/consultation?from=reflection"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/50 rounded-lg text-cyan-400 text-xs font-medium transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            AI Reflection
          </Link>
          <h1 className="text-base font-semibold text-white">Goals Dashboard</h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>

        <div className="px-4 space-y-3">
          {/* Schedule Tasks Section */}
          <div className="bg-gray-900/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <List className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Schedule Tasks</h2>
            </div>
            <div className="space-y-1.5 mb-2">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 bg-black/60 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        onClick={() => handleToggleTask(task.id)}
                        className={`w-4 h-4 border-2 rounded cursor-pointer ${
                          task.completed
                            ? "bg-cyan-400 border-cyan-400 flex items-center justify-center"
                            : "border-gray-500"
                        }`}
                      >
                        {task.completed && <Check className="w-2.5 h-2.5 text-black" />}
                      </div>
                      <span
                        className={`text-white text-xs flex-1 ${
                          task.completed ? "line-through text-gray-500" : ""
                        }`}
                      >
                        {task.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-2 bg-black/60 rounded-lg text-gray-400 text-center text-xs">
                  No tasks yet
                </div>
              )}
            </div>
            {showTaskInput ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddTask();
                    }
                  }}
                  placeholder="Task name..."
                  className="flex-1 bg-black/60 border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
                <button
                  onClick={handleAddTask}
                  className="px-3 py-2 bg-cyan-400 hover:bg-cyan-500 text-black text-xs font-medium rounded-lg transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowTaskInput(false);
                    setNewTaskName("");
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTaskInput(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/50 rounded-lg text-cyan-400 text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Task
              </button>
            )}
          </div>

          {/* Daily Goals Section */}
          <div className="bg-gray-900/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <CheckCircle2 className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-0.5 bg-cyan-400 rounded-full" />
                </div>
                <h2 className="text-sm font-semibold text-white">Daily Goals</h2>
        </div>
        <Link
                href="/goals?filter=daily"
                className="text-xs font-medium text-cyan-400"
        >
                View All
        </Link>
        </div>

            <div className="space-y-1.5">
              {dailyGoals.length > 0 ? (
                dailyGoals.slice(0, 3).map((goal) => {
                  const isCompleted = goal.current >= goal.target;
                  return (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between p-2 bg-black/60 rounded-lg"
                    >
          <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 border-2 rounded ${
                          isCompleted 
                            ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                            : "border-gray-500"
                        }`}>
                          {isCompleted && <Check className="w-2.5 h-2.5 text-black" />}
                        </div>
                        <span className="text-white text-xs">{goal.title}</span>
                      </div>
                      {!isCompleted && (
                        <button
                          onClick={() => handleMarkComplete(goal.id)}
                          className="px-2 py-0.5 bg-gray-700 text-white text-[10px] rounded hover:bg-gray-600 transition-colors"
                        >
                          Mark
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-2 bg-black/60 rounded-lg text-gray-400 text-center text-xs">
                  No daily goals yet
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Goals Section */}
          <div className="bg-gray-900/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="relative">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <Play className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-0.5 bg-cyan-400 rounded-full" />
              </div>
              <h2 className="text-sm font-semibold text-white">Scheduled Goals</h2>
            </div>

            {/* Weekly Goals */}
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-white mb-1">Weekly Goals</h3>
              {weeklyGoals.length > 0 ? (
                <div className="p-2 bg-black/60 rounded-lg">
          <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 border-2 rounded flex-shrink-0 ${
                      weeklyGoals[0].current >= weeklyGoals[0].target
                        ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                        : "border-gray-500"
                    }`}>
                      {weeklyGoals[0].current >= weeklyGoals[0].target && <Check className="w-2.5 h-2.5 text-black" />}
          </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-xs block truncate">{weeklyGoals[0].title}</span>
                      {weeklyGoals[0].targetDate && (
                        <p className="text-gray-400 text-[10px]">Due: {formatDate(weeklyGoals[0].targetDate)}</p>
                      )}
          </div>
          </div>
        </div>
              ) : (
                <div className="p-2 bg-black/60 rounded-lg text-gray-400 text-center text-xs">
                  No weekly goals yet
                </div>
              )}
            </div>

            {/* Monthly Goals */}
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-white mb-1">Monthly Goals</h3>
              {monthlyGoals.length > 0 ? (
                <div className="p-2 bg-black/60 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 border-2 rounded flex-shrink-0 ${
                      monthlyGoals[0].current >= monthlyGoals[0].target
                        ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                        : "border-gray-500"
                    }`}>
                      {monthlyGoals[0].current >= monthlyGoals[0].target && <Check className="w-2.5 h-2.5 text-black" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-xs block truncate">{monthlyGoals[0].title}</span>
                      {monthlyGoals[0].targetDate && (
                        <p className="text-gray-400 text-[10px]">Due: {formatDate(monthlyGoals[0].targetDate)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-black/60 rounded-lg text-gray-400 text-center text-xs">
                  No monthly goals yet
                </div>
                  )}
            </div>

            {/* Long-Term Goals */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-white">Long-Term Goals</h3>
                {longTermGoals.length > 1 && (
                  <Link 
                    href="/goals"
                    className="text-xs font-medium text-cyan-400"
                  >
                    View All
                  </Link>
                  )}
              </div>
              {longTermGoals.length > 0 ? (
                <div className="p-2 bg-black/60 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 border-2 rounded flex-shrink-0 ${
                      longTermGoals[0].current >= longTermGoals[0].target
                        ? "bg-cyan-400 border-cyan-400 flex items-center justify-center" 
                        : "border-gray-500"
                    }`}>
                      {longTermGoals[0].current >= longTermGoals[0].target && <Check className="w-2.5 h-2.5 text-black" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-xs block truncate">{longTermGoals[0].title}</span>
                      {longTermGoals[0].targetDate && (
                        <p className="text-gray-400 text-[10px]">Due: {formatDate(longTermGoals[0].targetDate)}</p>
                      )}
                    </div>
                  </div>
        </div>
              ) : (
                <div className="p-2 bg-black/60 rounded-lg text-gray-400 text-center text-xs">
                  No long-term goals yet
          </div>
        )}
            </div>
          </div>

          {/* Strength Increase Chart */}
          {strengthIncrease !== null && (
            <div className="bg-gray-900/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Strength Progress</h2>
              </div>
              <div className="p-3 bg-black/60 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-xs">Overall Increase</span>
                  <span className={`text-sm font-bold ${
                    strengthIncrease >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    {strengthIncrease >= 0 ? "+" : ""}{strengthIncrease.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      strengthIncrease >= 0 ? "bg-green-400" : "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(Math.abs(strengthIncrease), 100)}%` }}
                  />
                </div>
                <p className="text-gray-400 text-[10px] mt-2">
                  Based on weight progression from workouts
                </p>
              </div>
            </div>
          )}

        </div>
        </div>

      <BottomNav />
    </div>
  );
}
