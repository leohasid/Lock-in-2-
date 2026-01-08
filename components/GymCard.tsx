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
    <div className="rounded-2xl border-2 border-teal-500/30 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black p-3 h-full flex flex-col shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all relative overflow-hidden group">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="mb-1 flex items-center justify-between relative z-10">
        <h2 className="text-[10px] font-medium text-teal-400">Gym</h2>
        <span className="text-[11px] text-gray-400">{streak}</span>
      </div>

      {/* Heatmap - 31 days in 7 columns (will wrap to multiple rows) */}
      <div className="grid grid-cols-7 gap-[3px] mb-2 flex-1 min-h-0 relative z-10">
        {heatmapData.map((day, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded transition-all ${
              day.active 
                ? "bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-teal-500/30" 
                : "bg-white/5"
            }`}
          />
        ))}
      </div>

      <div className="flex justify-between text-[11px] text-gray-400 relative z-10">
        <span className="text-teal-400">{percentage}%</span>
        <span>{completed} / {total}</span>
      </div>
    </div>
  );
}

