const SAME = "http://ayni.invalid";

/** Sadece site içi yollar. Tarayıcının ayrıştırıcısını kullanır: "//site.com", "/\site.com", "/\t/site.com" hepsi başka siteye gider. */
export function safeNext(next: string | null | undefined, fallback = "/profil") {
  if (!next || !next.startsWith("/")) return fallback;
  try {
    const u = new URL(next, SAME);
    return u.origin === SAME ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}

export function isHttpUrl(value: string) {
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Kullanıcının girdiği link: http(s) değilse (ör. javascript:) hiç link verme. */
export const safeHref = (value: string | undefined) => (value && isHttpUrl(value) ? value.trim() : undefined);
