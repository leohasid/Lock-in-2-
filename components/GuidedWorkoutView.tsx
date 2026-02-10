"use client";

import { useState, useEffect } from "react";
import { Play, SkipForward, RefreshCw, Clock, Check, Pause, X, ChevronRight } from "lucide-react";
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

function getAlternatives(exerciseName: string): string[] {
  const name = exerciseName.toLowerCase();
  for (const [key, alts] of Object.entries(EXERCISE_ALTERNATIVES)) {
    if (name.includes(key)) return alts;
  }
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
  onExit: () => void;
}

type RestReason = "set" | "exercise";

export default function GuidedWorkoutView({
  exercises,
  onUpdateSet,
  onSwapExercise,
  onUpdateRest,
  onFinish,
  onExit,
}: GuidedWorkoutViewProps) {
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [restReason, setRestReason] = useState<RestReason>("set");
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(DEFAULT_REST_SECONDS);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showRestEdit, setShowRestEdit] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [tempRestSeconds, setTempRestSeconds] = useState(DEFAULT_REST_SECONDS);

  const currentEx = exercises[currentExIndex];
  const restSeconds = currentEx?.restSeconds ?? DEFAULT_REST_SECONDS;
  const currentSet = currentEx?.sets[currentSetIndex];

  // Rest timer countdown (pauses when isPaused)
  useEffect(() => {
    if (!isResting || restSecondsRemaining <= 0 || isPaused) return;
    const t = setInterval(() => setRestSecondsRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [isResting, restSecondsRemaining, isPaused]);


  const markSetComplete = () => {
    if (!currentEx || !currentSet) return;
    onUpdateSet(currentEx.id, currentSetIndex, { completed: true });

    // Start rest countdown
    setRestSecondsRemaining(restSeconds);
    setRestReason("set");
    setIsResting(true);
  };

  const skipRest = () => {
    setRestSecondsRemaining(0);
  };

  const goToNext = () => {
    const hasMoreSets = currentSetIndex + 1 < (currentEx?.sets.length ?? 0);
    const hasMoreExercises = currentExIndex + 1 < exercises.length;

    if (isResting) {
      skipRest();
    } else if (hasMoreSets) {
      setCurrentSetIndex((i) => i + 1);
    } else if (hasMoreExercises) {
      setRestReason("exercise");
      const nextEx = exercises[currentExIndex + 1];
      setRestSecondsRemaining(nextEx?.restSeconds ?? DEFAULT_REST_SECONDS);
      setCurrentExIndex((i) => i + 1);
      setCurrentSetIndex(0);
      setIsResting(true);
    }
  };

  // When rest countdown hits 0, advance to next set or exercise
  useEffect(() => {
    if (!isResting || restSecondsRemaining !== 0) return;

    const hasMoreSets = currentSetIndex + 1 < (currentEx?.sets.length ?? 0);
    const hasMoreExercises = currentExIndex + 1 < exercises.length;

    if (restReason === "set") {
      if (hasMoreSets) {
        setCurrentSetIndex((i) => i + 1);
        setIsResting(false);
      } else if (hasMoreExercises) {
        setRestReason("exercise");
        const nextEx = exercises[currentExIndex + 1];
        setRestSecondsRemaining(nextEx?.restSeconds ?? DEFAULT_REST_SECONDS);
        setCurrentExIndex((i) => i + 1);
        setCurrentSetIndex(0);
      } else {
        setIsResting(false);
      }
    } else {
      setCurrentSetIndex(0);
      setRestReason("set");
      setIsResting(false);
    }
  }, [isResting, restSecondsRemaining]);

  const handleSwap = (newName: string) => {
    if (currentEx) onSwapExercise(currentEx.id, newName);
    setShowSwapModal(false);
  };

  if (exercises.length === 0) return null;

  const totalExercises = exercises.length;
  const totalSets = currentEx?.sets.length ?? 0;
  const isLastExercise = currentExIndex === exercises.length - 1;
  const isLastSet = currentSetIndex === totalSets - 1;
  const allSetsDone = currentEx?.sets.every((s) => s.completed) ?? false;

  // Workout complete: last exercise, last set just completed, rest done
  if (isLastExercise && isLastSet && allSetsDone && !isResting) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        <div className="flex justify-end p-4">
          <button
            onClick={onFinish}
            className="p-2 text-gray-400 hover:text-white"
            title="Exit"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 -mt-12">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Workout complete!</h2>
          <p className="text-gray-400 text-sm mb-8">{totalExercises} exercises finished</p>
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

  // Rest screen
  if (isResting) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-2 text-gray-400 hover:text-white"
            title="Exit"
          >
            <X className="w-6 h-6" />
          </button>
          <span className="text-gray-400 text-sm">
            {restReason === "exercise" ? "Rest before next exercise" : "Rest before next set"}
          </span>
          <button
            onClick={() => {
              setShowRestEdit(true);
              setTempRestSeconds(restSecondsRemaining);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 rounded-lg text-gray-300 text-sm"
          >
            <Clock className="w-4 h-4" />
            Change rest
          </button>
        </div>

        {isPaused && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
            <p className="text-white text-lg mb-4">Workout paused</p>
            <button
              onClick={() => setIsPaused(false)}
              className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-black font-semibold rounded-xl"
            >
              <Play className="w-5 h-5" />
              Resume
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center p-6 pb-28">
          <div className="relative w-48 h-48 rounded-full border-4 border-cyan-500/50 flex items-center justify-center mb-6">
            <span className="text-5xl font-bold text-white">{restSecondsRemaining}</span>
            <span className="absolute -bottom-1 text-gray-400 text-sm">sec</span>
          </div>
        </div>

        {/* Fixed bottom: Pause (left) and Next (right) */}
        <div className="fixed bottom-20 left-0 right-0 flex gap-3 px-4 z-40">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-base"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={skipRest}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-base"
          >
            <SkipForward className="w-5 h-5" />
            Next
          </button>
        </div>

        {showExitConfirm && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-xs">
              <h3 className="text-white font-semibold mb-2">Exit workout?</h3>
              <p className="text-gray-400 text-sm mb-4">Progress will be saved.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    onExit();
                  }}
                  className="flex-1 py-2 bg-cyan-500 text-black font-semibold rounded-lg"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

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
                  onClick={() => {
                    if (currentEx) onUpdateRest(currentEx.id, tempRestSeconds);
                    setRestSecondsRemaining(tempRestSeconds);
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
      </div>
    );
  }

  // Set view - one set at a time
  if (!currentEx || !currentSet) return null;

  const completedSets = currentEx.sets.filter((s) => s.completed).length;
  const progressPct = totalExercises > 0
    ? ((currentExIndex + (completedSets / totalSets)) / totalExercises) * 100
    : 0;

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      <div className="h-1 bg-gray-800">
        <div
          className="h-full bg-cyan-500 transition-all"
          style={{ width: `${Math.min(progressPct, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="p-2 text-gray-400 hover:text-white"
          title="Exit"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-gray-400 text-sm">
          Exercise {currentExIndex + 1} / {totalExercises}
        </span>
        <button
          onClick={() => setShowSwapModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 rounded-lg text-gray-300 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Swap
        </button>
      </div>

      {isPaused && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
          <p className="text-white text-lg mb-4">Workout paused</p>
          <button
            onClick={() => setIsPaused(false)}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-black font-semibold rounded-xl"
          >
            <Play className="w-5 h-5" />
            Resume
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-28">
        {/* Exercise image */}
        <div className="w-32 h-32 rounded-xl bg-gray-900 flex items-center justify-center overflow-hidden mb-6">
          {(currentEx.imageUrl || getBuiltInImageUrl(currentEx.name)) ? (
            <img
              src={currentEx.imageUrl || getBuiltInImageUrl(currentEx.name) || ""}
              alt={currentEx.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl">💪</span>
          )}
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-1">{currentEx.name}</h2>
        <p className="text-gray-400 text-sm mb-8">
          Set {currentSetIndex + 1} of {totalSets}
        </p>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Reps</label>
            <input
              type="number"
              value={currentSet.reps}
              onChange={(e) =>
                onUpdateSet(currentEx.id, currentSetIndex, { reps: parseInt(e.target.value) || 0 })
              }
              className="w-full bg-white/10 text-white p-4 rounded-xl border border-white/20 text-lg font-semibold text-center"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Weight (kg)</label>
            <input
              type="number"
              value={currentSet.weight}
              onChange={(e) =>
                onUpdateSet(currentEx.id, currentSetIndex, {
                  weight: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full bg-white/10 text-white p-4 rounded-xl border border-white/20 text-lg font-semibold text-center"
            />
          </div>

          <button
            onClick={markSetComplete}
            className="w-full flex items-center justify-center gap-2 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-lg"
          >
            <Check className="w-6 h-6" strokeWidth={3} />
            Complete
          </button>
        </div>

        <div className="mt-8 flex items-center gap-1 text-cyan-400 text-sm">
          <Clock className="w-4 h-4" />
          Rest: {currentEx.restSeconds ?? DEFAULT_REST_SECONDS}s
        </div>
      </div>

      {/* Fixed bottom: Pause (left) and Next (right) */}
      <div className="fixed bottom-20 left-0 right-0 flex gap-3 px-4 z-40">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-base"
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button
          onClick={goToNext}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-base"
        >
          <ChevronRight className="w-5 h-5" />
          Next
        </button>
      </div>

      {/* Exit confirm */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-xs">
            <h3 className="text-white font-semibold mb-2">Exit workout?</h3>
            <p className="text-gray-400 text-sm mb-4">Progress will be saved.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 bg-white/10 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
                className="flex-1 py-2 bg-cyan-500 text-black font-semibold rounded-lg"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {showSwapModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-white font-semibold mb-2">Swap exercise</h3>
            <p className="text-gray-400 text-sm mb-4">Machine taken? Pick an alternative.</p>
            <div className="space-y-2">
              {getAlternatives(currentEx.name).map((alt) => (
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
