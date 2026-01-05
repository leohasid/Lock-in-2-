"use client";

interface GoalProgressCardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
}

export default function GoalProgressCard({
  title,
  current,
  target,
  unit = "",
}: GoalProgressCardProps) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  return (
    <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs text-gray-400">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1">
        <div
          className="h-1.5 rounded-full transition-all bg-green-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-400">
        {current.toLocaleString()}
        {unit} / {target.toLocaleString()}
        {unit}
      </div>
    </div>
  );
}

