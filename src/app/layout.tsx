import type { Metadata, Viewport } from "next";
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

// Tint the browser chrome (iOS Safari status bar / Android address bar) to
// match the dark landing hero instead of defaulting to white, and let the
// page extend into the notch/safe areas like native-feeling sites do.
export const viewport: Viewport = {
  themeColor: "#0C1211",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://skoolieapp.com"),
  title: "Skoolie — Study smarter. Pass with confidence.",
  description:
    "MCQs, flashcards, and clinical cases for pharmacy, medicine, and nursing students — with streaks, leagues, and a daily challenge that make exam prep feel like a game.",
  openGraph: {
    title: "Skoolie — Study smarter. Pass with confidence.",
    description:
      "50,000+ MCQs, flashcards, and clinical cases with streaks, leagues, and a daily challenge. Exam prep that feels like a game you actually want to win.",
    url: "https://skoolieapp.com",
    siteName: "Skoolie",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "Skoolie — Cappy the mascot" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Skoolie — Study smarter. Pass with confidence.",
    description:
      "Exam prep for health students that feels like a game you actually want to win.",
    images: ["/icon.png"],
  },
  robots: { index: true, follow: true },
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
