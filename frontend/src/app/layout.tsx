import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, Inter, Outfit } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "DailyDiary.in",
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
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${lora.variable} ${inter.variable} ${outfit.variable}`}>
      <body>
        <Toaster position="top-right" />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
