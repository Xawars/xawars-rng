import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { OnboardingProvider } from "./components/onboarding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XAWARS RNG",
  description: "Rainbow Six Siege operator randomizer",
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
        <AuthProvider>
          <DataProvider>
            <OnboardingProvider>
              {children}
            </OnboardingProvider>
          </DataProvider>
        </AuthProvider>
        {/* Noise texture overlay */}
        <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden="true">
          <div className="w-full h-full bg-repeat opacity-[0.06]" style={{ backgroundImage: 'url(/img/noise-texture.png)', backgroundSize: '109px' }} />
        </div>
      </body>
    </html>
  );
}
