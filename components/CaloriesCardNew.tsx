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
  const goalY = range > 0 ? 40 - ((goal - minValue) / range) * 35 : 20;

  return (
    <div className="rounded-2xl border-2 border-teal-500/30 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black p-4 h-full flex flex-col shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all relative overflow-hidden group">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Header - moved to top, smaller text */}
      <div className="mb-2 flex items-center justify-between relative z-10">
        <h2 className="text-sm font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Calories</h2>
        <div className="px-2 py-0.5 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-lg border border-teal-500/30">
          <span className="text-[10px] text-teal-400 font-bold">⚡</span>
        </div>
      </div>

      <p className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent leading-none mb-1 relative z-10">{current.toLocaleString()}</p>
      <p className="mb-3 text-[10px] text-gray-400 relative z-10">
        +{average.toLocaleString()} Avg.
      </p>

      {/* Chart */}
      <div className="mb-3 h-10 rounded-lg bg-gradient-to-br from-white/5 to-white/0 border border-teal-500/20 relative overflow-hidden relative z-10">
        <svg 
          key={`graph-${current}-${weeklyData.join(',')}`}
          className="w-full h-full" 
          viewBox="0 0 100 40" 
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
            stroke="url(#caloriesLineGradient)"
            strokeWidth="3"
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
                r="3"
                fill="url(#caloriesPointGradient)"
                className="drop-shadow-lg"
              />
            );
          })}
          <defs>
            <linearGradient id="caloriesLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14f1d9" />
              <stop offset="100%" stopColor="#0ddfc8" />
            </linearGradient>
            <linearGradient id="caloriesPointGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14f1d9" />
              <stop offset="100%" stopColor="#0ddfc8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Progress section - moved to bottom */}
      <div className="mt-auto relative z-10">
        <div className="mb-1.5 flex justify-between text-[10px] text-gray-300 font-medium">
          <span>{current.toLocaleString()} / {goal.toLocaleString()}</span>
          <span className="text-teal-400 font-bold">{percentage}%</span>
        </div>

        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden shadow-inner">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all duration-500 shadow-lg"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

