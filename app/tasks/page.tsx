"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  type: "supplement" | "task" | "habit";
  time: string;
  date: string; // ISO date string (YYYY-MM-DD)
  completed: boolean;
  repeatFrequency?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tasks (reminders with type "task") from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedReminders = localStorage.getItem("reminders");
    if (storedReminders) {
      try {
        const parsed = JSON.parse(storedReminders);
        // Filter for tasks only
        const taskReminders = parsed.filter((r: Task) => r.type === "task");
        setTasks(taskReminders);
      } catch (e) {
        console.error("Error loading tasks:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    
    // Get all reminders
    const storedReminders = localStorage.getItem("reminders");
    let allReminders: Task[] = [];
    if (storedReminders) {
      try {
        allReminders = JSON.parse(storedReminders);
      } catch (e) {
        allReminders = [];
      }
    }
    
    // Update tasks in all reminders
    const updatedReminders = allReminders.map((r) => {
      const task = tasks.find((t) => t.id === r.id);
      return task ? task : r;
    });
    
    // Add any new tasks that aren't in allReminders
    tasks.forEach((task) => {
      if (!allReminders.find((r) => r.id === task.id)) {
        updatedReminders.push(task);
      }
    });
    
    localStorage.setItem("reminders", JSON.stringify(updatedReminders));
  }, [tasks, isLoaded]);

  const toggleTaskComplete = (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  // Group tasks by date and sort
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (!groups[task.date]) {
        groups[task.date] = [];
      }
      groups[task.date].push(task);
    });

    // Sort dates
    const sortedDates = Object.keys(groups).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    // Sort tasks within each date by time
    sortedDates.forEach((date) => {
      groups[date].sort((a, b) => a.time.localeCompare(b.time));
    });

    return { groups, sortedDates };
  }, [tasks]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0f1a] to-black text-white px-4 pt-4 pb-28">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Tasks
          </h1>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-400 text-sm">No tasks yet</p>
            <p className="text-gray-500 text-xs mt-2">
              Tasks from your routine will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTasks.sortedDates.map((date) => {
              const dateTasks = groupedTasks.groups[date];
              const isToday = date === todayStr;
              const dateObj = new Date(date);
              
              return (
                <div key={date}>
                  <h2 className="text-sm font-semibold text-gray-300 mb-3">
                    {isToday ? "Today" : dateObj.toLocaleDateString("en-US", { 
                      weekday: "long", 
                      month: "long", 
                      day: "numeric" 
                    })}
                  </h2>
                  <div className="space-y-2">
                    {dateTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-gradient-to-br from-[#0c1422] via-[#1a2332] to-black rounded-xl p-4 border border-white/10 hover:border-teal-400/50 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleTaskComplete(task.id)}
                            className="flex-shrink-0 mt-0.5"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" fill="#22c55e" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-base font-medium mb-1 ${
                                task.completed
                                  ? "text-gray-500 line-through"
                                  : "text-white"
                              }`}
                            >
                              {task.title}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span>{task.time}</span>
                              {task.repeatFrequency && (
                                <>
                                  <span>•</span>
                                  <span>Repeats: {task.repeatFrequency}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
