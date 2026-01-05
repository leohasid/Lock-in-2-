"use client";

import { X } from "lucide-react";

interface GoalProgressCardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  targetDate?: string;
  onClick?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

export default function GoalProgressCard({
  title,
  current,
  target,
  unit = "",
  targetDate,
  onClick,
  onDelete,
  showDelete = false,
}: GoalProgressCardProps) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  return (
    <div 
      className="bg-gray-900 rounded-lg p-2 border border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors relative group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-medium text-white flex-1">{title}</h3>
        <div className="flex items-center gap-2">
          {showDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${title}"?`)) {
                  onDelete();
                }
              }}
              className="p-1 hover:bg-red-600 rounded transition-colors"
            >
              <X className="w-3 h-3 text-red-400" />
            </button>
          )}
          <span className="text-xs text-gray-400">{percentage}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1 mb-1">
        <div
          className="h-1 rounded-full transition-all bg-green-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {current.toLocaleString()}
          {unit} / {target.toLocaleString()}
          {unit}
        </div>
        {targetDate && (
          <div className="text-xs text-gray-500">
            {new Date(targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>
    </div>
  );
}

