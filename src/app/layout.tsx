import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ScrollMotion } from "@/components/ui/ScrollMotion";
import { ServiceWorkerRegistration } from "@/components/ui/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Basechan Enterprise Asset Manager",
  description: "Enterprise IT Hardware, Digital Credentials, Workbooks & Facilities Asset Command",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <ThemeProvider>
          <AuthProvider><ServiceWorkerRegistration /><ScrollMotion>{children}</ScrollMotion></AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
