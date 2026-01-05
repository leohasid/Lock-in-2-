"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

interface ReflectionData {
  date: string;
  howWasDay: string;
  grateful: string;
  focusTomorrow: string;
  timeManagement: number;
  discipline: number;
  energy: number;
  clarity: number;
  aiFeedback?: string;
}

export default function ReflectionsPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reflection, setReflection] = useState<ReflectionData>({
    date: selectedDate.toISOString().split("T")[0],
    howWasDay: "",
    grateful: "",
    focusTomorrow: "",
    timeManagement: 0,
    discipline: 0,
    energy: 0,
    clarity: 0,
  });
  const [loading, setLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);

  // Load reflection for selected date
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const stored = localStorage.getItem(`reflection_${dateStr}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setReflection({ ...data, date: dateStr });
        if (data.aiFeedback) {
          setAiFeedback(data.aiFeedback);
          setShowFeedback(true);
        }
      } catch (e) {
        // Reset to empty
        setReflection({
          date: dateStr,
          howWasDay: "",
          grateful: "",
          focusTomorrow: "",
          timeManagement: 0,
          discipline: 0,
          energy: 0,
          clarity: 0,
        });
      }
    } else {
      setReflection({
        date: dateStr,
        howWasDay: "",
        grateful: "",
        focusTomorrow: "",
        timeManagement: 0,
        discipline: 0,
        energy: 0,
        clarity: 0,
      });
      setAiFeedback("");
      setShowFeedback(false);
    }
  }, [selectedDate]);

  const handleSave = () => {
    if (typeof window === "undefined") return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const dataToSave = { ...reflection, date: dateStr };
    localStorage.setItem(`reflection_${dateStr}`, JSON.stringify(dataToSave));
    alert("Reflection saved!");
  };

  const handleGetFeedback = async () => {
    setLoading(true);
    try {
      // Get all previous reflections for context
      const allReflections: ReflectionData[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const stored = localStorage.getItem(`reflection_${dateStr}`);
        if (stored) {
          try {
            allReflections.push(JSON.parse(stored));
          } catch (e) {
            // Skip invalid entries
          }
        }
      }

      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentReflection: reflection,
          previousReflections: allReflections.slice(0, 7), // Last 7 days
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI feedback");
      }

      const data = await response.json();
      setAiFeedback(data.feedback);
      setShowFeedback(true);

      // Save feedback with reflection
      const dateStr = selectedDate.toISOString().split("T")[0];
      const dataToSave = { ...reflection, date: dateStr, aiFeedback: data.feedback };
      localStorage.setItem(`reflection_${dateStr}`, JSON.stringify(dataToSave));

      // Check if AI suggests new goals/habits
      if (data.suggestedGoals && data.suggestedGoals.length > 0) {
        // Store suggested goals
        const existingGoals = JSON.parse(localStorage.getItem("goals") || "[]");
        data.suggestedGoals.forEach((goal: any) => {
          if (!existingGoals.find((g: any) => g.id === goal.id)) {
            existingGoals.push(goal);
          }
        });
        localStorage.setItem("goals", JSON.stringify(existingGoals));
      }

      if (data.suggestedHabits && data.suggestedHabits.length > 0) {
        // Store suggested habits
        const existingHabits = JSON.parse(localStorage.getItem("allHabits") || "[]");
        data.suggestedHabits.forEach((habit: any) => {
          if (!existingHabits.find((h: any) => h.id === habit.id)) {
            existingHabits.push(habit);
          }
        });
        localStorage.setItem("allHabits", JSON.stringify(existingHabits));
      }
    } catch (error) {
      console.error("Error getting feedback:", error);
      alert("Failed to get AI feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (metric: "timeManagement" | "discipline" | "energy" | "clarity", value: number) => {
    setReflection(prev => ({ ...prev, [metric]: value }));
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button
            onClick={() => changeDate(1)}
            disabled={isToday}
            className={`p-2 rounded-lg transition-colors ${isToday ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-800"}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6 flex-1">
        {/* How was your day */}
        <div>
          <label className="block text-sm font-semibold mb-2">How was your day?</label>
          <textarea
            value={reflection.howWasDay}
            onChange={(e) => setReflection(prev => ({ ...prev, howWasDay: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-700"
            rows={3}
            placeholder="Describe how your day went..."
          />
        </div>

        {/* What are you grateful for */}
        <div>
          <label className="block text-sm font-semibold mb-2">What are you grateful for?</label>
          <textarea
            value={reflection.grateful}
            onChange={(e) => setReflection(prev => ({ ...prev, grateful: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-700"
            rows={3}
            placeholder="What are you grateful for today?"
          />
        </div>

        {/* What will you focus on tomorrow */}
        <div>
          <label className="block text-sm font-semibold mb-2">What will you focus on tomorrow?</label>
          <textarea
            value={reflection.focusTomorrow}
            onChange={(e) => setReflection(prev => ({ ...prev, focusTomorrow: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm focus:outline-none focus:border-gray-700"
            rows={3}
            placeholder="What will you focus on tomorrow?"
          />
        </div>

        {/* Rating Scales */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold mb-3">Rate your day (1-3 scale)</label>
          
          {(["timeManagement", "discipline", "energy", "clarity"] as const).map((metric) => {
            const labels: Record<string, string> = {
              timeManagement: "Time Management",
              discipline: "Discipline",
              energy: "Energy",
              clarity: "Clarity",
            };
            const value = reflection[metric];
            return (
              <div key={metric}>
                <label className="block text-xs text-gray-400 mb-2">{labels[metric]}</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleRatingChange(metric, num)}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                        value === num
                          ? num === 1
                            ? "bg-green-500 text-white"
                            : num === 2
                            ? "bg-orange-500 text-white"
                            : "bg-red-500 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Feedback */}
        {showFeedback && aiFeedback && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">AI Feedback</h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{aiFeedback}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-gray-800 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleGetFeedback}
            disabled={loading || !reflection.howWasDay}
            className="flex-1 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Get AI Feedback"}
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="pb-20 mt-6">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}

