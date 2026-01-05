"use client";

import { useMemo } from "react";
import { Zap } from "lucide-react";

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
  const minValue = Math.min(...weeklyData.filter(v => v > 0), goal) || 0;

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-teal-400">Calories</h3>
        <Zap className="w-3 h-3 text-teal-400" />
      </div>

      {/* Current */}
      <div className="mb-2">
        <div className="text-lg font-bold text-white mb-0.5">
          {current.toLocaleString()}
        </div>
        <div className="text-xs text-gray-400">
          + {average.toLocaleString()} Avg.
        </div>
      </div>

      {/* Line Graph */}
      <div className="mb-2 h-12 relative">
        <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="2"
            points={weeklyData
              .map((value, idx) => {
                const x = (idx / (weeklyData.length - 1)) * 100;
                const normalizedValue = maxValue > minValue 
                  ? ((value - minValue) / (maxValue - minValue)) * 35
                  : 20;
                const y = 40 - normalizedValue;
                return `${x},${y}`;
              })
              .join(" ")}
          />
          {weeklyData.map((value, idx) => {
            const x = (idx / (weeklyData.length - 1)) * 100;
            const normalizedValue = maxValue > minValue 
              ? ((value - minValue) / (maxValue - minValue)) * 35
              : 20;
            const y = 40 - normalizedValue;
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
        <div className="text-xs text-gray-400">
          Today{" "}
          <span className="text-white font-semibold">
            {current.toLocaleString()} / {goal.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1">
          <div
            className="h-1 rounded-full bg-teal-400 transition-all"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-400">
          Today {current.toLocaleString()} / {goal.toLocaleString()}{" "}
          <span className="text-teal-400">{percentage}%</span>
        </div>
      </div>
    </div>
  );
}

