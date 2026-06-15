import type { Metadata } from "next";
import "./globals.css";
import NavWrapper from "@/components/NavWrapper";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <NavWrapper />
      </body>
    </html>
  );
}
