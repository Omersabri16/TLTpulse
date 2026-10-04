import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | undefined;

function mailer() {
  if (!process.env.GMAIL_ADDRESS || !process.env.GMAIL_APP_PASSWORD) throw new Error("E-posta ayarları eksik");
  transport ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "") },
  });
  return transport;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
// Konu satırına satır sonu girip başlık eklenemesin.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 120);

/** Onay isteği. Gönderen sabit; kullanıcı metni escape edilir; e-postadaki tek link bizim onay linkimiz. */
export async function sendApprovalEmail(to: string, data: { approverName: string; userName: string; targetLabel: string; relation: string; link: string }) {
  const text =
    `Merhaba ${data.approverName},\n\n` +
    `${data.userName}, TLTpulse profilindeki şu bilgiyi onaylamanı istiyor: ${data.targetLabel}\n` +
    `Seni ${data.relation.toLowerCase()} olarak ekledi. Hesap açmana gerek yok:\n\n${data.link}\n\n` +
    `Link 14 gün geçerli ve tek kullanımlık. Bu kişiyi tanımıyorsan e-postayı yok sayabilirsin.\n\nTLTpulse`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#16163a;max-width:520px">
<p>Merhaba ${esc(data.approverName)},</p>
<p><b>${esc(data.userName)}</b>, TLTpulse profilindeki şu bilgiyi onaylamanı istiyor:</p>
<p style="background:#f4f4f6;border-radius:12px;padding:14px 16px"><b>${esc(data.targetLabel)}</b><br><span style="color:#626280">Seni ${esc(data.relation.toLowerCase())} olarak ekledi.</span></p>
<p><a href="${esc(data.link)}" style="display:inline-block;background:#5249d0;color:#fff;text-decoration:none;border-radius:999px;padding:12px 22px;font-weight:600">İsteği gör ve yanıtla</a></p>
<p style="color:#626280;font-size:13px">Hesap açmana gerek yok. Link 14 gün geçerli ve tek kullanımlık. Bu kişiyi tanımıyorsan e-postayı yok sayabilirsin.</p>
</div>`;
  await mailer().sendMail({
    from: { name: "TLTpulse", address: process.env.GMAIL_ADDRESS! },
    to,
    subject: oneLine(`${data.userName} senden onay istiyor`),
    text,
    html,
  });
}
