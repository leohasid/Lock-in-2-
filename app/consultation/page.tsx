"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Send, Bot, User, ArrowLeft } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ConsultationPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [consultationData, setConsultationData] = useState({
    goal: "",
    equipment: "",
    frequency: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation
  useEffect(() => {
    if (messages.length === 0) {
      const greetingMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Hey! I'm your AI fitness coach. I'm here to help with anything you need - workout plans, nutrition advice, progress evaluation, exercise questions, or just general fitness chat. I can also create a new training plan or modify your existing one. What's on your mind?",
      };
      setMessages([greetingMessage]);
    }
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getWorkoutData = () => {
    // Get workout data from localStorage or calculate from saved workouts
    const completedWorkouts: any[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const status = localStorage.getItem(`workout_${dateStr}`);
      if (status === "completed") {
        completedWorkouts.push({ date: dateStr });
      }
    }
    return {
      totalWorkouts: completedWorkouts.length,
      workoutsThisWeek: completedWorkouts.filter(w => {
        const workoutDate = new Date(w.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return workoutDate >= weekAgo;
      }).length,
      consistency: Math.round((completedWorkouts.length / 30) * 100),
    };
  };

  const generateAIResponse = async (userMessage: string) => {
    try {
      const workoutData = getWorkoutData();
      
      // Try to extract context from conversation
      const lastFewMessages = messages.slice(-5).map(m => m.content).join(" ");
      const extractedGoal = consultationData.goal || (lastFewMessages.match(/goal.*?(?:build|muscle|lose|weight|strength|endurance|cardio)/i)?.[0] || "");
      const extractedEquipment = consultationData.equipment || (lastFewMessages.match(/(?:gym|dumbbell|barbell|bodyweight|home|equipment)/i)?.[0] || "");
      const extractedFrequency = consultationData.frequency || (lastFewMessages.match(/\d+\s*(?:day|times|week)/i)?.[0] || "");
      
      const context = {
        goal: extractedGoal || "general fitness",
        equipment: extractedEquipment || "not specified",
        frequency: extractedFrequency || "not specified",
        workoutStats: workoutData,
      };

      const response = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get AI response");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data.reply || "I'm here to help! How can I assist you with your fitness journey today?";
    } catch (error: any) {
      console.error("AI consultation error:", error);
      
      // Provide helpful error messages
      if (error.message?.includes("API key") || error.message?.includes("Missing")) {
        return "⚠️ OpenAI API key is not configured. Please check your Vercel environment variables.";
      }
      
      if (error.message?.includes("rate limit")) {
        return "⏱️ Rate limit reached. Please wait a moment and try again.";
      }
      
      if (error.message?.includes("quota")) {
        return "💳 OpenAI account quota exceeded. Please check your OpenAI account billing.";
      }
      
      return `I'm having trouble connecting right now. ${error.message ? `Error: ${error.message}` : "Please check your internet connection and try again."}`;
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
    setConsultationData({ goal: "", equipment: "", frequency: "" });
    setInput("");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">🤖 AI Consultation</h1>
          <p className="text-gray-400">Get personalized workout plans and progress evaluations</p>
        </div>

        {/* Chat Container */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col" style={{ height: "calc(100vh - 280px)" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="bg-orange-500 text-black rounded-full p-2 w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === "user"
                      ? "bg-orange-500 text-black"
                      : "bg-gray-800 text-white"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                </div>
                {message.role === "user" && (
                  <div className="bg-gray-700 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={handleSendMessage}
                className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send
              </button>
            </div>
            {messages.length > 1 && (
              <button
                onClick={handleReset}
                className="mt-3 w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Start New Conversation
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}
