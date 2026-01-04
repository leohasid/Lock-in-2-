"use client";

interface GoalCardProps {
  title: string;
  targetDate: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
}

export default function GoalCard({
  title,
  targetDate,
  current,
  target,
  unit = "",
  color = "#3b82f6", // Default blue
}: GoalCardProps) {
  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;
  const displayPercentage = Math.min(percentage, 100);

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{targetDate}</p>
        </div>
        <div
          className="px-4 py-2 rounded-full text-white text-sm font-semibold"
          style={{ backgroundColor: color }}
        >
          {displayPercentage}% Complete
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${displayPercentage}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-400 mt-2">
        {current.toLocaleString()}
        {unit} / {target.toLocaleString()}
        {unit}
      </div>
    </div>
  );
}

