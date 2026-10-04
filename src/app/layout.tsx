import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { RealtimeBridge } from "@/components/realtime";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { currentUser } from "@/lib/server/auth";
import { EMPTY_ME, loadMe } from "@/lib/server/me";
import { AppProvider } from "@/lib/store";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "TLTpulse", template: "%s · TLTpulse" },
  description: "Yazılımcılar için kanıta dayalı profil, lig ve takım yarışmaları.",
  openGraph: {
    title: "TLTpulse",
    description: "Yazılımcılar için kanıta dayalı profil, lig ve takım yarışmaları.",
    images: [{ url: "/logo.png", width: 480, height: 444, alt: "TLTpulse" }],
  },
  twitter: { card: "summary_large_image", images: ["/logo.png"] },
};

async function initialMe() {
  const user = await currentUser();
  if (!user) return EMPTY_ME;
  try {
    return await loadMe(user.id, user.email);
  } catch (e) {
    console.error("[loadMe]", e instanceof Error ? e.message : e);
    return EMPTY_ME;
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = await initialMe();
  return (
    <html lang="tr" className={`${dmSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppProvider initial={me}>
            <TooltipProvider>
              {children}
              <RealtimeBridge />
              <Toaster position="bottom-center" />
            </TooltipProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
