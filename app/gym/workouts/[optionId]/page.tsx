"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Plus, Trash2, Check, X, Minus } from "lucide-react";
import ExerciseNameInput from "@/components/ExerciseNameInput";
import { persistWorkoutSchedule } from "@/lib/schedule-utils";

interface WorkoutOption {
  id: string;
  name: string;
  days: { day1: any[]; day2: any[]; day3: any[] };
  dayNames: { day1: string; day2: string; day3: string };
}

interface Exercise {
  name: string;
  sets: number;
  reps: number;
}

const WEEK_DAYS = [
  { label: "M", day: 1 },
  { label: "T", day: 2 },
  { label: "W", day: 3 },
  { label: "T", day: 4 },
  { label: "F", day: 5 },
  { label: "S", day: 6 },
  { label: "S", day: 0 },
];

function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 30,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="bg-black/50 border border-white/8 rounded-2xl px-3 py-3 flex flex-col items-center gap-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onPointerDown={(e) => e.currentTarget.classList.add("scale-90")}
          onPointerUp={(e) => e.currentTarget.classList.remove("scale-90")}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-gray-300 active:bg-white/20 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-3xl font-black text-white w-9 text-center tabular-nums leading-none">
          {value}
        </span>
        <button
          type="button"
          onPointerDown={(e) => e.currentTarget.classList.add("scale-90")}
          onPointerUp={(e) => e.currentTarget.classList.remove("scale-90")}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 active:bg-teal-500/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function WorkoutOptionPage() {
  const router = useRouter();
  const params = useParams();
  const optionId = params?.optionId as string;

  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [currentOption, setCurrentOption] = useState<WorkoutOption | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !optionId) return;

    const stored = localStorage.getItem("workoutOptions");
    if (stored) {
      try {
        const options: WorkoutOption[] = JSON.parse(stored);
        setWorkoutOptions(options);
        const opt = options.find((o) => o.id === optionId);
        if (opt) {
          setCurrentOption(opt);
          setWorkoutName(opt.name);
          setTempName(opt.name);

          const toEx = (exs: any[]): Exercise[] =>
            (exs || []).map((ex) => ({
              name: ex.name || "",
              sets: ex.goalSets || 3,
              reps: ex.goalReps || 10,
            }));

          const all = [
            ...toEx(opt.days.day1),
            ...toEx(opt.days.day2),
            ...toEx(opt.days.day3),
          ];
          setExercises(all);
        }
      } catch {}
    }

    // Load existing schedule days
    const sched = localStorage.getItem("manualScheduleByPlan");
    if (sched) {
      try {
        const s = JSON.parse(sched);
        if (s[optionId]?.days) setSelectedDays(s[optionId].days);
      } catch {}
    }
  }, [optionId]);

  const updateExercise = (index: number, field: keyof Exercise, value: string | number) => {
    setExercises((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    if (!currentOption || !workoutName.trim()) return;

    const converted = exercises
      .filter((ex) => ex.name.trim())
      .map((ex, i) => ({
        id: `custom-${Date.now()}-${i}`,
        name: ex.name,
        goalSets: ex.sets,
        goalReps: ex.reps,
        goalWeight: 0,
        sets: Array.from({ length: ex.sets }, () => ({
          reps: ex.reps,
          weight: 0,
          completed: false,
        })),
      }));

    const updatedOptions = workoutOptions.map((opt) =>
      opt.id === optionId
        ? { ...opt, name: workoutName, days: { day1: converted, day2: [], day3: [] } }
        : opt
    );
    setWorkoutOptions(updatedOptions);

    if (typeof window !== "undefined") {
      localStorage.setItem("workoutOptions", JSON.stringify(updatedOptions));

      const curSelected: string[] = JSON.parse(
        localStorage.getItem("selectedWorkoutOptions") || "[]"
      );
      const newSelected = curSelected.includes(optionId)
        ? curSelected
        : [...curSelected, optionId];
      localStorage.setItem("selectedWorkoutOptions", JSON.stringify(newSelected));
      localStorage.setItem("selectedWorkoutOption", optionId);

      // Save schedule with the days picked on this page
      const existingSched: Record<string, { days: number[] }> = JSON.parse(
        localStorage.getItem("manualScheduleByPlan") || "{}"
      );
      existingSched[optionId] = { days: selectedDays };
      persistWorkoutSchedule(existingSched, newSelected, updatedOptions);
    }

    router.push("/gym/workout");
  };

  if (!currentOption) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  const namedCount = exercises.filter((e) => e.name.trim()).length;

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-md mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/gym/workouts" className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setWorkoutName(tempName); setIsEditingName(false); }
                  if (e.key === "Escape") { setTempName(workoutName); setIsEditingName(false); }
                }}
                placeholder="e.g. Push Day"
                className="flex-1 min-w-0 bg-white/5 border border-teal-400/40 rounded-xl px-3 py-2 text-white font-bold text-base focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { setWorkoutName(tempName); setIsEditingName(false); }}
                className="p-2 text-teal-400 hover:bg-teal-400/10 rounded-xl shrink-0"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => { setTempName(workoutName); setIsEditingName(false); }}
                className="p-2 text-gray-500 hover:bg-white/10 rounded-xl shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex-1 min-w-0 text-left group"
              onClick={() => { setTempName(workoutName); setIsEditingName(true); }}
            >
              <h1 className="text-xl font-bold text-white truncate group-hover:text-teal-300 transition-colors">
                {workoutName || "Workout"}
              </h1>
              <p className="text-[11px] text-gray-600 group-hover:text-teal-400/60 transition-colors">
                Tap to rename
              </p>
            </button>
          )}
        </div>

        {/* Exercises section */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">Exercises</h2>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {namedCount > 0 ? `${namedCount} added` : "None yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExercises((prev) => [...prev, { name: "", sets: 3, reps: 10 }])}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-400 hover:bg-teal-500 active:bg-teal-600 text-black text-sm font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {exercises.length === 0 ? (
            <button
              type="button"
              onClick={() => setExercises([{ name: "", sets: 3, reps: 10 }])}
              className="w-full py-12 rounded-2xl border-2 border-dashed border-white/8 flex flex-col items-center gap-2 text-gray-600 hover:border-teal-500/30 hover:text-teal-400/50 transition-colors"
            >
              <Plus className="w-7 h-7" />
              <span className="text-sm font-medium">Add your first exercise</span>
            </button>
          ) : (
            <div className="space-y-3">
              {exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="bg-[#0c1422] border border-white/8 rounded-2xl p-4"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400/50">
                      Exercise {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExercises((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Exercise name — full width */}
                  <div className="mb-4">
                    <ExerciseNameInput
                      value={ex.name}
                      onChange={(name) => updateExercise(idx, "name", name)}
                      placeholder="Exercise name…"
                      className="w-full bg-black/60 text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-teal-400/60 text-base placeholder:text-gray-700"
                    />
                  </div>

                  {/* Stepper row */}
                  <div className="grid grid-cols-2 gap-3">
                    <Stepper
                      label="Sets"
                      value={ex.sets}
                      onChange={(v) => updateExercise(idx, "sets", v)}
                    />
                    <Stepper
                      label="Reps"
                      value={ex.reps}
                      onChange={(v) => updateExercise(idx, "reps", v)}
                      max={50}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Training days */}
        <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-bold text-white mb-0.5">Training days</h3>
          <p className="text-[11px] text-gray-500 mb-4">
            Which days of the week do you do this workout?
          </p>
          <div className="flex gap-1.5">
            {WEEK_DAYS.map((d) => {
              const active = selectedDays.includes(d.day);
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => toggleDay(d.day)}
                  className={`flex-1 aspect-square rounded-xl text-xs font-bold transition-all active:scale-90 ${
                    active
                      ? "bg-teal-400 text-black shadow-lg shadow-teal-500/20"
                      : "bg-white/5 border border-white/8 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          {selectedDays.length > 0 && (
            <p className="text-[11px] text-teal-400/60 text-center mt-3">
              {selectedDays.length} day{selectedDays.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!workoutName.trim()}
          className="w-full py-4 bg-teal-400 hover:bg-teal-500 active:bg-teal-600 disabled:opacity-30 text-black font-bold text-base rounded-2xl transition-colors"
        >
          Save workout
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
