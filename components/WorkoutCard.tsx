"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";

interface WorkoutCardProps {
  streak: number;
  completed: number;
  total: number;
  getActivityData: (date: Date) => boolean;
}

export default function WorkoutCard({
  streak,
  completed,
  total,
  getActivityData,
}: WorkoutCardProps) {
  // Generate 10 weeks of data (70 days) for iPhone view
  const heatmapData = useMemo(() => {
    const today = new Date();
    const data: Array<{ date: Date; active: boolean }> = [];
    
    // Start from 69 days ago (approximately 10 weeks)
    for (let i = 69; i >= 0; i--) {
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
  const weekLayout = useMemo(() => {
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
    const numWeeks = Math.ceil(heatmapData.length / 7);
    
    // Create rows for each day of the week (7 rows)
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
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-green-400">Gym</h3>
        <div className="flex items-center gap-1 text-green-400">
          <Flame className="w-3 h-3" />
          <span className="text-xs font-semibold">{streak}</span>
        </div>
      </div>

      {/* Heatmap Grid - Compact for iPhone */}
      <div className="flex gap-0.5 mb-2">
        {/* Day labels on the left */}
        <div className="flex flex-col gap-0.5 flex-shrink-0 justify-between py-0.5">
          {weekLayout.dayNames.map((day, idx) => (
            <div
              key={idx}
              className="text-[8px] text-gray-400 w-2.5 h-2.5 flex items-center justify-center font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks (columns) */}
        <div className="flex gap-0.5 flex-1 overflow-x-auto min-w-0">
          {Array.from({ length: weekLayout.numWeeks }).map((_, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-0.5 flex-shrink-0">
              {weekLayout.dayRows.map((dayRow, dayIdx) => {
                const day = dayRow[weekIdx];
                if (!day) return null;
                return (
                  <div
                    key={dayIdx}
                    className={`w-2.5 h-2.5 rounded-sm transition-all flex-shrink-0 ${
                      day.active
                        ? "opacity-100"
                        : "opacity-20"
                    }`}
                    style={{
                      backgroundColor: day.active ? "#10b981" : "#374151",
                    }}
                    title={day.date.toLocaleDateString()}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-[9px]">
        <div className="text-gray-400">
          {percentage}% ({completed}/{total})
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <div className="flex items-center gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-gray-700 opacity-20" />
            <span>Less</span>
          </div>
          <div className="flex items-center gap-0.5">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: "#10b981" }}
            />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

