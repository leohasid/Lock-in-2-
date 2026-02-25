import { toLocalDateString } from "./date-utils";

interface WorkoutSchedule {
  date: string;
  workoutName: string;
  completed: boolean;
  optionId?: string;
}

export function persistWorkoutSchedule(
  scheduleToUse: Record<string, { days: number[] }>,
  selectedOptions: string[],
  workoutOptions: { id: string; name: string }[]
) {
  if (typeof window === "undefined") return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayToWorkout = new Map<number, { name: string; optionId: string }>();
  for (const optId of selectedOptions) {
    const opt = workoutOptions.find((o) => o.id === optId);
    if (!opt) continue;
    const days = (scheduleToUse[optId] ?? { days: [] }).days ?? [];
    days.forEach((d) => {
      const dayNum = Number(d);
      if (dayNum >= 0 && dayNum <= 6) dayToWorkout.set(dayNum, { name: opt.name, optionId: optId });
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
}
