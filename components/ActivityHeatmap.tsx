"use client";

import { useMemo } from "react";

interface ActivityHeatmapProps {
  title: string;
  streak: number;
  completed: number;
  total: number;
  getActivityData: (date: Date) => boolean; // Function to check if activity was done on a date
  color?: string;
}

export default function ActivityHeatmap({
  title,
  streak,
  completed,
  total,
  getActivityData,
  color = "#10b981", // Default green
}: ActivityHeatmapProps) {
  // Generate 13 weeks of data (91 days)
  const heatmapData = useMemo(() => {
    const today = new Date();
    const data: Array<{ date: Date; active: boolean }> = [];
    
    // Start from 90 days ago (approximately 13 weeks)
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      data.push({
        date,
        active: getActivityData(date),
      });
    }
    
    return data;
  }, [getActivityData]);

  // Group data by weeks (columns) and days (rows)
  // Reorganize data so each row represents a day of the week (like GitHub contribution graph)
  const weekLayout = useMemo(() => {
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
    const numWeeks = Math.ceil(heatmapData.length / 7);
    
    // Create rows for each day of the week (7 rows)
    // Each row will contain all instances of that day of the week across all weeks
    const dayRows: Array<Array<{ date: Date; active: boolean }>> = [[], [], [], [], [], [], []];
    
    // Fill each day's row with data from that day of the week across all weeks
    for (let i = 0; i < heatmapData.length; i++) {
      const date = heatmapData[i].date;
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      dayRows[dayOfWeek].push(heatmapData[i]);
    }
    
    // Pad rows to have the same length (numWeeks)
    dayRows.forEach((row) => {
      while (row.length < numWeeks) {
        row.push({ date: new Date(), active: false });
      }
    });
    
    return { dayRows, dayNames, numWeeks };
  }, [heatmapData]);

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold" style={{ color }}>
          {title}
        </h2>
        <div className="flex items-center gap-1 text-gray-400">
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
          </svg>
          <span className="text-xs font-semibold">{streak}</span>
        </div>
      </div>

      {/* Heatmap Grid - Takes up most of the space */}
      <div className="flex gap-0.5 mb-1.5 w-full">
        {/* Day labels on the left */}
        <div className="flex flex-col gap-0.5 flex-shrink-0 justify-between py-0.5">
          {weekLayout.dayNames.map((day, idx) => (
            <div
              key={idx}
              className="text-[8px] text-gray-400 w-2 h-2 flex items-center justify-center font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks (columns) - scrollable */}
        <div className="flex gap-0.5 flex-1 overflow-x-auto min-w-0">
          {Array.from({ length: weekLayout.numWeeks }).map((_, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-0.5 flex-shrink-0">
              {weekLayout.dayRows.map((dayRow, dayIdx) => {
                const day = dayRow[weekIdx];
                if (!day) return null;
                return (
                  <div
                    key={dayIdx}
                    className={`w-2 h-2 rounded-sm transition-all flex-shrink-0 ${
                      day.active
                        ? "opacity-100"
                        : "opacity-20"
                    }`}
                    style={{
                      backgroundColor: day.active ? color : "#374151",
                    }}
                    title={day.date.toLocaleDateString()}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Stats - Pushed to bottom */}
      <div className="flex items-center justify-between">
        <div className="text-[9px] text-gray-400">
          {percentage}% ({completed}/{total})
        </div>
        <div className="flex items-center gap-1 text-[9px] text-gray-500">
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-gray-700 opacity-20" />
            <span>Incomplete</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span>Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

