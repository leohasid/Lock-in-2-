"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import BottomNav from "@/components/BottomNav";
import { appBlockingBridge } from "@/app/utils/app-blocking";
import { showImmediateNotification, requestNotificationPermission } from "@/app/utils/notifications";
import { Shield, X, PiggyBank, Plus, Flame, Users } from "lucide-react";
import Link from "next/link";

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
  bestStreak?: number; // Best streak in days
}

interface OtherAddiction {
  id: string;
  type: "vape" | "goon" | "other";
  name: string;
  startDate: string;
  startTime: string; // ISO timestamp for precise countdown
  weeklySpend?: number;
  bestStreak?: number; // Best streak in days
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
    Capacitor?: {
      isNativePlatform: () => boolean;
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
  };

  const determineCurrency = (): CurrencyInfo => {
    if (typeof window === "undefined") return { code: "USD", symbol: "$" };
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    for (const [key, value] of Object.entries(currencyMap)) {
      if (timezone.includes(key)) {
        return value;
      }
    }
    return { code: "USD", symbol: "$" };
  };

  const applySyncedUsage = (snapshot: PhoneUsageSnapshot) => {
    setAddictions((prev) =>
      prev.map((addiction) => {
        if ("apps" in addiction) {
          const phoneAddiction = addiction as PhoneAddiction;
          const updatedApps = phoneAddiction.apps.map((app) => {
            const syncedApp = snapshot.apps?.find((a) => a.appName === app.appName);
            if (syncedApp) {
            return {
              ...app,
                currentUsage: syncedApp.minutes || 0,
                blocked: syncedApp.blocked || false,
            };
            }
            return app;
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
  const notificationShownRef = useRef<Set<string>>(new Set());
  const prevUsageRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
    setAddictions((prev) => {
      let hasChanges = false;
      const updated = prev.map((addiction) => {
        if ("apps" in addiction) {
          const phoneAddiction = addiction as PhoneAddiction;
          const totalUsage = phoneAddiction.apps.reduce((sum, app) => sum + app.currentUsage, 0);
          const totalLimit = phoneAddiction.totalDailyLimit;
          const usagePercent = totalLimit > 0 ? (totalUsage / totalLimit) * 100 : 0;

          const updatedApps = phoneAddiction.apps.map((app) => {
            const shouldBeBlocked = app.currentUsage >= app.dailyLimit;
            const usageKey = `${phoneAddiction.id}-${app.appName}`;
            const prevUsage = prevUsageRef.current[usageKey] || 0;
            
            const usageChanged = app.currentUsage !== prevUsage;
            if (usageChanged) {
              prevUsageRef.current[usageKey] = app.currentUsage;
            }
            
            if (shouldBeBlocked && !app.blocked) {
              hasChanges = true;
              blockAppNative(app.appName, true);
              
              const notificationKey = `blocked-${app.appName}`;
              if (!notificationShownRef.current.has(notificationKey)) {
                showImmediateNotification(`🚫 ${app.appName} Blocked`, "Daily limit reached!");
                notificationShownRef.current.add(notificationKey);
              }
              
              return { ...app, blocked: true };
            }
            
            // Check if it's a new day and unblock
              const today = new Date().toISOString().split("T")[0];
              const lastResetDate = localStorage.getItem(`lastResetDate-${phoneAddiction.id}`);
            if (lastResetDate !== today && app.blocked) {
                hasChanges = true;
                blockAppNative(app.appName, false);
                notificationShownRef.current.delete(`blocked-${app.appName}`);
                localStorage.setItem(`lastResetDate-${phoneAddiction.id}`, today);
                return { ...app, blocked: false };
            }
            
            return app;
          });

          const warningKey = `warning-${phoneAddiction.id}`;
          if (usagePercent >= 80 && usagePercent < 100 && !phoneAddiction.blocked && !notificationShownRef.current.has(warningKey)) {
            showImmediateNotification("⚠️ Phone Usage Warning", `You've used ${Math.round(usagePercent)}% of your daily limit!`);
            notificationShownRef.current.add(warningKey);
          }

          const shouldBlockAll = usagePercent >= 100;
          const allBlocked = updatedApps.every((app) => app.blocked) || shouldBlockAll;

          if (shouldBlockAll && !phoneAddiction.blocked) {
            hasChanges = true;
            updatedApps.forEach((app) => {
              if (!app.blocked) {
                blockAppNative(app.appName, true);
              }
            });
            
            const allBlockedKey = `all-blocked-${phoneAddiction.id}`;
            if (!notificationShownRef.current.has(allBlockedKey)) {
              showImmediateNotification("🚫 Phone Blocked", "Daily limit exceeded! Apps are now blocked.");
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
      
      return hasChanges ? updated : prev;
    });
  }, [currentTime]);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
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

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PhoneUsageSnapshot>).detail;
      applySyncedUsage(detail);
    };
    window.addEventListener("phoneUsageUpdate", handler);

    syncPhoneData();
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

  // Update best streak for each addiction
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    
    setAddictions((prev) => {
      return prev.map((addiction) => {
        const daysClean = getDaysClean(addiction.startDate);
        const currentBestStreak = addiction.bestStreak || 0;
        const newBestStreak = Math.max(currentBestStreak, daysClean);
        
        if (newBestStreak !== currentBestStreak) {
          return { ...addiction, bestStreak: newBestStreak };
        }
        return addiction;
      });
    });
  }, [currentTime, isLoaded]);

  // Save addictions to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;
    localStorage.setItem("addictions", JSON.stringify(addictions));
    
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
        const existingPhone = addictions.find((a) => "apps" in a) as PhoneAddiction | undefined;
        
        if (existingPhone) {
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
          const phoneAddiction: PhoneAddiction = {
            id: Date.now().toString(),
            name: "Phone",
            startDate: new Date().toISOString().split("T")[0],
            apps: [],
            totalDailyLimit: newAddiction.dailyLimit ? parseInt(newAddiction.dailyLimit) : 120,
            totalCurrentUsage: 0,
            blocked: false,
          };
          setAddictions([...addictions, phoneAddiction]);
        }
      } else {
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
          startTime: new Date().toISOString(),
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

  const blockAppNative = async (appName: string, block: boolean) => {
    try {
      await appBlockingBridge.blockApp(appName, block);
      if (block && typeof window !== "undefined") {
        showImmediateNotification(`🚫 ${appName} Blocked`, "Daily limit reached! (Native blocking requires iOS app)");
      }
    } catch (error) {
      console.error("Failed to block app:", error);
    }
  };

  const getCountdown = (startTime: string | undefined) => {
    if (!startTime) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    let start: Date;
    if (/^\d+$/.test(startTime)) {
      start = new Date(parseInt(startTime, 10));
    } else {
      start = new Date(startTime);
    }

    const now = currentTime;
    
    if (isNaN(start.getTime())) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const diff = now.getTime() - start.getTime();
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

  const formatTimeUntilBlock = (remainingMinutes: number) => {
    if (remainingMinutes <= 0) return "Blocked";
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    if (hours === 0) return `${minutes}m left`;
    if (minutes === 0) return `${hours}h left`;
    return `${hours}h ${minutes}m left`;
  };

  // Format countdown as 00:00:00:00 (days:hours:minutes:seconds)
  const formatCountdownTime = (elapsed: { days: number; hours: number; minutes: number; seconds: number }) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(elapsed.days)}:${pad(elapsed.hours)}:${pad(elapsed.minutes)}:${pad(elapsed.seconds)}`;
  };

  // Calculate total saved across all addictions
  const totalSaved = useMemo(() => {
    return otherAddictions.reduce((sum, addiction) => {
      const daysClean = getDaysClean(addiction.startDate);
      const money = calculateMoneySaved(addiction, daysClean);
      return sum + money.total;
    }, 0);
  }, [otherAddictions, currentTime, currencyInfo]);

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="max-w-md mx-auto px-4 pt-6">
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Recovery</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-xl text-sm font-semibold hover:bg-teal-400/15 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Track New
        </button>
      </div>

      {/* Support Community */}
      <Link
        href="/addictions/support"
        className="flex items-center gap-3 w-full bg-[#0c1422] border border-white/8 rounded-2xl p-4 mb-4 hover:border-teal-500/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Support Community</p>
          <p className="text-[11px] text-gray-500">Connect with others on the same journey</p>
        </div>
        <span className="text-[10px] font-semibold text-teal-400 bg-teal-400/10 border border-teal-400/20 px-2 py-0.5 rounded-full">Join</span>
      </Link>

      {/* ADDICTIONS LIST */}
      <div className="space-y-3">
        {/* Phone */}
        {phoneAddictions.length > 0 && (() => {
          const phoneAddiction = phoneAddictions[0];
          const daysClean = getDaysClean(phoneAddiction.startDate);
          const bestStreak = phoneAddiction.bestStreak || daysClean;
          const totalRemaining = Math.max(phoneAddiction.totalDailyLimit - phoneAddiction.totalCurrentUsage, 0);
          const totalRemainingMinutes = totalRemaining;
          const totalPercent = phoneAddiction.totalDailyLimit > 0 
            ? Math.min((phoneAddiction.totalCurrentUsage / phoneAddiction.totalDailyLimit) * 100, 100)
            : 0;

          return (
            <button
              onClick={() => setShowPhoneDetail(true)}
              className="w-full bg-[#0c1422] border border-white/8 rounded-2xl p-4 hover:border-teal-500/30 transition-colors text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Phone</p>
                    <p className="text-[11px] text-teal-400/70">{daysClean} days clean</p>
                  </div>
                </div>
                {daysClean >= 1 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-400/10 border border-orange-400/20 rounded-full">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-bold text-orange-400">{daysClean}d</span>
                  </span>
                )}
              </div>

              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Screen Time Today</p>
              <p className="text-xs font-semibold text-teal-300 mb-2">
                {formatMinutes(phoneAddiction.totalCurrentUsage)} / {formatMinutes(phoneAddiction.totalDailyLimit)}
              </p>

              <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalPercent >= 100 ? "bg-red-400" : totalPercent >= 80 ? "bg-amber-400" : "bg-teal-400"
                  }`}
                  style={{ width: `${totalPercent}%` }}
                />
              </div>

              {phoneAddiction.apps.length > 0 && (() => {
                const sortedApps = [...phoneAddiction.apps].sort((a, b) => {
                  const remainingA = Math.max(a.dailyLimit - a.currentUsage, 0);
                  const remainingB = Math.max(b.dailyLimit - b.currentUsage, 0);
                  return remainingA - remainingB;
                });
                return (
                  <div className="space-y-1.5 mt-2">
                    {sortedApps.slice(0, 3).map((app) => {
                      const percent = app.dailyLimit > 0
                        ? Math.min((app.currentUsage / app.dailyLimit) * 100, 100)
                        : 0;
                      return (
                        <div key={app.appName} className="flex items-center gap-2">
                          <span className="text-[10px] w-16 truncate text-gray-500">{app.appName}</span>
                          <div className="flex-1 bg-white/8 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${percent >= 100 ? "bg-red-400" : percent >= 80 ? "bg-amber-400" : "bg-teal-400"}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] w-12 text-right text-gray-600">
                            {formatTimeUntilBlock(Math.max(app.dailyLimit - app.currentUsage, 0))}
                          </span>
                        </div>
                      );
                    })}
                    {phoneAddiction.apps.length > 3 && (
                      <p className="text-[10px] text-gray-600">+{phoneAddiction.apps.length - 3} more apps</p>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] text-gray-500">Best streak:</span>
                <span className="text-[11px] font-bold text-orange-400">{bestStreak}d</span>
              </div>
            </button>
          );
        })()}

        {/* Other Addictions */}
        {otherAddictions.map((addiction) => {
          const elapsed = getCountdown(addiction.startTime);
          const daysClean = getDaysClean(addiction.startDate);
          const money = calculateMoneySaved(addiction, daysClean);
          const bestStreak = addiction.bestStreak || daysClean;

          const typeColor = addiction.type === "vape"
            ? { icon: "bg-orange-400/10 border-orange-400/20 text-orange-400", timer: "text-orange-300", hover: "hover:border-orange-400/30", sub: "text-orange-400/70" }
            : addiction.type === "goon"
            ? { icon: "bg-violet-400/10 border-violet-400/20 text-violet-400", timer: "text-violet-300", hover: "hover:border-violet-400/30", sub: "text-violet-400/70" }
            : { icon: "bg-blue-400/10 border-blue-400/20 text-blue-400", timer: "text-blue-300", hover: "hover:border-blue-400/30", sub: "text-blue-400/70" };

          return (
            <button
              key={addiction.id}
              onClick={() => setShowOtherDetail(addiction.id)}
              className={`w-full bg-[#0c1422] border border-white/8 rounded-2xl p-4 ${typeColor.hover} transition-colors text-left`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${typeColor.icon}`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{addiction.name}</p>
                    <p className={`text-[11px] ${typeColor.sub}`}>{daysClean} days clean</p>
                  </div>
                </div>
                {daysClean >= 1 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-400/10 border border-orange-400/20 rounded-full">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-bold text-orange-400">{daysClean}d</span>
                  </span>
                )}
              </div>

              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">Time clean</p>
              <p className={`text-2xl font-black font-mono tracking-wider mb-3 ${typeColor.timer}`}>{formatCountdownTime(elapsed)}</p>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">Best streak:</span>
                  <span className="text-[11px] font-bold text-orange-400">{bestStreak}d</span>
                </div>
                {money.total > 0 && (
                  <div className="flex items-center gap-1.5">
                    <PiggyBank className="w-3 h-3 text-teal-400" />
                    <span className="text-[11px] font-bold text-teal-400">{currencyInfo.symbol}{money.total.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Total Saved Summary */}
      {otherAddictions.length > 0 && totalSaved > 0 && (
        <div className="mt-5 bg-[#0c1422] border border-white/8 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Total Saved</p>
              <p className="text-lg font-bold text-teal-400">{currencyInfo.symbol}{totalSaved.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {addictions.length === 0 && (
        <div className="bg-[#0c1422] border border-white/8 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-teal-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Start Your Recovery Journey</h3>
          <p className="text-gray-500 text-sm mb-5">Track your progress and celebrate every win.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-teal-400/10 border border-teal-400/20 text-teal-400 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-400/15 transition-colors"
          >
            Track Your First Addiction
          </button>
        </div>
      )}

      {/* ADD ADDICTION MODAL */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-md w-full border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Track New Addiction</h2>
              <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium mb-2">Addiction Type</label>
                  <select
                    value={newAddiction.type}
                    onChange={(e) =>
                      setNewAddiction({ ...newAddiction, type: e.target.value as any })
                    }
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 text-white p-3 rounded-lg text-sm"
                  >
                    <option value="phone">📱 Phone/Social Media</option>
                    <option value="vape">💨 Vape/Nicotine</option>
                    <option value="goon">🍷 Alcohol</option>
                    <option value="other">🚫 Other</option>
                  </select>
                </div>
                {newAddiction.type === "phone" ? (
                  <div>
                  <label className="block text-sm font-medium mb-2">Total Daily Limit (minutes)</label>
                    <input
                      type="number"
                      value={newAddiction.dailyLimit}
                      onChange={(e) =>
                        setNewAddiction({ ...newAddiction, dailyLimit: e.target.value })
                      }
                      placeholder="e.g., 120 (2 hours)"
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 text-white p-3 rounded-lg text-sm"
                    />
                  </div>
                ) : newAddiction.type === "other" ? (
                  <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={newAddiction.name}
                      onChange={(e) => setNewAddiction({ ...newAddiction, name: e.target.value })}
                    placeholder="e.g., Gambling"
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 text-white p-3 rounded-lg text-sm"
                    />
                  </div>
                ) : null}
                {(newAddiction.type === "vape" || newAddiction.type === "goon" || newAddiction.type === "other") && (
                  <div>
                  <label className="block text-sm font-medium mb-2">
                    Weekly Spend ({currencyInfo.symbol})
                    </label>
                    <input
                      type="number"
                      value={newAddiction.weeklySpend}
                      onChange={(e) => setNewAddiction({ ...newAddiction, weeklySpend: e.target.value })}
                      placeholder="e.g., 150"
                    className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 text-white p-3 rounded-lg text-sm"
                      min="0"
                    />
                  </div>
                )}
              <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddAddiction}
                  className="flex-1 bg-teal-400 hover:bg-teal-500 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Start Tracking
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAddiction({ type: "phone", name: "", dailyLimit: "", weeklySpend: "" });
                    }}
                  className="flex-1 bg-[rgba(20,30,35,0.85)] border border-white/10 hover:bg-[rgba(20,30,35,1)] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* APP SETTINGS MODAL */}
      {showAppSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Manage Apps</h2>
                      <button
                onClick={() => {
                  setShowAppSettings(null);
                  setNewApp({ appName: "", dailyLimit: "" });
                }}
                className="text-white/40 hover:text-white"
                      >
                <X className="w-5 h-5" />
                      </button>
                    </div>
              <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium mb-2">App Name</label>
                  <input
                    type="text"
                    value={newApp.appName}
                    onChange={(e) => setNewApp({ ...newApp, appName: e.target.value })}
                  placeholder="e.g., Instagram, TikTok..."
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 text-white p-3 rounded-lg text-sm"
                  />
                </div>
                <div>
                <label className="block text-sm font-medium mb-2">Daily Limit (minutes)</label>
                  <input
                    type="number"
                    value={newApp.dailyLimit}
                    onChange={(e) => setNewApp({ ...newApp, dailyLimit: e.target.value })}
                    placeholder="e.g., 30"
                  className="w-full bg-[rgba(20,30,35,0.85)] border border-white/10 text-white p-3 rounded-lg text-sm"
                  />
                </div>
              <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleAddApp(showAppSettings)}
                  className="flex-1 bg-teal-400 hover:bg-teal-500 text-black px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Add App
                  </button>
                  <button
                    onClick={() => {
                      setShowAppSettings(null);
                      setNewApp({ appName: "", dailyLimit: "" });
                    }}
                  className="flex-1 bg-[rgba(20,30,35,0.85)] border border-white/10 hover:bg-[rgba(20,30,35,1)] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* PHONE DETAIL MODAL */}
        {showPhoneDetail && phoneAddictions.length > 0 && (() => {
        const phoneAddiction = phoneAddictions[0];
        const daysClean = getDaysClean(phoneAddiction.startDate);
        const totalRemaining = Math.max(phoneAddiction.totalDailyLimit - phoneAddiction.totalCurrentUsage, 0);

          return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Phone</h2>
                  <button
                    onClick={() => setShowPhoneDetail(false)}
                  className="text-white/40 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Today's Usage</p>
                  <p className="text-2xl font-bold">
                    {formatMinutes(phoneAddiction.totalCurrentUsage)} / {formatMinutes(phoneAddiction.totalDailyLimit)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeUntilBlock(totalRemaining)} until block
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Apps</p>
                      <button
                        onClick={() => {
                          setShowPhoneDetail(false);
                        setShowAppSettings(phoneAddiction.id);
                        }}
                      className="text-xs text-teal-400 hover:text-teal-300"
                      >
                        Manage
                      </button>
                    </div>
                  <div className="space-y-2">
                    {phoneAddiction.apps.length === 0 ? (
                      <p className="text-xs text-gray-400">No apps configured</p>
                    ) : (() => {
                      // Sort apps by remaining time (closest to block first)
                      const sortedApps = [...phoneAddiction.apps].sort((a, b) => {
                        const remainingA = Math.max(a.dailyLimit - a.currentUsage, 0);
                        const remainingB = Math.max(b.dailyLimit - b.currentUsage, 0);
                        return remainingA - remainingB; // Sort ascending (lowest remaining first)
                      });

                      return sortedApps.map((app) => {
                          const remaining = Math.max(app.dailyLimit - app.currentUsage, 0);
                        const percent = app.dailyLimit > 0 
                              ? Math.min((app.currentUsage / app.dailyLimit) * 100, 100)
                              : 0;
                        const isCloseToBlock = percent >= 80 && percent < 100;
                        const isBlocked = percent >= 100;
                        
                          return (
                            <div
                            key={app.appName} 
                            className={`rounded-lg p-3 border ${
                              isBlocked ? "bg-red-500/10 border-red-500/30" :
                              isCloseToBlock ? "bg-yellow-500/10 border-yellow-500/30" :
                              "bg-[rgba(20,30,35,0.6)] border-white/5"
                            }`}
                            >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-medium ${
                                isBlocked ? "text-red-400" :
                                isCloseToBlock ? "text-yellow-400" :
                                "text-white"
                              }`}>
                                {app.appName}
                              </span>
                              <span className={`text-xs ${
                                isBlocked ? "text-red-400" :
                                isCloseToBlock ? "text-yellow-400" :
                                "text-gray-400"
                              }`}>
                                  {formatMinutes(app.currentUsage)} / {formatMinutes(app.dailyLimit)}
                                </span>
                              </div>
                            <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                                <div
                                className={`h-2 rounded-full ${
                                  percent >= 100 ? "bg-red-500" : percent >= 80 ? "bg-yellow-500" : "bg-[#14f1d9]"
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            <p className={`text-xs ${
                              isBlocked ? "text-red-400 font-semibold" :
                              isCloseToBlock ? "text-yellow-400 font-medium" :
                              "text-gray-400"
                            }`}>
                              {formatTimeUntilBlock(remaining)}
                            </p>
                            </div>
                          );
                      });
                    })()}
                      </div>
                  </div>

                <div className="flex items-center gap-2 pt-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-400">Streak: {daysClean} Days</span>
                      </div>

                <button
                  onClick={() => {
                    const now = new Date();
                    setAddictions(addictions.map((a) => {
                      if (!("apps" in a) || a.id !== phoneAddiction.id) return a;
                      return { ...a, startDate: now.toISOString().split("T")[0], bestStreak: 0 };
                    }));
                    setShowPhoneDetail(false);
                  }}
                  className="w-full mt-4 py-2.5 bg-amber-600/90 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors"
                >
                  Reset Streak
                </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* OTHER ADDICTION DETAIL MODAL */}
        {showOtherDetail && (() => {
          const addiction = otherAddictions.find(a => a.id === showOtherDetail);
          if (!addiction) return null;
          
          const elapsed = getCountdown(addiction.startTime);
          const daysClean = getDaysClean(addiction.startDate);
        const bestStreak = addiction.bestStreak || daysClean;
          const money = calculateMoneySaved(addiction, daysClean);

          return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-[#0c1422] to-black rounded-2xl p-6 max-w-md w-full border border-white/10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                  <div>
                  <div className="text-3xl mb-2">{getAddictionIcon(addiction)}</div>
                  <h2 className="text-xl font-semibold">{addiction.name}</h2>
                  </div>
                  <button
                    onClick={() => setShowOtherDetail(null)}
                  className="text-white/40 hover:text-white"
                  >
                  <X className="w-5 h-5" />
                  </button>
                </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Best Streak</p>
                  <p className="text-lg font-semibold text-white mb-3">
                    {bestStreak} Day{bestStreak !== 1 ? 's' : ''}
                  </p>
                  </div>
                    <div>
                  <p className="text-sm text-gray-400 mb-1">Time Clean</p>
                  <div className="text-2xl font-bold text-white font-mono tracking-wider">
                    {formatCountdownTime(elapsed)}
                    </div>
                    </div>

                {money && money.total > 0 && (
                    <div>
                    <div className="flex items-center gap-2 mb-1">
                      <PiggyBank className="w-4 h-4 text-[#14f1d9]" />
                      <p className="text-sm text-gray-400">Saved</p>
                    </div>
                    <p className="text-xl font-bold text-[#14f1d9]">
                      {currencyInfo.symbol}{money.total.toFixed(2)}
                    </p>
                      </div>
                    )}

                <button
                  onClick={() => {
                    const now = new Date();
                    setAddictions(addictions.map((a) => {
                      if (a.id !== addiction.id) return a;
                      return { ...a, startDate: now.toISOString().split("T")[0], startTime: now.toISOString(), bestStreak: 0 };
                    }));
                    setShowOtherDetail(null);
                  }}
                  className="w-full bg-amber-600/90 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Reset Streak
                </button>
                <button
                  onClick={() =>
                    setAddictions(addictions.filter((a) => a.id !== addiction.id))
                  }
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Remove This Addiction
                </button>
              </div>
              </div>
            </div>
          );
        })()}

      </div>
      <BottomNav />
    </div>
  );
}
