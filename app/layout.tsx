import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OnboardingCheck from "./onboarding-check";
import NotificationSetup from "@/components/NotificationSetup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mogifi AI - Your All-in-One Self-Improvement App",
  description: "Personalized gym plans, workout tracking, addiction recovery, and calendar reminders all in one place",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden h-full flex flex-col`}
      >
        <OnboardingCheck>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-touch">
            <NotificationSetup />
            {children}
          </div>
        </OnboardingCheck>
      </body>
    </html>
  );
}
