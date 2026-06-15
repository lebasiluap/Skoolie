import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavWrapper from "@/components/NavWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Skoolie — Healthcare Test Companion",
  description: "Ace your pharmacy, medicine, and nursing exams with smart MCQs, flashcards, and case studies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-white">
        {children}
        <NavWrapper />
      </body>
    </html>
  );
}
