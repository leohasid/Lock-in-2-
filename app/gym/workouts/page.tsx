"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft } from "lucide-react";

interface WorkoutOption {
  id: string;
  name: string;
  days: {
    day1: any[];
    day2: any[];
    day3: any[];
  };
  dayNames: {
    day1: string;
    day2: string;
    day3: string;
  };
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [selectedWorkoutOptions, setSelectedWorkoutOptions] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("selectedWorkoutOptions");
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        setSelectedWorkoutOptions(Array.isArray(arr) ? arr : []);
      } catch {
        const single = localStorage.getItem("selectedWorkoutOption");
        setSelectedWorkoutOptions(single ? [single] : []);
      }
    } else {
      const single = localStorage.getItem("selectedWorkoutOption");
      setSelectedWorkoutOptions(single ? [single] : []);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load workout options
    const storedOptions = localStorage.getItem("workoutOptions");
    if (storedOptions) {
      try {
        setWorkoutOptions(JSON.parse(storedOptions));
      } catch (e) {
        console.error("Error loading workout options:", e);
      }
    } else {
      // Initialize with default options
      const defaultOptions: WorkoutOption[] = [
        {
          id: "option1",
          name: "Option 1",
          days: {
            day1: [],
            day2: [],
            day3: [],
          },
          dayNames: {
            day1: "Push Day",
            day2: "Pull Day",
            day3: "Legs Day",
          },
        },
        {
          id: "option2",
          name: "Option 2",
          days: {
            day1: [],
            day2: [],
            day3: [],
          },
          dayNames: {
            day1: "Back & Triceps",
            day2: "Chest & Biceps",
            day3: "Legs Day",
          },
        },
        {
          id: "option3",
          name: "Option 3",
          days: {
            day1: [],
            day2: [],
            day3: [],
          },
          dayNames: {
            day1: "Upper Body",
            day2: "Lower Body",
            day3: "Full Body",
          },
        },
        {
          id: "option4",
          name: "Option 4",
          days: { day1: [], day2: [], day3: [] },
          dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" },
        },
        { id: "option5", name: "Option 5", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option6", name: "Option 6", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option7", name: "Option 7", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option8", name: "Option 8", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option9", name: "Option 9", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
        { id: "option10", name: "Option 10", days: { day1: [], day2: [], day3: [] }, dayNames: { day1: "Day 1", day2: "Day 2", day3: "Day 3" } },
      ];
      setWorkoutOptions(defaultOptions);
      localStorage.setItem("workoutOptions", JSON.stringify(defaultOptions));
    }
  }, []);

  const handleSelectOption = (optionId: string) => {
    // Navigate to the workout option editing page
    router.push(`/gym/workouts/${optionId}`);
  };

  const handleUseOption = (optionId: string) => {
    const isCurrentlySelected = selectedWorkoutOptions.includes(optionId);
    if (isCurrentlySelected) {
      const next = selectedWorkoutOptions.filter((id) => id !== optionId);
      setSelectedWorkoutOptions(next);
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedWorkoutOptions", JSON.stringify(next));
        localStorage.setItem("selectedWorkoutOption", next[0] || "");
        if (next.length === 0) localStorage.removeItem("selectedWorkoutOption");
      }
    } else {
      if (selectedWorkoutOptions.length >= 10) return;
      const next = [...selectedWorkoutOptions, optionId];
      setSelectedWorkoutOptions(next);
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedWorkoutOptions", JSON.stringify(next));
        localStorage.setItem("selectedWorkoutOption", optionId);
      }
    }
  };

  const handleAddWorkout = () => {
    // Find the highest option number
    const optionNumbers = workoutOptions.map(opt => {
      const match = opt.name.match(/Option (\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = optionNumbers.length > 0 ? Math.max(...optionNumbers) + 1 : workoutOptions.length + 1;
    
    const newOption: WorkoutOption = {
      id: `option${nextNumber}`,
      name: `Option ${nextNumber}`,
      days: {
        day1: [],
        day2: [],
        day3: [],
      },
      dayNames: {
        day1: "Day 1",
        day2: "Day 2",
        day3: "Day 3",
      },
    };
    
    const updatedOptions = [...workoutOptions, newOption];
    setWorkoutOptions(updatedOptions);
    if (typeof window !== "undefined") {
      localStorage.setItem("workoutOptions", JSON.stringify(updatedOptions));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0c1422] to-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/gym/workout"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Select Workout Option
          </h1>
          <button
            onClick={handleAddWorkout}
            className="px-3 py-1.5 bg-gradient-to-b from-[#0c1422] to-black border border-white/10 text-white rounded-lg text-xs font-medium hover:bg-[rgba(20,30,35,1)] transition-colors"
          >
            Add Workout
          </button>
        </div>

        {/* Workout Options */}
        <div className="grid grid-cols-1 gap-3">
          {workoutOptions.map((option) => (
            <div
              key={option.id}
              className="p-3 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-white/10 rounded-lg flex items-center justify-between gap-2"
            >
              <button
                onClick={() => handleSelectOption(option.id)}
                className="flex-1 text-left hover:opacity-90"
              >
                <h3 className="text-sm font-semibold text-white">{option.name}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {option.dayNames.day1} • {option.dayNames.day2} • {option.dayNames.day3}
                </p>
              </button>
              <button
                onClick={() => handleUseOption(option.id)}
                disabled={!selectedWorkoutOptions.includes(option.id) && selectedWorkoutOptions.length >= 10}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedWorkoutOptions.includes(option.id)
                    ? "bg-white/20 text-gray-300 hover:bg-white/30"
                    : "bg-teal-500 hover:bg-teal-400 text-black"
                }`}
              >
                {selectedWorkoutOptions.includes(option.id) ? "Unsave" : "Use"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
