"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, Shield, Calendar, Dumbbell } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/nutrition", icon: UtensilsCrossed, label: "Calories" },
    { href: "/addictions", icon: Shield, label: "Addiction" },
    { href: "/gym", icon: Dumbbell, label: "Fitness" },
    { href: "/calendar", icon: Calendar, label: "Calendar" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50">
      <div className="flex justify-between items-center px-4 py-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center transition-colors ${
                isActive ? "text-teal-400" : "text-gray-500 hover:text-teal-400"
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

