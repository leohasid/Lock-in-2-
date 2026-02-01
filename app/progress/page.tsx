"use client";

import Link from "next/link";

export default function ProgressPage() {
  // In a real app, these would come from state management or API
  const stats = {
    workouts: { thisWeek: 0, total: 0, streak: 0 },
    nutrition: { caloriesToday: 0, avgCalories: 0, proteinGoal: 0 },
    addictions: { daysClean: 0, longestStreak: 0, totalTracked: 0 },
    calendar: { remindersToday: 0, completedToday: 0, completionRate: 0 },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">📊 Progress Overview</h1>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-white mb-2">{stats.workouts.total}</div>
            <div className="text-gray-400">Total Workouts</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-white mb-2">{stats.addictions.daysClean}</div>
            <div className="text-gray-400">Days Clean</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-white mb-2">{stats.calendar.completionRate}%</div>
            <div className="text-gray-400">Task Completion</div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl font-bold text-white mb-2">{stats.workouts.streak}</div>
            <div className="text-gray-400">Current Streak</div>
          </div>
        </div>

        {/* Fitness Progress */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">💪 Fitness</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 mb-1">This Week</div>
              <div className="text-2xl font-bold text-white">{stats.workouts.thisWeek} workouts</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Total Workouts</div>
              <div className="text-2xl font-bold text-white">{stats.workouts.total}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Current Streak</div>
              <div className="text-2xl font-bold text-white">{stats.workouts.streak} days</div>
            </div>
          </div>
          <Link
            href="/gym/workout"
            className="inline-block mt-4 text-orange-400 hover:text-orange-300"
          >
            View Gym Details →
          </Link>
        </div>

        {/* Nutrition Progress */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">🥗 Nutrition</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 mb-1">Today's Calories</div>
              <div className="text-2xl font-bold text-white">{stats.nutrition.caloriesToday}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Average Daily</div>
              <div className="text-2xl font-bold text-white">{stats.nutrition.avgCalories}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Protein Goal</div>
              <div className="text-2xl font-bold text-white">{stats.nutrition.proteinGoal}g</div>
            </div>
          </div>
          <Link
            href="/nutrition"
            className="inline-block mt-4 text-orange-400 hover:text-orange-300"
          >
            View Nutrition Details →
          </Link>
        </div>

        {/* Addiction Recovery Progress */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">🛡️ Recovery</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 mb-1">Days Clean</div>
              <div className="text-2xl font-bold text-white">{stats.addictions.daysClean}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Longest Streak</div>
              <div className="text-2xl font-bold text-white">{stats.addictions.longestStreak} days</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Tracked Addictions</div>
              <div className="text-2xl font-bold text-white">{stats.addictions.totalTracked}</div>
            </div>
          </div>
          <Link
            href="/addictions"
            className="inline-block mt-4 text-orange-400 hover:text-orange-300"
          >
            View Recovery Details →
          </Link>
        </div>

        {/* Calendar & Tasks Progress */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">📅 Tasks & Reminders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 mb-1">Today's Reminders</div>
              <div className="text-2xl font-bold text-white">{stats.calendar.remindersToday}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Completed Today</div>
              <div className="text-2xl font-bold text-white">{stats.calendar.completedToday}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Completion Rate</div>
              <div className="text-2xl font-bold text-white">{stats.calendar.completionRate}%</div>
            </div>
          </div>
          <Link
            href="/calendar"
            className="inline-block mt-4 text-orange-400 hover:text-orange-300"
          >
            View Calendar Details →
          </Link>
        </div>

        {/* Achievements Section */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h2 className="text-2xl font-semibold text-white mb-4">🏆 Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-gray-400 text-sm">First Workout</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🔥</div>
              <div className="text-gray-400 text-sm">7 Day Streak</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">💪</div>
              <div className="text-gray-400 text-sm">10 Workouts</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🛡️</div>
              <div className="text-gray-400 text-sm">30 Days Clean</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

