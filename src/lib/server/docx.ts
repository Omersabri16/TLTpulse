import "server-only";

import { inflateRawSync } from "node:zlib";

// DOCX (zip) içinden sadece word/document.xml'i okuyup düz metne çevirir. Bağımlılıksız (mammoth'un CLI bağımlılığında
// düzeltilemeyen açık vardı). Zip bombasına karşı açılmış boyut sınırlı; şifreli/bozuk dosyada hata fırlatır.

const MAX_XML = 20 * 1024 * 1024;

function findEntry(buf: Buffer, name: string) {
  // Merkez dizinin sonu (EOCD): dosyanın son 64 KB'ında imza 0x06054b50.
  const from = Math.max(0, buf.length - 65_557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= from; i--)
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error("zip değil");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bozuk zip");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const fname = buf.subarray(p + 46, p + 46 + nlen).toString("utf8");
    if (fname === name) return { method, csize, usize, local };
    p += 46 + nlen + elen + clen;
  }
  return null;
}

export function docxText(buf: Buffer): string {
  const e = findEntry(buf, "word/document.xml");
  if (!e) throw new Error("word/document.xml yok");
  if (e.usize > MAX_XML) throw new Error("çok büyük");
  if (buf.readUInt32LE(e.local) !== 0x04034b50) throw new Error("bozuk zip");
  const start = e.local + 30 + buf.readUInt16LE(e.local + 26) + buf.readUInt16LE(e.local + 28);
  const data = buf.subarray(start, start + e.csize);
  const xml = (e.method === 0 ? data : inflateRawSync(data, { maxOutputLength: MAX_XML })).toString("utf8");
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>|<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
