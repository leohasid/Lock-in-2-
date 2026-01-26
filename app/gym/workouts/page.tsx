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
        },
      ];
      setWorkoutOptions(defaultOptions);
      localStorage.setItem("workoutOptions", JSON.stringify(defaultOptions));
    }
  }, []);

  const handleSelectOption = (optionId: string) => {
    // Navigate to workout page with the selected option
    router.push(`/gym/workout?option=${optionId}`);
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
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Description */}
        <p className="text-gray-400 mb-6 text-center">
          Choose a workout split that fits your training style
        </p>

        {/* Workout Options */}
        <div className="grid grid-cols-1 gap-4">
          {workoutOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelectOption(option.id)}
              className="p-6 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black border border-white/10 rounded-xl hover:border-cyan-400/50 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-white mb-3">{option.name}</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>• {option.dayNames.day1}</p>
                <p>• {option.dayNames.day2}</p>
                <p>• {option.dayNames.day3}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
