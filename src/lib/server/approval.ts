import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { isCorporateEmail } from "@/lib/score";
import { db } from "./admin";

/** Linkteki token: 32 bayt rastgele. Veritabanında sadece SHA-256 özeti tutulur. */
export const newToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const APPROVAL_DAYS = 14;

export interface ApprovalView {
  status: "Bekliyor" | "Onaylandı" | "Reddedildi";
  expired: boolean;
  approverName: string;
  relation: string;
  targetLabel: string;
  targetDetail: string;
  comment: string;
  requestedAt: string;
  approverDomain: string;
  corporate: boolean;
  user: { name: string; headline: string; school: string };
}

/** Onay sayfasının (hesapsız) gördüğü bilgi. Token geçersizse null. */
export async function approvalByToken(token: string): Promise<ApprovalView | null> {
  if (!TOKEN_RE.test(token)) return null;
  const r = await db()
    .from("approvals")
    .select("user_id, target_type, target_id, target_label, approver_name, approver_email, relation, status, comment, expires_at, requested_at")
    .eq("token_hash", tokenHash(token))
    .maybeSingle();
  if (!r.data) return null;
  const a = r.data as {
    user_id: string;
    target_type: string;
    target_id: string;
    target_label: string;
    approver_name: string;
    approver_email: string;
    relation: string;
    requested_at: string;
    status: ApprovalView["status"];
    comment: string | null;
    expires_at: string;
  };
  const [p, exp, cert] = await Promise.all([
    db().from("profiles").select("name, headline, school").eq("id", a.user_id).single(),
    a.target_type === "experience" ? db().from("experiences").select("kind, start_label, end_label, description").eq("id", a.target_id).maybeSingle() : Promise.resolve({ data: null }),
    a.target_type === "certificate" ? db().from("certificates").select("provider, link").eq("id", a.target_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const e = exp.data as { kind: string; start_label: string; end_label: string; description: string | null } | null;
  const c = cert.data as { provider: string; link: string } | null;
  return {
    status: a.status,
    expired: new Date(a.expires_at).getTime() < Date.now(),
    approverName: a.approver_name,
    relation: a.relation,
    targetLabel: a.target_label,
    targetDetail: e
      ? [e.kind, [e.start_label, e.end_label].filter(Boolean).join(" – "), e.description].filter(Boolean).join(" · ")
      : c
        ? `${c.provider} · ${c.link}`
        : "",
    comment: a.comment ?? "",
    requestedAt: a.requested_at,
    approverDomain: a.approver_email.split("@")[1] ?? "",
    corporate: isCorporateEmail(a.approver_email),
    user: (p.data as { name: string; headline: string; school: string } | null) ?? { name: "", headline: "", school: "" },
  };
}
