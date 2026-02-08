/**
 * Built-in exercise images (stored in /public, shown on all devices)
 * Key: exercise name lowercase (partial match)
 * Value: path to image in public folder
 */
export const BUILT_IN_EXERCISE_IMAGES: Record<string, string> = {
  "chest press": "/images/exercises/chest-press-machine.png",
  "chest press machine": "/images/exercises/chest-press-machine.png",
  "chest push": "/images/exercises/chest-press-machine.png",
  "chest push machine": "/images/exercises/chest-press-machine.png",
};

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
