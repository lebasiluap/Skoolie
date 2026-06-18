import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import PageTracker from "@/components/PageTracker";
import ThemeProvider from "@/components/ThemeProvider";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

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
    <html lang="en" className={`h-full ${nunito.variable}`}>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-nunito), 'Nunito', system-ui, -apple-system, sans-serif" }}
      >
        <ThemeProvider />
        <PageTracker />
        {children}
      </body>
    </html>
  );
}
