"use client";

import { CheckCircle2, Circle, Plus } from "lucide-react";

interface HabitCardProps {
  name: string;
  category: string;
  frequency: string;
  completed: boolean;
  onToggle?: () => void;
  categoryColor?: string;
}

export default function HabitCard({
  name,
  category,
  frequency,
  completed,
  onToggle,
  categoryColor = "#ef4444", // Default red for "Health"
}: HabitCardProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
      {/* Icon on left */}
      <div className="text-white">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: categoryColor }}>{category}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400">{frequency}</span>
        </div>
      </div>

      {/* Completion button on right */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 rounded-full p-2 transition-all ${
          completed
            ? "bg-green-500 text-white"
            : "bg-green-500/20 text-green-400 border-2 border-green-500/50"
        }`}
      >
        {completed ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Plus className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

