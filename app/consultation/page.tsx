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

type ConversationState = 
  | "greeting"
  | "choice"
  | "consultation_goal"
  | "consultation_equipment"
  | "consultation_frequency"
  | "consultation_creating"
  | "consultation_complete"
  | "evaluation_analyzing"
  | "evaluation_complete";

export default function ConsultationPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationState, setConversationState] = useState<ConversationState>("greeting");
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
        content: "Hi! I'm your AI fitness coach. I can help you with workout plans, nutrition advice, progress evaluation, and answer any fitness questions. I can also create a new training plan or modify your existing one. What would you like help with today?",
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
      const context = {
        goal: consultationData.goal || "general fitness",
        equipment: consultationData.equipment || "not specified",
        frequency: consultationData.frequency || "not specified",
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
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      return data.reply || "I'm here to help!";
    } catch (error) {
      console.error("AI consultation error:", error);
      return "I'm having trouble connecting right now. Please try again.";
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

  const processUserResponse = (userInput: string) => {
    let assistantResponse: Message;

    switch (conversationState) {
      case "choice":
        if (userInput.includes("evaluation") || userInput.includes("evaluate") || userInput.includes("progress")) {
          assistantResponse = {
            id: Date.now().toString(),
            role: "assistant",
            content: "Great! I'll analyze your workout data and provide an evaluation of your progress. Let me gather your workout information...",
          };
          setMessages((prev) => [...prev, assistantResponse]);
          setConversationState("evaluation_analyzing");
          
          // Analyze after a delay
          setTimeout(() => {
            analyzeProgress();
          }, 2000);
        } else if (userInput.includes("consultation") || userInput.includes("new plan") || userInput.includes("plan")) {
          assistantResponse = {
            id: Date.now().toString(),
            role: "assistant",
            content: "Perfect! Let's create a personalized workout plan for you. First, what's your main fitness goal? (e.g., build muscle, lose weight, increase strength, improve endurance)",
          };
          setMessages((prev) => [...prev, assistantResponse]);
          setConversationState("consultation_goal");
        } else {
          assistantResponse = {
            id: Date.now().toString(),
            role: "assistant",
            content: "I can help you with either an evaluation of your progress or create a new workout plan. Which would you like?",
          };
          setMessages((prev) => [...prev, assistantResponse]);
        }
        break;

      case "consultation_goal":
        setConsultationData((prev) => ({ ...prev, goal: userInput }));
        assistantResponse = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Got it! Your goal is ${userInput}. Now, what equipment do you have access to? (e.g., full gym, home gym, dumbbells only, bodyweight, resistance bands)`,
        };
        setMessages((prev) => [...prev, assistantResponse]);
        setConversationState("consultation_equipment");
        break;

      case "consultation_equipment":
        setConsultationData((prev) => ({ ...prev, equipment: userInput }));
        assistantResponse = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Perfect! You have access to ${userInput}. How many days per week would you like to train? (e.g., 3 days, 4 days, 5 days, 6 days)`,
        };
        setMessages((prev) => [...prev, assistantResponse]);
        setConversationState("consultation_frequency");
        break;

      case "consultation_frequency":
        setConsultationData((prev) => ({ ...prev, frequency: userInput }));
        assistantResponse = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Excellent! Creating your personalized ${consultationData.goal} workout plan for ${userInput} days per week using ${consultationData.equipment}...`,
        };
        setMessages((prev) => [...prev, assistantResponse]);
        setConversationState("consultation_creating");
        
        // Create plan after a delay
        setTimeout(() => {
          createWorkoutPlan();
        }, 2000);
        break;

      default:
        assistantResponse = {
          id: Date.now().toString(),
          role: "assistant",
          content: "I'm here to help! Would you like an evaluation on your progress or a consultation to create a new workout plan?",
        };
        setMessages((prev) => [...prev, assistantResponse]);
        setConversationState("choice");
    }
  };

  const analyzeProgress = () => {
    const workoutData = getWorkoutData();
    
    const analysis = `📊 **Progress Evaluation**

Based on your workout data:

**Workout Statistics:**
• Total workouts completed: ${workoutData.totalWorkouts}
• Workouts this week: ${workoutData.workoutsThisWeek}
• Consistency rate: ${workoutData.consistency}%

**Analysis:**
${workoutData.consistency >= 80 
  ? "🎉 Excellent consistency! You're maintaining a strong workout routine."
  : workoutData.consistency >= 60
  ? "👍 Good progress! You're building a solid habit."
  : "💪 Keep pushing! Consistency is key to reaching your goals."
}

${workoutData.workoutsThisWeek >= 4
  ? "🔥 You're on fire this week! Great job staying active."
  : workoutData.workoutsThisWeek >= 2
  ? "📈 You're making progress. Try to increase frequency for better results."
  : "🎯 Consider increasing your workout frequency to see better results."
}

**Recommendations:**
• ${workoutData.workoutsThisWeek < 3 ? "Aim for at least 3-4 workouts per week for optimal results." : "Maintain your current frequency - you're doing great!"}
• Focus on progressive overload in your exercises
• Ensure adequate rest and recovery between sessions
• Track your strength gains to monitor progress

Would you like to create a new plan or continue with your current routine?`;

    const analysisMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: analysis,
    };
    setMessages((prev) => [...prev, analysisMessage]);
    setConversationState("evaluation_complete");
  };

  const createWorkoutPlan = () => {
    const { goal, equipment, frequency } = consultationData;
    const daysPerWeek = parseInt(frequency.match(/\d+/)?.[0] || "3");
    
    const plan = `💪 **Your Personalized Workout Plan**

**Goal:** ${goal}
**Equipment:** ${equipment}
**Frequency:** ${daysPerWeek} days per week

**Weekly Schedule:**

${generateWeeklyPlan(daysPerWeek, goal, equipment)}

**Key Principles:**
• Progressive overload: Gradually increase weight or reps each week
• Proper form: Focus on technique over weight
• Rest days: Essential for recovery and growth
• Nutrition: Support your workouts with adequate protein and calories

**Next Steps:**
1. Start with the first workout of the week
2. Track your sets, reps, and weights
3. Aim to increase intensity each week
4. Stay consistent with your schedule

Would you like me to explain any exercises or adjust the plan?`;

    const planMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: plan,
    };
    setMessages((prev) => [...prev, planMessage]);
    setConversationState("consultation_complete");
  };

  const generateWeeklyPlan = (days: number, goal: string, equipment: string): string => {
    const plans: { [key: number]: string[] } = {
      3: [
        "Day 1: Upper Body (Chest, Shoulders, Triceps)",
        "Day 2: Lower Body (Legs, Glutes, Calves)",
        "Day 3: Back & Biceps",
      ],
      4: [
        "Day 1: Upper Body Push (Chest, Shoulders, Triceps)",
        "Day 2: Lower Body (Legs, Glutes)",
        "Day 3: Upper Body Pull (Back, Biceps)",
        "Day 4: Full Body / Cardio",
      ],
      5: [
        "Day 1: Chest & Triceps",
        "Day 2: Back & Biceps",
        "Day 3: Legs & Shoulders",
        "Day 4: Upper Body",
        "Day 5: Lower Body",
      ],
      6: [
        "Day 1: Chest",
        "Day 2: Back",
        "Day 3: Shoulders",
        "Day 4: Legs",
        "Day 5: Arms",
        "Day 6: Cardio / Active Recovery",
      ],
    };

    const selectedPlan = plans[days] || plans[3];
    return selectedPlan.map((day, i) => `${i + 1}. ${day}`).join("\n");
  };

  const handleReset = () => {
    setMessages([]);
    setConversationState("greeting");
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
            {conversationState === "consultation_creating" && (
              <div className="flex gap-3 justify-start">
                <div className="bg-orange-500 text-black rounded-full p-2 w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-gray-800 text-white rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                    <span className="text-sm">Creating your personalized plan...</span>
                  </div>
                </div>
              </div>
            )}
            {conversationState === "evaluation_analyzing" && (
              <div className="flex gap-3 justify-start">
                <div className="bg-orange-500 text-black rounded-full p-2 w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-gray-800 text-white rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                    <span className="text-sm">Analyzing your workout data...</span>
                  </div>
                </div>
              </div>
            )}
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
            {(conversationState === "consultation_complete" || conversationState === "evaluation_complete") && (
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
