"use client";

import { CheckCircle2 } from "lucide-react";

interface GoalItemCardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  icon: React.ReactNode;
  completed: boolean;
}

export default function GoalItemCard({
  title,
  current,
  target,
  unit = "",
  icon,
  completed,
}: GoalItemCardProps) {
  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;

  return (
    <div className="bg-gray-900 rounded-lg p-2 border border-gray-800 flex items-center gap-2">
      {/* Icon */}
      <div className="text-teal-400 flex-shrink-0">{icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h4 className="text-xs font-semibold text-white truncate">{title}</h4>
          {completed && (
            <CheckCircle2 className="w-3 h-3 text-teal-400 flex-shrink-0 ml-1" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">
            {current.toLocaleString()}
            {unit} / {target.toLocaleString()}
            {unit}
          </span>
          {title.includes("10k") && (
            <>
              <div className="w-full bg-gray-800 rounded-full h-0.5 flex-1 max-w-20">
                <div
                  className="h-0.5 rounded-full bg-teal-400 transition-all"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-teal-400">{percentage}%</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

