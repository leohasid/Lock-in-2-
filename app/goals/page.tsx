"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import GoalProgressCard from "@/components/GoalProgressCard";
import { ArrowLeft, Edit2, Check, X, Plus, Trash2 } from "lucide-react";

interface Goal {
  id: string;
  type: string; // "financial", "fitness", "health", "learning", "other"
  title: string;
  current: number;
  target: number;
  unit: string;
  targetDate: string; // ISO date string
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
  const [isEditing, setIsEditing] = useState(false);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState("");
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    type: "",
    title: "",
    current: 0,
    target: 0,
    unit: "",
    targetDate: "",
  });

  // Load goals from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedGoals = localStorage.getItem("goals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
        setAllGoals(goals);
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

  const handleAddGoal = () => {
    if (!formData.type || !formData.target || !formData.targetDate) {
      alert("Please fill in all required fields");
      return;
    }

    const goalType = GOAL_TYPES.find(t => t.value === formData.type);
    const unit = formData.unit || goalType?.unit || "";

    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      type: formData.type,
      title: formData.title || goalType?.label || "Goal",
      current: formData.current || 0,
      target: formData.target,
      unit: unit,
      targetDate: formData.targetDate,
    };

    const updatedGoals = [...allGoals, newGoal];
    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
    
    setFormData({ type: "", title: "", current: 0, target: 0, unit: "", targetDate: "" });
    setShowAddForm(false);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      type: goal.type || "",
      title: goal.title,
      current: goal.current,
      target: goal.target,
      unit: goal.unit,
      targetDate: goal.targetDate || "",
    });
    setShowAddForm(true);
  };

  const handleUpdateGoal = () => {
    if (!editingGoal || !formData.type || !formData.target || !formData.targetDate) {
      alert("Please fill in all required fields");
      return;
    }

    const goalType = GOAL_TYPES.find(t => t.value === formData.type);
    const unit = formData.unit || goalType?.unit || "";

    const updatedGoals = allGoals.map(g =>
      g.id === editingGoal.id
        ? {
            ...g,
            type: formData.type,
            title: formData.title || goalType?.label || "Goal",
            current: formData.current || 0,
            target: formData.target,
            unit: unit,
            targetDate: formData.targetDate,
          }
        : g
    );

    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
    
    setFormData({ type: "", title: "", current: 0, target: 0, unit: "", targetDate: "" });
    setEditingGoal(null);
    setShowAddForm(false);
  };

  const handleOpenProgressModal = (goal: Goal) => {
    setSelectedGoalForProgress(goal);
    setProgressValue(goal.current.toString());
    setShowProgressModal(true);
  };

  const handleSaveProgress = () => {
    if (!selectedGoalForProgress || !progressValue) return;
    
    const newCurrent = Number(progressValue);
    if (isNaN(newCurrent) || newCurrent < 0) {
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
    const updatedGoals = allGoals.map(g =>
      g.id === goalId ? { ...g, current: Math.max(0, Math.min(newCurrent, g.target)) } : g
    );
    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white p-6 flex flex-col">
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
                  setFormData({ type: "", title: "", current: 0, target: 0, unit: "", targetDate: "" });
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
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    {GOAL_TYPES.find(t => t.value === formData.type)?.question || "What's your goal?"}
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                    placeholder={formData.type === "financial" ? "e.g., Make $10,000" : formData.type === "fitness" ? "e.g., Lose 10kg" : "Enter your goal"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    {formData.type === "financial" ? "How much are you planning on making?" : "What's your target?"}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.target}
                      onChange={(e) => setFormData(prev => ({ ...prev, target: Number(e.target.value) }))}
                      className="flex-1 bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                      min="1"
                      placeholder="0"
                    />
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-20 bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                      placeholder={GOAL_TYPES.find(t => t.value === formData.type)?.unit || "unit"}
                    />
                  </div>
                </div>
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
                {!editingGoal && (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Current progress (optional)</label>
                    <input
                      type="number"
                      value={formData.current}
                      onChange={(e) => setFormData(prev => ({ ...prev, current: Number(e.target.value) }))}
                      className="w-full bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={editingGoal ? handleUpdateGoal : handleAddGoal}
                disabled={!formData.type || !formData.target || !formData.targetDate}
                className="flex-1 py-3 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-black"
              >
                {editingGoal ? "Update" : "Add Goal"}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingGoal(null);
                  setFormData({ type: "", title: "", current: 0, target: 0, unit: "", targetDate: "" });
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
                    type="number"
                    value={progressValue}
                    onChange={(e) => setProgressValue(e.target.value)}
                    className="flex-1 bg-[rgba(10,15,20,0.6)] border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-teal-400 text-white"
                    min="0"
                    placeholder="0"
                    autoFocus
                  />
                  <span className="text-gray-400">{selectedGoalForProgress.unit}</span>
                </div>
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
        <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-4">Goals</h2>
        <div className="space-y-2">
          {allGoals.length > 0 ? (
            allGoals.map((goal) => (
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

