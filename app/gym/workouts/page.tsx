"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Sparkles, Plus, PencilLine, Calendar } from "lucide-react";
import { toLocalDateString } from "@/lib/date-utils";

const SWIPE_THRESHOLD = 80;

function SwipeableRow({
  isSelected,
  isDisabled,
  onSelect,
  onUse,
  onRemove,
  children,
}: {
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
  onUse: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const dragXRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - startX.current;
    const x = deltaX <= 0 ? Math.max(deltaX, -120) : 0;
    setDragX(x);
    dragXRef.current = x;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragXRef.current < -SWIPE_THRESHOLD) {
      onRemove();
    }
    setDragX(0);
    dragXRef.current = 0;
  }, [onRemove]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    const deltaX = e.clientX - startX.current;
    const x = deltaX <= 0 ? Math.max(deltaX, -120) : 0;
    setDragX(x);
    dragXRef.current = x;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragXRef.current < -SWIPE_THRESHOLD) {
      onRemove();
    }
    setDragX(0);
    dragXRef.current = 0;
  }, [onRemove]);

  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-use-btn]")) {
        onUse();
      } else {
        onSelect();
      }
    },
    [onSelect, onUse]
  );

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        className="absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-red-600/90 text-white text-sm font-semibold z-0"
        style={{ opacity: dragX < -20 ? 1 : 0 }}
      >
        Delete
      </div>
      <div
        className="relative z-10 touch-pan-y"
        style={{ transform: `translateX(${dragX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          onClick={handleRowClick}
          className="p-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-white/10 rounded-lg flex items-center justify-between gap-2 cursor-pointer"
        >
          {children}
          <button
            data-use-btn
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
            disabled={isDisabled}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSelected
                ? "bg-white/20 text-gray-300 hover:bg-white/30"
                : "bg-teal-500 hover:bg-teal-400 text-black"
            }`}
          >
            {isSelected ? "Unsave" : "Use"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface WorkoutOption {
  id: string;
  name: string;
  days: {
    day1: any[];
    day2: any[];
    day3: any[];
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

export default function WorkoutsPage() {
  const router = useRouter();
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [selectedWorkoutOptions, setSelectedWorkoutOptions] = useState<string[]>([]);
  const [manualSchedule, setManualSchedule] = useState<Record<string, { days: number[] }>>({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("selectedWorkoutOptions");
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        setSelectedWorkoutOptions(Array.isArray(arr) ? arr : []);
      } catch {
        const single = localStorage.getItem("selectedWorkoutOption");
        setSelectedWorkoutOptions(single ? [single] : []);
      }
    } else {
      const single = localStorage.getItem("selectedWorkoutOption");
      setSelectedWorkoutOptions(single ? [single] : []);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load workout options
    const storedOptions = localStorage.getItem("workoutOptions");
    if (storedOptions) {
      try {
        setWorkoutOptions(JSON.parse(storedOptions));
      } catch (e) {
        console.error("Error loading workout options:", e);
      }
    } else {
      // Helper to create exercise with sets
      const ex = (id: string, name: string, sets = 3, reps = 10) => ({
        id,
        name,
        goalSets: sets,
        goalReps: reps,
        goalWeight: 0,
        sets: Array.from({ length: sets }, () => ({ reps, weight: 0, completed: false })),
      });
      // Initialize with default options - Option 1 pre-filled with illustrated exercises
      const defaultOptions: WorkoutOption[] = [
        {
          id: "option1",
          name: "Push / Pull / Legs",
          days: {
            day1: [
              ex("ex-1", "Incline Bench Press"),
              ex("ex-2", "Incline Dumbbell Press"),
              ex("ex-3", "Overhead Press"),
              ex("ex-4", "Dips"),
              ex("ex-5", "Incline Dumbbell Fly"),
            ],
            day2: [
              ex("ex-6", "Dumbbell Row"),
              ex("ex-7", "Cable Curl"),
            ],
            day3: [
              ex("ex-8", "Leg Press"),
              ex("ex-9", "Leg Extension"),
              ex("ex-10", "Leg Curl"),
              ex("ex-11", "Hip Thrust"),
              ex("ex-12", "Lunges"),
              ex("ex-13", "Hack Squat"),
            ],
          },
          dayNames: {
            day1: "Push Day",
            day2: "Pull Day",
            day3: "Legs Day",
          },
        },
        {
          id: "option2",
          name: "Option 2",
          days: {
            day1: [],
            day2: [],
            day3: [],
          },
          dayNames: {
            day1: "Back & Triceps",
            day2: "Chest & Biceps",
            day3: "Legs Day",
          },
        },
        {
          id: "option3",
          name: "Option 3",
          days: {
            day1: [],
            day2: [],
            day3: [],
          },
          dayNames: {
            day1: "Upper Body",
            day2: "Lower Body",
            day3: "Full Body",
          },
        },
        {
          id: "option4",
          name: "Option 4",
          days: { day1: [], day2: [], day3: [] },
          dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" },
        },
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
    const storedManual = localStorage.getItem("manualScheduleByPlan");
    if (storedManual) {
      try {
        const parsed = JSON.parse(storedManual);
        if (parsed && typeof parsed === "object") {
          const migrated: Record<string, { days: number[] }> = {};
          let hadOldFormat = false;
          for (const [k, v] of Object.entries(parsed)) {
            const old = v as any;
            if (old && "days" in old && Array.isArray(old.days)) {
              migrated[k] = { days: old.days };
            } else if (old && ("day1" in old || "pushDays" in old)) {
              hadOldFormat = true;
            }
          }
          setManualSchedule(migrated);
          if (hadOldFormat) localStorage.setItem("manualScheduleByPlan", JSON.stringify(migrated));
        }
      } catch { /* ignore */ }
    }
  }, []);

  const handleSelectOption = (optionId: string) => {
    // Navigate to the workout option editing page
    router.push(`/gym/workouts/${optionId}`);
  };

  const handleUseOption = (optionId: string) => {
    const isCurrentlySelected = selectedWorkoutOptions.includes(optionId);
    if (isCurrentlySelected) {
      const next = selectedWorkoutOptions.filter((id) => id !== optionId);
      setSelectedWorkoutOptions(next);
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedWorkoutOptions", JSON.stringify(next));
        localStorage.setItem("selectedWorkoutOption", next[0] || "");
        if (next.length === 0) localStorage.removeItem("selectedWorkoutOption");
      }
    } else {
      if (selectedWorkoutOptions.length >= 10) return;
      const next = [...selectedWorkoutOptions, optionId];
      setSelectedWorkoutOptions(next);
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedWorkoutOptions", JSON.stringify(next));
        localStorage.setItem("selectedWorkoutOption", optionId);
      }
    }
  };

  const handleRemoveOption = useCallback((optionId: string) => {
    const next = workoutOptions.filter((opt) => opt.id !== optionId);
    setWorkoutOptions(next);
    const nextSelected = selectedWorkoutOptions.filter((id) => id !== optionId);
    setSelectedWorkoutOptions(nextSelected);
    if (typeof window !== "undefined") {
      localStorage.setItem("workoutOptions", JSON.stringify(next));
      localStorage.setItem("selectedWorkoutOptions", JSON.stringify(nextSelected));
      if (nextSelected.length === 0) localStorage.removeItem("selectedWorkoutOption");
      else localStorage.setItem("selectedWorkoutOption", nextSelected[0]);
    }
  }, [workoutOptions, selectedWorkoutOptions]);

  const persistSchedule = (scheduleToUse: Record<string, { days: number[] }>) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayToWorkout = new Map<number, { name: string; optionId: string }>();
    for (const optId of selectedWorkoutOptions) {
      const opt = workoutOptions.find((o) => o.id === optId);
      if (!opt) continue;
      const days = (scheduleToUse[optId] ?? { days: [] }).days || [];
      days.forEach((d) => {
        dayToWorkout.set(d, { name: opt.name, optionId: optId });
      });
    }
    const existing = JSON.parse(localStorage.getItem("workoutSchedule") || "[]") as WorkoutSchedule[];
    const existingByDate = new Map(existing.map((w) => [w.date, w]));

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = toLocalDateString(d);
      const dayOfWeek = d.getDay();
      const assigned = dayToWorkout.get(dayOfWeek);
      const existingEntry = existingByDate.get(dateStr);
      existingByDate.set(dateStr, {
        date: dateStr,
        workoutName: assigned?.name ?? "Rest Day",
        completed: existingEntry?.completed ?? false,
        optionId: assigned?.optionId,
      });
    }

    const merged = Array.from(existingByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem("workoutSchedule", JSON.stringify(merged));
    localStorage.setItem("manualScheduleByPlan", JSON.stringify(scheduleToUse));
    localStorage.setItem("scheduleLastUpdated", String(Date.now()));
  };

  const handleSaveSchedule = () => {
    persistSchedule(manualSchedule);
  };

  const handleAddWorkout = () => {
    const optionNumbers = workoutOptions.map((opt) => {
      const match = opt.name.match(/Option (\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxFromName =
      optionNumbers.length > 0 ? Math.max(...optionNumbers, 0) : 0;
    const maxFromId = workoutOptions.reduce((acc, o) => {
      const m = o.id.match(/^option(\d+)$/);
      return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
    }, 0);
    const nextNumber = Math.max(maxFromName, maxFromId, workoutOptions.length) + 1;

    const newId = `option${nextNumber}`;
    const newOption: WorkoutOption = {
      id: newId,
      name: `My workout ${nextNumber}`,
      days: {
        day1: [],
        day2: [],
        day3: [],
      },
      dayNames: {
        day1: "Day 1",
        day2: "Day 2",
        day3: "Day 3",
      },
    };

    const updatedOptions = [...workoutOptions, newOption];
    setWorkoutOptions(updatedOptions);
    if (typeof window !== "undefined") {
      localStorage.setItem("workoutOptions", JSON.stringify(updatedOptions));
    }
    router.push(`/gym/workouts/${newId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.push("/gym/workout")}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Back to workout"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent text-center px-1">
            Workout plans
          </h1>
          <button
            type="button"
            onClick={handleAddWorkout}
            className="flex items-center gap-1 px-3 py-1.5 bg-teal-400 hover:bg-teal-300 text-black rounded-lg text-xs font-bold transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
          <span className="text-teal-400 font-medium">Tap a row</span> to add or edit exercises.&nbsp;
          <span className="text-white/80 font-medium">Use</span> adds the plan to your week (up to 10). Swipe left to delete.
        </p>

        {selectedWorkoutOptions.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-xl bg-white/5 border border-white/15 text-sm font-medium text-teal-300 hover:bg-white/10 transition-colors"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Which days do you train?
          </button>
        ) : null}

        {/* Workout options */}
        <div className="grid grid-cols-1 gap-2.5">
          {workoutOptions.map((option) => {
            const exerciseCount =
              (option.days?.day1?.length ?? 0) +
              (option.days?.day2?.length ?? 0) +
              (option.days?.day3?.length ?? 0);
            const isEmpty = exerciseCount === 0;
            const isActive = selectedWorkoutOptions.includes(option.id);
            const scheduledDays = (manualSchedule[option.id]?.days ?? [])
              .map((d: number) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
              .join(", ");

            return (
              <SwipeableRow
                key={option.id}
                isSelected={isActive}
                isDisabled={!isActive && selectedWorkoutOptions.length >= 10}
                onSelect={() => handleSelectOption(option.id)}
                onUse={() => handleUseOption(option.id)}
                onRemove={() => handleRemoveOption(option.id)}
              >
                <div className={`flex-1 min-w-0 flex items-center gap-2.5 ${isEmpty ? "opacity-50" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    isActive
                      ? "border-teal-500/50 bg-teal-500/15"
                      : isEmpty
                        ? "border-white/8 bg-white/4"
                        : "border-white/10 bg-white/5"
                  }`}>
                    <PencilLine className={`w-3.5 h-3.5 ${isActive ? "text-teal-400" : "text-gray-500"}`} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{option.name}</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {isEmpty
                        ? "Empty — tap to build"
                        : scheduledDays
                          ? `${exerciseCount} exercises · ${scheduledDays}`
                          : `${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""} · no days set`}
                    </p>
                  </div>
                </div>
              </SwipeableRow>
            );
          })}
        </div>

      </div>

      {/* Schedule modal - day-first: pick one workout (or Rest) per day */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto border border-white/10 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-2">Assign workout to each day</h2>
            <p className="text-sm text-gray-400 mb-4">
              Pick which workout (or Rest) for each day. One choice per day.
            </p>
            <div className="space-y-2 mb-4">
              {[
                { label: "Monday", dayIndex: 1 },
                { label: "Tuesday", dayIndex: 2 },
                { label: "Wednesday", dayIndex: 3 },
                { label: "Thursday", dayIndex: 4 },
                { label: "Friday", dayIndex: 5 },
                { label: "Saturday", dayIndex: 6 },
                { label: "Sunday", dayIndex: 0 },
              ].map(({ label, dayIndex }) => {
                const assignedOptionId = Object.entries(manualSchedule).find(([, v]) =>
                  (v?.days || []).includes(dayIndex)
                )?.[0] ?? null;
                return (
                  <div
                    key={dayIndex}
                    className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <span className="text-white font-medium w-24 shrink-0">{label}</span>
                    <select
                      value={assignedOptionId ?? "rest"}
                      onChange={(e) => {
                        const val = e.target.value;
                        const optId = val === "rest" ? null : val;
                        const getAssignedForDay = (d: number) =>
                          d === dayIndex ? optId : Object.entries(manualSchedule).find(([, v]) => (v?.days || []).includes(d))?.[0] ?? null;
                        const next: Record<string, { days: number[] }> = {};
                        for (const id of selectedWorkoutOptions) {
                          next[id] = { days: [0, 1, 2, 3, 4, 5, 6].filter((d) => getAssignedForDay(d) === id).sort((a, b) => a - b) };
                        }
                        setManualSchedule(next);
                        persistSchedule(next);
                      }}
                      className="flex-1 bg-[#0c1422] border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    >
                      <option value="rest">Rest</option>
                      {selectedWorkoutOptions.map((optId) => {
                        const opt = workoutOptions.find((o) => o.id === optId);
                        if (!opt) return null;
                        return (
                          <option key={optId} value={optId}>
                            {opt.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              })}
            </div>
            <Link
              href="/gym/ai-coach"
              onClick={() => setShowScheduleModal(false)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-teal-500/20 border border-teal-400/50 text-teal-400 rounded-xl font-semibold hover:bg-teal-500/30 transition-colors mb-3"
            >
              <Sparkles className="w-4 h-4" />
              Let AI Coach set this up
            </Link>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  handleSaveSchedule();
                  setShowScheduleModal(false);
                  window.location.href = "/gym/workout?refresh=" + Date.now();
                }}
                className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveSchedule();
                  setShowScheduleModal(false);
                  window.location.href = "/gym/workout?refresh=" + Date.now();
                }}
                className="flex-1 py-3 bg-teal-400 hover:bg-teal-500 text-black rounded-xl font-semibold transition-colors"
              >
                Save & go back
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
