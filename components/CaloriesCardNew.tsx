"use client";

import { useMemo } from "react";

interface CaloriesCardNewProps {
  current: number;
  goal: number;
  average: number;
  weeklyData: number[]; // Array of hourly calories for today's graph
}

export default function CaloriesCardNew({
  current,
  goal,
  average,
  weeklyData,
}: CaloriesCardNewProps) {
  const percentage = goal > 0 ? Math.round((current / goal) * 100) : 0;
  
  // Use hourly data for today's graph (24 hours)
  const graphData = useMemo(() => {
    // If we have hourly data, use it; otherwise create array of 24 zeros
    if (weeklyData.length >= 24) {
      return weeklyData.slice(0, 24);
    }
    const padded = [...weeklyData];
    while (padded.length < 24) {
      padded.push(0);
    }
    return padded.slice(0, 24);
  }, [weeklyData]);

  // Calculate graph range - ensure we have a visible range
  const allValues = [...graphData, goal, current].filter(v => v >= 0);
  const maxValue = allValues.length > 0 ? Math.max(...allValues, goal || 2000) : goal || 2000;
  const minValue = 0; // Always start from 0 for better visualization
  const range = maxValue - minValue || 1;
  const goalY = range > 0 ? 40 - ((goal - minValue) / range) * 35 : 20;

  return (
    <div className="rounded-2xl border-2 border-teal-500/30 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black p-3 h-full flex flex-col shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all relative overflow-hidden group">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Header - moved to top, smaller text */}
      <div className="mb-1 flex items-center justify-between relative z-10">
        <h2 className="text-[10px] font-medium text-teal-400">Calories</h2>
      </div>

      <p className="text-lg font-semibold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent leading-none mb-0.5 relative z-10">{current.toLocaleString()}</p>
      <p className="mb-2 text-[10px] text-gray-400 relative z-10">
        +{average.toLocaleString()} Avg.
      </p>

      {/* Chart - More room for graph */}
      <div className="mb-2 flex-1 min-h-[60px] rounded bg-gradient-to-br from-white/5 to-white/0 border border-teal-500/20 relative overflow-hidden relative z-10">
        <svg 
          key={`graph-${current}-${weeklyData.join(',')}`}
          className="w-full h-full" 
          viewBox="0 0 100 60" 
          preserveAspectRatio="none"
        >
          {/* Dashed goal line */}
          <line
            x1="0"
            y1={range > 0 ? 60 - ((goal - minValue) / range) * 50 : 30}
            x2="100"
            y2={range > 0 ? 60 - ((goal - minValue) / range) * 50 : 30}
            stroke="#4b5563"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.5"
          />
          
          {/* Trend line */}
          <polyline
            fill="none"
            stroke="url(#caloriesLineGradient)"
            strokeWidth="2.5"
            points={graphData
              .map((value, idx) => {
                const x = (idx / (graphData.length - 1)) * 100;
                const normalizedValue = range > 0 
                  ? ((value - minValue) / range) * 50
                  : 30;
                const y = 60 - Math.max(3, Math.min(normalizedValue, 57));
                return `${x},${y}`;
              })
              .join(" ")}
          />
          
          {/* Data points */}
          {graphData.map((value, idx) => {
            const x = (idx / (graphData.length - 1)) * 100;
            const normalizedValue = range > 0 
              ? ((value - minValue) / range) * 50
              : 30;
            const y = 60 - Math.max(3, Math.min(normalizedValue, 57));
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="2.5"
                fill="url(#caloriesPointGradient)"
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
        <div className="mb-1 flex justify-between text-[10px] text-gray-400">
          <span>{current.toLocaleString()} / {goal.toLocaleString()}</span>
          <span className="text-teal-400 font-semibold">{percentage}%</span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

