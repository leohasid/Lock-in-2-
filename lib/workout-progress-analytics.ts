import { toLocalDateString } from "@/lib/date-utils";

export type MuscleGroupId = "chest" | "back" | "shoulders" | "arms" | "legs" | "core";

export type StoredSet = { reps?: number; weight?: number; completed?: boolean };

export type StoredExercise = { name?: string; sets?: StoredSet[] };

export type StoredWorkoutDay = { date: string; exercises: StoredExercise[] };

const GROUP_META: Record<MuscleGroupId, { label: string; short: string }> = {
  chest: { label: "Chest", short: "Chest" },
  back: { label: "Back", short: "Back" },
  shoulders: { label: "Shoulders", short: "Delts" },
  arms: { label: "Arms", short: "Arms" },
  legs: { label: "Legs", short: "Legs" },
  core: { label: "Core", short: "Core" },
};

export const MUSCLE_GROUP_ORDER: MuscleGroupId[] = ["chest", "back", "shoulders", "arms", "legs", "core"];

export function getMuscleGroupMeta(id: MuscleGroupId) {
  return GROUP_META[id];
}

/** Classify exercise by name; returns null if unknown (volume still counted in totals). */
export function inferMuscleGroup(exerciseName: string): MuscleGroupId | null {
  const n = (exerciseName || "").toLowerCase();

  const has = (pats: string[]) => pats.some((p) => n.includes(p));

  if (has(["plank", "crunch", "ab wheel", "ab roll", "sit-up", "situp", "russian twist", "hanging leg", "leg raise", "oblique", "woodchop", "wood chop"])) {
    return "core";
  }
  if (n.includes("face pull") || n.includes("rear delt") || n.includes("reverse fly")) return "shoulders";
  if (has(["curl", "tricep", "triceps", "bicep", "biceps", "hammer", "skull", "preacher", "rope push"])) return "arms";
  if (n.includes("dip") && has(["tricep", "triceps"])) return "arms";
  if (
    has([
      "squat",
      "leg press",
      "lunge",
      "leg curl",
      "leg extension",
      "calf ",
      " calves",
      "romanian",
      "rdl",
      "hack squat",
      "glute",
      "hip thrust",
      "step-up",
      "step up",
      "goblet squat",
      "split squat",
      "deadlift",
      "dead lift",
      "sumo dead",
    ])
  ) {
    return "legs";
  }
  if (
    has([
      "row",
      "pull-up",
      "pullup",
      "chin-up",
      "chinup",
      "lat pul",
      "pulldown",
      "pull down",
      "cable row",
      "t-bar",
      "shrug",
      "good morning",
      "back extension",
      "hyperextension",
    ])
  ) {
    return "back";
  }
  if (
    has([
      "shoulder",
      "lateral raise",
      "front raise",
      "arnold",
      "overhead press",
      "ohp",
      "military press",
      "upright row",
    ])
  ) {
    return "shoulders";
  }
  if (has(["bench", "chest fly", "chest press", "pec deck", "pec ", "push-up", "pushup", " fly", "crossover", " dip"]) || (n.includes("press") && (n.includes("bench") || n.includes("chest") || n.includes("incline") || n.includes("decline")))) {
    return "chest";
  }

  return null;
}

export function volumeFromExercise(ex: StoredExercise): number {
  let v = 0;
  (ex.sets || []).forEach((s) => {
    if (s.completed) {
      v += (Number(s.reps) || 0) * (Number(s.weight) || 0);
    }
  });
  return v;
}

export function dayVolume(data: StoredExercise[]): number {
  return data.reduce((sum, ex) => sum + volumeFromExercise(ex), 0);
}

export function collectWorkoutDaysFromStorage(
  getItem: (key: string) => string | null,
  keys: string[]
): StoredWorkoutDay[] {
  const out: StoredWorkoutDay[] = [];
  const prefix = "workout_data_";

  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    const date = key.slice(prefix.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    try {
      const raw = getItem(key);
      if (!raw) continue;
      const exercises = JSON.parse(raw) as StoredExercise[];
      if (!Array.isArray(exercises)) continue;
      if (dayVolume(exercises) <= 0) continue;
      out.push({ date, exercises });
    } catch {
      continue;
    }
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** Min total kg in the *prior* window before showing % (avoids noisy math). */
const STREND_MIN_BASELINE = 200;

export function sumVolumeBetween(history: StoredWorkoutDay[], startInclusive: string, endInclusive: string): number {
  let s = 0;
  for (const day of history) {
    if (day.date >= startInclusive && day.date <= endInclusive) {
      s += dayVolume(day.exercises);
    }
  }
  return s;
}

/** Volume and how many days had any logged volume in range (calendar days without logs = 0 contribution). */
export function volumeAndActiveDaysBetween(
  history: StoredWorkoutDay[],
  startInclusive: string,
  endInclusive: string
): { volume: number; activeDays: number } {
  let volume = 0;
  let activeDays = 0;
  for (const day of history) {
    if (day.date < startInclusive || day.date > endInclusive) continue;
    const v = dayVolume(day.exercises);
    volume += v;
    if (v > 0) activeDays++;
  }
  return { volume, activeDays };
}

export function dateAddDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return toLocalDateString(dt);
}

/**
 * Compare average kg per **day you actually trained** in each window so long gaps with no logs
 * don't drag the recent window to near-zero and fake a huge negative %.
 */
function pctStrengthTrendFromActiveDayAverages(
  recentVol: number,
  recentActive: number,
  prevVol: number,
  prevActive: number
): number | null {
  if (recentActive === 0) return null;
  if (prevActive === 0 || prevVol < STREND_MIN_BASELINE) return null;
  const avgR = recentVol / recentActive;
  const avgP = prevVol / prevActive;
  if (avgP < 1) return null;
  const raw = Math.round(((avgR - avgP) / avgP) * 100);
  return Math.max(-90, Math.min(300, raw));
}

export type StrengthTrendPeriodId = "week" | "month" | "3mo" | "6mo" | "year" | "overall";

export interface StrengthTrendRow {
  id: StrengthTrendPeriodId;
  label: string;
  subtitle: string;
  /** % change in avg kg per training day vs prior window; null if you didn't train recently or baseline is thin */
  changePct: number | null;
  recentVolume: number;
  previousVolume: number;
}

/**
 * Compares average completed volume (kg) **per day you logged work** in recent vs prior windows of the same length.
 * Calendar days with no logs are ignored. No training days in the recent window → no % (dash).
 */
export function computeStrengthVolumeTrends(history: StoredWorkoutDay[], today: Date): StrengthTrendRow[] {
  const todayStr = toLocalDateString(today);
  const rows: StrengthTrendRow[] = [];

  const fixedWindows: { id: Exclude<StrengthTrendPeriodId, "overall">; days: number; label: string; subtitle: string }[] = [
    { id: "week", days: 7, label: "Past week", subtitle: "avg per session day vs prior week" },
    { id: "month", days: 30, label: "Past month", subtitle: "avg per session day vs prior month" },
    { id: "3mo", days: 90, label: "Past 3 months", subtitle: "avg per session day vs prior 90 days" },
    { id: "6mo", days: 180, label: "Past 6 months", subtitle: "avg per session day vs prior 180 days" },
    { id: "year", days: 365, label: "Past year", subtitle: "avg per session day vs prior year" },
  ];

  for (const w of fixedWindows) {
    const recentStart = dateAddDays(todayStr, -(w.days - 1));
    const recent = volumeAndActiveDaysBetween(history, recentStart, todayStr);

    const prevEnd = dateAddDays(recentStart, -1);
    const prevStart = dateAddDays(prevEnd, -(w.days - 1));
    const prev = volumeAndActiveDaysBetween(history, prevStart, prevEnd);

    const changePct = pctStrengthTrendFromActiveDayAverages(
      recent.volume,
      recent.activeDays,
      prev.volume,
      prev.activeDays
    );

    rows.push({
      id: w.id,
      label: w.label,
      subtitle: w.subtitle,
      changePct,
      recentVolume: recent.volume,
      previousVolume: prev.volume,
    });
  }

  if (history.length > 0) {
    const firstDate = history[0].date;
    const lastDate = history[history.length - 1].date;
    const [y1, m1, d1] = firstDate.split("-").map(Number);
    const [y2, m2, d2] = lastDate.split("-").map(Number);
    const t0 = new Date(y1, m1 - 1, d1).getTime();
    const t1 = new Date(y2, m2 - 1, d2).getTime();
    const spanDays = Math.floor((t1 - t0) / 86400000) + 1;

    if (spanDays < 21) {
      rows.push({
        id: "overall",
        label: "Since you started",
        subtitle: "Log ~3+ weeks to compare early vs recent training",
        changePct: null,
        recentVolume: sumVolumeBetween(history, firstDate, lastDate),
        previousVolume: 0,
      });
    } else {
      const mid = dateAddDays(firstDate, Math.floor(spanDays / 2) - 1);
      const earlyEnd = mid;
      const lateStart = dateAddDays(mid, 1);
      const early = volumeAndActiveDaysBetween(history, firstDate, earlyEnd);
      const late = volumeAndActiveDaysBetween(history, lateStart, lastDate);
      const changePct = pctStrengthTrendFromActiveDayAverages(
        late.volume,
        late.activeDays,
        early.volume,
        early.activeDays
      );

      rows.push({
        id: "overall",
        label: "Since you started",
        subtitle: "avg per session day: latest half of your logs vs first half",
        changePct,
        recentVolume: late.volume,
        previousVolume: early.volume,
      });
    }
  } else {
    rows.push({
      id: "overall",
      label: "Since you started",
      subtitle: "No logged workouts yet",
      changePct: null,
      recentVolume: 0,
      previousVolume: 0,
    });
  }

  return rows;
}

export interface ProgressionTip {
  exerciseName: string;
  muscleGroup: MuscleGroupId | null;
  kind: "progress_weight" | "stall" | "form_check";
  title: string;
  detail: string;
}

function normalizeExerciseName(name: string): string {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildProgressionTips(
  history: StoredWorkoutDay[],
  planExercises: Array<{ name: string; goalReps: number; goalSets: number }>
): ProgressionTip[] {
  const tips: ProgressionTip[] = [];
  const goalByName = new Map<string, { goalReps: number; goalSets: number }>();
  for (const ex of planExercises) {
    const k = normalizeExerciseName(ex.name);
    if (!k) continue;
    goalByName.set(k, { goalReps: ex.goalReps, goalSets: ex.goalSets });
  }

  const sessionsByExercise = new Map<string, StoredWorkoutDay[]>();
  for (const day of history) {
    for (const ex of day.exercises) {
      const k = normalizeExerciseName(ex.name || "");
      if (!k || !goalByName.has(k)) continue;
      if (!sessionsByExercise.has(k)) sessionsByExercise.set(k, []);
      const arr = sessionsByExercise.get(k)!;
      if (!arr.some((d) => d.date === day.date)) arr.push(day);
    }
  }

  for (const [key, days] of sessionsByExercise) {
    const goal = goalByName.get(key);
    if (!goal) continue;
    const uniqueDates = [...new Set(days.map((d) => d.date))].sort((a, b) => b.localeCompare(a));
    if (uniqueDates.length === 0) continue;

    const lastDate = uniqueDates[0];
    const lastDay = days.find((d) => d.date === lastDate)!;
    const ex = lastDay.exercises.find((e) => normalizeExerciseName(e.name || "") === key);
    if (!ex || !ex.sets?.length) continue;

    const completed = ex.sets.filter((s) => s.completed);
    const setsToCheck = Math.min(goal.goalSets, ex.sets.length);
    const relevant = completed.slice(0, setsToCheck);
    if (relevant.length < setsToCheck) continue;

    const allHitReps = relevant.every((r) => (Number(r.reps) || 0) >= goal.goalReps);
    const displayName = ex.name || key;
    const mg = inferMuscleGroup(displayName);

    if (allHitReps) {
      const w = Math.max(...relevant.map((s) => Number(s.weight) || 0));
      tips.push({
        exerciseName: displayName,
        muscleGroup: mg,
        kind: "progress_weight",
        title: `Ready to progress — ${displayName}`,
        detail:
          w > 0
            ? `You hit ${goal.goalReps}+ reps on your working sets at ${w} kg. Add about 2.5–5 kg next session if form stays solid, or add 1–2 reps before bumping weight.`
            : `You hit your rep targets on every logged set. When you add weight, keep the same rep quality — small jumps beat big ego lifts.`,
      });
      continue;
    }

    if (uniqueDates.length >= 3) {
      const lastThree = uniqueDates.slice(0, 3);
      const weights = lastThree
        .map((ds) => {
          const d = days.find((x) => x.date === ds);
          const exx = d?.exercises.find((e) => normalizeExerciseName(e.name || "") === key);
          if (!exx) return null;
          const comp = (exx.sets || []).filter((s) => s.completed).map((s) => Number(s.weight) || 0);
          return comp.length ? Math.max(...comp) : null;
        })
        .filter((x): x is number => x != null);

      if (weights.length >= 3 && weights[0] <= weights[2] && !allHitReps) {
        tips.push({
          exerciseName: displayName,
          muscleGroup: mg,
          kind: "stall",
          title: `Plateau check — ${displayName}`,
          detail: `Top weight has been flat for a few sessions and reps aren’t quite at ${goal.goalReps} yet. Try an extra half-set, better sleep, or one lighter “technique” week before pushing again.`,
        });
      }
    }
  }

  return tips.slice(0, 6);
}

/** Best lifts considering only sets that hit your plan rep target (reps ≥ goal). */
export interface GoalBestRow {
  exerciseName: string;
  goalReps: number;
  /** Heaviest weight on any qualifying set */
  bestWeight: number | null;
  /** Most reps on any qualifying set (may be at a lighter weight than bestWeight) */
  bestReps: number | null;
  qualifyingSetCount: number;
}

export function computeGoalBasedBests(
  history: StoredWorkoutDay[],
  planExercises: Array<{ name: string; goalReps: number; goalSets: number }>
): GoalBestRow[] {
  const byKey = new Map<string, { goalReps: number; displayName: string }>();
  for (const ex of planExercises) {
    const k = normalizeExerciseName(ex.name);
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, { goalReps: ex.goalReps, displayName: ex.name.trim() || ex.name });
  }

  const rows: GoalBestRow[] = [];

  for (const [key, meta] of byKey) {
    let bestWeight = 0;
    let bestReps = 0;
    let qualifyingSetCount = 0;
    const g = meta.goalReps;

    for (const day of history) {
      const ex = day.exercises.find((e) => normalizeExerciseName(e.name || "") === key);
      if (!ex) continue;
      for (const s of ex.sets || []) {
        if (!s.completed) continue;
        const r = Number(s.reps) || 0;
        const w = Number(s.weight) || 0;
        if (r < g || w <= 0) continue;
        qualifyingSetCount++;
        if (w > bestWeight) bestWeight = w;
        if (r > bestReps) bestReps = r;
      }
    }

    rows.push({
      exerciseName: meta.displayName,
      goalReps: g,
      bestWeight: bestWeight > 0 ? bestWeight : null,
      bestReps: bestReps > 0 ? bestReps : null,
      qualifyingSetCount,
    });
  }

  rows.sort((a, b) => {
    const ah = a.bestWeight != null ? 1 : 0;
    const bh = b.bestWeight != null ? 1 : 0;
    if (ah !== bh) return bh - ah;
    return a.exerciseName.localeCompare(b.exerciseName);
  });

  return rows;
}
