"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import GoalProgressCard from "@/components/GoalProgressCard";
import { ArrowLeft, Edit2, Check, X, Plus, Trash2 } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
}

export default function GoalsPage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    current: 0,
    target: 0,
    unit: "",
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
      if (selectedGoalIds.length < 5) {
        setSelectedGoalIds(prev => [...prev, goalId]);
      }
    }
  };

  const handleAddGoal = () => {
    if (!formData.title || !formData.target) {
      alert("Please fill in title and target");
      return;
    }

    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      title: formData.title,
      current: formData.current || 0,
      target: formData.target,
      unit: formData.unit || "",
    };

    const updatedGoals = [...allGoals, newGoal];
    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
    
    setFormData({ title: "", current: 0, target: 0, unit: "" });
    setShowAddForm(false);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      current: goal.current,
      target: goal.target,
      unit: goal.unit,
    });
    setShowAddForm(true);
  };

  const handleUpdateGoal = () => {
    if (!editingGoal || !formData.title || !formData.target) {
      alert("Please fill in title and target");
      return;
    }

    const updatedGoals = allGoals.map(g =>
      g.id === editingGoal.id
        ? {
            ...g,
            title: formData.title,
            current: formData.current || 0,
            target: formData.target,
            unit: formData.unit || "",
          }
        : g
    );

    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
    
    setFormData({ title: "", current: 0, target: 0, unit: "" });
    setEditingGoal(null);
    setShowAddForm(false);
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
    <div className="min-h-screen bg-black text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
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
                  setFormData({ title: "", current: 0, target: 0, unit: "" });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
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
                className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
          <h3 className="text-lg font-bold mb-4">
            {editingGoal ? "Edit Goal" : "Add New Goal"}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600"
                placeholder="e.g., I will make 10k"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Current</label>
                <input
                  type="number"
                  value={formData.current}
                  onChange={(e) => setFormData(prev => ({ ...prev, current: Number(e.target.value) }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Target</label>
                <input
                  type="number"
                  value={formData.target}
                  onChange={(e) => setFormData(prev => ({ ...prev, target: Number(e.target.value) }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600"
                  min="1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Unit (optional)</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-600"
                placeholder="e.g., $, kg, lbs"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={editingGoal ? handleUpdateGoal : handleAddGoal}
                className="flex-1 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                {editingGoal ? "Update" : "Add Goal"}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingGoal(null);
                  setFormData({ title: "", current: 0, target: 0, unit: "" });
                }}
                className="flex-1 py-3 bg-gray-800 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="mb-6 flex-1">
        <h2 className="text-xl font-bold text-white mb-4 uppercase">Goals</h2>
        <div className="space-y-2">
          {allGoals.length > 0 ? (
            allGoals.map((goal) => (
              <div key={goal.id} className="relative">
                <GoalProgressCard
                  title={goal.title}
                  current={goal.current}
                  target={goal.target}
                  unit={goal.unit}
                  onClick={() => {
                    if (!isEditing) {
                      const newCurrent = prompt(`Update progress for "${goal.title}" (current: ${goal.current}${goal.unit}):`, goal.current.toString());
                      if (newCurrent !== null) {
                        handleUpdateProgress(goal.id, Number(newCurrent));
                      }
                    }
                  }}
                />
                {isEditing && (
                  <div className="absolute right-2 top-2 flex items-center gap-2">
                    <button
                      onClick={() => handleEditGoal(goal)}
                      className="p-1.5 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 bg-red-600 rounded hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleSelection(goal.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedGoalIds.includes(goal.id)
                          ? "bg-green-500 border-green-500"
                          : "border-gray-500"
                      }`}
                    >
                      {selectedGoalIds.includes(goal.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No goals yet. Click "Add" to create one.</p>
          )}
        </div>
        {isEditing && (
          <p className="text-sm text-gray-400 mt-4">
            Select up to 5 goals to show on the home screen ({selectedGoalIds.length}/5 selected)
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

