"use client";

import { CheckCircle2, Circle } from "lucide-react";

interface HabitCardProps {
  name: string;
  completed: boolean;
  onToggle?: () => void;
}

export default function HabitCard({
  name,
  completed,
  onToggle,
}: HabitCardProps) {
  return (
    <div 
      className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors"
      onClick={onToggle}
    >
      {/* Name */}
      <h3 className="text-lg font-semibold text-white">{name}</h3>

      {/* Checkmark circle on right */}
      {completed ? (
        <CheckCircle2 className="w-6 h-6 text-green-500" />
      ) : (
        <Circle className="w-6 h-6 text-gray-500" />
      )}
    </div>
  );
}
