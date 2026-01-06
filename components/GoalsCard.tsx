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
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c1422] to-black p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Goals</h2>
        <Link href="/goals" className="text-[11px] text-gray-400">
          View all →
        </Link>
      </div>

      <ul className="space-y-3">
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
          <li className="text-center text-sm text-gray-400 py-4">
            No goals yet
          </li>
        )}
      </ul>

      <button
        onClick={onAddGoal}
        className="mt-4 w-full rounded-xl bg-teal-500 py-3 text-sm font-medium text-black"
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
    <li className="flex items-center justify-between">
      <span className="text-sm text-gray-200 leading-snug">{title}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400">{value}</span>
        {completed && <span className="text-xs text-teal-400">✔</span>}
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
    <li>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-gray-200 leading-snug">{title}</span>
        <span className="text-[11px] text-gray-400">
          {unit === "$" || unit === "£" ? unit : ""}
          {current.toLocaleString()}
          {unit && unit !== "$" && unit !== "£" ? ` ${unit}` : ""} /{" "}
          {unit === "$" || unit === "£" ? unit : ""}
          {target.toLocaleString()}
          {unit && unit !== "$" && unit !== "£" ? ` ${unit}` : ""}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-teal-400"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-1 text-right text-[11px] text-teal-400">{percent}%</p>
    </li>
  );
}

