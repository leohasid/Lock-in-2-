"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import GoalProgressCard from "@/components/GoalProgressCard";
import { ArrowLeft, Edit2, Check, X, Plus, Trash2 } from "lucide-react";

interface Goal {
  id: string;
  type: string; // "financial", "fitness", "health", "learning", "other"
  goalType: "daily" | "long-term"; // Daily or long-term goal
  title: string;
  current: number;
  target: number;
  unit: string;
  targetDate: string; // ISO date string (only for long-term goals)
  lastUpdated?: string; // ISO date string for daily goals to track when they reset
}

const GOAL_TYPES = [
  { value: "financial", label: "Financial", question: "How much are you planning on making?", unit: "$" },
  { value: "fitness", label: "Fitness", question: "What's your fitness target?", unit: "kg" },
  { value: "health", label: "Health", question: "What's your health goal?", unit: "" },
  { value: "learning", label: "Learning", question: "What do you want to learn?", unit: "hours" },
  { value: "other", label: "Other", question: "What's your goal?", unit: "" },
];

export default function GoalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState("");
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalTypeFilter, setGoalTypeFilter] = useState<"daily" | "long-term" | "all">(() => {
    const filter = searchParams.get("filter");
    if (filter === "daily" || filter === "long-term") {
      return filter;
    }
    return "all";
  });
  const [formData, setFormData] = useState({
    goalType: "long-term" as "daily" | "long-term",
    type: "",
    title: "",
    current: "",
    target: "",
    unit: "",
    targetDate: "",
  });

  // Load goals from localStorage and reset daily goals if needed
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedGoals = localStorage.getItem("goals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        const todayStr = new Date().toISOString().split("T")[0];
        
        // Reset daily goals if it's a new day
        const updatedGoals = goals.map((goal: Goal) => {
          if (goal.goalType === "daily" && goal.lastUpdated !== todayStr) {
            return { ...goal, current: 0, lastUpdated: todayStr };
          }
          return goal;
        });
        
        // Only update if there were changes
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

    // Load selected goals for home screen
    const storedSelected = localStorage.getItem("selectedGoalsForHome");
    if (storedSelected) {
      try {
        const selected = JSON.parse(storedSelected);
        setSelectedGoalIds(selected);
      } catch (e) {
        setSelectedGoalIds([]);
      }
    }
  }, []);

  const handleSave = () => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedGoalsForHome", JSON.stringify(selectedGoalIds));
    setIsEditing(false);
  };

  const handleToggleSelection = (goalId: string) => {
    if (selectedGoalIds.includes(goalId)) {
      setSelectedGoalIds(prev => prev.filter(id => id !== goalId));
    } else {
      setSelectedGoalIds(prev => [...prev, goalId]);
    }
  };

  // Helper function to parse value with "k" notation
  const parseValue = (value: string): number => {
    if (!value || value.trim() === "") return 0;
    const trimmed = value.trim().toLowerCase();
    if (trimmed.endsWith("k")) {
      const num = parseFloat(trimmed.slice(0, -1));
      return isNaN(num) ? 0 : num * 1000;
    }
    const num = parseFloat(trimmed);
    return isNaN(num) ? 0 : num;
  };

  const handleAddGoal = () => {
    if (!formData.type || !formData.target) {
      alert("Please fill in all required fields");
      return;
    }

    // Long-term goals require a target date
    if (formData.goalType === "long-term" && !formData.targetDate) {
      alert("Please select a target date for long-term goals");
      return;
    }

    const goalType = GOAL_TYPES.find(t => t.value === formData.type);
    const unit = formData.unit || goalType?.unit || "";
    const targetValue = parseValue(formData.target);
    const currentValue = parseValue(formData.current);

    if (targetValue <= 0) {
      alert("Target must be greater than 0");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      type: formData.type,
      goalType: formData.goalType,
      title: formData.title || goalType?.label || "Goal",
      current: currentValue,
      target: targetValue,
      unit: unit,
      targetDate: formData.goalType === "daily" ? "" : formData.targetDate,
      lastUpdated: formData.goalType === "daily" ? todayStr : undefined,
    };

    const updatedGoals = [...allGoals, newGoal];
    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
    
    setFormData({ goalType: "long-term", type: "", title: "", current: "", target: "", unit: "", targetDate: "" });
    setShowAddForm(false);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      goalType: goal.goalType || "long-term",
      type: goal.type || "",
      title: goal.title,
      current: goal.current > 0 ? goal.current.toString() : "",
      target: goal.target > 0 ? goal.target.toString() : "",
      unit: goal.unit,
      targetDate: goal.targetDate || "",
    });
    setShowAddForm(true);
  };

  const handleUpdateGoal = () => {
    if (!editingGoal || !formData.type || !formData.target) {
      alert("Please fill in all required fields");
      return;
    }

    // Long-term goals require a target date
    if (formData.goalType === "long-term" && !formData.targetDate) {
      alert("Please select a target date for long-term goals");
      return;
    }

    const goalType = GOAL_TYPES.find(t => t.value === formData.type);
    const unit = formData.unit || goalType?.unit || "";
    const targetValue = parseValue(formData.target);
    const currentValue = parseValue(formData.current);

    if (targetValue <= 0) {
      alert("Target must be greater than 0");
      return;
    }

    const updatedGoals = allGoals.map(g =>
      g.id === editingGoal.id
        ? {
            ...g,
            type: formData.type,
            goalType: formData.goalType,
            title: formData.title || goalType?.label || "Goal",
            current: currentValue,
            target: targetValue,
            unit: unit,
            targetDate: formData.goalType === "daily" ? "" : formData.targetDate,
          }
        : g
    );

    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
    
    setFormData({ goalType: "long-term", type: "", title: "", current: "", target: "", unit: "", targetDate: "" });
    setEditingGoal(null);
    setShowAddForm(false);
  };

  const handleOpenProgressModal = (goal: Goal) => {
    setSelectedGoalForProgress(goal);
    setProgressValue(goal.current > 0 ? goal.current.toString() : "");
    setShowProgressModal(true);
  };

  const handleSaveProgress = () => {
    if (!selectedGoalForProgress || !progressValue) return;
    
    const newCurrent = parseValue(progressValue);
    if (newCurrent < 0) {
      alert("Please enter a valid number");
      return;
    }

    handleUpdateProgress(selectedGoalForProgress.id, newCurrent);
    setShowProgressModal(false);
    setSelectedGoalForProgress(null);
    setProgressValue("");
  };

  const handleDeleteGoal = (goalId: string) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      const updatedGoals = allGoals.filter(g => g.id !== goalId);
      setAllGoals(updatedGoals);
      localStorage.setItem("goals", JSON.stringify(updatedGoals));
      
      // Remove from selected if it was selected
      setSelectedGoalIds(prev => prev.filter(id => id !== goalId));
    }
  };

  const handleUpdateProgress = (goalId: string, newCurrent: number) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const updatedGoals = allGoals.map(g => {
      if (g.id === goalId) {
        const updated = { ...g, current: Math.max(0, Math.min(newCurrent, g.target)) };
        // Update lastUpdated for daily goals
        if (g.goalType === "daily") {
          updated.lastUpdated = todayStr;
        }
        return updated;
      }
      return g;
    });
    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
  };

  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white p-6 flex flex-col">
      {/* Tab Selection Bar - Same as Home page */}
      <div className="flex gap-2 mb-6 -mx-6 px-6 border-b border-teal-500/30">
        <Link
          href="/"
          className="flex-1 px-4 py-2 font-semibold transition-all transform hover:scale-105 text-center text-gray-400 hover:text-teal-300"
        >
          Home
        </Link>
        <Link
          href="/goals"
          className={`flex-1 px-4 py-2 font-semibold transition-all transform hover:scale-105 text-center ${
            pathname === "/goals"
              ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent"
              : "text-gray-400 hover:text-teal-300"
          }`}
        >
          Goals
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-teal-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingGoal(null);
                  setFormData({ goalType: "long-term", type: "", title: "", current: "", target: "", unit: "", targetDate: "" });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 text-black font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            </>
          )}
          {isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10 mb-6">
          <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            {editingGoal ? "Edit Goal" : "Add New Goal"}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Daily or Long-term goal?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, goalType: "daily" }))}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    formData.goalType === "daily"
                      ? "bg-gradient-to-r from-teal-400 to-cyan-500 text-black shadow-lg shadow-teal-500/30"
                      : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, goalType: "long-term" }))}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    formData.goalType === "long-term"
                      ? "bg-gradient-to-r from-teal-400 to-cyan-500 text-black shadow-lg shadow-teal-500/30"
                      : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  Long-term
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">What type of goal?</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const selectedType = GOAL_TYPES.find(t => t.value === e.target.value);
                  setFormData(prev => ({ 
                    ...prev, 
                    type: e.target.value,
                    unit: selectedType?.unit || prev.unit
                  }));
                }}
                className="w-full bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
              >
                <option value="">Select goal type...</option>
                {GOAL_TYPES.map(type => (
                  <option key={type.value} value={type.value} className="bg-[#0c1422]">
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.type && (
              <>
                {formData.type !== "financial" && (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">
                      {GOAL_TYPES.find(t => t.value === formData.type)?.question || "What's your goal?"}
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                      placeholder={formData.type === "fitness" ? "e.g., Lose 10kg" : "Enter your goal"}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    {formData.type === "financial" ? "How much are you planning on making?" : "What's your target?"}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.target}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow numbers, k, K, and decimal point
                        if (value === "" || /^[\d.]*[kK]?$/.test(value)) {
                          setFormData(prev => ({ ...prev, target: value }));
                        }
                      }}
                      className="flex-1 bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                      placeholder={formData.type === "financial" ? "e.g., 10k or 10000" : "Enter target"}
                    />
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-20 bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                      placeholder={GOAL_TYPES.find(t => t.value === formData.type)?.unit || "unit"}
                    />
                  </div>
                  {formData.type === "financial" && formData.target && (
                    <p className="text-xs text-gray-400 mt-1">
                      {parseValue(formData.target).toLocaleString()} {formData.unit || "$"}
                    </p>
                  )}
                </div>
                {formData.goalType === "long-term" && (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">When is it to be completed by?</label>
                    <input
                      type="date"
                      value={formData.targetDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                      className="w-full bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}
                {!editingGoal && (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Current progress (optional)</label>
                    <input
                      type="text"
                      value={formData.current}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow numbers, k, K, and decimal point
                        if (value === "" || /^[\d.]*[kK]?$/.test(value)) {
                          setFormData(prev => ({ ...prev, current: value }));
                        }
                      }}
                      className="w-full bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                      placeholder={formData.type === "financial" ? "e.g., 5k or 5000" : "Enter current progress"}
                    />
                    {formData.type === "financial" && formData.current && (
                      <p className="text-xs text-gray-400 mt-1">
                        {parseValue(formData.current).toLocaleString()} {formData.unit || "$"}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={editingGoal ? handleUpdateGoal : handleAddGoal}
                disabled={!formData.type || !formData.target || (formData.goalType === "long-term" && !formData.targetDate)}
                className="flex-1 py-3 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-black"
              >
                {editingGoal ? "Update" : "Add Goal"}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingGoal(null);
                  setFormData({ goalType: "long-term", type: "", title: "", current: "", target: "", unit: "", targetDate: "" });
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold transition-all text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Update Modal */}
      {showProgressModal && selectedGoalForProgress && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-6 max-w-md w-full border border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">Update Progress</h3>
            <p className="text-sm text-gray-400 mb-4">{selectedGoalForProgress.title}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Current: {selectedGoalForProgress.current}{selectedGoalForProgress.unit} / Target: {selectedGoalForProgress.target}{selectedGoalForProgress.unit}
                </label>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">New progress value</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={progressValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow numbers, k, K, and decimal point
                      if (value === "" || /^[\d.]*[kK]?$/.test(value)) {
                        setProgressValue(value);
                      }
                    }}
                    className="flex-1 bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                    placeholder="Enter value"
                    autoFocus
                  />
                  <span className="text-gray-400">{selectedGoalForProgress.unit}</span>
                </div>
                {selectedGoalForProgress.type === "financial" && progressValue && (
                  <p className="text-xs text-gray-400 mt-1">
                    {parseValue(progressValue).toLocaleString()} {selectedGoalForProgress.unit}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveProgress}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 text-black"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowProgressModal(false);
                    setSelectedGoalForProgress(null);
                    setProgressValue("");
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold transition-all text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="mb-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Goals</h2>
          {allGoals.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setGoalTypeFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  goalTypeFilter === "all"
                    ? "bg-gradient-to-r from-teal-400 to-cyan-500 text-black"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setGoalTypeFilter("daily")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  goalTypeFilter === "daily"
                    ? "bg-gradient-to-r from-teal-400 to-cyan-500 text-black"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setGoalTypeFilter("long-term")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  goalTypeFilter === "long-term"
                    ? "bg-gradient-to-r from-teal-400 to-cyan-500 text-black"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                }`}
              >
                Long-term
              </button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {allGoals.length > 0 ? (
            allGoals
              .filter((goal) => {
                if (goalTypeFilter === "all") return true;
                if (goalTypeFilter === "daily") return goal.goalType === "daily";
                if (goalTypeFilter === "long-term") return goal.goalType === "long-term";
                return true;
              })
              .map((goal) => (
              <div key={goal.id} className="relative">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div
                      onClick={() => {
                        if (!isEditing) {
                          handleOpenProgressModal(goal);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <GoalProgressCard
                        title={goal.title}
                        current={goal.current}
                        target={goal.target}
                        unit={goal.unit}
                        targetDate={goal.targetDate}
                        onClick={() => {}}
                      />
                    </div>
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSelection(goal.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedGoalIds.includes(goal.id)
                            ? "bg-green-500 border-green-500"
                            : "border-gray-500"
                        }`}
                      >
                        {selectedGoalIds.includes(goal.id) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No goals yet. Click "Add" to create one.</p>
          )}
        </div>
        {isEditing && (
          <p className="text-sm text-gray-400 mt-4">
            Select goals to show on the home screen ({selectedGoalIds.length} selected)
          </p>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}

