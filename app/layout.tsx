import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/lib/provider";
import { Toaster } from "react-hot-toast";
import localFont from "next/font/local";
import { NextStep, NextStepProvider } from "nextstepjs";
import { CustomCard } from "@/components/ui/CustomCard";
import { Roboto } from "next/font/google";
import { steps } from "@/lib/steps";

const roboto = Roboto({
  weight: ["400", "700"], // choose weights you need
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Nomadic Bookings - Desert Camping Experience",
  description:
    "Experience the ultimate desert camping adventure with Nomadic Bookings",
 
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={roboto.variable}>
        <NextStepProvider>
          <NextStep steps={steps} cardComponent={CustomCard}>
            <Providers>{children}</Providers>
            <Toaster position="top-right" reverseOrder={false} />
            <Analytics />
          </NextStep>
        </NextStepProvider>
      </body>
    </html>
  );
}
