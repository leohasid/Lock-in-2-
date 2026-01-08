"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Trash2, Sparkles } from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  type: "supplement" | "task" | "habit";
  time: string;
  date: string; // ISO date string (YYYY-MM-DD)
  completed: boolean;
  repeatFrequency?: string; // e.g., "daily", "weekly", "every 3 days", etc.
}

export default function CalendarPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newReminder, setNewReminder] = useState({
    title: "",
    type: "supplement" as Reminder["type"],
    time: "",
    date: new Date().toISOString().split("T")[0], // Default to today
    repeatFrequency: "",
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPreferences, setAiPreferences] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReminders, setGeneratedReminders] = useState<Reminder[]>([]);
  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);
  const [activeView, setActiveView] = useState<"calendar" | "routine">("calendar");
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  // Load reminders from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedReminders = localStorage.getItem("reminders");
    if (storedReminders) {
      try {
        const parsed = JSON.parse(storedReminders);
        setReminders(parsed);
      } catch (e) {
        console.error("Error loading reminders:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save reminders to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    localStorage.setItem("reminders", JSON.stringify(reminders));
  }, [reminders, isLoaded]);

  const parseRepeatFrequency = (frequency: string): { days: number; count: number } | null => {
    if (!frequency || frequency.trim() === "") return null;
    
    const lower = frequency.toLowerCase().trim();
    
    // Parse common patterns
    if (lower === "daily" || lower === "every day" || lower === "day") {
      return { days: 1, count: 30 };
    }
    if (lower === "weekly" || lower === "every week" || lower === "week") {
      return { days: 7, count: 8 };
    }
    
    // Parse "every X days" or "X days"
    const everyMatch = lower.match(/every\s+(\d+)\s+days?/);
    if (everyMatch) {
      const days = parseInt(everyMatch[1]);
      return { days, count: Math.floor(30 / days) || 1 };
    }
    
    const daysMatch = lower.match(/(\d+)\s+days?/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      return { days, count: Math.floor(30 / days) || 1 };
    }
    
    // Parse "X weeks" or "every X weeks"
    const weeksMatch = lower.match(/(\d+)\s+weeks?/);
    if (weeksMatch) {
      const weeks = parseInt(weeksMatch[1]);
      return { days: weeks * 7, count: Math.floor(8 / weeks) || 1 };
    }
    
    // Default: try to extract number and assume days
    const numberMatch = lower.match(/(\d+)/);
    if (numberMatch) {
      const days = parseInt(numberMatch[1]);
      return { days, count: Math.floor(30 / days) || 1 };
    }
    
    return null;
  };

  const handleAddReminder = () => {
    if (newReminder.title && newReminder.time && newReminder.date) {
      const remindersToAdd: Reminder[] = [];
      const startDate = new Date(newReminder.date);
      
      const repeatInfo = parseRepeatFrequency(newReminder.repeatFrequency);
      
      if (repeatInfo) {
        // Create repeating reminders
        for (let i = 0; i < repeatInfo.count; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + (i * repeatInfo.days));
          remindersToAdd.push({
            id: `${Date.now()}-${i}`,
            title: newReminder.title,
            type: newReminder.type,
            time: newReminder.time,
            date: date.toISOString().split("T")[0],
            completed: false,
            repeatFrequency: newReminder.repeatFrequency,
          });
        }
      } else {
        // Single reminder, no repeat
        remindersToAdd.push({
          id: Date.now().toString(),
          title: newReminder.title,
          type: newReminder.type,
          time: newReminder.time,
          date: newReminder.date,
          completed: false,
        });
      }
      
      setReminders([...reminders, ...remindersToAdd]);
      setNewReminder({ 
        title: "", 
        type: "supplement", 
        time: "", 
        date: new Date().toISOString().split("T")[0],
        repeatFrequency: "",
      });
      setShowAddForm(false);
      setShowDateModal(false);
      setClickedDate(null);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setClickedDate(date);
    setShowDateModal(true);
  };

  const toggleComplete = (id: string) => {
    setReminders(
      reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const deleteReminder = (id: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      setReminders(reminders.filter((r) => r.id !== id));
    }
  };

  const getReminderIcon = (type: Reminder["type"]) => {
    switch (type) {
      case "supplement":
        return "💊";
      case "task":
        return "✅";
      case "habit":
        return "🔄";
    }
  };

  const getTodayReminders = () => {
    const today = new Date().toISOString().split("T")[0];
    return reminders.filter((r) => r.date === today);
  };

  const getSelectedDateReminders = () => {
    const selectedDateStr = selectedDate.toISOString().split("T")[0];
    return reminders.filter((r) => r.date === selectedDateStr);
  };

  // Calendar generation
  const getCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isSameDay = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return isSameDay(date, today);
  };

  const hasReminders = (date: Date | null) => {
    if (!date) return false;
    const dateStr = date.toISOString().split("T")[0];
    return reminders.some((r) => r.date === dateStr);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const navigateMonth = (direction: "prev" | "next") => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setSelectedWeek((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setDate(prev.getDate() - 7);
      } else {
        newDate.setDate(prev.getDate() + 7);
      }
      return newDate;
    });
  };

  // Get the week's days (Monday to Sunday)
  const getWeekDays = () => {
    const days: Date[] = [];
    const startOfWeek = new Date(selectedWeek);
    // Get Monday (day 1)
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Generate time slots (every hour from 6 AM to 11 PM)
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  // Get reminders for a specific day and time (exact hour match)
  const getRemindersForSlot = (date: Date, time: string) => {
    const dateStr = date.toISOString().split("T")[0];
    const timeHour = parseInt(time.split(":")[0]);
    
    return reminders.filter((reminder) => {
      if (reminder.date !== dateStr) return false;
      
      const reminderHour = parseInt(reminder.time.split(":")[0]);
      // Match exact hour
      return reminderHour === timeHour;
    }).sort((a, b) => a.time.localeCompare(b.time)); // Sort by exact time within the hour
  };

  const weekDays = getWeekDays();
  const weekDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-5 pb-28">
      <div className="container mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-teal-400 hover:bg-teal-500 text-black px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Add Reminder
              </button>
              <button
                onClick={() => setShowAIGenerator(true)}
                className="bg-teal-400 hover:bg-teal-500 text-black px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                AI Schedule
              </button>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-4 border-b border-white/10">
          <button
            onClick={() => setActiveView("calendar")}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeView === "calendar"
                ? "text-teal-400 border-b-2 border-teal-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveView("routine")}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeView === "routine"
                ? "text-teal-400 border-b-2 border-teal-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Routine
          </button>
        </div>

        {/* Date Click Modal - Shows Reminders for Selected Date */}
        {showDateModal && clickedDate && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {clickedDate.toLocaleDateString("en-US", { 
                    weekday: "long", 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                  })}
                </h2>
                <button
                  onClick={() => {
                    setShowDateModal(false);
                    setClickedDate(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              {getSelectedDateReminders().length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg mb-4">No reminders for this date</p>
                  <button
                    onClick={() => {
                      setShowAddForm(true);
                      setNewReminder({
                        ...newReminder,
                        date: clickedDate.toISOString().split("T")[0],
                      });
                      setShowDateModal(false);
                      setClickedDate(null);
                    }}
                    className="bg-teal-400 hover:bg-teal-500 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Add Reminder
                  </button>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {getSelectedDateReminders()
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`bg-[rgba(20,30,35,0.85)] rounded-lg p-4 flex items-center justify-between ${
                          reminder.completed ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-2xl">{getReminderIcon(reminder.type)}</div>
                          <div className="flex-1">
                            <h3
                              className={`font-semibold ${
                                reminder.completed ? "line-through text-gray-500" : "text-white"
                              }`}
                            >
                              {reminder.title}
                            </h3>
                            <p className="text-gray-400 text-sm">{reminder.time}</p>
                            {reminder.repeatFrequency && (
                              <p className="text-gray-500 text-xs mt-1">
                                Repeats: {reminder.repeatFrequency}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleComplete(reminder.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              reminder.completed
                                ? "bg-[rgba(20,30,35,1)] text-gray-300"
                                : "bg-green-600 hover:bg-green-700 text-white"
                            }`}
                          >
                            {reminder.completed ? "Undo" : "Done"}
                          </button>
                          <button
                            onClick={() => deleteReminder(reminder.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete reminder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {getSelectedDateReminders().length > 0 && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setNewReminder({
                      ...newReminder,
                      date: clickedDate.toISOString().split("T")[0],
                    });
                    setShowDateModal(false);
                    setClickedDate(null);
                  }}
                  className="w-full bg-teal-400 hover:bg-teal-500 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  + Add Another Reminder
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add Reminder Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Add Reminder</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    placeholder="e.g., Take Vitamin D, Drink Water..."
                    className="w-full bg-[rgba(20,30,35,0.85)] text-white p-3 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Type</label>
                  <select
                    value={newReminder.type}
                    onChange={(e) =>
                      setNewReminder({ ...newReminder, type: e.target.value as Reminder["type"] })
                    }
                    className="w-full bg-[rgba(20,30,35,0.85)] text-white p-3 rounded-lg"
                  >
                    <option value="supplement">💊 Supplement</option>
                    <option value="task">✅ Task</option>
                    <option value="habit">🔄 Habit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Time</label>
                  <input
                    type="time"
                    value={newReminder.time}
                    onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] text-white p-3 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={newReminder.date}
                    onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                    className="w-full bg-[rgba(20,30,35,0.85)] text-white p-3 rounded-lg"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Repeat Frequency</label>
                  <input
                    type="text"
                    value={newReminder.repeatFrequency}
                    onChange={(e) => setNewReminder({ ...newReminder, repeatFrequency: e.target.value })}
                    placeholder="e.g., daily, weekly, every 3 days, 2 weeks"
                    className="w-full bg-[rgba(20,30,35,0.85)] text-white p-3 rounded-lg"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Examples: "daily", "weekly", "every 3 days", "2 weeks", or leave empty for one-time reminder
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleAddReminder}
                    className="flex-1 bg-teal-400 hover:bg-teal-500 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Add Reminder
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setShowDateModal(false);
                      setClickedDate(null);
                      setNewReminder({ 
                        title: "", 
                        type: "supplement", 
                        time: "", 
                        date: new Date().toISOString().split("T")[0],
                        repeatFrequency: "",
                      });
                    }}
                    className="flex-1 bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Routine View - Weekly Schedule Grid */}
        {activeView === "routine" && (
          <div className="mb-4">
            {/* Week Navigation */}
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-4 border border-white/10 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Weekly Routine</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateWeek("prev")}
                    className="bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-3 py-1 rounded-lg text-sm"
                  >
                    ←
                  </button>
                  <span className="text-white font-semibold min-w-[200px] text-center text-sm">
                    {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => navigateWeek("next")}
                    className="bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-3 py-1 rounded-lg text-sm"
                  >
                    →
                  </button>
                  <button
                    onClick={() => setSelectedWeek(new Date())}
                    className="bg-teal-400 hover:bg-teal-500 text-black px-3 py-1 rounded-lg text-sm font-medium"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Weekly Schedule Grid - Days on left, Times on top */}
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="min-w-full">
                  {/* Time header row - Show more columns at once */}
                  <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: `90px repeat(${timeSlots.length}, minmax(70px, 1fr))` }}>
                    <div className="text-xs text-gray-400 font-semibold p-2"></div>
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="text-center text-xs font-semibold p-2 rounded text-gray-400"
                      >
                        {time}
                      </div>
                    ))}
                  </div>

                  {/* Day rows */}
                  <div className="space-y-1.5">
                    {weekDays.map((day, dayIndex) => {
                      const isTodaySlot = isToday(day);
                      const dayName = weekDayNames[dayIndex];
                      return (
                        <div 
                          key={dayIndex} 
                          className="grid gap-1.5"
                          style={{ gridTemplateColumns: `90px repeat(${timeSlots.length}, minmax(70px, 1fr))` }}
                        >
                          {/* Day label */}
                          <div className={`text-xs font-semibold p-2 rounded flex flex-col justify-center ${
                            isTodaySlot ? "bg-teal-400/20 text-teal-400" : "text-gray-300 bg-[rgba(20,30,35,0.85)]/50"
                          }`}>
                            <div className="font-bold">{dayName}</div>
                            <div className="text-[10px] mt-0.5 opacity-75">{day.getDate()}</div>
                          </div>
                          {/* Time columns */}
                          {timeSlots.map((time) => {
                            const slotReminders = getRemindersForSlot(day, time);
                            return (
                              <div
                                key={time}
                                className={`min-h-[70px] p-1.5 rounded border ${
                                  isTodaySlot
                                    ? "bg-teal-400/5 border-teal-400/20"
                                    : "bg-[rgba(20,30,35,0.85)]/50 border-white/10/50"
                                }`}
                              >
                                {slotReminders.length === 0 ? (
                                  <div className="text-gray-600 text-[9px] opacity-30 h-full flex items-center justify-center">
                                    -
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {slotReminders.map((reminder) => (
                                      <div
                                        key={reminder.id}
                                        onClick={() => {
                                          setSelectedDate(day);
                                          setClickedDate(day);
                                          setShowDateModal(true);
                                        }}
                                        className={`p-1.5 rounded text-[10px] cursor-pointer transition-colors ${
                                          reminder.completed
                                            ? "opacity-50 line-through"
                                            : ""
                                        } ${
                                          reminder.type === "supplement"
                                            ? "bg-blue-500/30 border border-blue-500/50 text-blue-200"
                                            : reminder.type === "task"
                                            ? "bg-green-500/30 border border-green-500/50 text-green-200"
                                            : "bg-teal-400/30 border border-teal-400/50 text-teal-200"
                                        }`}
                                        title={`${reminder.title} at ${reminder.time}`}
                                      >
                                        <div className="flex items-start gap-1">
                                          <span className="text-xs mt-0.5">{getReminderIcon(reminder.type)}</span>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{reminder.title}</div>
                                            <div className="text-[9px] opacity-90 mt-0.5 font-mono">
                                              {reminder.time}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar View */}
        {activeView === "calendar" && (
          <>
        {/* Today's Reminders */}
        <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-4 border border-white/10 mb-4">
          <h2 className="text-lg font-semibold text-white mb-3">
            Today's Reminders ({getTodayReminders().length})
          </h2>
          {getTodayReminders().length === 0 ? (
            <p className="text-gray-400">No reminders scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {getTodayReminders()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`bg-[rgba(20,30,35,0.85)] rounded-lg p-4 flex items-center justify-between ${
                      reminder.completed ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{getReminderIcon(reminder.type)}</div>
                      <div>
                        <h3
                          className={`font-semibold ${
                            reminder.completed ? "line-through text-gray-500" : "text-white"
                          }`}
                        >
                          {reminder.title}
                        </h3>
                        <p className="text-gray-400 text-sm">{reminder.time}</p>
                        {reminder.repeatFrequency && (
                          <p className="text-gray-500 text-xs mt-1">
                            Repeats: {reminder.repeatFrequency}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleComplete(reminder.id)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          reminder.completed
                            ? "bg-[rgba(20,30,35,0.85)] text-gray-300"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {reminder.completed ? "Undo" : "Complete"}
                      </button>
                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete reminder"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => router.push("/calendar/all-reminders")}
            className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-3 border border-white/10 hover:border-teal-400/50 transition-all text-left cursor-pointer"
          >
            <div className="text-xl font-bold text-white mb-1">{reminders.length}</div>
            <div className="text-xs text-gray-400">Total</div>
            <div className="text-teal-400 text-[10px] mt-1">View all →</div>
          </button>
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-3 border border-white/10">
            <div className="text-xl font-bold text-white mb-1">
              {reminders.filter((r) => r.completed).length}
            </div>
            <div className="text-xs text-gray-400">Completed</div>
          </div>
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-3 border border-white/10">
            <div className="text-xl font-bold text-white mb-1">
              {Math.round(
                (reminders.filter((r) => r.completed).length / Math.max(getTodayReminders().length, 1)) * 100
              )}%
            </div>
            <div className="text-xs text-gray-400">Rate</div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-4 border border-white/10 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Calendar</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth("prev")}
                className="bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-3 py-1 rounded-lg text-sm"
              >
                ←
              </button>
              <span className="text-white font-semibold min-w-[150px] text-center">
                {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </span>
              <button
                onClick={() => navigateMonth("next")}
                className="bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-3 py-1 rounded-lg text-sm"
              >
                →
              </button>
            </div>
          </div>
          
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {weekDayNamesShort.map((day) => (
              <div key={day} className="text-center text-gray-400 text-[10px] font-semibold py-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {getCalendarDays().map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }
              
              const isSelected = isSameDay(date, selectedDate);
              const isCurrentDay = isToday(date);
              const hasReminder = hasReminders(date);
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateClick(date)}
                  className={`aspect-square rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-teal-400 text-black"
                      : isCurrentDay
                      ? "bg-[rgba(20,30,35,0.85)] text-white border-2 border-teal-400"
                      : "bg-[rgba(20,30,35,0.85)] text-white hover:bg-[rgba(20,30,35,1)]"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{date.getDate()}</span>
                    {hasReminder && (
                      <div className="w-1 h-1 rounded-full bg-teal-400 mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Reminders - Shows below calendar when date is clicked */}
        {activeView === "calendar" && !isSameDay(selectedDate, new Date()) && (
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-xl p-4 border border-white/10 mb-4">
            <h2 className="text-lg font-semibold text-white mb-3">
              {selectedDate.toLocaleDateString("en-US", { 
                weekday: "long", 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </h2>
            {getSelectedDateReminders().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg mb-4">No reminders for this date!</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-teal-400 hover:bg-teal-500 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Add Reminder
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {getSelectedDateReminders()
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`bg-[rgba(20,30,35,0.85)] rounded-lg p-4 flex items-center justify-between ${
                        reminder.completed ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{getReminderIcon(reminder.type)}</div>
                        <div>
                          <h3
                            className={`font-semibold ${
                              reminder.completed ? "line-through text-gray-500" : "text-white"
                            }`}
                          >
                            {reminder.title}
                          </h3>
                          <p className="text-gray-400 text-sm">{reminder.time}</p>
                          {reminder.repeatFrequency && (
                            <p className="text-gray-500 text-xs mt-1">
                              Repeats: {reminder.repeatFrequency}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleComplete(reminder.id)}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                            reminder.completed
                              ? "bg-[rgba(20,30,35,0.85)] text-gray-300"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                        >
                          {reminder.completed ? "Undo" : "Complete"}
                        </button>
                        <button
                          onClick={() => deleteReminder(reminder.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete reminder"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
          </>
        )}

        {/* AI Schedule Generator Modal */}
        {showAIGenerator && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-teal-400" />
                  AI Schedule Generator
                </h2>
                <button
                  onClick={() => {
                    setShowAIGenerator(false);
                    setAiPreferences("");
                    setGeneratedReminders([]);
                    setShowGeneratedPreview(false);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {!showGeneratedPreview ? (
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Let AI create a personalized monthly schedule for you! Tell us about your routine preferences, goals, and activities you want to track.
                  </p>
                  <div>
                    <label className="block text-gray-300 mb-2">Your Preferences & Goals</label>
                    <textarea
                      value={aiPreferences}
                      onChange={(e) => setAiPreferences(e.target.value)}
                      placeholder="e.g., I want to workout 4 times a week, take vitamins daily at 8am, meal prep on Sundays, meditate every morning, drink water every 2 hours..."
                      className="w-full bg-[rgba(20,30,35,0.85)] text-white p-3 rounded-lg min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Be specific about times, frequencies, and activities you want included
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!aiPreferences.trim()) {
                        alert("Please enter your preferences to generate a schedule");
                        return;
                      }
                      setIsGenerating(true);
                      try {
                        const monthNames = [
                          "January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"
                        ];
                        const month = monthNames[selectedDate.getMonth()];
                        const year = selectedDate.getFullYear();

                        const response = await fetch("/api/generate-schedule", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            preferences: aiPreferences,
                            month,
                            year,
                            existingReminders: reminders,
                          }),
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || "Failed to generate schedule");
                        }

                        const data = await response.json();
                        const newReminders: Reminder[] = data.reminders.map((r: any, index: number) => ({
                          id: `ai-generated-${Date.now()}-${index}`,
                          title: r.title,
                          type: r.type || "task",
                          time: r.time,
                          date: r.date,
                          completed: false,
                          repeatFrequency: r.repeatFrequency || "",
                        }));

                        setGeneratedReminders(newReminders);
                        setShowGeneratedPreview(true);
                      } catch (error: any) {
                        console.error("AI schedule generation error:", error);
                        alert(error.message || "Failed to generate schedule. Please try again.");
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                    disabled={isGenerating}
                    className="w-full bg-teal-400 hover:bg-teal-500 disabled:bg-[rgba(20,30,35,1)] disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {isGenerating ? "Generating Schedule..." : "Generate Monthly Schedule"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-teal-400/10 border border-teal-400/30 rounded-lg p-4">
                    <p className="text-teal-300 text-sm font-semibold mb-1">
                      ✨ Generated {generatedReminders.length} reminders for {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Review the schedule below and click "Add to Calendar" to apply it
                    </p>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {generatedReminders.slice(0, 20).map((reminder, index) => (
                      <div
                        key={reminder.id}
                        className="bg-[rgba(20,30,35,0.85)] rounded-lg p-3 flex items-center gap-3"
                      >
                        <div className="text-xl">{getReminderIcon(reminder.type)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-sm truncate">{reminder.title}</h3>
                          <p className="text-gray-400 text-xs">
                            {new Date(reminder.date).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric" 
                            })} at {reminder.time}
                          </p>
                          {reminder.repeatFrequency && (
                            <p className="text-gray-500 text-[10px] mt-0.5">
                              Repeats: {reminder.repeatFrequency}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {generatedReminders.length > 20 && (
                      <p className="text-gray-400 text-xs text-center py-2">
                        ... and {generatedReminders.length - 20} more reminders
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setReminders([...reminders, ...generatedReminders]);
                        setShowAIGenerator(false);
                        setAiPreferences("");
                        setGeneratedReminders([]);
                        setShowGeneratedPreview(false);
                        alert(`Successfully added ${generatedReminders.length} reminders to your calendar!`);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Add to Calendar
                    </button>
                    <button
                      onClick={() => {
                        setShowGeneratedPreview(false);
                        setGeneratedReminders([]);
                      }}
                      className="flex-1 bg-[rgba(20,30,35,0.85)] hover:bg-[rgba(20,30,35,1)] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}

