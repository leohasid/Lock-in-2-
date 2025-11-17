import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OnboardingCheck from "./onboarding-check";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Locked In - Your All-in-One Self-Improvement App",
  description: "Personalized gym plans, workout tracking, addiction recovery, and calendar reminders all in one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OnboardingCheck>{children}</OnboardingCheck>
      </body>
    </html>
  );
}
