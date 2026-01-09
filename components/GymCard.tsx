"use client";

import { useMemo } from "react";

interface GymCardProps {
  streak: number;
  completed: number;
  total: number;
  getActivityData: (date: Date) => boolean;
}

export default function GymCard({
  streak,
  completed,
  total,
  getActivityData,
}: GymCardProps) {
  // Generate 31 days of data
  const heatmapData = useMemo(() => {
    const today = new Date();
    const data: Array<{ date: Date; active: boolean }> = [];
    
    // Start from 30 days ago (31 days total)
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      data.push({
        date,
        active: getActivityData(date),
      });
    }
    
    return data;
  }, [getActivityData]);

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border-2 border-teal-500/30 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black p-4 h-full flex flex-col shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all relative overflow-hidden group">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="mb-2 flex items-center justify-between relative z-10">
        <h2 className="text-sm font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Fitness</h2>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
          <span className="text-[10px] font-bold text-yellow-300">🔥 {streak}</span>
        </div>
      </div>

      {/* Heatmap - 31 days in 7 columns (will wrap to multiple rows) */}
      <div className="grid grid-cols-7 gap-1 mb-3 flex-1 min-h-0 relative z-10">
        {heatmapData.map((day, i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded transition-all ${
              day.active 
                ? "bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-teal-500/30" 
                : "bg-white/5"
            }`}
          />
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-gray-300 font-medium relative z-10">
        <span className="text-teal-400 font-bold">{percentage}%</span>
        <span>{completed} / {total}</span>
      </div>
    </div>
  );
}

