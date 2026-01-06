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
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c1422] to-black p-3 h-full flex flex-col">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xs font-medium text-teal-400">Gym</h2>
        <span className="text-[11px] text-gray-400">{streak}</span>
      </div>

      {/* Heatmap - 31 days in 7 columns (will wrap to multiple rows) */}
      <div className="grid grid-cols-7 gap-[3px] mb-2 flex-1 min-h-0">
        {heatmapData.map((day, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded ${
              day.active ? "bg-teal-400" : "bg-white/5"
            }`}
          />
        ))}
      </div>

      <div className="flex justify-between text-[11px] text-gray-400">
        <span>{percentage}%</span>
        <span>{completed} / {total}</span>
      </div>
    </div>
  );
}

