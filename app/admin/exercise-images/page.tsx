"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, X, Check, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { getExerciseImagePosition } from "@/lib/built-in-exercise-images";

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

export default function ExerciseImagesAdminPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Default exercises list
  const defaultExercises: Exercise[] = [
    // Push Day Exercises
    { id: "chest-press", name: "Chest Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "bench-press", name: "Bench Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "incline-bench-press", name: "Incline Bench Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "incline-dumbbell-press", name: "Incline Dumbbell Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "flat-dumbbell-press", name: "Flat Dumbbell Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "dumbbell-press", name: "Dumbbell Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "shoulder-press", name: "Shoulder Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "overhead-press", name: "Overhead Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "military-press", name: "Military Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "lateral-raises", name: "Lateral Raises", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "front-raises", name: "Front Raises", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "tricep-dips", name: "Tricep Dips", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "tricep-extension", name: "Tricep Extension", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "overhead-tricep-extensions", name: "Overhead Tricep Extensions", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "one-handed-tricep-push-down", name: "One Handed Tricep Push Down", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "close-grip-bench", name: "Close Grip Bench Press", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "push-ups", name: "Push Ups", goalSets: 3, goalReps: 15, goalWeight: 0, sets: [] },
    { id: "dips", name: "Dips", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "chest-fly", name: "Chest Fly", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "dumbbell-fly", name: "Dumbbell Fly", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "incline-fly", name: "Incline Dumbbell Fly", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    // Pull Day Exercises
    { id: "pull-ups", name: "Pull Ups", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "lat-pulldown", name: "Lat Pulldown", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "lat-pull-overs", name: "Lat Pull Overs", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "barbell-row", name: "Barbell Row", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "dumbbell-row", name: "Dumbbell Row", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "cable-row", name: "Cable Row", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "t-bar-row", name: "T-Bar Row", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "bicep-curl", name: "Bicep Curl", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "hammer-curl", name: "Hammer Curl", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "preacher-curl", name: "Preacher Curl", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "cable-curl", name: "Cable Curl", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "face-pull", name: "Face Pull", goalSets: 3, goalReps: 15, goalWeight: 0, sets: [] },
    { id: "rear-delt-fly", name: "Rear Delt Fly", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "shrugs", name: "Shrugs", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "upright-row", name: "Upright Row", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    
    // Legs Day Exercises
    { id: "squat", name: "Squat", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "leg-press", name: "Leg Press", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "leg-extension", name: "Leg Extension", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "leg-curl", name: "Leg Curl", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "hamstring-curl", name: "Hamstring Curl", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "deadlift", name: "Deadlift", goalSets: 3, goalReps: 8, goalWeight: 0, sets: [] },
    { id: "romanian-deadlift", name: "Romanian Deadlift", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "lunges", name: "Lunges", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "split-squat", name: "Split Squat", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "calf-raise", name: "Calf Raise", goalSets: 3, goalReps: 15, goalWeight: 0, sets: [] },
    { id: "seated-calf-raise", name: "Seated Calf Raise", goalSets: 3, goalReps: 15, goalWeight: 0, sets: [] },
    { id: "hip-thrust", name: "Hip Thrust", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
    { id: "glute-bridge", name: "Glute Bridge", goalSets: 3, goalReps: 15, goalWeight: 0, sets: [] },
    { id: "hack-squat", name: "Hack Squat", goalSets: 3, goalReps: 10, goalWeight: 0, sets: [] },
    { id: "walking-lunges", name: "Walking Lunges", goalSets: 3, goalReps: 12, goalWeight: 0, sets: [] },
  ];

  // Load all exercises from workout plan
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadExercises = () => {
      try {
        const allExercises: Exercise[] = [];
        const seenNames = new Set<string>();

        // Load saved images for exercises
        const exerciseImagesKey = "exerciseImages";
        const storedImages = localStorage.getItem(exerciseImagesKey);
        const savedImages: Record<string, string> = storedImages ? JSON.parse(storedImages) : {};

        // First, add default exercises with saved images
        defaultExercises.forEach(ex => {
          if (!seenNames.has(ex.name.toLowerCase())) {
            seenNames.add(ex.name.toLowerCase());
            const imageUrl = savedImages[ex.name.toLowerCase()];
            allExercises.push({ ...ex, imageUrl });
          }
        });

        // Then, add exercises from workout plan if it exists
        const storedPlan = localStorage.getItem("workoutPlan");
        if (storedPlan) {
          const plan: WorkoutPlanByDay = JSON.parse(storedPlan);
          
          [...(plan.pushDay || []), ...(plan.pullDay || []), ...(plan.legsDay || [])].forEach(ex => {
            const nameLower = ex.name.toLowerCase();
            if (!seenNames.has(nameLower)) {
              seenNames.add(nameLower);
              allExercises.push(ex);
            } else {
              // Update existing exercise with imageUrl if it has one
              const existingIndex = allExercises.findIndex(e => e.name.toLowerCase() === nameLower);
              if (existingIndex !== -1 && ex.imageUrl) {
                allExercises[existingIndex] = { ...allExercises[existingIndex], imageUrl: ex.imageUrl };
              }
            }
          });
        }

        // Sort by name
        allExercises.sort((a, b) => a.name.localeCompare(b.name));
        setExercises(allExercises);
      } catch (error) {
        console.error("Error loading exercises:", error);
        setMessage({ type: "error", text: "Failed to load exercises" });
        // Fallback to default exercises
        setExercises(defaultExercises);
      } finally {
        setLoading(false);
      }
    };

    loadExercises();

    // Also reload when storage changes (in case workout plan is updated elsewhere)
    const handleStorageChange = () => {
      loadExercises();
    };
    window.addEventListener("storage", handleStorageChange);
    
    // Poll for changes (since storage event doesn't fire in same window)
    const interval = setInterval(loadExercises, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleImageUpload = async (exercise: Exercise, file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 5MB" });
      return;
    }

    setUploading(exercise.id);
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateExerciseImage(exercise, base64String);
        setUploading(null);
        setMessage({ type: "success", text: `Image added to ${exercise.name}!` });
        setTimeout(() => setMessage(null), 3000);
      };
      reader.onerror = () => {
        setUploading(null);
        setMessage({ type: "error", text: "Failed to read image file" });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploading(null);
      setMessage({ type: "error", text: "Failed to upload image" });
    }
  };

  const updateExerciseImage = (exercise: Exercise, imageUrl: string) => {
    try {
      // Save to exercise images storage (separate from workout plan)
      const exerciseImagesKey = "exerciseImages";
      const storedImages = localStorage.getItem(exerciseImagesKey);
      const images: Record<string, string> = storedImages ? JSON.parse(storedImages) : {};
      images[exercise.name.toLowerCase()] = imageUrl;
      localStorage.setItem(exerciseImagesKey, JSON.stringify(images));

      // Also update in workout plan if it exists
      const storedPlan = localStorage.getItem("workoutPlan");
      if (storedPlan) {
        const plan: WorkoutPlanByDay = JSON.parse(storedPlan);

        // Update exercise in all days where it appears
        const updateDay = (exercises: Exercise[]): Exercise[] => {
          return exercises.map(ex => {
            if (ex.id === exercise.id || ex.name.toLowerCase() === exercise.name.toLowerCase()) {
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
      }

      // Update local state
      setExercises(prev => prev.map(ex => 
        ex.id === exercise.id || ex.name.toLowerCase() === exercise.name.toLowerCase() 
          ? { ...ex, imageUrl } 
          : ex
      ));
    } catch (error) {
      console.error("Error updating exercise image:", error);
    }
  };

  const removeImage = (exercise: Exercise) => {
    try {
      // Remove from exercise images storage
      const exerciseImagesKey = "exerciseImages";
      const storedImages = localStorage.getItem(exerciseImagesKey);
      if (storedImages) {
        const images: Record<string, string> = JSON.parse(storedImages);
        delete images[exercise.name.toLowerCase()];
        localStorage.setItem(exerciseImagesKey, JSON.stringify(images));
      }

      // Also remove from workout plan if it exists
      const storedPlan = localStorage.getItem("workoutPlan");
      if (storedPlan) {
        const plan: WorkoutPlanByDay = JSON.parse(storedPlan);

        const updateDay = (exercises: Exercise[]): Exercise[] => {
          return exercises.map(ex => {
            if (ex.id === exercise.id || ex.name.toLowerCase() === exercise.name.toLowerCase()) {
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
      }

      // Update local state
      setExercises(prev => prev.map(ex => {
        if (ex.id === exercise.id || ex.name.toLowerCase() === exercise.name.toLowerCase()) {
          const { imageUrl, ...rest } = ex;
          return rest as Exercise;
        }
        return ex;
      }));

      setMessage({ type: "success", text: `Image removed from ${exercise.name}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error removing image:", error);
      setMessage({ type: "error", text: "Failed to remove image" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p>Loading exercises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Exercise Images Admin</h1>
              <p className="text-gray-400">Upload demonstration images for exercises</p>
            </div>
            <Link
              href="/gym/workout"
              className="px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-black font-semibold rounded-lg transition-colors"
            >
              Back to Workouts
            </Link>
          </div>
          
          {message && (
            <div className={`p-4 rounded-lg mb-4 ${
              message.type === "success" 
                ? "bg-green-500/20 border border-green-500/50 text-green-400" 
                : "bg-red-500/20 border border-red-500/50 text-red-400"
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Exercises Grid */}
        {exercises.length === 0 ? (
          <div className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-8 border border-white/10 text-center">
            <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No exercises found</p>
            <p className="text-sm text-gray-500 mb-4">Create a workout plan first to add exercise images</p>
            <Link
              href="/gym/workout"
              className="inline-block px-4 py-2 bg-cyan-400 hover:bg-cyan-500 text-black font-semibold rounded-lg transition-colors"
            >
              Go Create Workout Plan
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-400">
              Found {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10"
              >
                {/* Exercise Image Preview */}
                <div className="w-full h-32 bg-gray-800 rounded-lg mb-3 overflow-hidden relative">
                  {exercise.imageUrl ? (
                    <>
                      <img
                        src={exercise.imageUrl}
                        alt={exercise.name}
                        className={`w-full h-full object-cover ${getExerciseImagePosition(exercise.name)}`}
                      />
                      <button
                        onClick={() => removeImage(exercise)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                      <ImageIcon className="w-12 h-12 mb-2" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </div>

                {/* Exercise Name */}
                <h3 className="text-sm font-semibold text-white mb-3 truncate">{exercise.name}</h3>

                {/* Upload Button */}
                <input
                  type="file"
                  accept="image/*"
                  ref={(el) => {
                    fileInputRefs.current[exercise.id] = el;
                  }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(exercise, file);
                    }
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRefs.current[exercise.id]?.click()}
                  disabled={uploading === exercise.id}
                  className="w-full py-2 px-4 bg-cyan-400 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {uploading === exercise.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      <span>Uploading...</span>
                    </>
                  ) : exercise.imageUrl ? (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Replace Image</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Image</span>
                    </>
                  )}
                </button>

                {/* Exercise Info */}
                <div className="mt-2 text-xs text-gray-400">
                  {exercise.goalSets} sets × {exercise.goalReps} reps
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
