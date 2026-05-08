import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "DailyDiary.in — Your Encrypted Journal",
  description:
    "A secure, habit-driven journaling platform with templates, challenges, and gamification. Write daily, build streaks, earn badges.",
  keywords: [
    "diary",
    "journal",
    "daily diary",
    "encrypted journal",
    "habit tracker",
    "gratitude journal",
  ],
};

import ClientLayout from "@/components/ClientLayout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${lora.variable}`}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
