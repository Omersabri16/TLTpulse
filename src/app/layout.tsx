import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: "TLTpulse", template: "%s · TLTpulse" },
  description: "Yazılımcılar için kanıta dayalı profil, lig ve takım yarışmaları.",
  openGraph: {
    title: "TLTpulse",
    description: "Yazılımcılar için kanıta dayalı profil, lig ve takım yarışmaları.",
    images: [{ url: "/logo.png", width: 480, height: 444, alt: "TLTpulse" }],
  },
  twitter: { card: "summary_large_image", images: ["/logo.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${dmSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-center" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
