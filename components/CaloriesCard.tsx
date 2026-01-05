"use client";

import { useMemo } from "react";
import { Zap } from "lucide-react";

interface CaloriesCardProps {
  current: number;
  goal: number;
  average: number;
  weeklyData: number[]; // Array of daily calories for the week (should be 10 days for the graph)
}

export default function CaloriesCard({
  current,
  goal,
  average,
  weeklyData,
}: CaloriesCardProps) {
  const percentage = goal > 0 ? Math.round((current / goal) * 100) : 0;
  
  // Use 10 data points for the graph (extend weeklyData to 10 if needed)
  const graphData = useMemo(() => {
    if (weeklyData.length >= 10) {
      return weeklyData.slice(-10); // Take last 10 days
    }
    // Pad with zeros or repeat last value to get 10 points
    const padded = [...weeklyData];
    while (padded.length < 10) {
      padded.push(padded.length > 0 ? padded[padded.length - 1] : 0);
    }
    return padded;
  }, [weeklyData]);

  // Calculate graph range - include goal as reference
  const allValues = [...graphData, goal, current].filter(v => v > 0);
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : goal || 2000;
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
  const range = maxValue - minValue || 1;

  // Calculate goal line position
  const goalY = range > 0 ? 40 - ((goal - minValue) / range) * 35 : 20;

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 h-full flex flex-col">
      {/* Header - Lightning bolt + Calories on left, number on right */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-teal-400" />
          <h3 className="text-sm font-bold text-teal-400">Calories</h3>
        </div>
        <div className="text-sm font-bold text-white">
          {current.toLocaleString()}
        </div>
      </div>

      {/* Main Calorie Display */}
      <div className="mb-2">
        <div className="text-lg font-bold text-white mb-0.5">
          {current.toLocaleString()}
        </div>
        <div className="text-xs text-white">
          + {average.toLocaleString()} Avg.
        </div>
      </div>

      {/* Line Graph with 10 data points */}
      <div className="mb-2 h-16 relative bg-gray-800/20 rounded">
        <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          {/* Dashed horizontal line for goal */}
          <line
            x1="0"
            y1={goalY}
            x2="100"
            y2={goalY}
            stroke="#4b5563"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.5"
          />
          
          {/* Main trend line */}
          <polyline
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="2.5"
            points={graphData
              .map((value, idx) => {
                const x = graphData.length > 1 ? (idx / (graphData.length - 1)) * 100 : (idx * 10);
                const normalizedValue = range > 0 
                  ? ((value - minValue) / range) * 35
                  : 20;
                const y = 40 - Math.max(2, Math.min(normalizedValue, 38));
                return `${x},${y}`;
              })
              .join(" ")}
          />
          
          {/* Data points (circles) */}
          {graphData.map((value, idx) => {
            const x = graphData.length > 1 ? (idx / (graphData.length - 1)) * 100 : (idx * 10);
            const normalizedValue = range > 0 
              ? ((value - minValue) / range) * 35
              : 20;
            const y = 40 - Math.max(2, Math.min(normalizedValue, 38));
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="2.5"
                fill="#2dd4bf"
              />
            );
          })}
        </svg>
      </div>

      {/* Today's Progress */}
      <div className="space-y-1 mt-auto">
        <div className="text-xs text-white">
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
        <div className="text-xs text-white">
          Today {current.toLocaleString()} / {goal.toLocaleString()}{" "}
          <span className="text-white">{percentage}%</span>
        </div>
      </div>
    </div>
  );
}

