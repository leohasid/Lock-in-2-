/**
 * Developer utility for adding demonstration images to exercises
 * 
 * To add an image to an exercise:
 * 1. Convert your image to base64 (you can use online tools or Node.js)
 * 2. Call addImageToExercise() with the exercise name and base64 image
 * 
 * Example:
 * ```typescript
 * import { addImageToExercise } from '@/lib/exercise-images';
 * 
 * const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANS...'; // Your base64 string
 * addImageToExercise('Chest Press', base64Image);
 * ```
 */

interface Exercise {
  id: string;
  name: string;
  goalSets: number;
  goalReps: number;
  goalWeight: number;
  imageUrl?: string;
  sets: Array<{
    reps: number;
    weight: number;
    completed: boolean;
  }>;
}

interface WorkoutPlanByDay {
  pushDay: Exercise[];
  pullDay: Exercise[];
  legsDay: Exercise[];
}

/**
 * Adds an image to an exercise by name across all workout days
 * @param exerciseName - The name of the exercise (case-insensitive partial match)
 * @param imageUrl - Base64 image string (e.g., 'data:image/png;base64,...')
 */
export function addImageToExercise(exerciseName: string, imageUrl: string): void {
  if (typeof window === "undefined") {
    console.warn("addImageToExercise can only be called in the browser");
    return;
  }

  const storedPlan = localStorage.getItem("workoutPlan");
  if (!storedPlan) {
    console.warn("No workout plan found in localStorage");
    return;
  }

  try {
    const plan: WorkoutPlanByDay = JSON.parse(storedPlan);
    const searchName = exerciseName.toLowerCase();

    // Search and update in all days
    const updateDay = (exercises: Exercise[]): Exercise[] => {
      return exercises.map(ex => {
        if (ex.name.toLowerCase().includes(searchName)) {
          return { ...ex, imageUrl };
        }
        return ex;
      });
    };

    const updatedPlan: WorkoutPlanByDay = {
      pushDay: updateDay(plan.pushDay || []),
      pullDay: updateDay(plan.pullDay || []),
      legsDay: updateDay(plan.legsDay || []),
    };

    localStorage.setItem("workoutPlan", JSON.stringify(updatedPlan));
    console.log(`Image added to exercise: ${exerciseName}`);
  } catch (error) {
    console.error("Error adding image to exercise:", error);
  }
}

/**
 * Adds images to multiple exercises at once
 * @param imageMap - Object mapping exercise names to image URLs
 */
export function addImagesToExercises(imageMap: Record<string, string>): void {
  Object.entries(imageMap).forEach(([name, imageUrl]) => {
    addImageToExercise(name, imageUrl);
  });
}

/**
 * Removes image from an exercise
 * @param exerciseName - The name of the exercise (case-insensitive partial match)
 */
export function removeImageFromExercise(exerciseName: string): void {
  if (typeof window === "undefined") {
    console.warn("removeImageFromExercise can only be called in the browser");
    return;
  }

  const storedPlan = localStorage.getItem("workoutPlan");
  if (!storedPlan) {
    console.warn("No workout plan found in localStorage");
    return;
  }

  try {
    const plan: WorkoutPlanByDay = JSON.parse(storedPlan);
    const searchName = exerciseName.toLowerCase();

    const updateDay = (exercises: Exercise[]): Exercise[] => {
      return exercises.map(ex => {
        if (ex.name.toLowerCase().includes(searchName)) {
          const { imageUrl, ...rest } = ex;
          return rest as Exercise;
        }
        return ex;
      });
    };

    const updatedPlan: WorkoutPlanByDay = {
      pushDay: updateDay(plan.pushDay || []),
      pullDay: updateDay(plan.pullDay || []),
      legsDay: updateDay(plan.legsDay || []),
    };

    localStorage.setItem("workoutPlan", JSON.stringify(updatedPlan));
    console.log(`Image removed from exercise: ${exerciseName}`);
  } catch (error) {
    console.error("Error removing image from exercise:", error);
  }
}

/**
 * Helper function to convert a file to base64
 * Use this in the browser console or in your development code
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
