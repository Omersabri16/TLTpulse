"use client";

import { Bell, LogOut, Menu, MessageSquare, Gauge, ShieldCheck, UserRound, Wrench, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo, UserAvatar } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/app/actions/auth";
import { markNotificationsRead } from "@/app/actions/profile";
import { useAct, useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const MEMBER_LINKS = [
  { href: "/profil", label: "Profil" },
  { href: "/projeler", label: "Projeler" },
  { href: "/lig", label: "Lig" },
  { href: "/yarismalar", label: "Yarışmalar" },
  { href: "/yol-haritasi", label: "Yol haritam" },
];
const GUEST_LINKS = [
  { href: "/", label: "Ana sayfa" },
  { href: "/lig", label: "Lig" },
];

export function SiteHeader() {
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const isAdmin = useApp((s) => s.isAdmin);
  const incoming = useApp((s) => s.connectionRequests.incoming.length);
  const notifications = useApp((s) => s.notifications);
  const markAllRead = useApp((s) => s.markAllRead);
  const act = useAct();
  const markRead = () => {
    if (!notifications.some((n) => !n.read)) return;
    markAllRead();
    void act(markNotificationsRead(), { silent: true });
  };
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const member = !!session;
  const links = member ? MEMBER_LINKS : GUEST_LINKS;
  const unread = notifications.filter((n) => !n.read).length;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <header className="no-print sticky top-0 z-40 border-b border-navy-line bg-navy text-on-navy">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Ana menü">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm text-on-navy-muted transition hover:text-on-navy",
                isActive(l.href) && "bg-navy-2 font-semibold text-on-navy",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {member ? (
            <>
              <Link href="/mesajlar" className="grid size-9 place-items-center rounded-full text-on-navy-muted hover:bg-navy-2 hover:text-on-navy" aria-label="Mesajlar">
                <MessageSquare className="size-[18px]" />
              </Link>

              <DropdownMenu onOpenChange={(o) => !o && unread && markRead()}>
                <DropdownMenuTrigger className="relative grid size-9 place-items-center rounded-full text-on-navy-muted hover:bg-navy-2 hover:text-on-navy" aria-label="Bildirimler">
                  <Bell className="size-[18px]" />
                  {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-cyan" />}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-2">
                  <DropdownMenuGroup>
                  <DropdownMenuLabel>Bildirimler</DropdownMenuLabel>
                  {notifications.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Yeni bildirim yok.</p>}
                  {notifications.slice(0, 6).map((n) => (
                    <DropdownMenuItem key={n.id} onClick={() => router.push(n.href)} className="items-start gap-3 rounded-lg px-2 py-2.5">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-cyan")} />
                      <span className="flex-1 leading-snug">
                        {n.text}
                        <span className="mt-0.5 block text-xs text-muted-foreground">{n.at}</span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="ml-1 rounded-full" aria-label="Hesap menüsü">
                  <UserAvatar name={profile?.name ?? "?"} className="size-9 text-xs" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-foreground">
                      <span className="block text-sm font-semibold">{profile?.name}</span>
                      <span className="block font-normal text-muted-foreground">{profile?.email}</span>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profil")}>
                    <UserRound /> Profilim
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/baglantilar")}>
                    <Users /> Bağlantılarım
                    {incoming > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">{incoming}</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/puan")}>
                    <Gauge /> Puanım
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/hesap")}>
                    <ShieldCheck /> Hesap ve gizlilik
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push("/yonetim")}>
                      <Wrench /> Yönetim
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={async () => {
                      await act(logout());
                      router.push("/");
                      router.refresh();
                    }}
                  >
                    <LogOut /> Çıkış yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/giris" className="rounded-full px-4 py-2 text-sm font-semibold text-on-navy hover:bg-navy-2">
                Giriş yap
              </Link>
              <Link href="/kayit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Kayıt ol
              </Link>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="grid size-9 place-items-center rounded-full text-on-navy-muted hover:bg-navy-2 md:hidden" aria-label="Menüyü aç">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <SheetTitle className="mb-4">Menü</SheetTitle>
              <nav className="flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn("rounded-xl px-4 py-3 text-sm", isActive(l.href) ? "bg-secondary font-semibold text-secondary-foreground" : "hover:bg-muted")}
                  >
                    {l.label}
                  </Link>
                ))}
                {member ? (
                  <>
                    <Link href="/mesajlar" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm hover:bg-muted">
                      Mesajlar
                    </Link>
                    <Link href="/baglantilar" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm hover:bg-muted">
                      Bağlantılarım{incoming > 0 && ` (${incoming} yeni istek)`}
                    </Link>
                    <Link href="/puan" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm hover:bg-muted">
                      Puanım
                    </Link>
                    <Link href="/hesap" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm hover:bg-muted">
                      Hesap ve gizlilik
                    </Link>
                    {isAdmin && (
                      <Link href="/yonetim" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm hover:bg-muted">
                        Yönetim
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link href="/giris" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm hover:bg-muted">
                      Giriş yap
                    </Link>
                    <Link href="/kayit" onClick={() => setOpen(false)} className="mt-2 rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">
                      Kayıt ol
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
