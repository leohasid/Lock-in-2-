"use client";

import { Dumbbell, Zap } from "lucide-react";

interface WorkoutCardProps {
  current: number;
  goal: number;
  streak: number;
  weeklyData: number[]; // Array of 7 numbers for the week
}

export default function WorkoutCard({
  current,
  goal,
  streak,
  weeklyData,
}: WorkoutCardProps) {
  const percentage = goal > 0 ? Math.round((current / goal) * 100) : 0;
  const maxValue = Math.max(...weeklyData, 1);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-teal-400" />
          <h3 className="text-base font-bold text-white">Workouts</h3>
        </div>
        <div className="flex items-center gap-1 text-teal-400">
          <Zap className="w-4 h-4" />
          <span className="text-sm font-semibold">{streak}</span>
        </div>
      </div>

      {/* Current/Goal */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-white mb-1">{current}</div>
        <div className="text-sm text-gray-400">Goal: {goal}</div>
      </div>

      {/* Bar Chart */}
      <div className="mb-3">
        <div className="flex items-end gap-1 h-16">
          {weeklyData.map((value, idx) => {
            const height = (value / maxValue) * 100;
            const isToday = idx === weeklyData.length - 1;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t transition-all ${
                    isToday ? "bg-teal-400" : "bg-teal-500"
                  }`}
                  style={{ height: `${Math.max(height, 5)}%` }}
                />
                {isToday && (
                  <svg
                    className="w-3 h-3 text-teal-400 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>Tue</span>
          <span>T</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span className="text-teal-400 font-semibold">Today</span>
        </div>
      </div>

      {/* This Week Stats */}
      <div className="text-sm text-gray-400">
        This Week <span className="text-white font-semibold">{current} / {goal}</span>{" "}
        <span className="text-teal-400">{percentage}%</span>
      </div>
    </div>
  );
}

