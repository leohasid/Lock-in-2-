"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Trash2, Sparkles, Plus } from "lucide-react";
import {
  scheduleDailyTasksSummaryNotification,
  rescheduleTodayTaskReminders,
} from "@/app/utils/notifications";

interface Reminder {
  id: string;
  title: string;
  type: "supplement" | "task" | "habit";
  /** Start time HH:mm */
  time: string;
  /** End time HH:mm (optional; schedule tasks) */
  endTime?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  completed: boolean;
  repeatFrequency?: string; // e.g., "daily", "weekly", "every 3 days", etc.
}

function formatReminderTimeDisplay(reminder: Reminder): string {
  const start = reminder.time || "";
  const end = reminder.endTime?.trim();
  if (!start) return "";
  if (end) return `${start} – ${end}`;
  return start;
}

/** Same metadata as expanded recurring / batch tasks → same "series" for delete-all */
function reminderSeriesKey(r: Reminder): string {
  const end = r.endTime?.trim() ?? "";
  const rep = r.repeatFrequency?.trim() ?? "";
  return [r.type, r.title, r.time, end, rep].join("\u0001");
}

function remindersMatchingSeries(reminder: Reminder, all: Reminder[]): Reminder[] {
  const key = reminderSeriesKey(reminder);
  return all.filter((x) => reminderSeriesKey(x) === key);
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Map words in user "when" text to JS getDay() indices (0 Sun … 6 Sat) */
function parseWeekdayPattern(whenRaw: string): number[] | null {
  const when = whenRaw
    .toLowerCase()
    .replace(/\bthis\s+month\b/gi, " ")
    .replace(/,/g, " ")
    .replace(/&/g, " ")
    .replace(/\band\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!when) return null;

  if (/\bweekdays?\b/.test(when) || /\bmon-?fri\b/.test(when) || /\bmon to fri\b/.test(when) || /\bwork\s*days?\b/.test(when)) {
    return [1, 2, 3, 4, 5];
  }
  if (/\bweekends?\b/.test(when)) {
    return [0, 6];
  }

  const patterns: [RegExp, number][] = [
    [/\b(sundays?|sun)\b/, 0],
    [/\b(mondays?|mon)\b/, 1],
    [/\b(tuesdays?|tues?)\b/, 2],
    [/\b(wednesdays?|wed)\b/, 3],
    [/\b(thursdays?|thur?s?)\b/, 4],
    [/\b(fridays?|fri)\b/, 5],
    [/\b(saturdays?|sat)\b/, 6],
  ];

  const found = new Set<number>();
  for (const [re, idx] of patterns) {
    if (re.test(when)) found.add(idx);
  }
  return found.size > 0 ? Array.from(found).sort((a, b) => a - b) : null;
}

/** True → repeat on all matching weekdays (e.g. every Monday). False → only the next occurrence of each named day. */
function isRecurringWeekdayWhen(whenRaw: string): boolean {
  const t = whenRaw.toLowerCase();
  if (/\bevery\b/.test(t)) return true;
  if (/\beach\b/.test(t)) return true;
  if (/\bweekly\b/.test(t)) return true;
  if (/\ball\s+(the\s+)?(weekday|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/.test(t)) {
    return true;
  }
  if (
    /\b(mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays)\b/.test(t)
  ) {
    return true;
  }
  return false;
}

function firstOccurrenceOnOrAfter(startDateStr: string, weekday: number): string | null {
  const start = new Date(`${startDateStr}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  for (let i = 0; i < 370; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getDay() === weekday) return localDateStr(d);
  }
  return null;
}

/** One calendar entry per listed weekday: next time that weekday happens on or after start (not recurring). */
function nextOccurrencePerWeekday(startDateStr: string, weekdays: number[]): string[] {
  const dates: string[] = [];
  for (const w of weekdays) {
    const d = firstOccurrenceOnOrAfter(startDateStr, w);
    if (d) dates.push(d);
  }
  return [...new Set(dates)].sort();
}

/** From start date, collect up to maxCount calendar dates whose weekday is in weekdays */
function expandOccurrencesOnWeekdays(startDateStr: string, weekdays: number[], maxCount: number): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDateStr}T12:00:00`);
  if (Number.isNaN(start.getTime()) || weekdays.length === 0) return dates;

  for (let i = 0; i < 370 && dates.length < maxCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (weekdays.includes(d.getDay())) {
      dates.push(localDateStr(d));
    }
  }
  return dates;
}

/** All dates in the same calendar month as anchorDate that fall on one of weekdays */
function datesInMonthMatchingWeekdays(anchorDateStr: string, weekdays: number[]): string[] {
  const anchor = new Date(`${anchorDateStr}T12:00:00`);
  if (Number.isNaN(anchor.getTime()) || weekdays.length === 0) return [];
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const out: string[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(y, m, day, 12, 0, 0);
    if (weekdays.includes(d.getDay())) {
      out.push(localDateStr(d));
    }
  }
  return out;
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
    type: "task" as Reminder["type"],
    time: "",
    endTime: "",
    date: new Date().toISOString().split("T")[0], // Default to today
    repeatFrequency: "",
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPreferences, setAiPreferences] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReminders, setGeneratedReminders] = useState<Reminder[]>([]);
  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);
  const [showScheduleChat, setShowScheduleChat] = useState(false);
  const [scheduleChatMessages, setScheduleChatMessages] = useState<Array<{role: "user" | "assistant", content: string}>>([]);
  const [scheduleChatInput, setScheduleChatInput] = useState("");
  const [isScheduleChatLoading, setIsScheduleChatLoading] = useState(false);
  const [scheduleContext, setScheduleContext] = useState<any>(null);
  const [activeView, setActiveView] = useState<"calendar" | "routine">("calendar");
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [routineView, setRoutineView] = useState<"fullWeek" | "today">("fullWeek");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  /** Calendar flows use “reminder” copy; schedule (weekly grid) uses “task” copy */
  const [addFormKind, setAddFormKind] = useState<"reminder" | "task">("reminder");
  /** Whether the day-detail popup was opened from the month calendar vs the schedule week */
  const [dateModalSource, setDateModalSource] = useState<"calendar" | "schedule" | null>(null);
  const [deleteSeriesModal, setDeleteSeriesModal] = useState<{
    reminder: Reminder;
    series: Reminder[];
  } | null>(null);

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
    scheduleDailyTasksSummaryNotification();
    rescheduleTodayTaskReminders(reminders);
  }, [reminders, isLoaded]);

  const handleScheduleChatSend = async () => {
    if (!scheduleChatInput.trim() || isScheduleChatLoading) return;

    const userMessage = scheduleChatInput.trim();
    setScheduleChatInput("");
    
    // Add user message
    setScheduleChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsScheduleChatLoading(true);

    try {
      // Call AI consultation API with context
      const response = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: `You are helping the user set up their schedule. They have ${scheduleContext?.generatedReminders?.length || 0} schedule items that need to be added.

**IMPORTANT RULES:**
1. You MUST ask which specific days (Monday, Tuesday, Wednesday, etc.) if the user hasn't specified
2. If the user doesn't mention days, ask: "Which days should these be scheduled? Please specify (e.g., Monday, Tuesday, or Monday-Friday)"
3. If the user doesn't mention repeat frequency, ask: "Should these repeat forever, or for how long?"
4. Only proceed to add when you have clear information about: (a) which days, (b) repeat frequency
5. When you have all info, summarize and ask: "Should I add these to your schedule now?"

Previous conversation:
${scheduleChatMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

User just said: ${userMessage}

Check if they specified days. If not, ask specifically about days.`
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      const aiResponse = data.response || data.message || "I understand. Let me help you set up your schedule.";

      setScheduleChatMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);

      // Check if user is confirming or if we have enough info
      const lowerResponse = aiResponse.toLowerCase();
      const lowerUserMsg = userMessage.toLowerCase();
      
      // Check if user specified days
      const hasDays = lowerUserMsg.includes("monday") || lowerUserMsg.includes("tuesday") || 
                     lowerUserMsg.includes("wednesday") || lowerUserMsg.includes("thursday") ||
                     lowerUserMsg.includes("friday") || lowerUserMsg.includes("saturday") ||
                     lowerUserMsg.includes("sunday") || lowerUserMsg.includes("weekday") ||
                     lowerUserMsg.includes("weekend") || lowerUserMsg.includes("every day") ||
                     lowerUserMsg.includes("all days") || lowerUserMsg.includes("mon-fri");
      
      // If AI is asking for confirmation and user says yes, or if user provided days and confirmed
      if ((lowerResponse.includes("add") && lowerUserMsg.includes("yes")) ||
          (lowerResponse.includes("confirm") && lowerUserMsg.includes("yes")) ||
          (hasDays && (lowerUserMsg.includes("yes") || lowerUserMsg.includes("add") || lowerUserMsg.includes("proceed")))) {
        // Process and add reminders based on conversation
        processAndAddReminders(userMessage);
      } else if (!hasDays && !lowerUserMsg.includes("?") && !lowerUserMsg.includes("when")) {
        // If no days specified and user didn't ask a question, remind them we need days
        setScheduleChatMessages(prev => [...prev, {
          role: "assistant",
          content: "I need to know which days you want these scheduled. Please specify the days (e.g., Monday, Tuesday, Wednesday, or Monday-Friday, or Weekends, or All days)."
        }]);
      }
    } catch (error: any) {
      console.error("Schedule chat error:", error);
      setScheduleChatMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm sorry, I encountered an error. Could you please try again or provide your preferences directly?"
      }]);
    } finally {
      setIsScheduleChatLoading(false);
    }
  };

  const processAndAddReminders = (userPreferences: string) => {
    if (!scheduleContext?.generatedReminders) return;

    // Combine all conversation messages to find day specifications
    const allMessages = scheduleChatMessages.map(m => m.content).join(' ') + ' ' + userPreferences;
    const lowerPrefs = allMessages.toLowerCase();
    const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const selectedDays: string[] = [];
    
    // Determine which days
    if (lowerPrefs.includes("weekday") || lowerPrefs.includes("monday-friday") || lowerPrefs.includes("mon-fri")) {
      selectedDays.push(...["monday", "tuesday", "wednesday", "thursday", "friday"]);
    } else if (lowerPrefs.includes("weekend")) {
      selectedDays.push("saturday", "sunday");
    } else if (lowerPrefs.includes("every day") || lowerPrefs.includes("all days")) {
      selectedDays.push(...daysOfWeek);
    } else {
      daysOfWeek.forEach(day => {
        if (lowerPrefs.includes(day)) selectedDays.push(day);
      });
    }

    // Determine repeat frequency
    let repeatFreq = "";
    if (lowerPrefs.includes("forever") || lowerPrefs.includes("indefinitely") || lowerPrefs.includes("always")) {
      repeatFreq = "daily";
    } else if (lowerPrefs.includes("week")) {
      const weekMatch = lowerPrefs.match(/(\d+)\s*week/);
      if (weekMatch) {
        repeatFreq = `every ${weekMatch[1]} weeks`;
      } else {
        repeatFreq = "weekly";
      }
    } else if (lowerPrefs.includes("month")) {
      repeatFreq = "monthly";
    }

    // Process reminders with user preferences
    const processedReminders: Reminder[] = [];
    const today = new Date();
    
    scheduleContext.generatedReminders.forEach((reminder: Reminder) => {
      if (selectedDays.length === 0) {
        // If no specific days, use original date
        processedReminders.push({
          ...reminder,
          repeatFrequency: repeatFreq || reminder.repeatFrequency || "",
        });
      } else {
        // Create reminders for each selected day
        selectedDays.forEach(dayName => {
          const dayIndex = daysOfWeek.indexOf(dayName);
          if (dayIndex !== -1) {
            const reminderDate = new Date(today);
            const currentDay = today.getDay();
            const daysUntilDay = (dayIndex - currentDay + 7) % 7 || 7;
            reminderDate.setDate(today.getDate() + daysUntilDay);
            
            processedReminders.push({
              ...reminder,
              id: `${reminder.id}-${dayName}`,
              date: reminderDate.toISOString().split("T")[0],
              repeatFrequency: repeatFreq || reminder.repeatFrequency || "weekly",
            });
          }
        });
      }
    });

    // Add to reminders
    setReminders([...reminders, ...processedReminders]);
    setShowScheduleChat(false);
    setScheduleChatMessages([]);
    setScheduleChatInput("");
    setScheduleContext(null);
    setShowAIGenerator(false);
    setAiPreferences("");
    setGeneratedReminders([]);
    setShowGeneratedPreview(false);
    
    alert(`Successfully added ${processedReminders.length} items to your schedule!`);
  };

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
      const startDate = new Date(`${newReminder.date}T12:00:00`);
      const whenText = newReminder.repeatFrequency.trim();
      const repeatLabel = whenText || undefined;
      const endTimeField: string | undefined =
        addFormKind === "task" ? newReminder.endTime.trim() || undefined : undefined;

      if (addFormKind === "task") {
        const weekdaySet = whenText ? parseWeekdayPattern(whenText) : null;

        if (weekdaySet && weekdaySet.length > 0) {
          const thisMonthScope = /\bthis\s+month\b/i.test(whenText);
          const dayStrings = thisMonthScope
            ? datesInMonthMatchingWeekdays(newReminder.date, weekdaySet)
            : isRecurringWeekdayWhen(whenText)
              ? expandOccurrencesOnWeekdays(newReminder.date, weekdaySet, 52)
              : nextOccurrencePerWeekday(newReminder.date, weekdaySet);
          const baseId = Date.now();
          dayStrings.forEach((dateStr, i) => {
            remindersToAdd.push({
              id: `${baseId}-d${i}`,
              title: newReminder.title,
              type: "task",
              time: newReminder.time,
              ...(endTimeField ? { endTime: endTimeField } : {}),
              date: dateStr,
              completed: false,
              repeatFrequency: whenText,
            });
          });
        } else {
          const repeatInfo = parseRepeatFrequency(whenText);
          if (repeatInfo) {
            for (let i = 0; i < repeatInfo.count; i++) {
              const date = new Date(startDate);
              date.setDate(date.getDate() + i * repeatInfo.days);
              remindersToAdd.push({
                id: `${Date.now()}-${i}`,
                title: newReminder.title,
                type: "task",
                time: newReminder.time,
                ...(endTimeField ? { endTime: endTimeField } : {}),
                date: localDateStr(date),
                completed: false,
                repeatFrequency: whenText,
              });
            }
          } else {
            remindersToAdd.push({
              id: Date.now().toString(),
              title: newReminder.title,
              type: "task",
              time: newReminder.time,
              ...(endTimeField ? { endTime: endTimeField } : {}),
              date: newReminder.date,
              completed: false,
              repeatFrequency: repeatLabel,
            });
          }
        }
      } else {
        const repeatInfo = parseRepeatFrequency(whenText);

        if (repeatInfo) {
          for (let i = 0; i < repeatInfo.count; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i * repeatInfo.days);
            remindersToAdd.push({
              id: `${Date.now()}-${i}`,
              title: newReminder.title,
              type: newReminder.type,
              time: newReminder.time,
              ...(endTimeField ? { endTime: endTimeField } : {}),
              date: localDateStr(date),
              completed: false,
              repeatFrequency: whenText,
            });
          }
        } else {
          remindersToAdd.push({
            id: Date.now().toString(),
            title: newReminder.title,
            type: newReminder.type,
            time: newReminder.time,
            ...(endTimeField ? { endTime: endTimeField } : {}),
            date: newReminder.date,
            completed: false,
            repeatFrequency: repeatLabel,
          });
        }
      }

      setReminders([...reminders, ...remindersToAdd]);
      setNewReminder({ 
        title: "", 
        type: "task", 
        time: "", 
        endTime: "",
        date: new Date().toISOString().split("T")[0],
        repeatFrequency: "",
      });
      setShowAddForm(false);
      setShowDateModal(false);
      setClickedDate(null);
      setDateModalSource(null);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setClickedDate(date);
    setDateModalSource("calendar");
    setShowDateModal(true);
  };

  const openAddFormFromCalendar = (dateStr: string) => {
    setAddFormKind("reminder");
    setNewReminder({
      title: "",
      type: "task",
      time: "",
      endTime: "",
      date: dateStr,
      repeatFrequency: "",
    });
    setShowAddForm(true);
  };

  const openAddFormFromSchedule = (dateStr: string) => {
    setAddFormKind("task");
    setNewReminder({
      title: "",
      type: "task",
      time: "",
      endTime: "",
      date: dateStr,
      repeatFrequency: "",
    });
    setShowAddForm(true);
  };

  const toggleComplete = (id: string) => {
    setReminders(
      reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const performDeleteReminderIds = (ids: Iterable<string>) => {
    const idSet = new Set(ids);
    setReminders((prev) => prev.filter((r) => !idSet.has(r.id)));
  };

  const requestDeleteReminder = (reminder: Reminder) => {
    const series = remindersMatchingSeries(reminder, reminders);
    if (series.length <= 1) {
      if (confirm("Delete this entry?")) {
        performDeleteReminderIds([reminder.id]);
      }
      return;
    }
    setDeleteSeriesModal({ reminder, series });
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

  /** Parse time string to minutes since midnight for sorting */
  const parseTimeToMinutes = (time: string): number => {
    if (!time) return 0;
    const t = time.trim().toLowerCase();
    const pmMatch = t.match(/^(\d{1,2})(?::(\d{2}))?\s*pm$/);
    const amMatch = t.match(/^(\d{1,2})(?::(\d{2}))?\s*am$/);
    const colonMatch = t.match(/^(\d{1,2}):(\d{2})$/);
    if (pmMatch) {
      let h = parseInt(pmMatch[1], 10);
      if (h === 12) h = 0;
      const m = pmMatch[2] ? parseInt(pmMatch[2], 10) : 0;
      return (h + 12) * 60 + m;
    }
    if (amMatch) {
      let h = parseInt(amMatch[1], 10);
      if (h === 12) h = 0;
      const m = amMatch[2] ? parseInt(amMatch[2], 10) : 0;
      return h * 60 + m;
    }
    if (colonMatch) {
      const h = parseInt(colonMatch[1], 10);
      const m = parseInt(colonMatch[2], 10);
      return h * 60 + m;
    }
    return 0;
  };

  const getUpcomingReminders = () => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return reminders
      .filter((r) => !r.completed && r.date >= todayStr)
      .sort((a, b) => {
        const dateCmp = (a.date || "").localeCompare(b.date || "");
        if (dateCmp !== 0) return dateCmp;
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      })
      .filter((r) => {
        if (r.date > todayStr) return true;
        return parseTimeToMinutes(r.time) >= nowMinutes;
      });
  };

  const getNextReminder = () => getUpcomingReminders()[0] ?? null;

  const getSelectedDateReminders = () => {
    const selectedDateStr = selectedDate.toISOString().split("T")[0];
    return reminders.filter((r) => r.date === selectedDateStr);
  };

  const getRemindersForDate = (date: Date) => {
    const d = date.toISOString().split("T")[0];
    return reminders.filter((r) => r.date === d);
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

  // Generate hourly time slots from 04:00 to 23:00 (20 hours)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 4; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();
  
  // Get Monday to Sunday for the current week
  const getWeekDaysMonFri = () => {
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
  
  // Get reminders for a specific day
  const getDayReminders = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return reminders.filter((r) => r.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  };

  // Get reminders for a specific day and time (with tolerance)
  const getRemindersForSlot = (date: Date, time: string) => {
    const dateStr = date.toISOString().split("T")[0];
    const slotHour = parseInt(time.split(":")[0]);
    const slotMin = parseInt(time.split(":")[1]) || 0;
    const slotTotal = slotHour * 60 + slotMin;
    
    return reminders.filter((reminder) => {
      if (reminder.date !== dateStr) return false;
      const reminderHour = parseInt(reminder.time.split(":")[0]);
      const reminderMin = parseInt(reminder.time.split(":")[1]) || 0;
      const reminderTotal = reminderHour * 60 + reminderMin;
      // Match within 90 minutes (1.5 hours) tolerance
      return Math.abs(reminderTotal - slotTotal) <= 90;
    }).sort((a, b) => a.time.localeCompare(b.time));
  };

  const weekDays = getWeekDays();
  const weekDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-4 pb-28">
      <div className="container mx-auto px-4 py-4">
        {/* View Tabs */}
        <div className="flex gap-1 mb-5 bg-white/5 border border-white/8 rounded-2xl p-1">
          <button
            onClick={() => setActiveView("calendar")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
              activeView === "calendar" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveView("routine")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${
              activeView === "routine" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Schedule
          </button>
        </div>

        {/* Header */}
        <div className="mb-5 flex items-center justify-end gap-2">
          {activeView === "calendar" && (
            <button
              type="button"
              onClick={() => openAddFormFromCalendar(selectedDate.toISOString().split("T")[0])}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-1.5 bg-[#0c1422] border border-white/8 text-white hover:bg-white/10 min-h-[38px]"
            >
              + Add reminder
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAIGenerator(true)}
            className="px-4 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black rounded-xl text-xs font-bold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 flex items-center justify-center gap-1.5 min-h-[38px]"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            AI Schedule
          </button>
        </div>

        {/* Date Click Modal - Shows Tasks for Selected Date */}
        {showDateModal && clickedDate && (() => {
          const modalReminders = getRemindersForDate(clickedDate).sort((a, b) => a.time.localeCompare(b.time));
          const isCalendarModal = dateModalSource === "calendar";
          const emptyLabel = isCalendarModal ? "No reminders for this date" : "No tasks for this date";
          const addLabel = isCalendarModal ? "Add reminder" : "Add task";
          const addAnotherLabel = isCalendarModal ? "+ Add another reminder" : "+ Add another task";
          const dateStr = clickedDate.toISOString().split("T")[0];
          const closeModal = () => {
            setShowDateModal(false);
            setClickedDate(null);
            setDateModalSource(null);
            setSelectedDate(new Date());
          };
          return (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-[#0c1422] rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border border-white/8"
              onClick={(e) => e.stopPropagation()}
            >
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
                  type="button"
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              {modalReminders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg mb-4">{emptyLabel}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCalendarModal) openAddFormFromCalendar(dateStr);
                      else openAddFormFromSchedule(dateStr);
                      setShowDateModal(false);
                      setClickedDate(null);
                      setDateModalSource(null);
                    }}
                    className="bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30"
                  >
                    {addLabel}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {modalReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`bg-[#0c1422] rounded-xl p-4 border border-white/8 hover:border-teal-400/40 transition-all hover:shadow-lg hover:shadow-teal-500/10 flex items-center justify-between ${
                          reminder.completed ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-2xl">{getReminderIcon(reminder.type)}</div>
                          <div className="flex-1">
                            <h3
                              className={`font-bold ${
                                reminder.completed ? "line-through text-gray-500" : "text-white"
                              }`}
                            >
                              {reminder.title}
                            </h3>
                            <p className="text-gray-400 text-sm">{formatReminderTimeDisplay(reminder)}</p>
                            {reminder.repeatFrequency && (
                              <p className="text-teal-400/70 text-xs mt-1 font-medium">
                                Repeats: {reminder.repeatFrequency}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleComplete(reminder.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all transform hover:scale-105 shadow-lg ${
                              reminder.completed
                                ? "bg-[#0c1422] border border-white/8 text-gray-300"
                                : "bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-black shadow-green-500/30"
                            }`}
                          >
                            {reminder.completed ? "Undo" : "Done"}
                          </button>
                          <button
                            onClick={() => requestDeleteReminder(reminder)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all transform hover:scale-110 shadow-lg"
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {modalReminders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (isCalendarModal) openAddFormFromCalendar(dateStr);
                    else openAddFormFromSchedule(dateStr);
                    setShowDateModal(false);
                    setClickedDate(null);
                    setDateModalSource(null);
                  }}
                  className="w-full bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30"
                >
                  {addAnotherLabel}
                </button>
              )}
            </div>
          </div>
          );
        })()}

        {deleteSeriesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-[#0c1422] rounded-2xl p-6 max-w-md w-full border border-white/8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-2">Delete</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-1">
                <span className="text-white font-semibold">{deleteSeriesModal.reminder.title}</span> is on{" "}
                <span className="text-teal-300 font-semibold">{deleteSeriesModal.series.length}</span>{" "}
                {deleteSeriesModal.series.length === 1 ? "day" : "days"}. Choose what to remove.
              </p>
              <p className="text-gray-500 text-xs mb-5">
                Only{" "}
                {new Date(deleteSeriesModal.reminder.date + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                or every matching entry.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    performDeleteReminderIds([deleteSeriesModal.reminder.id]);
                    setDeleteSeriesModal(null);
                  }}
                  className="w-full py-3 rounded-lg font-bold bg-[#0c1422] border border-white/8 text-white hover:border-teal-400/40 transition-colors"
                >
                  Only this day
                </button>
                <button
                  type="button"
                  onClick={() => {
                    performDeleteReminderIds(deleteSeriesModal.series.map((r) => r.id));
                    setDeleteSeriesModal(null);
                  }}
                  className="w-full py-3 rounded-lg font-bold bg-red-500/15 border border-red-400/40 text-red-200 hover:bg-red-500/25 transition-colors"
                >
                  All {deleteSeriesModal.series.length} days
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteSeriesModal(null)}
                  className="w-full py-3 rounded-lg font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add reminder (calendar) / Add task (schedule) */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0c1422] rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">
                {addFormKind === "reminder" ? "Add reminder" : "Add task"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    placeholder={
                      addFormKind === "task"
                        ? "e.g., Gym, Study block, Team standup…"
                        : "e.g., Take Vitamin D, Call mom, Workout..."
                    }
                    className="w-full bg-white/5 text-white p-3 rounded-lg"
                  />
                </div>
                {addFormKind === "reminder" && (
                  <div>
                    <label className="block text-gray-300 mb-2">Type</label>
                    <select
                      value={newReminder.type}
                      onChange={(e) =>
                        setNewReminder({ ...newReminder, type: e.target.value as Reminder["type"] })
                      }
                      className="w-full bg-white/5 text-white p-3 rounded-lg"
                    >
                      <option value="supplement">💊 Supplement</option>
                      <option value="task">✅ Task</option>
                      <option value="habit">🔄 Habit</option>
                    </select>
                  </div>
                )}
                {addFormKind === "reminder" ? (
                  <div>
                    <label className="block text-gray-300 mb-2">Time</label>
                    <input
                      type="time"
                      value={newReminder.time}
                      onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                      className="w-full bg-white/5 text-white p-3 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-300 mb-2">Start time</label>
                      <input
                        type="time"
                        value={newReminder.time}
                        onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                        className="w-full bg-white/5 text-white p-3 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">End time (optional)</label>
                      <input
                        type="time"
                        value={newReminder.endTime}
                        onChange={(e) => setNewReminder({ ...newReminder, endTime: e.target.value })}
                        className="w-full bg-white/5 text-white p-3 rounded-lg"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-gray-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={newReminder.date}
                    onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                    className="w-full bg-white/5 text-white p-3 rounded-lg"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">
                    {addFormKind === "task" ? "When (optional)" : "Repeat frequency (optional)"}
                  </label>
                  <input
                    type="text"
                    value={newReminder.repeatFrequency}
                    onChange={(e) => setNewReminder({ ...newReminder, repeatFrequency: e.target.value })}
                    placeholder={
                      addFormKind === "task"
                        ? "e.g. every Monday, Tuesday this month, Wednesday and Thursday…"
                        : "e.g., daily, weekly, every 3 days, 2 weeks"
                    }
                    className="w-full bg-white/5 text-white p-3 rounded-lg"
                  />
                  {addFormKind === "task" ? (
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      <span className="text-gray-300">Date</span> sets the calendar month for “this month” and the anchor for other patterns.{" "}
                      <span className="text-gray-300">One-off:</span> e.g. <span className="text-gray-300">Wednesday and Thursday</span> (next occurrence of each on or after Date).{" "}
                      <span className="text-gray-300">This month:</span> e.g. <span className="text-gray-300">Tuesday this month</span> — every matching weekday in that month.{" "}
                      <span className="text-gray-300">Repeating:</span> <span className="text-gray-300">every Monday</span>, plurals, <span className="text-gray-300">weekly</span> — up to 52 future days.
                      <span className="text-gray-300"> Weekdays / weekends</span> without &quot;every&quot; = next Mon–Fri or Sat+Sun once.
                      Intervals like <span className="text-gray-300">daily</span> still work; leave empty for a single task on Date only.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">
                      Examples: &quot;daily&quot;, &quot;weekly&quot;, &quot;every 3 days&quot;, &quot;2 weeks&quot;, or leave empty for one-time.
                    </p>
                  )}
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleAddReminder}
                    className="flex-1 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30"
                  >
                    {addFormKind === "reminder" ? "Save reminder" : "Save task"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setShowDateModal(false);
                      setClickedDate(null);
                      setDateModalSource(null);
                      setNewReminder({ 
                        title: "", 
                        type: "task", 
                        time: "", 
                        endTime: "",
                        date: new Date().toISOString().split("T")[0],
                        repeatFrequency: "",
                      });
                    }}
                    className="flex-1 bg-[#0c1422] border border-white/8 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Routine View - Day Selection and Schedule */}
        {activeView === "routine" && (
          <div className="mb-4">
            {/* Week Navigation Bar */}
            <div className="bg-[#0c1422] rounded-2xl p-3 border border-white/8 shadow-lg shadow-teal-500/10 relative overflow-hidden group mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigateWeek("prev")}
                    className="bg-[#0c1422] border border-white/8 text-white px-4 py-2 rounded-lg text-base hover:bg-white/10 transition-all transform hover:scale-105 shadow-lg font-bold"
                  >
                    ←
                  </button>
                  <span className="text-white font-bold min-w-[220px] text-center text-base bg-gradient-to-r from-teal-400/20 to-cyan-400/20 px-4 py-2 rounded-lg">
                    {getWeekDaysMonFri()[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {getWeekDaysMonFri()[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => navigateWeek("next")}
                    className="bg-[#0c1422] border border-white/8 text-white px-4 py-2 rounded-lg text-base hover:bg-white/10 transition-all transform hover:scale-105 shadow-lg font-bold"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            {/* Day Selection - Monday to Sunday */}
            {!selectedDay && (
              <div className="space-y-3 mb-4">
                {getWeekDaysMonFri().map((day, index) => {
                  const dayName = weekDayNames[index];
                  const isToday = day.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
                  const dayReminders = getDayReminders(day);
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDay(day)}
                      className={`w-full bg-[#0c1422] rounded-xl p-4 border-2 transition-all transform hover:scale-[1.02] text-left shadow-lg ${
                        isToday
                          ? "border-teal-400 shadow-teal-500/30"
                          : "border-white/8 hover:border-teal-400/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-lg font-bold mb-1 ${isToday ? "text-teal-400" : "text-white"}`}>
                            {dayName}
                          </div>
                          <div className="text-sm text-gray-400">
                            {day.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                          </div>
                          {dayReminders.length > 0 && (
                            <div className="text-xs text-teal-400 mt-2 font-semibold">
                              {dayReminders.length} task{dayReminders.length !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                        <div className="text-2xl">→</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Day Schedule View - Times going down */}
            {selectedDay && (
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setSelectedDay(null)}
                    className="flex-1 bg-[#0c1422] border border-white/8 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all transform hover:scale-105 shadow-lg font-bold flex items-center justify-center gap-2"
                >
                  ← Back to Days
                </button>
                  <button
                    type="button"
                    onClick={() => openAddFormFromSchedule(selectedDay.toISOString().split("T")[0])}
                    className="flex-1 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 font-bold flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add task
                  </button>
                </div>
                
                <div className="bg-[#0c1422] rounded-2xl p-4 border border-white/8 shadow-lg shadow-teal-500/10 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <h2 className="text-xl font-bold text-white mb-4">
                      {weekDayNames[selectedDay.getDay() === 0 ? 6 : selectedDay.getDay() - 1]} {selectedDay.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    </h2>
                    
                    <div className="relative border-l border-white/20 pl-2">
                      {/* Times on the left, horizontal lines across, reminders on the right */}
                      {timeSlots.map((time, idx) => {
                        const reminderHour = parseInt(time.split(":")[0]);
                        const reminderMin = 0;
                        const matchingReminders = getDayReminders(selectedDay).filter((reminder) => {
                          const rHour = parseInt(reminder.time.split(":")[0]);
                          const rMin = parseInt(reminder.time.split(":")[1]) || 0;
                          return rHour === reminderHour && Math.abs(rMin - reminderMin) <= 30;
                        });
                        
                        // Color mapping
                        let reminderElement = null;
                        if (matchingReminders.length > 0) {
                          const reminder = matchingReminders[0];
                          let colorClass = "bg-orange-600/50 border-orange-500/70 text-orange-100";
                          const titleLower = reminder.title.toLowerCase();
                          
                          if (titleLower.includes("study") && titleLower.includes("session")) {
                            colorClass = "bg-blue-600/50 border-blue-500/70 text-blue-100";
                          } else if ((titleLower.includes("gym") && titleLower.includes("session")) || titleLower.includes("workout")) {
                            colorClass = "bg-green-600/50 border-green-500/70 text-green-100";
                          } else if (titleLower.includes("meditation") || titleLower.includes("meditate")) {
                            colorClass = "bg-orange-700/60 border-orange-600/70 text-orange-100";
                          } else if (titleLower.includes("study") || titleLower.includes("learn")) {
                            colorClass = "bg-blue-600/50 border-blue-500/70 text-blue-100";
                          } else if (titleLower.includes("gym") || titleLower.includes("exercise")) {
                            colorClass = "bg-green-600/50 border-green-500/70 text-green-100";
                          } else if (reminder.type === "supplement") {
                            colorClass = "bg-blue-600/50 border-blue-500/70 text-blue-100";
                          } else if (reminder.type === "task") {
                            colorClass = "bg-green-600/50 border-green-500/70 text-green-100";
                          } else if (reminder.type === "habit") {
                            colorClass = "bg-orange-600/50 border-orange-500/70 text-orange-100";
                          }
                          
                          reminderElement = (
                            <div
                              key={reminder.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedDate(selectedDay);
                                setClickedDate(selectedDay);
                                setDateModalSource("schedule");
                                setShowDateModal(true);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedDate(selectedDay);
                                  setClickedDate(selectedDay);
                                  setDateModalSource("schedule");
                                  setShowDateModal(true);
                                }
                              }}
                              className={`p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] border ${colorClass} ${
                                reminder.completed ? "opacity-50 line-through" : ""
                              }`}
                            >
                              <div className="font-bold text-sm">{reminder.title}</div>
                              <div className="text-xs mt-1 opacity-90">{formatReminderTimeDisplay(reminder)}</div>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={idx} className="relative flex items-start min-h-[60px]">
                            {/* Time on the left */}
                            <div className="w-20 text-gray-300 text-sm font-semibold pt-3 flex-shrink-0">
                              {time}
                            </div>
                            {/* Horizontal line extending across */}
                            <div className="absolute left-20 right-0 top-6 border-t border-white/8"></div>
                            {/* Reminder or empty space on the right */}
                            <div className="flex-1 pl-6 pt-2">
                              {reminderElement || (
                                <div className="h-10"></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {activeView === "calendar" && (
          <>
        {/* Upcoming Reminders */}
        <div className="bg-[#0c1422] rounded-2xl p-4 border border-white/8 shadow-lg shadow-teal-500/10 relative overflow-hidden group mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">
                Upcoming Reminders
              </h2>
              <Link
                href="/calendar/all-reminders"
                className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors whitespace-nowrap"
              >
                View All Reminders
              </Link>
            </div>
            {(() => {
              const next = getNextReminder();
              if (!next) {
                return <p className="text-gray-400">No upcoming reminders</p>;
              }
              const isToday = next.date === new Date().toISOString().split("T")[0];
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const tomorrowStr = tomorrow.toISOString().split("T")[0];
              const dateLabel = isToday ? "Today" : next.date === tomorrowStr ? "Tomorrow" : new Date(next.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              return (
                <div className="bg-[#0c1422] rounded-xl p-4 border border-white/8 hover:border-teal-400/40 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getReminderIcon(next.type)}</div>
                    <div>
                      <h3 className="font-bold text-white">{next.title}</h3>
                      <p className="text-gray-400 text-sm">
                        {dateLabel} at {formatReminderTimeDisplay(next)}
                      </p>
                      {next.repeatFrequency && (
                        <p className="text-teal-400/70 text-xs mt-1 font-medium">
                          Repeats: {next.repeatFrequency}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>


        {/* Calendar */}
        <div className="bg-[#0c1422] rounded-2xl p-4 border border-white/8 shadow-lg shadow-teal-500/10 relative overflow-hidden group mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateMonth("prev")}
                  className="bg-[#0c1422] border border-white/8 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-all transform hover:scale-105 shadow-lg"
                >
                  ←
                </button>
                <span className="text-white font-bold min-w-[150px] text-center bg-gradient-to-r from-teal-400/20 to-cyan-400/20 px-3 py-1.5 rounded-lg">
                  {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() => navigateMonth("next")}
                  className="bg-[#0c1422] border border-white/8 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-all transform hover:scale-105 shadow-lg"
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
                  className={`aspect-square rounded-lg text-xs font-bold transition-all transform hover:scale-110 shadow-lg ${
                    isSelected
                      ? "bg-gradient-to-r from-teal-400 to-cyan-500 text-black shadow-teal-500/50 border-2 border-teal-400"
                      : isCurrentDay
                      ? "bg-gradient-to-br from-[rgba(20,241,217,0.15)] to-[rgba(20,241,217,0.05)] text-white border-2 border-teal-400/50 shadow-teal-500/20"
                      : "bg-[#0c1422] text-white hover:bg-white/10 border border-white/8 hover:border-teal-400/40"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{date.getDate()}</span>
                    {hasReminder && (
                      <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 mt-1 shadow-lg shadow-teal-500/50" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          </div>
        </div>

        {/* Selected Date Reminders - Shows below calendar when date is clicked */}
        {activeView === "calendar" && !isSameDay(selectedDate, new Date()) && (
          <div className="bg-[#0c1422] rounded-2xl p-4 border border-white/8 shadow-lg shadow-teal-500/10 relative overflow-hidden group mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <h2 className="text-lg font-bold text-white mb-3">
                {selectedDate.toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </h2>
            {getSelectedDateReminders().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg mb-4">No reminders for this date</p>
                <button
                  type="button"
                  onClick={() => openAddFormFromCalendar(selectedDate.toISOString().split("T")[0])}
                  className="bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 text-black px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30"
                >
                  Add reminder
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {getSelectedDateReminders()
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`bg-[#0c1422] rounded-xl p-4 border border-white/8 hover:border-teal-400/40 transition-all hover:shadow-lg hover:shadow-teal-500/10 flex items-center justify-between ${
                        reminder.completed ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{getReminderIcon(reminder.type)}</div>
                        <div>
                          <h3
                            className={`font-bold ${
                              reminder.completed ? "line-through text-gray-500" : "text-white"
                            }`}
                          >
                            {reminder.title}
                          </h3>
                          <p className="text-gray-400 text-sm">{formatReminderTimeDisplay(reminder)}</p>
                          {reminder.repeatFrequency && (
                            <p className="text-teal-400/70 text-xs mt-1 font-medium">
                              Repeats: {reminder.repeatFrequency}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleComplete(reminder.id)}
                          className={`px-4 py-2 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg ${
                            reminder.completed
                              ? "bg-[#0c1422] border border-white/8 text-gray-300"
                              : "bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-black shadow-green-500/30"
                          }`}
                        >
                          {reminder.completed ? "Undo" : "Complete"}
                        </button>
                        <button
                          onClick={() => requestDeleteReminder(reminder)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all transform hover:scale-110 shadow-lg"
                          title="Delete task"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                <button
                  type="button"
                  onClick={() => openAddFormFromCalendar(selectedDate.toISOString().split("T")[0])}
                  className="w-full mt-2 py-2.5 rounded-lg text-xs font-bold border border-teal-500/40 text-teal-200 hover:bg-teal-500/10 transition-colors"
                >
                  + Add another reminder
                </button>
              </div>
            )}
            </div>
          </div>
        )}
          </>
        )}

        {/* AI Schedule Generator Modal */}
        {showAIGenerator && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0c1422] rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/8">
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
                      className="w-full bg-white/5 text-white p-3 rounded-lg min-h-[120px] resize-none"
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
                          ...(r.endTime?.trim() ? { endTime: r.endTime.trim() } : {}),
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
                    className="w-full bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 disabled:bg-[rgba(20,30,35,1)] disabled:cursor-not-allowed text-black px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30 disabled:transform-none disabled:shadow-none"
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
                      Review the schedule below and click "Add to Schedule" to customize it
                    </p>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {generatedReminders.slice(0, 20).map((reminder, index) => (
                      <div
                        key={reminder.id}
                        className="bg-white/5 rounded-lg p-3 flex items-center gap-3"
                      >
                        <div className="text-xl">{getReminderIcon(reminder.type)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-sm truncate">{reminder.title}</h3>
                          <p className="text-gray-400 text-xs">
                            {new Date(reminder.date).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric" 
                            })} at {formatReminderTimeDisplay(reminder)}
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
                        // Store the generated reminders in context and start chat
                        setScheduleContext({ generatedReminders, aiPreferences });
                        setScheduleChatMessages([
                          {
                            role: "assistant",
                            content: `I've generated ${generatedReminders.length} schedule items based on what you mentioned. Before I add them to your schedule, I need to know:\n\n1. Which days should these be scheduled? Please specify the days (e.g., Monday, Tuesday, Wednesday, or Monday-Friday, or Weekends, or All days)\n2. Should these repeat forever, or for a specific period?\n3. Are there any specific times you prefer?\n\nPlease tell me which days you want these scheduled on.`
                          }
                        ]);
                        setShowGeneratedPreview(false);
                        setShowScheduleChat(true);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-black px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg shadow-green-500/30"
                    >
                      Add to Schedule
                    </button>
                    <button
                      onClick={() => {
                        setShowGeneratedPreview(false);
                        setGeneratedReminders([]);
                      }}
                      className="flex-1 bg-[#0c1422] border border-white/8 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Chat Modal */}
        {showScheduleChat && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0c1422] rounded-2xl p-6 max-w-md w-full max-h-[90vh] flex flex-col border border-white/8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                  Schedule Setup
                </h2>
                <button
                  onClick={() => {
                    setShowScheduleChat(false);
                    setScheduleChatMessages([]);
                    setScheduleChatInput("");
                    setScheduleContext(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[300px] max-h-[400px]">
                {scheduleChatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-teal-400 text-black"
                          : "bg-white/5 text-white"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isScheduleChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-sm text-gray-400">AI is thinking...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scheduleChatInput}
                  onChange={(e) => setScheduleChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && scheduleChatInput.trim()) {
                      handleScheduleChatSend();
                    }
                  }}
                  placeholder="Type your response..."
                  className="flex-1 bg-white/5 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  disabled={isScheduleChatLoading}
                />
                <button
                  onClick={handleScheduleChatSend}
                  disabled={!scheduleChatInput.trim() || isScheduleChatLoading}
                  className="bg-teal-400 hover:bg-teal-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-black px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  Send
                </button>
              </div>
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

