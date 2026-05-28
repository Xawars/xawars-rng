import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SoundProvider } from "./context/SoundContext";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { MasteryProvider } from "./context/MasteryContext";
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
            <MasteryProvider>
              <SoundProvider>
                <OnboardingProvider>
                  {children}
                </OnboardingProvider>
              </SoundProvider>
            </MasteryProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
