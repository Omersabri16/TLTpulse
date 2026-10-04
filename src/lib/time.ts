// Sunucu (Vercel, UTC) ve tarayıcı aynı sonucu versin diye saat dilimi sabit.
const TZ = "Europe/Istanbul";
const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

/** Sohbet satırı: bugünse saat, dünse "Dün", değilse "29 Eyl". */
export function fmtClock(iso: string, now = new Date()) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (day(d) === day(now)) return d.toLocaleTimeString("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  if (day(d) === day(new Date(now.getTime() - 86400000))) return "Dün";
  return d.toLocaleDateString("tr-TR", { timeZone: TZ, day: "numeric", month: "short" });
}

/** Bildirim: bir dakikadan yeniyse "Şimdi". */
export function fmtRelative(iso: string, now = new Date()) {
  return now.getTime() - new Date(iso).getTime() < 60000 ? "Şimdi" : fmtClock(iso, now);
}
