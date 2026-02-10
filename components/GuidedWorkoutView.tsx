"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Play, SkipForward, RefreshCw, Clock, ChevronRight, Check } from "lucide-react";
import { getBuiltInImageUrl } from "@/lib/built-in-exercise-images";

export interface GuidedExercise {
  id: string;
  name: string;
  goalSets: number;
  goalReps: number;
  goalWeight: number;
  imageUrl?: string;
  restSeconds?: number;
  sets: Array<{ reps: number; weight: number; completed: boolean }>;
}

const DEFAULT_REST_SECONDS = 90;

// Common exercise alternatives for swapping (grouped loosely by type)
const EXERCISE_ALTERNATIVES: Record<string, string[]> = {
  "bench press": ["Dumbbell Bench Press", "Push-ups", "Cable Chest Fly", "Machine Chest Press"],
  "chest press": ["Dumbbell Bench Press", "Push-ups", "Cable Chest Fly", "Barbell Bench Press"],
  "squat": ["Leg Press", "Goblet Squat", "Lunges", "Hack Squat"],
  "deadlift": ["Romanian Deadlift", "Leg Curl", "Back Extension", "Good Morning"],
  "row": ["Cable Row", "Dumbbell Row", "T-Bar Row", "Machine Row"],
  "pull": ["Lat Pulldown", "Pull-ups", "Cable Row", "Dumbbell Row"],
  "curl": ["Hammer Curl", "Cable Curl", "Preacher Curl", "Concentration Curl"],
  "press": ["Dumbbell Shoulder Press", "Machine Shoulder Press", "Push Press", "Arnold Press"],
  "extension": ["Cable Tricep Pushdown", "Overhead Tricep Extension", "Dips", "Skull Crushers"],
  "pull down": ["Pull-ups", "Assisted Pull-up", "Lat Pulldown", "Chin-ups"],
  "leg curl": ["Romanian Deadlift", "Stiff Leg Deadlift", "Good Morning", "Glute Bridge"],
  "leg press": ["Squat", "Hack Squat", "Lunges", "Goblet Squat"],
};

function getAlternatives(exerciseName: string, currentExercises: GuidedExercise[]): string[] {
  const name = exerciseName.toLowerCase();
  for (const [key, alts] of Object.entries(EXERCISE_ALTERNATIVES)) {
    if (name.includes(key)) return alts;
  }
  // Fallback: generic list
  return [
    "Dumbbell Bench Press", "Push-ups", "Squat", "Leg Press", "Lat Pulldown",
    "Cable Row", "Dumbbell Row", "Bicep Curl", "Tricep Pushdown", "Shoulder Press",
    "Lunges", "Romanian Deadlift", "Cable Chest Fly", "Pull-ups",
  ];
}

interface GuidedWorkoutViewProps {
  exercises: GuidedExercise[];
  onUpdateSet: (exId: string, setIndex: number, patch: Partial<{ reps: number; weight: number; completed: boolean }>) => void;
  onSwapExercise: (exId: string, newName: string) => void;
  onUpdateRest: (exId: string, restSeconds: number) => void;
  onFinish: () => void;
}

export default function GuidedWorkoutView({
  exercises,
  onUpdateSet,
  onSwapExercise,
  onUpdateRest,
  onFinish,
}: GuidedWorkoutViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(DEFAULT_REST_SECONDS);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showRestEdit, setShowRestEdit] = useState(false);
  const [tempRestSeconds, setTempRestSeconds] = useState(DEFAULT_REST_SECONDS);

  const currentEx = exercises[currentIndex];
  const restSeconds = currentEx?.restSeconds ?? DEFAULT_REST_SECONDS;

  // Rest timer countdown
  useEffect(() => {
    if (!isResting || restSecondsRemaining <= 0) return;
    const t = setInterval(() => setRestSecondsRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [isResting, restSecondsRemaining]);

  // When rest ends
  useEffect(() => {
    if (isResting && restSecondsRemaining === 0) {
      setIsResting(false);
      if (currentIndex < exercises.length - 1) {
        setCurrentIndex((i) => i + 1);
        const nextEx = exercises[currentIndex + 1];
        const nextRest = nextEx?.restSeconds ?? DEFAULT_REST_SECONDS;
        setRestSecondsRemaining(nextRest);
      }
    }
  }, [isResting, restSecondsRemaining, currentIndex, exercises.length]);


  const markSetComplete = (setIndex: number) => {
    if (!currentEx) return;
    onUpdateSet(currentEx.id, setIndex, { completed: true });
    const isLastSet = setIndex === currentEx.sets.length - 1;
    const allOtherSetsDone = currentEx.sets
      .filter((_, i) => i !== setIndex)
      .every((s) => s.completed);
    if (isLastSet && allOtherSetsDone) {
      if (currentIndex < exercises.length - 1) {
        setIsResting(true);
        setRestSecondsRemaining(restSeconds);
      }
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestSecondsRemaining(0);
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((i) => i + 1);
      const nextEx = exercises[currentIndex + 1];
      setRestSecondsRemaining(nextEx?.restSeconds ?? DEFAULT_REST_SECONDS);
    }
  };

  const saveRestTime = () => {
    if (currentEx) {
      onUpdateRest(currentEx.id, tempRestSeconds);
      setRestSecondsRemaining(tempRestSeconds);
    }
    setShowRestEdit(false);
  };

  const handleSwap = (newName: string) => {
    if (currentEx) onSwapExercise(currentEx.id, newName);
    setShowSwapModal(false);
  };

  if (!currentEx && exercises.length > 0) return null;
  if (exercises.length === 0) return null;

  const completedExercises = exercises.slice(0, currentIndex).length;
  const totalExercises = exercises.length;
  const isLastExercise = currentIndex === exercises.length - 1;
  const allSetsDone = currentEx.sets.every((s) => s.completed);

  // Rest screen
  if (isResting) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <p className="text-gray-400 text-sm mb-2">Rest before next exercise</p>
          <div className="relative w-48 h-48 rounded-full border-4 border-cyan-500/50 flex items-center justify-center mb-6">
            <span className="text-4xl font-bold text-white">{restSecondsRemaining}</span>
            <span className="absolute bottom-2 text-gray-400 text-sm">sec</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowRestEdit(true);
                setTempRestSeconds(restSecondsRemaining);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white text-sm"
            >
              <Clock className="w-4 h-4" />
              Change rest
            </button>
            <button
              onClick={skipRest}
              className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-black font-semibold rounded-lg"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          </div>
        </div>

        {showRestEdit && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-xs">
              <h3 className="text-white font-semibold mb-3">Rest duration (seconds)</h3>
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setTempRestSeconds((s) => Math.max(15, s - 15))}
                  className="w-12 h-12 rounded-full bg-white/10 text-white text-xl"
                >
                  −
                </button>
                <span className="text-2xl font-bold text-white flex-1 text-center">{tempRestSeconds}</span>
                <button
                  onClick={() => setTempRestSeconds((s) => s + 15)}
                  className="w-12 h-12 rounded-full bg-white/10 text-white text-xl"
                >
                  +
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRestEdit(false)}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRestTime}
                  className="flex-1 py-2 bg-cyan-500 text-black font-semibold rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Workout complete
  if (isLastExercise && allSetsDone && !isResting) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Workout complete!</h2>
          <p className="text-gray-400 text-sm mb-8">
            {totalExercises} exercises finished
          </p>
          <button
            onClick={onFinish}
            className="px-8 py-4 bg-cyan-500 text-black font-bold rounded-xl text-lg"
          >
            Finish Workout
          </button>
        </div>
      </div>
    );
  }

  // Exercise view
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Progress bar */}
      <div className="h-1 bg-gray-800">
        <div
          className="h-full bg-cyan-500 transition-all"
          style={{ width: `${((currentIndex + (allSetsDone ? 1 : 0)) / totalExercises) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">
            {currentIndex + 1} / {totalExercises}
          </span>
        </div>
        <button
          onClick={() => setShowSwapModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg text-gray-300 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Swap
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Exercise image */}
        <div className="w-full h-48 bg-gray-900 flex items-center justify-center overflow-hidden">
          {(currentEx.imageUrl || getBuiltInImageUrl(currentEx.name)) ? (
            <img
              src={currentEx.imageUrl || getBuiltInImageUrl(currentEx.name) || ""}
              alt={currentEx.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">💪</span>
          )}
        </div>

        <div className="p-4 space-y-4">
          <h2 className="text-xl font-bold text-white">{currentEx.name}</h2>
          <p className="text-gray-400 text-sm">
            {currentEx.goalSets} sets × {currentEx.goalReps} reps
            {currentEx.goalWeight > 0 && ` @ ${currentEx.goalWeight}kg`}
          </p>

          {/* Sets */}
          <div className="space-y-2">
            {currentEx.sets.map((set, setIndex) => (
              <div
                key={setIndex}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  set.completed ? "bg-cyan-500/20 border-cyan-500/50" : "bg-white/5 border-white/10"
                }`}
              >
                {set.completed ? (
                  <div className="w-10 h-10 rounded-full bg-cyan-400 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-black" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-white font-semibold">
                    {setIndex + 1}
                  </div>
                )}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Reps</label>
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) =>
                        onUpdateSet(currentEx.id, setIndex, { reps: parseInt(e.target.value) || 0 })
                      }
                      disabled={set.completed}
                      className="w-full bg-black/60 text-white p-2 rounded border border-white/20 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={set.weight}
                      onChange={(e) =>
                        onUpdateSet(currentEx.id, setIndex, {
                          weight: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={set.completed}
                      className="w-full bg-black/60 text-white p-2 rounded border border-white/20 disabled:opacity-60"
                    />
                  </div>
                </div>
                {!set.completed ? (
                  <button
                    onClick={() => markSetComplete(setIndex)}
                    className="px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg shrink-0"
                  >
                    Done
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Rest duration (editable before/during) */}
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-400 text-sm">Rest after this exercise</span>
            <button
              onClick={() => {
                setTempRestSeconds(currentEx.restSeconds ?? DEFAULT_REST_SECONDS);
                setShowRestEdit(true);
              }}
              className="flex items-center gap-1 text-cyan-400 text-sm"
            >
              <Clock className="w-4 h-4" />
              {currentEx.restSeconds ?? DEFAULT_REST_SECONDS}s
            </button>
          </div>
        </div>
      </div>

      {/* Rest edit modal (during exercise) */}
      {showRestEdit && !isResting && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-xs">
            <h3 className="text-white font-semibold mb-3">Rest duration (seconds)</h3>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setTempRestSeconds((s) => Math.max(15, s - 15))}
                className="w-12 h-12 rounded-full bg-white/10 text-white text-xl"
              >
                −
              </button>
              <span className="text-2xl font-bold text-white flex-1 text-center">{tempRestSeconds}</span>
              <button
                onClick={() => setTempRestSeconds((s) => s + 15)}
                className="w-12 h-12 rounded-full bg-white/10 text-white text-xl"
              >
                +
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRestEdit(false)}
                className="flex-1 py-2 bg-white/10 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (currentEx) onUpdateRest(currentEx.id, tempRestSeconds);
                  setShowRestEdit(false);
                }}
                className="flex-1 py-2 bg-cyan-500 text-black font-semibold rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-white font-semibold mb-2">Swap exercise</h3>
            <p className="text-gray-400 text-sm mb-4">
              Machine taken? Pick an alternative.
            </p>
            <div className="space-y-2">
              {getAlternatives(currentEx.name, exercises).map((alt) => (
                <button
                  key={alt}
                  onClick={() => handleSwap(alt)}
                  className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white"
                >
                  {alt}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSwapModal(false)}
              className="w-full mt-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
