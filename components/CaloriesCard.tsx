"use client";

import { Zap, Flame } from "lucide-react";

interface CaloriesCardProps {
  current: number;
  goal: number;
  average: number;
  weeklyData: number[]; // Array of daily calories for the week
}

export default function CaloriesCard({
  current,
  goal,
  average,
  weeklyData,
}: CaloriesCardProps) {
  const percentage = goal > 0 ? Math.round((current / goal) * 100) : 0;
  const maxValue = Math.max(...weeklyData, goal, 1);
  const minValue = Math.min(...weeklyData.filter(v => v > 0), goal);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-teal-400" />
          <h3 className="text-base font-bold text-white">Calories</h3>
        </div>
        <Zap className="w-4 h-4 text-teal-400" />
      </div>

      {/* Current */}
      <div className="mb-2">
        <div className="text-2xl font-bold text-white mb-1">
          {current.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400">
          + {average.toLocaleString()} Avg.
        </div>
      </div>

      {/* Line Graph */}
      <div className="mb-3 h-16 relative">
        <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="2"
            points={weeklyData
              .map((value, idx) => {
                const x = (idx / (weeklyData.length - 1)) * 100;
                const y = 40 - ((value - minValue) / (maxValue - minValue)) * 35;
                return `${x},${y}`;
              })
              .join(" ")}
          />
          {weeklyData.map((value, idx) => {
            const x = (idx / (weeklyData.length - 1)) * 100;
            const y = 40 - ((value - minValue) / (maxValue - minValue)) * 35;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="2"
                fill="#2dd4bf"
              />
            );
          })}
        </svg>
      </div>

      {/* Today Stats */}
      <div className="space-y-1">
        <div className="text-sm text-gray-400">
          Today{" "}
          <span className="text-white font-semibold">
            {current.toLocaleString()} / {goal.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-teal-400 transition-all"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-sm text-gray-400">
          Today {current.toLocaleString()} / {goal.toLocaleString()}{" "}
          <span className="text-teal-400">{percentage}%</span>
        </div>
      </div>
    </div>
  );
}

