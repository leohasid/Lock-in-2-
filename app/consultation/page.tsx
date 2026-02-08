"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Send, Bot, User, ArrowLeft, Sparkles, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ReflectionForm {
  howWasDay: string;
  grateful: string;
  focusTomorrow: string;
  timeManagement: number;
  discipline: number;
  energy: number;
  clarity: number;
}

export default function ConsultationPage() {
  const router = useRouter();
  const todayStr = new Date().toISOString().split("T")[0];
  const [step, setStep] = useState<"form" | "feedback" | "chat">("form");
  const [reflection, setReflection] = useState<ReflectionForm>({
    howWasDay: "",
    grateful: "",
    focusTomorrow: "",
    timeManagement: 0,
    discipline: 0,
    energy: 0,
    clarity: 0,
  });
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load saved reflection if any
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(`reflection_${todayStr}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setReflection(prev => ({
          howWasDay: data.howWasDay || prev.howWasDay,
          grateful: data.grateful || prev.grateful,
          focusTomorrow: data.focusTomorrow || prev.focusTomorrow,
          timeManagement: data.timeManagement ?? prev.timeManagement,
          discipline: data.discipline ?? prev.discipline,
          energy: data.energy ?? prev.energy,
          clarity: data.clarity ?? prev.clarity,
        }));
        if (data.aiFeedback) {
          setAiFeedback(data.aiFeedback);
          setStep("feedback");
        }
      } catch (_) {}
    }
  }, [todayStr]);

  // Gather all user data for today (workouts, nutrition, tasks, addictions, etc.)
  const getAllUserDayData = () => {
    if (typeof window === "undefined") return "";
    const todayStr = new Date().toISOString().split("T")[0];
    const parts: string[] = [];

    // Nutrition
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    const todayMeals = meals.filter((m: any) => m.date === todayStr);
    if (todayMeals.length > 0) {
      const totalCal = todayMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
      const totalP = todayMeals.reduce((s: number, m: any) => s + (m.protein || 0), 0);
      const totalC = todayMeals.reduce((s: number, m: any) => s + (m.carbs || 0), 0);
      const totalF = todayMeals.reduce((s: number, m: any) => s + (m.fats || 0), 0);
      parts.push(`**Nutrition today:** ${todayMeals.length} meal(s) logged – ${totalCal} cal, ${totalP}g protein, ${totalC}g carbs, ${totalF}g fats. Meals: ${todayMeals.map((m: any) => m.name).join(", ") || "—"}`);
    } else {
      parts.push("**Nutrition today:** No meals logged.");
    }

    // Workout
    const workoutCompleted = localStorage.getItem(`workout_${todayStr}`) === "completed";
    const workoutData = localStorage.getItem(`workout_data_${todayStr}`);
    let workoutDetail = "No workout logged.";
    if (workoutCompleted) {
      workoutDetail = "Workout completed.";
      if (workoutData) {
        try {
          const data = JSON.parse(workoutData);
          const completedSets = data.reduce((s: number, ex: any) => s + (ex.sets?.filter((x: any) => x.completed).length || 0), 0);
          const totalSets = data.reduce((s: number, ex: any) => s + (ex.sets?.length || 0), 0);
          workoutDetail += ` ${completedSets}/${totalSets} sets logged. Exercises: ${data.map((ex: any) => ex.name).join(", ") || "—"}`;
        } catch (_) {}
      }
    }
    parts.push(`**Workout today:** ${workoutDetail}`);

    // Tasks and reminders
    const reminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    const todayTasks = reminders.filter((r: any) => r.type === "task" && r.date === todayStr);
    const todayReminders = reminders.filter((r: any) => r.date === todayStr && r.type !== "task");
    const tasksDone = todayTasks.filter((t: any) => t.completed).length;
    parts.push(`**Tasks today:** ${tasksDone}/${todayTasks.length} completed.${todayTasks.length ? ` Tasks: ${todayTasks.map((t: any) => t.title + (t.completed ? " ✓" : "")).join("; ")}` : ""}`);
    if (todayReminders.length > 0) {
      parts.push(`**Reminders/schedule today:** ${todayReminders.map((r: any) => `${r.title}${r.time ? ` at ${r.time}` : ""}`).join("; ")}`);
    }

    // Addictions (days clean, etc.)
    const addictions = JSON.parse(localStorage.getItem("addictions") || "[]");
    if (addictions.length > 0) {
      const getDaysClean = (start: string) => Math.floor((Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
      const maxDays = Math.max(...addictions.map((a: any) => getDaysClean(a.startDate || a.createdAt || "")));
      parts.push(`**Recovery:** ${addictions.length} addiction(s) tracked. Longest streak: ${maxDays} days clean.`);
    }

    // Previous reflection if any
    const storedReflection = localStorage.getItem(`reflection_${todayStr}`);
    if (storedReflection) {
      try {
        const r = JSON.parse(storedReflection);
        if (r.howWasDay || r.grateful || r.focusTomorrow) {
          parts.push(`**Earlier reflection:** How was day: ${r.howWasDay || "—"}. Grateful: ${r.grateful || "—"}. Focus tomorrow: ${r.focusTomorrow || "—"}. Ratings (1-5): Time Management ${r.timeManagement ?? "—"}, Discipline ${r.discipline ?? "—"}, Energy ${r.energy ?? "—"}, Clarity ${r.clarity ?? "—"}.`);
        }
      } catch (_) {}
    }

    return parts.join("\n\n");
  };

  // Initialize chat when moving to chat step
  useEffect(() => {
    if (step === "chat" && messages.length === 0) {
      const greetingMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: aiFeedback || "Hey! I'm here to help you reflect on your day. I can see your workouts, nutrition, tasks, and other data from the app. Tell me what happened today—anything that stood out, how you felt, wins, challenges—and I'll analyze it and give you a thoughtful reflection.",
      };
      setMessages([greetingMessage]);
    }
  }, [step]);

  const handleRatingChange = (metric: keyof Pick<ReflectionForm, "timeManagement" | "discipline" | "energy" | "clarity">, value: number) => {
    setReflection(prev => ({ ...prev, [metric]: value }));
  };

  const handleGetFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const allReflections: ReflectionForm[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dStr = date.toISOString().split("T")[0];
        const stored = localStorage.getItem(`reflection_${dStr}`);
        if (stored) {
          try {
            allReflections.push(JSON.parse(stored));
          } catch (_) {}
        }
      }

      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentReflection: { ...reflection, date: todayStr },
          previousReflections: allReflections.slice(0, 7),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI feedback");
      }

      const data = await response.json();
      setAiFeedback(data.feedback);
      setStep("feedback");

      const dataToSave = { ...reflection, date: todayStr, aiFeedback: data.feedback };
      localStorage.setItem(`reflection_${todayStr}`, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Error getting feedback:", error);
      alert("Failed to get AI feedback. Please try again.");
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleContinueToChat = () => {
    setStep("chat");
  };

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateAIResponse = async (userMessage: string) => {
    try {
      const userDataSummary = getAllUserDayData();
      const conversationHistory = messages
        .map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
        .join("\n");

      const prompt = `You are an AI reflection assistant. Your role is to help the user reflect on and analyze their day. You have access to their app data below. The user will share additional things about their day (how it went, how they felt, wins, challenges, etc.), and you should analyze everything together to give them a thoughtful reflection.

**User's data from the app (today):**
${userDataSummary || "No data available."}

**Conversation so far:**
${conversationHistory}

**How to respond:**
- Use the app data AND what the user tells you to form a cohesive picture of their day
- Analyze patterns: e.g. did they eat well and work out? Did they complete tasks? How does that connect to how they feel?
- Be warm, supportive, and insightful—like a thoughtful friend helping them process their day
- Highlight wins, acknowledge challenges, and offer perspective
- Keep responses focused on reflection and self-awareness, not advice-giving unless they ask
- Be concise but meaningful

Provide your reflection response now:`;

      // Use Railway backend if available, otherwise fallback to local API
      // Note: NEXT_PUBLIC_ env vars are embedded at build time, so redeploy after adding!
      let railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || '';
      
      // Ensure Railway URL has https:// protocol
      if (railwayUrl && !railwayUrl.startsWith('http://') && !railwayUrl.startsWith('https://')) {
        railwayUrl = `https://${railwayUrl}`;
      }
      
      // Remove trailing slash to avoid double slashes
      railwayUrl = railwayUrl.replace(/\/+$/, '');
      
      const apiUrl = railwayUrl ? `${railwayUrl}/api/ai` : '/api/ai';
      
      // Debug logging
      console.log('[AI Debug] Railway URL from env:', railwayUrl || 'NOT SET - Need to redeploy Vercel!');
      console.log('[AI Debug] Using API URL:', apiUrl);
      
      let response;
      try {
        response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        
        console.log('[AI Debug] Response status:', response.status, response.statusText);
      } catch (fetchError: any) {
        console.error('[AI Debug] Fetch error:', fetchError);
        throw new Error(`Network error: ${fetchError.message}. Check Railway URL: ${railwayUrl || 'NOT SET'}`);
      }

      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          console.error('[AI Debug] Error response text:', text);
          errorData = JSON.parse(text);
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('[AI Debug] Error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          apiUrl
        });
        
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to get AI response`);
      }

      let data;
      try {
        const text = await response.text();
        console.log('[AI Debug] Response text:', text.substring(0, 200));
        data = JSON.parse(text);
      } catch (e) {
        console.error('[AI Debug] Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }
      
      console.log('[AI Debug] Parsed response data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.response) {
        return data.response;
      } else {
        return "I'm here to help you reflect on your day. Share what happened and how you felt.";
      }
    } catch (error: any) {
      console.error("AI consultation error:", error);
      console.error("Full error details:", error);
      
      const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || '';
      console.error("Railway URL status:", railwayUrl || "NOT SET");
      
      // Provide helpful error messages
      if (error.message?.includes("API key") || error.message?.includes("Missing")) {
        return "⚠️ OpenAI API key is not configured. Please check Railway environment variables.";
      }
      
      if (error.message?.includes("rate limit")) {
        return "⏱️ Rate limit reached. Please wait a moment and try again.";
      }
      
      if (error.message?.includes("quota")) {
        return "💳 OpenAI account quota exceeded. Please check your OpenAI account billing.";
      }
      
      if (error.message?.includes("405")) {
        return `❌ HTTP 405 Error: Method not allowed. Railway URL: ${railwayUrl || 'NOT SET'}. Check Railway backend is deployed correctly.`;
      }
      
      if (error.message?.includes("Network error") || error.message?.includes("fetch")) {
        return `❌ Network error. Railway URL: ${railwayUrl || 'NOT SET - Check Vercel env vars and redeploy'}. Check Railway is online.`;
      }
      
      return `I'm having trouble connecting right now. Error: ${error.message || "Unknown error"}. Railway URL: ${railwayUrl || 'NOT SET'}`;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    // Show loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Thinking...",
    };
    setMessages((prev) => [...prev, loadingMessage]);

    // Get AI response
    const aiResponse = await generateAIResponse(currentInput);
    
    // Replace loading message with actual response
    setMessages((prev) => 
      prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, content: aiResponse }
          : msg
      )
    );
  };



  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-black text-white min-h-[100dvh]">
      <div className="max-w-md mx-auto px-4 py-3 pb-24">
        {/* Compact header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[#888888] hover:text-[#00D9D9] transition-colors -ml-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00D9D9]" />
            <h1 className="text-lg font-bold text-white">AI Reflection</h1>
          </div>
          <div className="w-12" />
        </div>

        {/* Step 1: Reflection form - fits ~1–1.5 screens, not cramped */}
        {step === "form" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">How was your day?</label>
              <textarea
                value={reflection.howWasDay}
                onChange={(e) => setReflection(prev => ({ ...prev, howWasDay: e.target.value }))}
                className="w-full bg-[#0F1419] border border-[#1F2937] rounded-xl p-3 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-[#00D9D9]/50 transition-colors resize-none"
                rows={2}
                placeholder="Describe how your day went..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">What are you grateful for?</label>
              <textarea
                value={reflection.grateful}
                onChange={(e) => setReflection(prev => ({ ...prev, grateful: e.target.value }))}
                className="w-full bg-[#0F1419] border border-[#1F2937] rounded-xl p-3 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-[#00D9D9]/50 transition-colors resize-none"
                rows={2}
                placeholder="What are you grateful for today?"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">What will you focus on tomorrow?</label>
              <textarea
                value={reflection.focusTomorrow}
                onChange={(e) => setReflection(prev => ({ ...prev, focusTomorrow: e.target.value }))}
                className="w-full bg-[#0F1419] border border-[#1F2937] rounded-xl p-3 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:border-[#00D9D9]/50 transition-colors resize-none"
                rows={2}
                placeholder="What will you focus on tomorrow?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-3">Rate your day (1–5)</label>
              <div className="space-y-3">
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
                      <label className="block text-xs text-[#888888] mb-2">{labels[metric]}</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleRatingChange(metric, num)}
                            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                              value === num
                                ? "bg-[#00D9D9] text-black"
                                : "bg-[#0F1419] border border-[#1F2937] text-[#888888]"
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
            </div>

            <button
              onClick={handleGetFeedback}
              disabled={loadingFeedback || !reflection.howWasDay.trim()}
              className="w-full py-3 bg-[#00D9D9] hover:bg-[#00c4c4] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-colors"
            >
              {loadingFeedback ? "Analyzing..." : "Get AI Analysis"}
            </button>
          </div>
        )}

        {/* Step 2: AI feedback - compact */}
        {step === "feedback" && (
          <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 140px)", minHeight: 400 }}>
            <div className="flex-1 rounded-xl bg-[#0F1419] border border-[#1F2937] p-4 overflow-y-auto">
              <h3 className="text-xs font-semibold text-[#00D9D9] mb-2">AI Analysis</h3>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{aiFeedback}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleContinueToChat}
                className="flex-1 py-2.5 bg-[#00D9D9] hover:bg-[#00c4c4] text-black font-semibold rounded-xl flex items-center justify-center gap-1.5 text-sm transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Continue in chat
              </button>
              <button
                onClick={() => setStep("form")}
                className="py-2.5 px-4 text-[#888888] hover:text-[#00D9D9] text-sm transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Chat */}
        {step === "chat" && (
        <div className="rounded-2xl bg-[#0F1419] border border-[#1F2937] flex flex-col overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="bg-[#00D9D9]/10 border border-[#00D9D9]/30 text-[#00D9D9] rounded-full p-2 w-9 h-9 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-[#00D9D9] text-black"
                      : "bg-[#1A1A1A] border border-[#1F2937] text-white"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                </div>
                {message.role === "user" && (
                  <div className="bg-[#1A1A1A] border border-[#1F2937] text-[#00D9D9] rounded-full p-2 w-9 h-9 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-[#1F2937] p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder="Share how your day went..."
                className="flex-1 bg-[#1A1A1A] text-white px-4 py-3 rounded-xl border border-[#1F2937] placeholder:text-[#555555] focus:outline-none focus:border-[#00D9D9]/50 transition-colors"
              />
              <button
                onClick={handleSendMessage}
                className="bg-[#00D9D9] hover:bg-[#00c4c4] text-black px-5 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            {messages.length > 1 && (
              <button
                onClick={handleReset}
                className="mt-3 w-full bg-[#1A1A1A] hover:bg-[#252525] border border-[#1F2937] text-[#888888] hover:text-[#00D9D9] px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Start New Conversation
              </button>
            )}
          </div>
        </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
