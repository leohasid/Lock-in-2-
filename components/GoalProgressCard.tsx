"use client";

interface GoalProgressCardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  onClick?: () => void;
}

export default function GoalProgressCard({
  title,
  current,
  target,
  unit = "",
  onClick,
}: GoalProgressCardProps) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  return (
    <div 
      className="bg-gray-900 rounded-lg p-2 border border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-medium text-white flex-1">{title}</h3>
        <span className="text-xs text-gray-400 ml-2">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1 mb-1">
        <div
          className="h-1 rounded-full transition-all bg-green-500"
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

