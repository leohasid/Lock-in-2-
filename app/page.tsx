"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Sparkles } from "lucide-react";

interface UpcomingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
}

export default function Home() {
  const pathname = usePathname();
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [macroGoals, setMacroGoals] = useState({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  const loadData = () => {
    if (typeof window === "undefined") return;

    const storedMeals = localStorage.getItem("meals");
    if (storedMeals) {
      try {
        const allMeals = JSON.parse(storedMeals);
        const todayMeals = allMeals.filter((m: { date?: string }) => m.date === todayStr);
        const totals = todayMeals.reduce(
          (acc: { calories: number; protein: number; carbs: number; fats: number }, m: any) => ({
            calories: acc.calories + (m.calories || 0),
            protein: acc.protein + (m.protein || 0),
            carbs: acc.carbs + (m.carbs || 0),
            fats: acc.fats + (m.fats || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );
        setMacros(totals);
      } catch (_) {}
    }
    const goals = JSON.parse(localStorage.getItem("macroGoals") || "{}");
    setMacroGoals({
      calories: goals.calories || 2000,
      protein: goals.protein || 150,
      carbs: goals.carbs || 250,
      fats: goals.fats || 65,
    });

    // Upcoming
    const reminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    const todayAndTomorrow = reminders.filter(
      (r: { date: string }) => r.date === todayStr || r.date === tomorrowStr
    );
    const sorted = todayAndTomorrow.sort((a: UpcomingItem, b: UpcomingItem) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return (a.time || "").localeCompare(b.time || "");
    });
    setUpcoming(sorted.slice(0, 4));
  };

  useEffect(() => {
    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const macroPcts = {
    calories: macroGoals.calories > 0 ? Math.min((macros.calories / macroGoals.calories) * 100, 100) : 0,
    protein: macroGoals.protein > 0 ? Math.min((macros.protein / macroGoals.protein) * 100, 100) : 0,
    carbs: macroGoals.carbs > 0 ? Math.min((macros.carbs / macroGoals.carbs) * 100, 100) : 0,
    fats: macroGoals.fats > 0 ? Math.min((macros.fats / macroGoals.fats) * 100, 100) : 0,
  };

  const formatEventDate = (date: string, time: string) => {
    const d = new Date(date + (time ? "T" + time : ""));
    if (date === todayStr) return `Today at ${time || "All day"}`;
    if (date === tomorrowStr) return `Tomorrow at ${time || "All day"}`;
    return new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + (time ? ` at ${time}` : "");
  };

  const getHoursUntil = (date: string, time: string) => {
    if (date !== todayStr || !time) return null;
    const [h, m] = time.split(":").map(Number);
    const event = new Date();
    event.setHours(h || 0, m || 0, 0, 0);
    const diff = event.getTime() - Date.now();
    if (diff < 0) return null;
    return Math.round(diff / (1000 * 60 * 60));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto pb-24 px-5">
        {/* Tab Bar */}
        <div className="flex gap-2 mb-6 pt-4 border-b border-[#2A2A2A]">
          <Link
            href="/"
            className={`flex-1 py-2 font-semibold text-center text-sm ${
              pathname === "/" ? "text-[#00D9D9] border-b-2 border-[#00D9D9]" : "text-gray-500 hover:text-[#00D9D9]"
            }`}
          >
            Home
          </Link>
          <Link
            href="/goals"
            className={`flex-1 py-2 font-semibold text-center text-sm ${
              pathname === "/goals" ? "text-[#00D9D9] border-b-2 border-[#00D9D9]" : "text-gray-500 hover:text-[#00D9D9]"
            }`}
          >
            Goals
          </Link>
        </div>

        {/* AI Reflection */}
        <Link
          href="/consultation?from=reflection"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#00D9D9]/10 border border-[#00D9D9]/30 text-[#00D9D9] font-medium hover:bg-[#00D9D9]/20 transition-colors mb-6"
        >
          <Sparkles className="w-5 h-5" />
          AI Reflection
        </Link>

        {/* Macros - compact grid */}
        <p className="text-[11px] font-semibold text-[#666666] tracking-wider mb-2">TODAY&apos;S MACROS</p>
        <Link
          href="/nutrition"
          className="block mb-6"
        >
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "calories", label: "Cal", value: macros.calories, goal: macroGoals.calories, pct: macroPcts.calories },
              { key: "protein", label: "P", value: macros.protein, goal: macroGoals.protein, pct: macroPcts.protein, unit: "g" },
              { key: "carbs", label: "C", value: macros.carbs, goal: macroGoals.carbs, pct: macroPcts.carbs, unit: "g" },
              { key: "fats", label: "F", value: macros.fats, goal: macroGoals.fats, pct: macroPcts.fats, unit: "g" },
            ].map(({ key, label, value, goal, pct, unit = "" }) => (
              <div
                key={key}
                className="rounded-lg bg-[#0F1419] border border-[#1F2937] p-2.5 hover:border-[#00D9D9]/30 transition-colors"
              >
                <p className="text-[#666666] text-[9px] uppercase tracking-wide">{label}</p>
                <p className="text-[#00D9D9] font-bold text-sm">{value}{unit}</p>
                <p className="text-[#555555] text-[9px]">/ {goal}{unit}</p>
                <div className="mt-1 h-1 rounded-full bg-[#1A1A1A] overflow-hidden">
                  <div
                    className="h-1 rounded-full bg-[#00D9D9] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Link>

        {/* Upcoming */}
        <p className="text-[11px] font-semibold text-[#666666] tracking-wider mb-3">UPCOMING</p>
        <div className="space-y-2">
          {upcoming.slice(0, 3).map((item) => {
            const hoursUntil = getHoursUntil(item.date, item.time);
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl bg-[#0F1419] border border-[#1F2937] px-4 py-3"
              >
                <div
                  className={`w-1 h-9 rounded flex-shrink-0 ${
                    item.date === todayStr ? "bg-[#00D9D9]" : "bg-[#555555]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-[15px]">{item.title}</p>
                  <p className="text-[#666666] text-[13px]">{formatEventDate(item.date, item.time)}</p>
                </div>
                {hoursUntil !== null && (
                  <span className="text-[#00D9D9] text-xs">{hoursUntil}h</span>
                )}
              </div>
            );
          })}
        </div>
        {upcoming.length === 0 && (
          <p className="text-[#555555] text-sm py-4 text-center">No upcoming events</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
