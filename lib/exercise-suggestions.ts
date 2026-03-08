/**
 * Suggested exercise names - these match images in built-in-exercise-images
 * or can have images added via the admin exercise-images page.
 * Using these ensures photos match up when displaying exercises.
 */
export const EXERCISE_SUGGESTIONS: string[] = [
  // Push
  "Bench Press",
  "Chest Press",
  "Chest Press Machine",
  "Incline Bench Press",
  "Dumbbell Press",
  "Shoulder Press",
  "Overhead Press",
  "Lateral Raises",
  "Front Raises",
  "Tricep Dips",
  "Tricep Extension",
  "Overhead Tricep Extensions",
  "One Handed Tricep Push Down",
  "Close Grip Bench Press",
  "Push Ups",
  "Dips",
  "Chest Fly",
  "Pec Deck",
  // Pull
  "Pull Ups",
  "Lat Pulldown",
  "Lat Pull Overs",
  "Barbell Row",
  "Dumbbell Row",
  "Cable Row",
  "T-Bar Row",
  "Bicep Curl",
  "Hammer Curl",
  "Preacher Curl",
  "Cable Curl",
  "Face Pull",
  "Rear Delt Fly",
  "Shrugs",
  "Upright Row",
  // Legs
  "Squat",
  "Leg Press",
  "Leg Extension",
  "Leg Curl",
  "Deadlift",
  "Romanian Deadlift",
  "Lunges",
  "Bulgarian Split Squat",
  "Calf Raise",
  "Seated Calf Raise",
  "Hip Thrust",
  "Glute Bridge",
  "Hack Squat",
  "Walking Lunges",
].sort();

export function filterExerciseSuggestions(query: string, limit = 8): string[] {
  if (!query.trim()) return EXERCISE_SUGGESTIONS.slice(0, limit);
  const q = query.toLowerCase().trim();
  return EXERCISE_SUGGESTIONS.filter((name) => name.toLowerCase().includes(q)).slice(0, limit);
}
