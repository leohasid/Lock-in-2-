"use client";

import { CheckCircle2, Circle, X } from "lucide-react";

interface HabitCardProps {
  name: string;
  completed: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

export default function HabitCard({
  name,
  completed,
  onToggle,
  onDelete,
  showDelete = false,
}: HabitCardProps) {
  return (
    <div 
      className="bg-gray-900 rounded-lg p-2 border border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors relative group"
      onClick={onToggle}
    >
      {/* Name */}
      <h3 className="text-sm font-medium text-white flex-1">{name}</h3>

      {/* Checkmark circle on right */}
      <div className="flex items-center gap-2">
        {showDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${name}"?`)) {
                onDelete();
              }
            }}
            className="p-1 hover:bg-red-600 rounded transition-colors"
          >
            <X className="w-3 h-3 text-red-400" />
          </button>
        )}
        {completed ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Circle className="w-4 h-4 text-gray-500" />
        )}
      </div>
    </div>
  );
}
