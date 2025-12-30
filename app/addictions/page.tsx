"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Shield, Clock, AlertTriangle, Lock, Unlock, Settings, X } from "lucide-react";

interface AppBlock {
  appName: string;
  dailyLimit: number; // in minutes
  currentUsage: number;
  blocked: boolean;
}

interface PhoneAddiction {
  id: string;
  name: string;
  startDate: string;
  apps: AppBlock[];
  totalDailyLimit: number;
  totalCurrentUsage: number;
  blocked: boolean;
}

interface OtherAddiction {
  id: string;
  type: "vape" | "goon" | "other";
  name: string;
  startDate: string;
  startTime: string; // ISO timestamp for precise countdown
  weeklySpend?: number;
}

type Addiction = PhoneAddiction | OtherAddiction;

interface MoneySavedStats {
  daily: number;
  total: number;
  currency: string;
  hourly?: number;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
}

interface PhoneUsageSnapshot {
  totalMinutes?: number;
  apps: Array<{
    appName: string;
    minutes: number;
    blocked?: boolean;
  }>;
}

declare global {
  interface Window {
    lockedInUsageBridge?: {
      getUsage?: () => Promise<PhoneUsageSnapshot> | PhoneUsageSnapshot;
      blockApp?: (appName: string, block: boolean) => Promise<void> | void;
    };
  }
}

export default function AddictionsPage() {
  const [addictions, setAddictions] = useState<Addiction[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState<string | null>(null);
  const [showPhoneDetail, setShowPhoneDetail] = useState(false);
  const [showOtherDetail, setShowOtherDetail] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo>({ code: "USD", symbol: "$" });
  const [newAddiction, setNewAddiction] = useState({
    type: "phone" as "phone" | "vape" | "goon" | "other",
    name: "",
    dailyLimit: "",
    weeklySpend: "",
  });
  const [newApp, setNewApp] = useState({
    appName: "",
    dailyLimit: "",
  });

  const currencyMap: Record<string, CurrencyInfo> = {
    US: { code: "USD", symbol: "$" },
    CA: { code: "CAD", symbol: "CA$" },
    GB: { code: "GBP", symbol: "£" },
    AU: { code: "AUD", symbol: "A$" },
    NZ: { code: "NZD", symbol: "NZ$" },
    EU: { code: "EUR", symbol: "€" },
    IE: { code: "EUR", symbol: "€" },
    DE: { code: "EUR", symbol: "€" },
    FR: { code: "EUR", symbol: "€" },
    ES: { code: "EUR", symbol: "€" },
    IT: { code: "EUR", symbol: "€" },
    SG: { code: "SGD", symbol: "S$" },
    HK: { code: "HKD", symbol: "HK$" },
    JP: { code: "JPY", symbol: "¥" },
    CN: { code: "CNY", symbol: "¥" },
    IN: { code: "INR", symbol: "₹" },
    KR: { code: "KRW", symbol: "₩" },
    TH: { code: "THB", symbol: "฿" },
    PH: { code: "PHP", symbol: "₱" },
    BR: { code: "BRL", symbol: "R$" },
    MX: { code: "MXN", symbol: "MX$" },
    ZA: { code: "ZAR", symbol: "R" },
    AE: { code: "AED", symbol: "د.إ" },
    SA: { code: "SAR", symbol: "﷼" },
    CH: { code: "CHF", symbol: "CHF" },
  };

  const resolveCurrency = (locale: string | undefined) => {
    if (!locale) return null;
    const parts = locale.split(/[-_]/);
    const region = parts[1]?.toUpperCase();
    if (region && currencyMap[region]) {
      return currencyMap[region];
    }
    const base = parts[0]?.toUpperCase();
    if (base && currencyMap[base]) {
      return currencyMap[base];
    }
    return null;
  };

  const determineCurrency = (): CurrencyInfo => {
    const fallback = { code: "USD", symbol: "$" };
    if (typeof window === "undefined") return fallback;
    const locales = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).filter(Boolean);
    for (const locale of locales) {
      const match = resolveCurrency(locale);
      if (match) return match;
    }
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    const intlMatch = resolveCurrency(intlLocale);
    if (intlMatch) return intlMatch;
    return fallback;
  };

  const applySyncedUsage = (snapshot?: PhoneUsageSnapshot | null) => {
    if (!snapshot || !snapshot.apps || snapshot.apps.length === 0) return;

    setAddictions((prev) =>
      prev.map((addiction) => {
        if ("apps" in addiction) {
          const updatedApps = addiction.apps.map((app) => {
            const match = snapshot.apps.find(
              (synced) => synced.appName.toLowerCase() === app.appName.toLowerCase()
            );
            if (!match) return app;
            const minutes = Math.max(0, Math.round(match.minutes));
            // Only block if usage has actually reached or exceeded the limit
            const shouldBeBlocked = minutes >= app.dailyLimit;
            
            // Use native blocked state if available, otherwise determine from usage
            const isBlocked = match.blocked !== undefined ? match.blocked : shouldBeBlocked;
            
            // If app should be blocked based on usage, call native blocking
            if (shouldBeBlocked && !isBlocked) {
              blockAppNative(app.appName, true);
            }
            
            // If app is blocked but usage is below limit (e.g., new day), unblock it
            if (!shouldBeBlocked && isBlocked) {
              blockAppNative(app.appName, false);
            }
            
            return {
              ...app,
              currentUsage: minutes,
              blocked: shouldBeBlocked, // Only block when usage >= limit
            };
          });

          const totalCurrentUsage = updatedApps.reduce(
            (sum, app) => sum + app.currentUsage,
            0
          );

          return {
            ...addiction,
            apps: updatedApps,
            totalCurrentUsage,
            blocked: totalCurrentUsage >= addiction.totalDailyLimit || updatedApps.every((app) => app.blocked),
          };
        }
        return addiction;
      })
    );
  };

  // Update time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  // Check if limits are exceeded and automatically block apps
  // Use a ref to track if we've already shown notifications to prevent spam
  const notificationShownRef = useRef<Set<string>>(new Set());
  const prevUsageRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
    // Only check and update if there are actual changes needed
    setAddictions((prev) => {
      let hasChanges = false;
      const updated = prev.map((addiction) => {
        if ("apps" in addiction) {
          const phoneAddiction = addiction as PhoneAddiction;
          const totalUsage = phoneAddiction.apps.reduce((sum, app) => sum + app.currentUsage, 0);
          const totalLimit = phoneAddiction.totalDailyLimit;
          const usagePercent = totalLimit > 0 ? (totalUsage / totalLimit) * 100 : 0;

          // Check each app individually and block if limit reached
          const updatedApps = phoneAddiction.apps.map((app) => {
            const shouldBeBlocked = app.currentUsage >= app.dailyLimit;
            const usageKey = `${phoneAddiction.id}-${app.appName}`;
            const prevUsage = prevUsageRef.current[usageKey] || 0;
            
            // Only update if usage changed or blocking status needs to change
            const usageChanged = app.currentUsage !== prevUsage;
            if (usageChanged) {
              prevUsageRef.current[usageKey] = app.currentUsage;
            }
            
            // If app should be blocked but isn't, block it now
            if (shouldBeBlocked && !app.blocked) {
              hasChanges = true;
              blockAppNative(app.appName, true);
              
              // Show notification for individual app blocking (only once)
              const notificationKey = `blocked-${app.appName}`;
              if (Notification.permission === "granted" && !notificationShownRef.current.has(notificationKey)) {
                new Notification(`🚫 ${app.appName} Blocked`, {
                  body: `Daily limit of ${app.dailyLimit} minutes reached!`,
                });
                notificationShownRef.current.add(notificationKey);
              }
              
              return { ...app, blocked: true };
            }
            
            // If app is blocked but usage is below limit (e.g., new day), unblock it
            if (!shouldBeBlocked && app.blocked) {
              hasChanges = true;
              blockAppNative(app.appName, false);
              notificationShownRef.current.delete(`blocked-${app.appName}`);
              return { ...app, blocked: false };
            }
            
            return app;
          });

          // Show warning at 80% usage (only once)
          const warningKey = `warning-${phoneAddiction.id}`;
          if (usagePercent >= 80 && usagePercent < 100 && !phoneAddiction.blocked && !notificationShownRef.current.has(warningKey)) {
            if (Notification.permission === "granted") {
              new Notification("⚠️ Phone Usage Warning", {
                body: `You've used ${Math.round(usagePercent)}% of your daily limit!`,
              });
              notificationShownRef.current.add(warningKey);
            }
          }

          // Block all if total limit exceeded
          const shouldBlockAll = usagePercent >= 100;
          const allBlocked = updatedApps.every((app) => app.blocked) || shouldBlockAll;

          if (shouldBlockAll && !phoneAddiction.blocked) {
            hasChanges = true;
            // Block all apps that aren't already blocked
            updatedApps.forEach((app) => {
              if (!app.blocked) {
                blockAppNative(app.appName, true);
              }
            });
            
            const allBlockedKey = `all-blocked-${phoneAddiction.id}`;
            if (Notification.permission === "granted" && !notificationShownRef.current.has(allBlockedKey)) {
              new Notification("🚫 Phone Blocked", {
                body: "Daily limit exceeded! Apps are now blocked.",
              });
              notificationShownRef.current.add(allBlockedKey);
            }
          }

          return {
            ...phoneAddiction,
            apps: updatedApps,
            blocked: allBlocked,
          };
        }
        return addiction;
      });
      
      // Only return updated state if there were actual changes
      return hasChanges ? updated : prev;
    });
  }, [currentTime]); // Only depend on currentTime which updates every second

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    setCurrencyInfo(determineCurrency());
  }, []);

  // Sync phone usage data periodically and on events
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const syncPhoneData = () => {
      const usageFn = window.lockedInUsageBridge?.getUsage;
      if (usageFn) {
        Promise.resolve(usageFn())
          .then(applySyncedUsage)
          .catch((err) => console.error("Phone usage sync failed", err));
      }
    };

    // Event listener for phone usage updates
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PhoneUsageSnapshot>).detail;
      applySyncedUsage(detail);
    };
    window.addEventListener("phoneUsageUpdate", handler);

    // Initial sync
    syncPhoneData();

    // Sync every 30 seconds to get latest usage data from phone
    const syncInterval = setInterval(syncPhoneData, 30000);

    return () => {
      window.removeEventListener("phoneUsageUpdate", handler as EventListener);
      clearInterval(syncInterval);
    };
  }, []);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load addictions from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedAddictions = localStorage.getItem("addictions");
    if (storedAddictions) {
      try {
        const parsed = JSON.parse(storedAddictions);
        setAddictions(parsed);
      } catch (e) {
        console.error("Error loading addictions:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save addictions to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    localStorage.setItem("addictions", JSON.stringify(addictions));
    
    // Also save phone addiction data separately for home page
    const phoneAddiction = addictions.find((a): a is PhoneAddiction => "apps" in a);
    if (phoneAddiction) {
      localStorage.setItem("phoneAddictionData", JSON.stringify({
        totalCurrentUsage: phoneAddiction.totalCurrentUsage,
        totalDailyLimit: phoneAddiction.totalDailyLimit,
      }));
    }
  }, [addictions, isLoaded]);

  const handleAddAddiction = () => {
    if (newAddiction.type === "phone" || newAddiction.type === "vape" || newAddiction.type === "goon" || newAddiction.name) {
      const needsWeeklySpend = newAddiction.type === "vape" || newAddiction.type === "goon" || newAddiction.type === "other";
      let weeklySpendValue: number | undefined = undefined;
      if (needsWeeklySpend) {
        weeklySpendValue = parseFloat(newAddiction.weeklySpend);
        if (isNaN(weeklySpendValue) || weeklySpendValue <= 0) {
          const addictionLabel =
            newAddiction.type === "goon"
              ? "alcohol"
              : newAddiction.type === "vape"
              ? "vaping"
              : "this addiction";
          alert(`Please enter how much you spend per week on ${addictionLabel} (must be greater than 0).`);
          return;
        }
      }
      if (newAddiction.type === "phone") {
        // Check if phone addiction already exists
        const existingPhone = addictions.find((a) => "apps" in a) as PhoneAddiction | undefined;
        
        if (existingPhone) {
          // Update existing phone addiction instead of creating new one
          setAddictions((prev) =>
            prev.map((a) => {
              if (a.id === existingPhone.id && "apps" in a) {
                return {
                  ...a,
                  totalDailyLimit: newAddiction.dailyLimit
                    ? parseInt(newAddiction.dailyLimit)
                    : (a as PhoneAddiction).totalDailyLimit || 120,
                } as PhoneAddiction;
              }
              return a;
            })
          );
        } else {
          // Create new phone addiction
          const phoneAddiction: PhoneAddiction = {
            id: Date.now().toString(),
            name: "Phone & Social Media",
            startDate: new Date().toISOString().split("T")[0],
            apps: [],
            totalDailyLimit: newAddiction.dailyLimit ? parseInt(newAddiction.dailyLimit) : 120,
            totalCurrentUsage: 0,
            blocked: false,
          };
          setAddictions([...addictions, phoneAddiction]);
        }
      } else {
        // Auto-set name for vape and goon types
        let addictionName = newAddiction.name;
        if (newAddiction.type === "vape") {
          addictionName = "Vape/Nicotine";
        } else if (newAddiction.type === "goon") {
          addictionName = "Alcohol";
        }
        
        const otherAddiction: OtherAddiction = {
          id: Date.now().toString(),
          type: newAddiction.type,
          name: addictionName,
          startDate: new Date().toISOString().split("T")[0],
          startTime: new Date().toISOString(), // Store precise timestamp
          weeklySpend: needsWeeklySpend ? weeklySpendValue : undefined,
        };
        setAddictions([...addictions, otherAddiction]);
      }
      setNewAddiction({ type: "phone", name: "", dailyLimit: "", weeklySpend: "" });
      setShowAddForm(false);
    }
  };

  const handleAddApp = (addictionId: string) => {
    if (newApp.appName && newApp.dailyLimit) {
      setAddictions((prev) =>
        prev.map((a) => {
          if (a.id === addictionId && "apps" in a) {
            const phoneAddiction = a as PhoneAddiction;
            return {
              ...phoneAddiction,
              apps: [
                ...phoneAddiction.apps,
                {
                  appName: newApp.appName,
                  dailyLimit: parseInt(newApp.dailyLimit),
                  currentUsage: 0,
                  blocked: false,
                },
              ],
            };
          }
          return a;
        })
      );
      setNewApp({ appName: "", dailyLimit: "" });
      setShowAppSettings(null);
    }
  };

  const updateAppUsage = (addictionId: string, appName: string, minutes: number) => {
    setAddictions((prev) =>
      prev.map((a) => {
        if (a.id === addictionId && "apps" in a) {
          const phoneAddiction = a as PhoneAddiction;
          return {
            ...phoneAddiction,
            apps: phoneAddiction.apps.map((app) =>
              app.appName === appName
                ? { ...app, currentUsage: Math.max(0, app.currentUsage + minutes) }
                : app
            ),
            totalCurrentUsage: phoneAddiction.totalCurrentUsage + minutes,
          };
        }
        return a;
      })
    );
  };

  // Call native blocking API if available
  const blockAppNative = async (appName: string, block: boolean) => {
    try {
      // Try Capacitor plugin first (iOS native)
      if (typeof window !== "undefined") {
        // @ts-ignore - Capacitor plugin
        const { AppBlocking } = await import('@capacitor/core').then(m => m.Plugins).catch(() => ({}));
        if (AppBlocking?.blockApp) {
          await AppBlocking.blockApp({ appName, block });
          return;
        }
      }
      
      // Fallback to legacy bridge
      if (typeof window !== "undefined" && window.lockedInUsageBridge) {
        if (window.lockedInUsageBridge.blockApp) {
          await window.lockedInUsageBridge.blockApp(appName, block);
        }
      }
    } catch (error) {
      console.error("Failed to block app natively:", error);
    }
  };

  const toggleAppBlock = async (addictionId: string, appName: string) => {
    setAddictions((prev) =>
      prev.map((a) => {
        if (a.id === addictionId && "apps" in a) {
          const phoneAddiction = a as PhoneAddiction;
          const updatedApps = phoneAddiction.apps.map((app) => {
            if (app.appName === appName) {
              const newBlockedState = !app.blocked;
              // Call native blocking API
              blockAppNative(appName, newBlockedState);
              return { ...app, blocked: newBlockedState };
            }
            return app;
          });
          return {
            ...phoneAddiction,
            apps: updatedApps,
          };
        }
        return a;
      })
    );
  };

  const getCountdown = (startTime: string | undefined) => {
    if (!startTime) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    // Handle both timestamp strings and date strings
    let start: Date;
    if (/^\d+$/.test(startTime)) {
      // It's a timestamp string, convert to number
      start = new Date(parseInt(startTime, 10));
    } else {
      // It's a date string
      start = new Date(startTime);
    }

    const now = currentTime;
    
    // Check if date is valid
    if (isNaN(start.getTime())) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const diff = now.getTime() - start.getTime();

    // Ensure diff is not negative and values are valid numbers
    const safeDiff = Math.max(0, diff);
    const days = Math.floor(safeDiff / (1000 * 60 * 60 * 24)) || 0;
    const hours = Math.floor((safeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) || 0;
    const minutes = Math.floor((safeDiff % (1000 * 60 * 60)) / (1000 * 60)) || 0;
    const seconds = Math.floor((safeDiff % (1000 * 60)) / 1000) || 0;

    return { days, hours, minutes, seconds };
  };

  const getDaysClean = (startDate: string) => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAddictionIcon = (addiction: Addiction) => {
    if ("type" in addiction) {
      switch (addiction.type) {
        case "vape":
          return "💨";
        case "goon":
          return "🍷";
        default:
          return "🚫";
      }
    }
    return "📱";
  };

  const calculateMoneySaved = (addiction: OtherAddiction, daysClean: number): MoneySavedStats => {
    const currency = currencyInfo.symbol || "$";
    if (
      (addiction.type === "vape" || addiction.type === "goon" || addiction.type === "other") &&
      addiction.weeklySpend &&
      addiction.weeklySpend > 0
    ) {
      const start = new Date(addiction.startTime);
      const diffMs = currentTime.getTime() - start.getTime();
      const elapsedHours = Math.max(Math.floor(diffMs / (1000 * 60 * 60)), 0);
      const hourlyRate = addiction.weeklySpend / (7 * 24);
      return {
        daily: addiction.weeklySpend / 7,
        hourly: hourlyRate,
        total: elapsedHours * hourlyRate,
        currency,
      };
    }
    const daily =
      addiction.type === "goon"
        ? 25
        : addiction.type === "vape"
        ? 15
        : 10;
    return {
      daily,
      total: daysClean * daily,
      currency,
    };
  };

  const CircularProgress = ({ percentage, size = 120 }: { percentage: number; size?: number }) => {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const safePercentage = isNaN(percentage) || !isFinite(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
    const offset = circumference - (safePercentage / 100) * circumference;
    const color = safePercentage >= 100 ? "#dc2626" : safePercentage >= 80 ? "#eab308" : "#22c55e";

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1f2937"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={isNaN(offset) || !isFinite(offset) ? circumference : offset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white">{Math.round(safePercentage)}%</div>
          <div className="text-xs text-gray-400">used</div>
        </div>
      </div>
    );
  };

  const phoneAddictions = addictions.filter((a) => "apps" in a) as PhoneAddiction[];
  const otherAddictions = addictions.filter((a) => !("apps" in a)) as OtherAddiction[];

  const formatMinutes = (value: number) => {
    if (value <= 0) return "0m";
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-white">🛡️ Addiction Recovery</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/addictions/support"
                className="bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                💬 Support
              </Link>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                + Track New
              </button>
            </div>
          </div>
        </div>

        {/* Add Addiction Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-800">
              <h2 className="text-2xl font-bold text-white mb-6">Track New Addiction</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Addiction Type</label>
                  <select
                    value={newAddiction.type}
                    onChange={(e) =>
                      setNewAddiction({ ...newAddiction, type: e.target.value as any })
                    }
                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                  >
                    <option value="phone">📱 Phone/Social Media</option>
                    <option value="vape">💨 Vape/Nicotine</option>
                    <option value="goon">🍷 Alcohol</option>
                    <option value="other">🚫 Other</option>
                  </select>
                </div>
                {newAddiction.type === "phone" ? (
                  <div>
                    <label className="block text-gray-300 mb-2">Total Daily Limit (minutes)</label>
                    <input
                      type="number"
                      value={newAddiction.dailyLimit}
                      onChange={(e) =>
                        setNewAddiction({ ...newAddiction, dailyLimit: e.target.value })
                      }
                      placeholder="e.g., 120 (2 hours)"
                      className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                    />
                    <p className="text-sm text-gray-400 mt-2">
                      You can set individual app limits after creating
                    </p>
                  </div>
                ) : newAddiction.type === "other" ? (
                  <div>
                    <label className="block text-gray-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={newAddiction.name}
                      onChange={(e) => setNewAddiction({ ...newAddiction, name: e.target.value })}
                      placeholder="e.g., Gambling, etc..."
                      className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                    />
                  </div>
                ) : null}
                {(newAddiction.type === "vape" || newAddiction.type === "goon" || newAddiction.type === "other") && (
                  <div>
                    <label className="block text-gray-300 mb-2">
                      {newAddiction.type === "goon"
                        ? `How much do you spend per week on alcohol? (${currencyInfo.symbol})`
                        : newAddiction.type === "vape"
                        ? `How much do you spend per week on vaping? (${currencyInfo.symbol})`
                        : `How much do you spend per week on this addiction? (${currencyInfo.symbol})`}
                    </label>
                    <input
                      type="number"
                      value={newAddiction.weeklySpend}
                      onChange={(e) => setNewAddiction({ ...newAddiction, weeklySpend: e.target.value })}
                      placeholder="e.g., 150"
                      className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                      min="0"
                    />
                  </div>
                )}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleAddAddiction}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Start Tracking
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAddiction({ type: "phone", name: "", dailyLimit: "", weeklySpend: "" });
                    }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Addictions - List Format */}
        {(phoneAddictions.length > 0 || otherAddictions.length > 0) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-3">Your Addictions</h2>
            <div className="space-y-3">
              {/* Phone Addiction Card */}
              {phoneAddictions.length > 0 && (() => {
          // Combine all phone addictions into one unified display
          const earliestStartDate = phoneAddictions.reduce((earliest, addiction) => {
            return new Date(addiction.startDate) < new Date(earliest) ? addiction.startDate : earliest;
          }, phoneAddictions[0].startDate);
          
          const daysClean = getDaysClean(earliestStartDate);
          const totalDailyLimit = phoneAddictions.reduce((sum, a) => sum + a.totalDailyLimit, 0);
          const totalCurrentUsage = phoneAddictions.reduce((sum, a) => sum + a.totalCurrentUsage, 0);
          const totalUsagePercent = totalDailyLimit > 0 ? (totalCurrentUsage / totalDailyLimit) * 100 : 0;
          const isBlocked = phoneAddictions.some(a => a.blocked);
          
          // Combine all apps from all phone addictions
          const allApps: Array<{ app: AppBlock; addictionId: string }> = [];
          phoneAddictions.forEach(addiction => {
            addiction.apps.forEach(app => {
              allApps.push({ app, addictionId: addiction.id });
            });
          });

                return (
                  <div
                    className={`bg-gray-900 rounded-xl p-4 border-2 text-left transition-all hover:border-orange-500/50 ${
                      isBlocked
                        ? "border-red-500/50"
                        : totalUsagePercent >= 80
                        ? "border-yellow-500/50"
                        : "border-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">📱</div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Phone & Social Media</h3>
                          <p className="text-xs text-gray-500">{daysClean} days tracking</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2.5 border border-gray-700 mb-2.5">
                      <div className="flex items-center justify-between text-xs text-gray-300 mb-1.5">
                        <span>Today's usage</span>
                        <span>{formatMinutes(totalCurrentUsage)} / {formatMinutes(totalDailyLimit)}</span>
                      </div>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {allApps.length === 0 && (
                          <p className="text-[10px] text-gray-500">No apps configured yet.</p>
                        )}
                        {allApps.map(({ app }) => {
                          const remaining = Math.max(app.dailyLimit - app.currentUsage, 0);
                          const percent =
                            app.dailyLimit > 0
                              ? Math.min((app.currentUsage / app.dailyLimit) * 100, 100)
                              : 0;
                          return (
                            <div key={app.appName}>
                              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                                <span className="font-medium text-white">{app.appName}</span>
                                <span className={remaining === 0 ? "text-red-400" : "text-gray-300"}>
                                  {remaining === 0 ? "Blocked" : `${formatMinutes(remaining)} left`}
                                </span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full ${
                                    percent >= 100
                                      ? "bg-red-600"
                                      : percent >= 80
                                      ? "bg-yellow-500"
                                      : "bg-blue-500"
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5 text-xs text-gray-400">
                      <button
                        onClick={() => setShowPhoneDetail(true)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-black px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        View detailed analysis
                      </button>
                      <p className="text-[10px] text-gray-500">
                        Live usage updates when the phone sync bridge is connected.
                      </p>
                    </div>
                    {isBlocked && (
                      <span className="inline-block mt-1.5 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        BLOCKED
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Other Addictions - List Format */}
              {otherAddictions.map((addiction) => {
                const elapsed = getCountdown(addiction.startTime);
                const daysClean = getDaysClean(addiction.startDate);
                const money = calculateMoneySaved(addiction, daysClean);

                return (
                  <button
                    key={addiction.id}
                    onClick={() => setShowOtherDetail(addiction.id)}
                    className="bg-gray-900 rounded-xl p-4 border-2 border-gray-800 text-left transition-all hover:border-orange-500/50 w-full"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">{getAddictionIcon(addiction)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{addiction.name}</h3>
                        <p className="text-xs text-gray-400">{daysClean} days clean</p>
                      </div>
                    </div>
                    
                    {/* Live Countdown Timer */}
                    <div className="bg-gray-800 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-center gap-1.5 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-xs text-gray-400 font-semibold">Time Clean</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        <div>
                          <div className="text-lg font-bold text-white">{elapsed.days ?? 0}</div>
                          <div className="text-[10px] text-gray-400">Days</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">{elapsed.hours ?? 0}</div>
                          <div className="text-[10px] text-gray-400">Hours</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">{elapsed.minutes ?? 0}</div>
                          <div className="text-[10px] text-gray-400">Mins</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">{elapsed.seconds ?? 0}</div>
                          <div className="text-[10px] text-gray-400">Secs</div>
                        </div>
                      </div>
                    </div>
                    {money && (
                      <div className="text-xs text-green-400 font-semibold text-center">
                        Saved so far: {money.currency}
                        {money.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {addictions.length === 0 && (
          <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 text-center">
            <p className="text-gray-300 text-lg mb-4">Start tracking your recovery journey</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Track Your First Addiction
            </button>
          </div>
        )}

        {/* App Settings Modal */}
        {showAppSettings && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-800">
              <h2 className="text-2xl font-bold text-white mb-6">Manage Apps</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">App Name</label>
                  <input
                    type="text"
                    value={newApp.appName}
                    onChange={(e) => setNewApp({ ...newApp, appName: e.target.value })}
                    placeholder="e.g., Instagram, TikTok, Twitter..."
                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Daily Limit (minutes)</label>
                  <input
                    type="number"
                    value={newApp.dailyLimit}
                    onChange={(e) => setNewApp({ ...newApp, dailyLimit: e.target.value })}
                    placeholder="e.g., 30"
                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => handleAddApp(showAppSettings)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Add App
                  </button>
                  <button
                    onClick={() => {
                      setShowAppSettings(null);
                      setNewApp({ appName: "", dailyLimit: "" });
                    }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phone Detail Modal */}
        {showPhoneDetail && phoneAddictions.length > 0 && (() => {
          const earliestStartDate = phoneAddictions.reduce((earliest, addiction) => {
            return new Date(addiction.startDate) < new Date(earliest) ? addiction.startDate : earliest;
          }, phoneAddictions[0].startDate);
          
          const daysClean = getDaysClean(earliestStartDate);
          const totalDailyLimit = phoneAddictions.reduce((sum, a) => sum + a.totalDailyLimit, 0);
          const totalCurrentUsage = phoneAddictions.reduce((sum, a) => sum + a.totalCurrentUsage, 0);
          const totalUsagePercent = totalDailyLimit > 0 ? (totalCurrentUsage / totalDailyLimit) * 100 : 0;
          const isBlocked = phoneAddictions.some(a => a.blocked);
          
          const avgDailyUsage = totalCurrentUsage;
          const projectedFreeTime = Math.max(totalDailyLimit - totalCurrentUsage, 0);
          
          const allApps: Array<{ app: AppBlock; addictionId: string }> = [];
          phoneAddictions.forEach(addiction => {
            addiction.apps.forEach(app => {
              allApps.push({ app, addictionId: addiction.id });
            });
          });

          return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 rounded-xl p-4 max-w-2xl w-full max-h-[95vh] border border-gray-800 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-white">📱 Phone & Social Media</h2>
                    <p className="text-xs text-gray-400">Live insights synced from your device</p>
                  </div>
                  <button
                    onClick={() => setShowPhoneDetail(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3 flex-shrink-0">
                  <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                    <p className="text-[10px] text-gray-400 mb-0.5">Usage Today</p>
                    <p className="text-base font-bold text-white">{formatMinutes(totalCurrentUsage)}</p>
                    <p className="text-[9px] text-gray-500">of {formatMinutes(totalDailyLimit)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                    <p className="text-[10px] text-gray-400 mb-0.5">Remaining</p>
                    <p className="text-base font-bold text-white">{formatMinutes(projectedFreeTime)}</p>
                    <p className="text-[9px] text-gray-500">before block</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                    <p className="text-[10px] text-gray-400 mb-0.5">Apps</p>
                    <p className="text-base font-bold text-white">{allApps.length}</p>
                    <p className="text-[9px] text-gray-500">tracked</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                    <p className="text-[10px] text-gray-400 mb-0.5">Days</p>
                    <p className="text-base font-bold text-white">{daysClean}</p>
                    <p className="text-[9px] text-gray-500">streak</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <h3 className="text-sm font-semibold text-white">Tracked Apps</h3>
                      <button
                        onClick={() => {
                          setShowPhoneDetail(false);
                          setShowAppSettings(phoneAddictions[0].id);
                        }}
                        className="px-2 py-1 text-[10px] rounded-lg bg-orange-500 text-black font-semibold"
                      >
                        Manage
                      </button>
                    </div>
                    {allApps.length === 0 ? (
                      <p className="text-xs text-gray-400">No apps configured. Tap "Manage" to start tracking.</p>
                    ) : (
                      <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
                        {allApps.map(({ app, addictionId }) => {
                          const remaining = Math.max(app.dailyLimit - app.currentUsage, 0);
                          const percent =
                            app.dailyLimit > 0
                              ? Math.min((app.currentUsage / app.dailyLimit) * 100, 100)
                              : 0;
                          return (
                            <div
                              key={`${addictionId}-${app.appName}`}
                              className="bg-gray-900 rounded-lg p-2 border border-gray-800"
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-white font-semibold text-xs">{app.appName}</span>
                                <span className="text-[10px] text-gray-400">
                                  {formatMinutes(app.currentUsage)} / {formatMinutes(app.dailyLimit)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mb-0.5 text-[10px]">
                                <span className={app.currentUsage >= app.dailyLimit ? "text-red-400" : "text-gray-400"}>
                                  {app.currentUsage >= app.dailyLimit ? "Blocked" : `${formatMinutes(remaining)} left`}
                                </span>
                                <button
                                  onClick={() => toggleAppBlock(addictionId, app.appName)}
                                  className={`w-14 h-6 rounded text-[10px] font-semibold border flex items-center justify-center ${
                                    app.blocked
                                      ? "bg-green-700 border-green-500 text-white hover:bg-green-600"
                                      : "bg-red-700 border-red-500 text-white hover:bg-red-600"
                                  }`}
                                >
                                  {app.blocked ? "Unblock" : "Block"}
                                </button>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full ${
                                    percent >= 100
                                      ? "bg-red-600"
                                      : percent >= 80
                                      ? "bg-yellow-500"
                                      : "bg-blue-500"
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 flex flex-col space-y-2 min-h-0">
                    <h3 className="text-sm font-semibold text-white mb-1 flex-shrink-0">Focus Insights</h3>
                    <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                      <div className="bg-gray-900 rounded-lg p-2 border border-gray-800">
                        <p className="text-[10px] text-gray-400">Avg per day</p>
                        <p className="text-base font-bold text-white">{formatMinutes(avgDailyUsage)}</p>
                        <p className="text-[9px] text-gray-500">min/day</p>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-2 border border-gray-800">
                        <p className="text-[10px] text-gray-400">Free time</p>
                        <p className="text-base font-bold text-white">{formatMinutes(projectedFreeTime)}</p>
                        <p className="text-[9px] text-gray-500">earned</p>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-2 border border-gray-800 flex-shrink-0">
                      <p className="text-[10px] text-gray-400 mb-1.5">Quick actions</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            phoneAddictions.forEach(addiction => {
                              updateAppUsage(addiction.id, "all", 5);
                            });
                          }}
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-2 py-1.5 rounded text-[10px] transition-colors"
                        >
                          +5 min
                        </button>
                        <button
                          onClick={() => {
                            setAddictions((prev) =>
                              prev.map((a) => {
                                if ("apps" in a) {
                                  return {
                                    ...a,
                                    totalCurrentUsage: 0,
                                    blocked: false,
                                    apps: (a as PhoneAddiction).apps.map((app) => ({
                                      ...app,
                                      currentUsage: 0,
                                      blocked: false,
                                    })),
                                  };
                                }
                                return a;
                              })
                            );
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-[10px] transition-colors"
                        >
                          Reset day
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Other Addiction Detail Modal */}
        {showOtherDetail && (() => {
          const addiction = otherAddictions.find(a => a.id === showOtherDetail);
          if (!addiction) return null;
          
          const elapsed = getCountdown(addiction.startTime);
          const daysClean = getDaysClean(addiction.startDate);
          
          const money = calculateMoneySaved(addiction, daysClean);
          
          // Calculate other stats
          const hoursSaved = daysClean * 24;
          const cigarettesAvoided = addiction.type === "vape" ? daysClean * 20 : 0; // Assuming 20 cigarettes/day
          const drinksAvoided = addiction.type === "goon" ? daysClean * 6 : 0; // Assuming 6 drinks/day

          return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800 my-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-4xl mb-2">{getAddictionIcon(addiction)}</div>
                    <h2 className="text-2xl font-bold text-white">{addiction.name}</h2>
                  </div>
                  <button
                    onClick={() => setShowOtherDetail(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Money Saved */}
                <div className="bg-gray-800 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">💰 Money Saved</h3>
                  <div className="text-center">
                    <p className="text-5xl font-bold text-green-400 mb-2">
                      {money.currency}
                      {money.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-gray-400">Total saved in {daysClean} days</p>
                    <p className="text-gray-500 text-sm mt-2">
                      ~{money.currency}{money.daily.toLocaleString()} per day
                    </p>
                    {money.hourly !== undefined && (
                      <p className="text-gray-500 text-xs mt-1">
                        ~{money.currency}{money.hourly.toFixed(2)} per hour (updates every hour)
                      </p>
                    )}
                  </div>
                </div>

                {/* Time Clean */}
                <div className="bg-gray-800 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">⏱️ Time Clean</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-white">{elapsed.days ?? 0}</div>
                      <div className="text-gray-400 text-sm">Days</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-white">{elapsed.hours ?? 0}</div>
                      <div className="text-gray-400 text-sm">Hours</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-white">{elapsed.minutes ?? 0}</div>
                      <div className="text-gray-400 text-sm">Minutes</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-white">{elapsed.seconds ?? 0}</div>
                      <div className="text-gray-400 text-sm">Seconds</div>
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="bg-gray-800 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">📊 Additional Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">{daysClean}</div>
                      <div className="text-gray-400 text-sm">Days Clean</div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">{hoursSaved}</div>
                      <div className="text-gray-400 text-sm">Hours Saved</div>
                    </div>
                    {cigarettesAvoided > 0 && (
                      <div className="bg-gray-900 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-white">{cigarettesAvoided.toLocaleString()}</div>
                        <div className="text-gray-400 text-sm">Cigarettes Avoided</div>
                      </div>
                    )}
                    {drinksAvoided > 0 && (
                      <div className="bg-gray-900 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-white">{drinksAvoided.toLocaleString()}</div>
                        <div className="text-gray-400 text-sm">Drinks Avoided</div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    setAddictions(addictions.filter((a) => a.id !== addiction.id))
                  }
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Remove This Addiction
                </button>
              </div>
            </div>
          );
        })()}

      </div>
      <div className="pb-20">
        {/* Spacer for bottom navigation */}
      </div>
      <BottomNav />
    </div>
  );
}

