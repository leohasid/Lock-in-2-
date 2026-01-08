"use client";

import Link from "next/link";
import { DollarSign, Dumbbell, TrendingUp, Droplet } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit?: string;
}

interface GoalsCardProps {
  goals: Goal[];
  onAddGoal?: () => void;
}

export default function GoalsCard({ goals, onAddGoal }: GoalsCardProps) {
  // Separate goals into simple goals and long-term goals (those with progress bars)
  const simpleGoals = goals.filter(g => !g.title.toLowerCase().includes("10k") && !g.title.toLowerCase().includes("make"));
  const longTermGoals = goals.filter(g => g.title.toLowerCase().includes("10k") || g.title.toLowerCase().includes("make"));

  return (
    <section className="rounded-2xl border-2 border-teal-500/30 bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black p-5 shadow-lg shadow-teal-500/10 relative overflow-hidden group">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="mb-4 flex items-center justify-between relative z-10">
        <h2 className="text-base font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Goals</h2>
        <Link href="/goals" className="text-xs text-teal-400 hover:text-teal-300 transition-colors font-medium">
          View all →
        </Link>
      </div>

      <ul className="space-y-3 relative z-10">
        {simpleGoals.map((goal) => {
          const isCompleted = goal.current >= goal.target;
          return (
            <GoalRow
              key={goal.id}
              title={goal.title}
              value={`${goal.current} / ${goal.target}`}
              completed={isCompleted}
            />
          );
        })}

        {longTermGoals.map((goal) => (
          <LongTermGoal
            key={goal.id}
            title={goal.title}
            current={goal.current}
            target={goal.target}
            unit={goal.unit || ""}
          />
        ))}

        {goals.length === 0 && (
          <li className="text-center py-6">
            <div className="text-4xl mb-2 animate-bounce">🎯</div>
            <p className="text-sm text-gray-400">No goals yet</p>
            <p className="text-xs text-gray-500 mt-1">Start tracking your progress!</p>
          </li>
        )}
      </ul>

      <button
        onClick={onAddGoal}
        className="mt-5 w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 py-3 text-sm font-bold text-black transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 relative z-10"
      >
        + Add New Goal
      </button>
    </section>
  );
}

function GoalRow({
  title,
  value,
  completed,
}: {
  title: string;
  value: string;
  completed?: boolean;
}) {
  return (
    <li className="flex items-center justify-between p-2.5 bg-gradient-to-br from-[rgba(10,15,20,0.6)] to-[rgba(5,10,15,0.6)] rounded-xl border border-teal-500/20 hover:border-teal-400/40 transition-all">
      <span className="text-sm font-medium text-white leading-snug">{title}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-300 font-medium">{value}</span>
        {completed && (
          <span className="px-1.5 py-0.5 bg-gradient-to-r from-teal-400 to-cyan-500 text-black text-[10px] font-bold rounded-full">
            ✔
          </span>
        )}
      </div>
    </li>
  );
}

function LongTermGoal({
  title,
  current,
  target,
  unit = "",
}: {
  title: string;
  current: number;
  target: number;
  unit?: string;
}) {
  const percent = Math.min(100, Math.round((current / target) * 100));

  return (
    <li className="p-3 bg-gradient-to-br from-[rgba(10,15,20,0.6)] to-[rgba(5,10,15,0.6)] rounded-xl border border-teal-500/20 hover:border-teal-400/40 transition-all">
      <div className="mb-2 flex justify-between">
        <span className="text-sm font-medium text-white leading-snug">{title}</span>
        <span className="text-xs text-gray-300 font-medium">
          {unit === "$" || unit === "£" ? unit : ""}
          {current.toLocaleString()}
          {unit && unit !== "$" && unit !== "£" ? ` ${unit}` : ""} /{" "}
          {unit === "$" || unit === "£" ? unit : ""}
          {target.toLocaleString()}
          {unit && unit !== "$" && unit !== "£" ? ` ${unit}` : ""}
        </span>
      </div>

      <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden shadow-inner">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all duration-500 shadow-lg"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-1.5 text-right text-xs font-bold text-teal-400">{percent}%</p>
    </li>
  );
}

