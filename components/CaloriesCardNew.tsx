"use client";

import { useMemo } from "react";

interface CaloriesCardNewProps {
  current: number;
  goal: number;
  average: number;
  weeklyData: number[]; // Array of daily calories for the graph
}

export default function CaloriesCardNew({
  current,
  goal,
  average,
  weeklyData,
}: CaloriesCardNewProps) {
  const percentage = goal > 0 ? Math.round((current / goal) * 100) : 0;
  
  // Use 10 data points for the graph
  const graphData = useMemo(() => {
    if (weeklyData.length >= 10) {
      return weeklyData.slice(-10);
    }
    const padded = [...weeklyData];
    while (padded.length < 10) {
      padded.push(padded.length > 0 ? padded[padded.length - 1] : 0);
    }
    return padded;
  }, [weeklyData]);

  // Calculate graph range - ensure we have a visible range
  const allValues = [...graphData, goal, current].filter(v => v >= 0);
  const maxValue = allValues.length > 0 ? Math.max(...allValues, goal || 2000) : goal || 2000;
  const minValue = 0; // Always start from 0 for better visualization
  const range = maxValue - minValue || 1;
  const goalY = range > 0 ? 60 - ((goal - minValue) / range) * 55 : 30;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c1422] to-black p-3 h-full flex flex-col">
      {/* Header - moved to top, smaller text */}
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[10px] font-medium text-teal-400">Calories</h2>
        <span className="text-[10px] text-teal-400">⚡</span>
      </div>

      <p className="text-lg font-semibold leading-none mb-0.5">{current.toLocaleString()}</p>
      <p className="mb-2 text-[10px] text-gray-400">
        +{average.toLocaleString()} Avg.
      </p>

      {/* Chart - increased height */}
      <div className="mb-2 flex-1 min-h-[60px] rounded bg-white/5 relative overflow-hidden">
        <svg 
          key={`graph-${current}-${weeklyData.join(',')}`}
          className="w-full h-full" 
          viewBox="0 0 100 60" 
          preserveAspectRatio="none"
        >
          {/* Dashed goal line */}
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
          
          {/* Trend line */}
          <polyline
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="2.5"
            points={graphData
              .map((value, idx) => {
                const x = graphData.length > 1 ? (idx / (graphData.length - 1)) * 100 : (idx * 10);
                const normalizedValue = range > 0 
                  ? ((value - minValue) / range) * 55
                  : 30;
                const y = 60 - Math.max(2, Math.min(normalizedValue, 58));
                return `${x},${y}`;
              })
              .join(" ")}
          />
          
          {/* Data points */}
          {graphData.map((value, idx) => {
            const x = graphData.length > 1 ? (idx / (graphData.length - 1)) * 100 : (idx * 10);
            const normalizedValue = range > 0 
              ? ((value - minValue) / range) * 55
              : 30;
            const y = 60 - Math.max(2, Math.min(normalizedValue, 58));
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

      {/* Progress section - moved to bottom */}
      <div className="mt-auto">
        <div className="mb-1 flex justify-between text-[10px] text-gray-400">
          <span>{current.toLocaleString()} / {goal.toLocaleString()}</span>
          <span className="text-teal-400 font-semibold">{percentage}%</span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-teal-400"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

