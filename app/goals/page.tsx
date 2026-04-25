"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import {
  Check,
  X,
  Plus,
  Trash2,
  MoreVertical,
  Bell,
  TrendingUp,
  Dumbbell,
  Heart,
  BookOpen,
  Target,
  ChevronLeft,
  Crown,
  Sparkles,
  Flame,
  Trophy,
  Calendar,
  ListChecks,
} from "lucide-react";
import { requestNotificationPermission, scheduleTaskReminder, rescheduleTodayTaskReminders, scheduleDailyTasksSummaryNotification } from "@/app/utils/notifications";

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
const MOTO_DISMISS_KEY = "goals_motivation_dismissed";

function RingProgress({ percent, size = 56 }: { percent: number; size?: number }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        className="rotate-[-90deg] text-teal-400"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="text-white/10"
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-white tabular-nums">{percent}%</span>
    </div>
  );
}

function formatTargetDateLabel(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length <= 10 ? "T12:00:00" : ""));
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function typeAccent(goalType: string): { border: string; iconWrap: string; ring: string } {
  switch (goalType) {
    case "financial":
      return {
        border: "border-l-emerald-400",
        iconWrap: "from-emerald-500/30 to-emerald-600/10 text-emerald-300",
        ring: "text-emerald-400",
      };
    case "fitness":
      return {
        border: "border-l-teal-400",
        iconWrap: "from-teal-500/30 to-teal-600/10 text-teal-300",
        ring: "text-teal-400",
      };
    case "health":
      return {
        border: "border-l-fuchsia-400",
        iconWrap: "from-fuchsia-500/30 to-fuchsia-600/10 text-fuchsia-300",
        ring: "text-fuchsia-400",
      };
    case "learning":
      return {
        border: "border-l-sky-400",
        iconWrap: "from-sky-500/30 to-sky-600/10 text-sky-300",
        ring: "text-sky-400",
      };
    default:
      return {
        border: "border-l-violet-400",
        iconWrap: "from-violet-500/30 to-violet-600/10 text-violet-300",
        ring: "text-violet-400",
      };
  }
}

function TypeIcon({ type }: { type: string }) {
  const c = "h-4 w-4";
  switch (type) {
    case "financial":
      return <TrendingUp className={c} />;
    case "fitness":
      return <Dumbbell className={c} />;
    case "health":
      return <Heart className={c} />;
    case "learning":
      return <BookOpen className={c} />;
    default:
      return <Target className={c} />;
  }
}

function RingProgressTinted({
  percent,
  size = 48,
  ringClass,
}: {
  percent: number;
  size?: number;
  ringClass: string;
}) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        className={`rotate-[-90deg] ${ringClass}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="text-white/10"
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white tabular-nums">{percent}%</span>
    </div>
  );
}

export default function GoalsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addStep, setAddStep] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState("");
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [quickTaskInput, setQuickTaskInput] = useState("");
  const [showMoreGoals, setShowMoreGoals] = useState(false);
  const [reminderTaskId, setReminderTaskId] = useState<string | null>(null);
  const [draftReminderTimes, setDraftReminderTimes] = useState<string[]>([]);
  const [customTimeInput, setCustomTimeInput] = useState("");
  const quickTaskInputRef = useRef<HTMLInputElement>(null);
  const [showMotivationBanner, setShowMotivationBanner] = useState(true);

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

  // Reschedule today's task reminders and daily summary on load (only if permission already granted)
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
          scheduleDailyTasksSummaryNotification();
        } catch (_) {}
      }
    }
  }, [todayStr, tasks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowMotivationBanner(localStorage.getItem(MOTO_DISMISS_KEY) !== "1");
  }, []);

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
  const dailyGoals = allGoals.filter((g) => g.goalType === "daily");
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
    setAddStep(2);
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

  const handleDeleteTask = (taskId: string) => {
    const storedReminders = localStorage.getItem("reminders");
    if (!storedReminders) return;
    const reminders = JSON.parse(storedReminders);
    const updated = reminders.filter((r: Task) => r.id !== taskId);
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
    const storedReminders = localStorage.getItem("reminders");
    if (!storedReminders) return;
    const reminders = JSON.parse(storedReminders);
    const updated = reminders.map((r: Task) =>
      r.id === task.id ? { ...r, reminderTimes: times, reminderTime: undefined } : r
    );
    localStorage.setItem("reminders", JSON.stringify(updated));
    setTasks(updated.filter((r: Task) => r.type === "task" && r.date === todayStr));
    setReminderTaskId(null);
    // Schedule notifications only if permission granted (don't block save)
    const hasPermission = await requestNotificationPermission();
    if (hasPermission) {
      times.forEach((time) => scheduleTaskReminder(task.id, task.title, task.date, time));
    }
  };

  const formatProgressText = (goal: Goal) => {
    const unitLabel = goal.unit ? ` ${goal.unit}` : "";
    return `${goal.current} of ${goal.target}${unitLabel}`;
  };

  const completedTasksCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-[#080B12] text-white">
      <div className="mx-auto max-w-md px-4 pb-28 pt-5">
        {/* Tab bar */}
        <div className="mb-5 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          <Link
            href="/"
            className="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold text-gray-500 transition-colors hover:text-gray-300"
          >
            Home
          </Link>
          <div className="flex-1 rounded-xl bg-gradient-to-b from-white/12 to-white/[0.07] py-2.5 text-center text-sm font-bold text-white shadow-[0_0_20px_rgba(45,212,191,0.12)]">
            Goals
          </div>
        </div>

        {/* Title row */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-[28px] font-bold text-transparent">
              Goals
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">Track progress. Stay motivated.</p>
          </div>
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setEditingGoal(null);
                setAddStep(0);
                setFormData({
                  goalType: "long-term",
                  type: "",
                  title: "",
                  current: "",
                  target: "",
                  unit: "",
                  targetDate: "",
                });
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 text-black shadow-md shadow-teal-500/25 transition-transform hover:scale-105 active:scale-95"
              aria-label="Add goal"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Customize
            </button>
          </div>
        </div>

        {/* Long-term goals */}
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-amber-400/90" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Long-term goals</p>
          </div>
          <span className="text-[11px] font-semibold text-teal-400/90">
            {longTermGoals.length} Active
          </span>
        </div>
        <div className="mb-2 space-y-3">
          {displayedLongTermGoals.map((goal) => {
            const percent =
              goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
            return (
              <div
                key={goal.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 shadow-sm shadow-black/20"
              >
                <div className="flex gap-3">
                  <RingProgress percent={percent} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{goal.title}</p>
                    <p className="text-xs text-gray-500">{formatProgressText(goal)}</p>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-teal-400 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {goal.targetDate ? (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-gray-400">
                        <Calendar className="h-3 w-3 text-teal-400/80" />
                        <span>Target: {formatTargetDateLabel(goal.targetDate)}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenProgressModal(goal)}
                          className="text-xs text-gray-500 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenProgressModal(goal)}
                        className="p-1 text-gray-500 hover:text-white"
                        aria-label="Goal actions"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {longTermGoals.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-gray-500">
              No long-term goals yet. Tap the + to add one.
            </div>
          )}
        </div>

        {longTermGoals.length > LONG_TERM_GOALS_PREVIEW && !showMoreGoals && (
          <button
            type="button"
            onClick={() => setShowMoreGoals(true)}
            className="mb-8 w-full rounded-xl border border-dashed border-white/10 py-3 text-sm text-gray-500 transition-colors hover:border-teal-400/40 hover:text-gray-400"
          >
            + {hiddenGoalsCount} more goal{hiddenGoalsCount !== 1 ? "s" : ""}
          </button>
        )}

        {/* Today’s tasks */}
        <div className="mb-3 mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-3.5 w-3.5 text-teal-400/80" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Today&apos;s tasks
            </p>
          </div>
          <span className="text-[11px] font-semibold text-teal-400/90">
            {completedTasksCount}/{tasks.length} completed
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent p-4">
            <div className="flex gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center text-2xl" aria-hidden>
                📋
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white">Plan your day</p>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-500">
                  Set up to 2 daily tasks to stay on track and build momentum.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={quickTaskInputRef}
                    type="text"
                    value={quickTaskInput}
                    onChange={(e) => setQuickTaskInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddQuickTask()}
                    placeholder="Add a task…"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-teal-400/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuickTask}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-3 py-2.5 text-xs font-bold text-black"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <input
                ref={quickTaskInputRef}
                type="text"
                value={quickTaskInput}
                onChange={(e) => setQuickTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuickTask()}
                placeholder="Add another task…"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddQuickTask}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-400 text-black hover:bg-teal-300"
                aria-label="Add task"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            <div className="mb-2 space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-3 py-3"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      task.completed
                        ? "border-teal-400 bg-teal-400"
                        : "border-teal-400/60 bg-transparent"
                    }`}
                  >
                    {task.completed && <Check className="h-5 w-5 text-black" strokeWidth={3} />}
                  </button>
                  <span
                    className={`min-w-0 flex-1 text-[15px] ${
                      task.completed ? "text-gray-500 line-through" : "text-white"
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReminderTaskId(task.id);
                      setDraftReminderTimes(getTaskReminderTimes(task));
                      setCustomTimeInput("");
                    }}
                    className={`shrink-0 rounded-lg p-2 transition-colors ${
                      getTaskReminderTimes(task).length > 0
                        ? "bg-teal-400/20 text-teal-400"
                        : "text-gray-500 hover:bg-white/5 hover:text-teal-400"
                    }`}
                    title={
                      getTaskReminderTimes(task).length > 0
                        ? `${getTaskReminderTimes(task).length} alert(s) set`
                        : "Set time alerts"
                    }
                  >
                    <Bell className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete task"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Daily goals */}
        {dailyGoals.length > 0 && (
          <>
            <div className="mb-3 mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-orange-400/90" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Daily goals</p>
              </div>
              <span className="text-[11px] font-semibold text-teal-400/90">{dailyGoals.length} Active</span>
            </div>
            <div className="space-y-3">
              {dailyGoals.map((goal) => {
                const percent =
                  goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
                const acc = typeAccent(goal.type);
                return (
                  <div
                    key={goal.id}
                    className={`overflow-hidden rounded-2xl border border-white/10 border-l-4 ${acc.border} bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-3.5 pl-3.5 shadow-sm shadow-black/20`}
                  >
                    <div className="flex gap-3">
                      <RingProgressTinted percent={percent} size={50} ringClass={acc.ring} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${acc.iconWrap}`}
                            >
                              <TypeIcon type={goal.type} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white">{goal.title}</p>
                              <p className="text-xs text-gray-500">{formatProgressText(goal)}</p>
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenProgressModal(goal)}
                                className="text-xs text-gray-500"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenProgressModal(goal)}
                              className="shrink-0 p-1 text-gray-500 hover:text-white"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${
                              goal.type === "fitness"
                                ? "bg-teal-400"
                                : goal.type === "health"
                                  ? "bg-fuchsia-400"
                                  : goal.type === "financial"
                                    ? "bg-emerald-400"
                                    : goal.type === "learning"
                                      ? "bg-sky-400"
                                      : "bg-violet-400"
                            } transition-all duration-300`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {longTermGoals.length === 0 && dailyGoals.length === 0 && tasks.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-500">
            No goals yet. Tap the teal + to get started.
          </p>
        )}

        {/* Motivation banner */}
        {showMotivationBanner && (
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-950/80 via-[#0a1818] to-teal-950/40 px-4 py-3.5 pr-10">
            <div className="pointer-events-none absolute -right-4 bottom-0 text-4xl opacity-20" aria-hidden>
              🏔️
            </div>
            <div className="flex gap-2.5">
              <Trophy className="h-5 w-5 shrink-0 text-amber-400/90" />
              <div>
                <p className="text-sm font-medium text-white">Small steps every day</p>
                <p className="text-xs text-gray-500">Lead to big changes tomorrow.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") localStorage.setItem(MOTO_DISMISS_KEY, "1");
                setShowMotivationBanner(false);
              }}
              className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setReminderTaskId(null)}
              aria-hidden="true"
            />
            <div
              className="relative w-full max-w-md bg-gradient-to-b from-[#0c1422] via-[#1a2332] to-black rounded-2xl border border-white/8 max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/8">
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
                          : "bg-white/5 text-white border border-white/8 hover:border-teal-400/30"
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
                    className="flex-1 bg-black/40 border border-white/8 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400"
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
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 border border-white/8"
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
              <div className="p-4 border-t border-white/8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setReminderTaskId(null)}
                  className="flex-1 py-3 min-h-[48px] rounded-xl border border-white/8 text-gray-400 hover:text-white transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReminders(task, draftReminderTimes)}
                  className="flex-1 py-3 min-h-[48px] rounded-xl bg-teal-400 hover:bg-teal-500 text-black font-bold transition-colors active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add/Edit Goal — centered dialog (not bottom sheet) */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => {
              setShowAddForm(false);
              setEditingGoal(null);
            }}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingGoal ? "Edit goal" : "Add goal"}
            className="relative z-10 w-full max-w-md max-h-[min(88vh,720px)] overflow-y-auto rounded-2xl border border-white/20 bg-[#101a2e] shadow-2xl shadow-black/60 ring-1 ring-white/10 px-4 pt-3 pb-6 sm:px-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              {!editingGoal && (
                <div className="flex flex-1 items-center justify-center gap-1.5 pt-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        addStep === i
                          ? "w-6 bg-teal-400"
                          : i < addStep
                            ? "w-3 bg-teal-400/50"
                            : "w-3 bg-white/15"
                      }`}
                    />
                  ))}
                </div>
              )}
              {editingGoal && <div className="flex-1" />}
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingGoal(null);
                }}
                className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors -mr-1 -mt-0.5"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            {/* Step 0 — Category */}
            {addStep === 0 && (
              <>
                <p className="text-lg sm:text-xl font-bold text-white mb-0.5 leading-tight">What are you working on?</p>
                <p className="text-sm text-gray-400 mb-3">Pick a category to get started</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: "financial", label: "Financial", icon: <TrendingUp className="w-5 h-5" />, color: "text-green-400", iconBg: "bg-green-500/20 border-green-400/45" },
                    { value: "fitness", label: "Fitness", icon: <Dumbbell className="w-5 h-5" />, color: "text-orange-400", iconBg: "bg-orange-500/20 border-orange-400/45" },
                    { value: "health", label: "Health", icon: <Heart className="w-5 h-5" />, color: "text-pink-400", iconBg: "bg-pink-500/20 border-pink-400/45" },
                    { value: "learning", label: "Learning", icon: <BookOpen className="w-5 h-5" />, color: "text-blue-400", iconBg: "bg-blue-500/20 border-blue-400/45" },
                    { value: "other", label: "Other", icon: <Target className="w-5 h-5" />, color: "text-violet-400", iconBg: "bg-violet-500/20 border-violet-400/45" },
                  ].map((cat) => {
                    const goalTypeMatch = GOAL_TYPES.find((t) => t.value === cat.value);
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({ ...p, type: cat.value, unit: goalTypeMatch?.unit || "" }));
                          setAddStep(1);
                        }}
                        className="flex items-center gap-2.5 rounded-2xl border-2 border-white/25 bg-white/[0.07] p-3 text-left shadow-md shadow-black/30 ring-1 ring-white/10 transition-all hover:border-teal-400/60 hover:bg-white/[0.12] hover:ring-teal-400/20 active:scale-[0.98]"
                      >
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 ${cat.iconBg} ${cat.color}`}
                        >
                          {cat.icon}
                        </div>
                        <span className="text-sm font-semibold text-white">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Step 1 — Daily or Long-term */}
            {addStep === 1 && (
              <>
                <p className="text-lg sm:text-xl font-bold text-white mb-0.5 leading-tight">How does it work?</p>
                <p className="text-sm text-gray-400 mb-3">Choose how to track your progress</p>
                <div className="mb-4 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => { setFormData((p) => ({ ...p, goalType: "daily" })); setAddStep(2); }}
                    className="w-full rounded-2xl border-2 border-white/20 bg-white/[0.06] p-4 text-left ring-1 ring-white/10 transition-colors hover:border-teal-400/50 hover:bg-white/10"
                  >
                    <p className="mb-0.5 text-base font-bold text-white">Daily</p>
                    <p className="text-sm text-gray-400">Resets every day — track your streak.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormData((p) => ({ ...p, goalType: "long-term" })); setAddStep(2); }}
                    className="w-full rounded-2xl border-2 border-white/20 bg-white/[0.06] p-4 text-left ring-1 ring-white/10 transition-colors hover:border-teal-400/50 hover:bg-white/10"
                  >
                    <p className="mb-0.5 text-base font-bold text-white">Long-term</p>
                    <p className="text-sm text-gray-400">A milestone with a target date.</p>
                  </button>
                </div>
                <button onClick={() => setAddStep(0)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              </>
            )}

            {/* Step 2 — Details */}
            {addStep === 2 && (
              <>
                <p className="text-lg sm:text-xl font-bold text-white mb-0.5 leading-tight">{editingGoal ? "Edit goal" : "Set the details"}</p>
                <p className="mb-4 text-sm text-gray-400">
                  {editingGoal ? "Update your goal details below." : "Almost done — fill in a few quick details."}
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                      placeholder={formData.type === "financial" ? "e.g., Save for car" : formData.type === "fitness" ? "e.g., Lose 10kg" : "Give your goal a name"}
                      className="w-full bg-white/5 border border-white/8 rounded-xl p-3.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.target}
                        onChange={(e) => {
                          if (e.target.value === "" || /^[\d.]*[kK]?$/.test(e.target.value))
                            setFormData((p) => ({ ...p, target: e.target.value }));
                        }}
                        placeholder={formData.type === "financial" ? "e.g., 10000" : "e.g., 90"}
                        className="flex-1 bg-white/5 border border-white/8 rounded-xl p-3.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-400"
                      />
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))}
                        placeholder="unit"
                        className="w-20 bg-white/5 border border-white/8 rounded-xl p-3.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>
                  {formData.goalType === "long-term" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target date</label>
                      <input
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) => setFormData((p) => ({ ...p, targetDate: e.target.value }))}
                        className="w-full bg-white/5 border border-white/8 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-teal-400"
                        min={todayStr}
                      />
                    </div>
                  )}
                  {!editingGoal && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Starting progress <span className="text-gray-700 normal-case font-normal">(optional)</span></label>
                      <input
                        type="text"
                        value={formData.current}
                        onChange={(e) => {
                          if (e.target.value === "" || /^[\d.]*[kK]?$/.test(e.target.value))
                            setFormData((p) => ({ ...p, current: e.target.value }));
                        }}
                        placeholder="0"
                        className="w-full bg-white/5 border border-white/8 rounded-xl p-3.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={editingGoal ? handleUpdateGoal : handleAddGoal}
                  disabled={!formData.target || (formData.goalType === "long-term" && !formData.targetDate)}
                  className="w-full mt-6 py-4 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base"
                >
                  {editingGoal ? "Save changes" : "Add goal"}
                </button>

                {!editingGoal && (
                  <button onClick={() => setAddStep(1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mt-4">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress Update Modal */}
      {showProgressModal && selectedGoalForProgress && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1422] rounded-xl p-6 max-w-md w-full border border-white/8">
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
                    className="flex-1 bg-white/5 border border-white/8 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-400"
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
                  className="flex-1 py-3 bg-white/5 border border-white/8 rounded-lg font-semibold text-white hover:bg-white/10"
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
