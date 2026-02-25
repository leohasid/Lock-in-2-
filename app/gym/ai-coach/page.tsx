"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Send, Bot, User, ArrowLeft, Dumbbell } from "lucide-react";
import { persistWorkoutSchedule } from "@/lib/schedule-utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function GymAICoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendToAPI = async (
    userMessage: string
  ): Promise<{ reply: string; scheduleUpdate?: Record<string, { days: number[] }> | null }> => {
    const workoutOptions = JSON.parse(localStorage.getItem("workoutOptions") || "[]");
    const selectedOptions = JSON.parse(localStorage.getItem("selectedWorkoutOptions") || "[]");
    const manualScheduleByPlan = JSON.parse(localStorage.getItem("manualScheduleByPlan") || "{}");
    const planNames = workoutOptions
      .filter((o: { id: string }) => selectedOptions.includes(o.id))
      .map((o: { name: string }) => o.name);

    const res = await fetch("/api/gym-coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, { role: "user", content: userMessage }],
        context: { selectedOptions, manualScheduleByPlan, planNames },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      reply: data.reply || "I'm here to help with your workouts. What would you like to change or ask about?",
      scheduleUpdate: data.scheduleUpdate ?? null,
    };
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const loadingMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "..." };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      const { reply, scheduleUpdate } = await sendToAPI(text);
      setMessages((prev) =>
        prev.map((m) => (m.id === loadingMsg.id ? { ...m, content: reply } : m))
      );
      if (scheduleUpdate) {
        const workoutOptions = JSON.parse(localStorage.getItem("workoutOptions") || "[]");
        const selectedOptions = JSON.parse(localStorage.getItem("selectedWorkoutOptions") || "[]");
        persistWorkoutSchedule(scheduleUpdate, selectedOptions, workoutOptions);
      }
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: `Sorry, something went wrong: ${e.message || "Please try again."}` }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white min-h-[100dvh]">
      <div className="max-w-md mx-auto px-4 py-3 pb-24">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/gym/workout"
            className="flex items-center gap-1.5 text-[#888888] hover:text-teal-400 transition-colors -ml-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-teal-400" />
            <h1 className="text-lg font-bold text-white">AI Fitness Coach</h1>
          </div>
          <div className="w-12" />
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Ask about your workout plan, training days, or exercises. I can help you modify plans and when you train.
        </p>

        <div
          className="rounded-2xl bg-[#0F1419] border border-[#1F2937] flex flex-col overflow-hidden"
          style={{ height: "calc(100vh - 220px)", minHeight: 320 }}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">
                <p>e.g. &quot;Change my Push day to Monday and Wednesday&quot;</p>
                <p className="mt-2">&quot;Suggest a substitute for bench press&quot;</p>
                <p className="mt-2">&quot;I want to train 4 days a week&quot;</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="bg-teal-500/10 border border-teal-400/30 text-teal-400 rounded-full p-2 w-9 h-9 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-teal-500 text-black"
                      : "bg-[#1A1A1A] border border-[#1F2937] text-white"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                </div>
                {msg.role === "user" && (
                  <div className="bg-[#1A1A1A] border border-[#1F2937] text-teal-400 rounded-full p-2 w-9 h-9 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#1F2937] p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask about workouts, plans, or training days..."
                className="flex-1 bg-[#1A1A1A] text-white px-4 py-3 rounded-xl border border-[#1F2937] placeholder:text-[#555555] focus:outline-none focus:border-teal-500/50 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={loading}
                className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-black px-5 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
