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

  // Calculate graph range
  const allValues = [...graphData, goal, current].filter(v => v > 0);
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : goal || 2000;
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
  const range = maxValue - minValue || 1;
  const goalY = range > 0 ? 40 - ((goal - minValue) / range) * 35 : 20;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c1422] to-black p-3">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xs font-medium text-teal-400">Calories</h2>
        <span className="text-xs text-teal-400">⚡</span>
      </div>

      <p className="text-xl font-semibold leading-none">{current.toLocaleString()}</p>
      <p className="mb-2 text-[11px] text-gray-400">
        +{average.toLocaleString()} Avg.
      </p>

      {/* Chart */}
      <div className="mb-2 h-8 rounded bg-white/5 relative overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
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
                  ? ((value - minValue) / range) * 35
                  : 20;
                const y = 40 - Math.max(2, Math.min(normalizedValue, 38));
                return `${x},${y}`;
              })
              .join(" ")}
          />
          
          {/* Data points */}
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

      <div className="mb-1 flex justify-between text-[11px] text-gray-400">
        <span>Today</span>
        <span>{current.toLocaleString()} / {goal.toLocaleString()}</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-1.5 rounded-full bg-teal-400"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <p className="mt-1 text-right text-[11px] text-teal-400">
        {percentage}%
      </p>
    </div>
  );
}

