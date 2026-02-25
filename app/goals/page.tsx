"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Edit2, Check, X, Plus, Trash2, MoreVertical, Bell } from "lucide-react";
import { requestNotificationPermission, scheduleTaskReminder, rescheduleTodayTaskReminders } from "@/app/utils/notifications";

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
  title: string;
  type: "task";
  time: string;
  date: string;
  completed: boolean;
  reminderTime?: string;
  reminderTimes?: string[];
}

const GOAL_TYPES = [
  { value: "financial", label: "Financial", question: "How much are you planning on making?", unit: "$" },
  { value: "fitness", label: "Fitness", question: "What's your fitness target?", unit: "kg" },
  { value: "health", label: "Health", question: "What's your health goal?", unit: "" },
  { value: "learning", label: "Learning", question: "What do you want to learn?", unit: "hours" },
  { value: "other", label: "Other", question: "What's your goal?", unit: "" },
];

const LONG_TERM_GOALS_PREVIEW = 3;

export default function GoalsPage() {
  const pathname = usePathname();
  const [isEditing, setIsEditing] = useState(false);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState("");
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [quickTaskInput, setQuickTaskInput] = useState("");
  const [showMoreGoals, setShowMoreGoals] = useState(false);
  const [reminderTaskId, setReminderTaskId] = useState<string | null>(null);
  const [draftReminderTimes, setDraftReminderTimes] = useState<string[]>([]);
  const [customTimeInput, setCustomTimeInput] = useState("");

  const [formData, setFormData] = useState({
    goalType: "long-term" as "daily" | "long-term",
    type: "",
    title: "",
    current: "",
    target: "",
    unit: "",
    targetDate: "",
  });

  const todayStr = new Date().toISOString().split("T")[0];

  // Load goals from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedGoals = localStorage.getItem("goals");
    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals);
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
  }, [todayStr]);

  // Load today's tasks from reminders
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedReminders = localStorage.getItem("reminders");
    if (storedReminders) {
      try {
        const reminders = JSON.parse(storedReminders);
        const todayTasks = reminders.filter(
          (r: Task) => r.type === "task" && r.date === todayStr
        );
        setTasks(todayTasks);
      } catch (e) {
        setTasks([]);
      }
    }
  }, [todayStr]);

  // Reschedule today's task reminders on load (only if permission already granted)
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const storedReminders = localStorage.getItem("reminders");
      if (storedReminders) {
        try {
          const reminders = JSON.parse(storedReminders);
          const todayTasks = reminders.filter(
            (r: Task) => r.type === "task" && r.date === todayStr
          );
          rescheduleTodayTaskReminders(todayTasks);
        } catch (_) {}
      }
    }
  }, [todayStr]);

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

  const longTermGoals = allGoals.filter((g) => g.goalType === "long-term");
  const displayedLongTermGoals = showMoreGoals
    ? longTermGoals
    : longTermGoals.slice(0, LONG_TERM_GOALS_PREVIEW);
  const hiddenGoalsCount = longTermGoals.length - LONG_TERM_GOALS_PREVIEW;

  const handleAddGoal = () => {
    if (!formData.type || !formData.target) {
      alert("Please fill in all required fields");
      return;
    }
    if (formData.goalType === "long-term" && !formData.targetDate) {
      alert("Please select a target date for long-term goals");
      return;
    }
    const goalType = GOAL_TYPES.find((t) => t.value === formData.type);
    const unit = formData.unit || goalType?.unit || "";
    const targetValue = parseValue(formData.target);
    const currentValue = parseValue(formData.current);
    if (targetValue <= 0) {
      alert("Target must be greater than 0");
      return;
    }
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
    if (!editingGoal || !formData.type || !formData.target) return;
    if (formData.goalType === "long-term" && !formData.targetDate) {
      alert("Please select a target date for long-term goals");
      return;
    }
    const goalType = GOAL_TYPES.find((t) => t.value === formData.type);
    const unit = formData.unit || goalType?.unit || "";
    const targetValue = parseValue(formData.target);
    const currentValue = parseValue(formData.current);
    if (targetValue <= 0) return;
    const updatedGoals = allGoals.map((g) =>
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
    if (newCurrent < 0) return;
    handleUpdateProgress(selectedGoalForProgress.id, newCurrent);
    setShowProgressModal(false);
    setSelectedGoalForProgress(null);
    setProgressValue("");
  };

  const handleDeleteGoal = (goalId: string) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      const updatedGoals = allGoals.filter((g) => g.id !== goalId);
      setAllGoals(updatedGoals);
      localStorage.setItem("goals", JSON.stringify(updatedGoals));
    }
  };

  const handleUpdateProgress = (goalId: string, newCurrent: number) => {
    const updatedGoals = allGoals.map((g) => {
      if (g.id === goalId) {
        const updated = { ...g, current: Math.max(0, Math.min(newCurrent, g.target)) };
        if (g.goalType === "daily") updated.lastUpdated = todayStr;
        return updated;
      }
      return g;
    });
    setAllGoals(updatedGoals);
    localStorage.setItem("goals", JSON.stringify(updatedGoals));
  };

  const handleAddQuickTask = () => {
    if (!quickTaskInput.trim()) return;
    const storedReminders = localStorage.getItem("reminders");
    const reminders = storedReminders ? JSON.parse(storedReminders) : [];
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: quickTaskInput.trim(),
      type: "task",
      time: "",
      date: todayStr,
      completed: false,
    };
    reminders.push(newTask);
    localStorage.setItem("reminders", JSON.stringify(reminders));
    setTasks([...tasks, newTask]);
    setQuickTaskInput("");
  };

  const handleToggleTask = (taskId: string) => {
    const storedReminders = localStorage.getItem("reminders");
    if (!storedReminders) return;
    const reminders = JSON.parse(storedReminders);
    const updated = reminders.map((r: Task) =>
      r.id === taskId ? { ...r, completed: !r.completed } : r
    );
    localStorage.setItem("reminders", JSON.stringify(updated));
    setTasks(updated.filter((r: Task) => r.type === "task" && r.date === todayStr));
  };

  const REMINDER_PRESETS = [
    { value: "09:00", label: "9am" },
    { value: "12:00", label: "12pm" },
    { value: "15:00", label: "3pm" },
    { value: "18:00", label: "6pm" },
  ];

  const getTaskReminderTimes = (task: Task): string[] => {
    const fromArray = task.reminderTimes ?? [];
    const fromSingle = task.reminderTime ? [task.reminderTime] : [];
    return [...new Set([...fromArray, ...fromSingle])].sort();
  };

  const getReminderLabel = (value: string) =>
    REMINDER_PRESETS.find((o) => o.value === value)?.label ?? value;

  const handleSaveReminders = async (task: Task, times: string[]) => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;
    const storedReminders = localStorage.getItem("reminders");
    if (!storedReminders) return;
    const reminders = JSON.parse(storedReminders);
    const updated = reminders.map((r: Task) =>
      r.id === task.id ? { ...r, reminderTimes: times, reminderTime: undefined } : r
    );
    localStorage.setItem("reminders", JSON.stringify(updated));
    setTasks(updated.filter((r: Task) => r.type === "task" && r.date === todayStr));
    times.forEach((time) => scheduleTaskReminder(task.id, task.title, task.date, time));
    setReminderTaskId(null);
  };

  const formatProgressText = (goal: Goal) => {
    const unitLabel = goal.unit ? ` ${goal.unit}` : "";
    return `${goal.current} of ${goal.target}${unitLabel}`;
  };

  const completedTasksCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white">
      <div className="max-w-md mx-auto pb-24 px-5">
        {/* Tab Bar */}
        <div className="flex gap-2 mb-6 pt-4 border-b border-teal-500/30">
          <Link
            href="/"
            className={`flex-1 py-2 font-semibold text-center text-sm ${
              pathname === "/" ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent" : "text-gray-400 hover:text-teal-300"
            }`}
          >
            Home
          </Link>
          <Link
            href="/goals"
            className={`flex-1 py-2 font-semibold text-center text-sm ${
              pathname === "/goals" ? "text-teal-400 border-b-2 border-teal-400 bg-gradient-to-t from-teal-400/10 to-transparent" : "text-gray-400 hover:text-teal-300"
            }`}
          >
            Goals
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-bold text-teal-400">Goals</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingGoal(null);
                setFormData({ goalType: "long-term", type: "", title: "", current: "", target: "", unit: "", targetDate: "" });
              }}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black font-semibold text-sm transition-colors"
            >
              + Add
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-lg bg-gradient-to-b from-[#0c1422] to-black border border-teal-500/30 text-white text-sm hover:bg-[rgba(20,30,35,1)] transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Long-term Goals Section */}
        <p className="text-[11px] font-semibold text-gray-500 tracking-wider mb-3">LONG-TERM GOALS</p>
        <div className="space-y-4 mb-4">
          {displayedLongTermGoals.map((goal) => {
            const percent = goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
            return (
              <div
                key={goal.id}
                className="rounded-xl bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-teal-500/30 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-white truncate">{goal.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatProgressText(goal)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-lg font-bold text-teal-400">{percent}%</span>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenProgressModal(goal)}
                          className="p-1 text-gray-500 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenProgressModal(goal)}
                        className="p-1 text-gray-500 hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More */}
        {longTermGoals.length > LONG_TERM_GOALS_PREVIEW && !showMoreGoals && (
          <button
            onClick={() => setShowMoreGoals(true)}
            className="w-full py-3 rounded-lg border border-dashed border-teal-500/30 text-gray-500 text-sm hover:border-teal-400/50 hover:text-gray-400 transition-colors mb-8"
          >
            + {hiddenGoalsCount} more goal{hiddenGoalsCount !== 1 ? "s" : ""}
          </button>
        )}

        {/* Today's Tasks Section */}
        <div className="flex items-center justify-between mb-3 mt-8">
          <p className="text-[11px] font-semibold text-gray-500 tracking-wider">TODAY&apos;S TASKS</p>
          <span className="text-[11px] font-semibold text-teal-400">
            {completedTasksCount}/{tasks.length}
          </span>
        </div>

        {/* Quick Add Input */}
        <div className="flex items-center gap-2 mb-4 rounded-xl bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-teal-500/30 px-4 py-3">
          <input
            type="text"
            value={quickTaskInput}
            onChange={(e) => setQuickTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddQuickTask()}
            placeholder="Set your goals for the day..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
          />
          <button
            onClick={handleAddQuickTask}
            className="w-8 h-6 rounded-md bg-teal-400 flex items-center justify-center text-black font-bold text-base hover:bg-teal-500 transition-colors"
          >
            +
          </button>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-teal-500/30 px-4 py-3 relative"
            >
              <button
                onClick={() => handleToggleTask(task.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                  task.completed ? "bg-teal-400 border-teal-400" : "border-teal-400 bg-transparent"
                }`}
              >
                {task.completed && <Check className="w-5 h-5 text-black" strokeWidth={3} />}
              </button>
              <span
                className={`flex-1 text-[15px] min-w-0 ${
                  task.completed ? "text-gray-500 line-through" : "text-white"
                }`}
              >
                {task.title}
              </span>
              <button
                  onClick={() => {
                    setReminderTaskId(task.id);
                    setDraftReminderTimes(getTaskReminderTimes(task));
                    setCustomTimeInput("");
                  }}
                className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                  getTaskReminderTimes(task).length > 0
                    ? "text-teal-400 bg-teal-400/20"
                    : "text-gray-500 hover:text-teal-400 hover:bg-white/5"
                }`}
                title={
                  getTaskReminderTimes(task).length > 0
                    ? `${getTaskReminderTimes(task).length} alert(s) set`
                    : "Set time alerts"
                }
              >
                <Bell className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {longTermGoals.length === 0 && tasks.length === 0 && (
          <p className="text-center text-gray-500 py-12 text-sm">
            No goals yet. Click &quot;+ Add&quot; to create one.
          </p>
        )}
      </div>

      {/* Time Alerts Modal */}
      {reminderTaskId && (() => {
        const task = tasks.find((t) => t.id === reminderTaskId);
        if (!task) return null;
        const toggleTime = (time: string) => {
          if (draftReminderTimes.includes(time)) {
            setDraftReminderTimes(draftReminderTimes.filter((t) => t !== time));
          } else {
            setDraftReminderTimes([...draftReminderTimes, time].sort());
          }
        };
        const addTime = (time: string) => {
          if (time && !draftReminderTimes.includes(time)) {
            setDraftReminderTimes([...draftReminderTimes, time].sort());
          }
        };
        const removeTime = (time: string) => {
          setDraftReminderTimes(draftReminderTimes.filter((t) => t !== time));
        };
        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setReminderTaskId(null)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-md bg-gradient-to-b from-[#0c1422] via-[#1a2332] to-black rounded-t-2xl sm:rounded-2xl border border-teal-500/30 max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">Time Alerts</h3>
                <button
                  onClick={() => setReminderTaskId(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <p className="text-gray-400 text-sm mb-4">"{task.title}"</p>
                <p className="text-xs text-gray-500 mb-3">Choose when to be reminded</p>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {REMINDER_PRESETS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleTime(opt.value)}
                      className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                        draftReminderTimes.includes(opt.value)
                          ? "bg-teal-500/30 text-teal-400 border border-teal-400/50"
                          : "bg-white/5 text-white border border-white/10 hover:border-teal-400/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="time"
                    value={customTimeInput}
                    onChange={(e) => setCustomTimeInput(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400"
                  />
                  <button
                    onClick={() => {
                      if (customTimeInput) {
                        addTime(customTimeInput);
                        setCustomTimeInput("");
                      }
                    }}
                    className="px-4 py-2.5 rounded-lg bg-teal-400/20 text-teal-400 font-medium text-sm hover:bg-teal-400/30 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {draftReminderTimes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Your alerts</p>
                    <div className="space-y-2">
                      {draftReminderTimes.map((time) => (
                        <div
                          key={time}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <span className="text-white text-sm">{getReminderLabel(time)}</span>
                          <button
                            onClick={() => removeTime(time)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/10 flex gap-3">
                <button
                  onClick={() => setReminderTaskId(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveReminders(task, draftReminderTimes)}
                  className="flex-1 py-3 rounded-xl bg-teal-400 hover:bg-teal-500 text-black font-bold transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add/Edit Goal Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-5 max-w-md w-full border border-teal-500/30 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingGoal ? "Edit Goal" : "Add New Goal"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Daily or Long-term?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, goalType: "daily" }))}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
                      formData.goalType === "daily" ? "bg-teal-400 text-black" : "bg-[rgba(20,30,35,0.85)] border border-teal-500/30 text-white"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, goalType: "long-term" }))}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
                      formData.goalType === "long-term" ? "bg-teal-400 text-black" : "bg-[rgba(20,30,35,0.85)] border border-teal-500/30 text-white"
                    }`}
                  >
                    Long-term
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Goal type</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const t = GOAL_TYPES.find((x) => x.value === e.target.value);
                    setFormData((prev) => ({ ...prev, type: e.target.value, unit: t?.unit || prev.unit }));
                  }}
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-teal-500/30 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="">Select...</option>
                  {GOAL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {formData.type && (
                <>
                  {formData.type !== "financial" && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-300">Title (optional)</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder={formData.type === "fitness" ? "e.g., Lose 10kg" : "Enter goal"}
                        className="w-full bg-[rgba(20,30,35,0.85)] border border-teal-500/30 rounded-lg p-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Target</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.target}
                        onChange={(e) => {
                          if (e.target.value === "" || /^[\d.]*[kK]?$/.test(e.target.value)) {
                            setFormData((prev) => ({ ...prev, target: e.target.value }));
                          }
                        }}
                        placeholder={formData.type === "financial" ? "e.g., 10k" : "Target"}
                        className="flex-1 bg-[rgba(20,30,35,0.85)] border border-teal-500/30 rounded-lg p-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
                      />
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                        placeholder="unit"
                        className="w-20 bg-[rgba(20,30,35,0.85)] border border-teal-500/30 rounded-lg p-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>
                  {formData.goalType === "long-term" && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-300">Target date</label>
                      <input
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, targetDate: e.target.value }))}
                        className="w-full bg-[rgba(20,30,35,0.85)] border border-teal-500/30 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
                        min={todayStr}
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
                          if (e.target.value === "" || /^[\d.]*[kK]?$/.test(e.target.value)) {
                            setFormData((prev) => ({ ...prev, current: e.target.value }));
                          }
                        }}
                        placeholder="0"
                        className="w-full bg-[rgba(20,30,35,0.85)] border border-teal-500/30 rounded-lg p-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={editingGoal ? handleUpdateGoal : handleAddGoal}
                  disabled={!formData.type || !formData.target || (formData.goalType === "long-term" && !formData.targetDate)}
                  className="flex-1 py-3 bg-teal-400 text-black rounded-lg font-semibold hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingGoal ? "Update" : "Add Goal"}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingGoal(null);
                    setFormData({ goalType: "long-term", type: "", title: "", current: "", target: "", unit: "", targetDate: "" });
                  }}
                  className="flex-1 py-3 bg-[rgba(20,30,35,0.85)] border border-teal-500/30 rounded-lg font-semibold text-white hover:bg-[rgba(20,30,35,1)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Update Modal */}
      {showProgressModal && selectedGoalForProgress && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-6 max-w-md w-full border border-teal-500/30">
            <h3 className="text-xl font-bold text-white mb-2">Update Progress</h3>
            <p className="text-sm text-[#555555] mb-4">{selectedGoalForProgress.title}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">New progress value</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={progressValue}
                    onChange={(e) => {
                      if (e.target.value === "" || /^[\d.]*[kK]?$/.test(e.target.value)) {
                        setProgressValue(e.target.value);
                      }
                    }}
                    className="flex-1 bg-[rgba(20,30,35,0.85)] border border-teal-500/30 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
                    placeholder="Enter value"
                    autoFocus
                  />
                  <span className="text-[#555555]">{selectedGoalForProgress.unit}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveProgress}
                  className="flex-1 py-3 bg-teal-400 text-black rounded-lg font-semibold hover:bg-teal-500"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowProgressModal(false);
                    setSelectedGoalForProgress(null);
                    setProgressValue("");
                  }}
                  className="flex-1 py-3 bg-[rgba(20,30,35,0.85)] border border-teal-500/30 rounded-lg font-semibold text-white hover:bg-[rgba(20,30,35,1)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
