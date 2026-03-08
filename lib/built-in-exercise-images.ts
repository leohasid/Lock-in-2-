/**
 * Built-in exercise images (stored in /public, shown on all devices)
 * Key: exercise name lowercase (partial match)
 * Value: path to image in public folder
 */
export const BUILT_IN_EXERCISE_IMAGES: Record<string, string> = {
  // Chest
  "chest press": "/images/exercises/chest-press-machine.png",
  "chest press machine": "/images/exercises/chest-press-machine.png",
  "chest push": "/images/exercises/chest-press-machine.png",
  "chest push machine": "/images/exercises/chest-press-machine.png",
  "bench press": "/images/exercises/bench-press.png",
  "incline bench press": "/images/exercises/incline-bench-press.png",
  "incline barbell press": "/images/exercises/incline-bench-press.png",
  "incline dumbbell press": "/images/exercises/incline-dumbbell-press.png",
  "dumbbell fly": "/images/exercises/dumbbell-fly.png",
  "chest fly": "/images/exercises/incline-fly.png",
  "incline fly": "/images/exercises/incline-fly.png",
  "incline dumbbell fly": "/images/exercises/incline-fly.png",
  "pec deck": "/images/exercises/incline-fly.png",
  // Shoulders
  "front raise": "/images/exercises/front-raises.png",
  "front raises": "/images/exercises/front-raises.png",
  "dumbbell front raise": "/images/exercises/front-raises.png",
  "lateral raise": "/images/exercises/lateral-raises.png",
  "lateral raises": "/images/exercises/lateral-raises.png",
  "overhead press": "/images/exercises/overhead-press.png",
  "shoulder press": "/images/exercises/overhead-press.png",
  "barbell overhead press": "/images/exercises/overhead-press.png",
  // Triceps
  "dips": "/images/exercises/dips.png",
  "dip": "/images/exercises/dips.png",
  "tricep dips": "/images/exercises/dips.png",
  // Back / Pull
  "barbell row": "/images/exercises/barbell-row.png",
  "bent over barbell row": "/images/exercises/barbell-row.png",
  "dumbbell row": "/images/exercises/dumbbell-row.png",
  "cable curl": "/images/exercises/cable-curl.png",
  "cable bicep curl": "/images/exercises/cable-curl.png",
  "bicep curl": "/images/exercises/cable-curl.png",
  "face pull": "/images/exercises/face-pull.png",
  // Legs
  "leg press": "/images/exercises/leg-press.png",
  "leg press machine": "/images/exercises/leg-press.png",
  "leg extension": "/images/exercises/leg-extension.png",
  "leg curl": "/images/exercises/leg-curl.png",
  "prone leg curl": "/images/exercises/leg-curl.png",
  "lying leg curl": "/images/exercises/leg-curl.png",
  "hip thrust": "/images/exercises/hip-thrust.png",
  "barbell hip thrust": "/images/exercises/hip-thrust.png",
  "glute bridge": "/images/exercises/hip-thrust.png",
  "lunges": "/images/exercises/lunges.png",
  "dumbbell lunge": "/images/exercises/lunges.png",
  "walking lunges": "/images/exercises/lunges.png",
  "hack squat": "/images/exercises/hack-squat.png",
  "split squat": "/images/exercises/split-squat.png",
  "bulgarian split squat": "/images/exercises/split-squat.png",
};

/** Standing exercises (person upright) - use object-top so head is visible */
const STANDING_EXERCISES = ["lateral raise", "front raise"];

export function getExerciseImagePosition(exerciseName: string): "object-top" | "object-center" {
  if (!exerciseName) return "object-center";
  const name = exerciseName.toLowerCase().trim();
  return STANDING_EXERCISES.some((key) => name.includes(key)) ? "object-top" : "object-center";
}

export function getBuiltInImageUrl(exerciseName: string): string | undefined {
  if (!exerciseName) return undefined;
  const name = exerciseName.toLowerCase().trim();
  for (const [key, url] of Object.entries(BUILT_IN_EXERCISE_IMAGES)) {
    if (name.includes(key) || key.includes(name)) {
      return url;
    }
  }
  return undefined;
}
