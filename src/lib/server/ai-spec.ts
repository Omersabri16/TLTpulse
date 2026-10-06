import "server-only";

import { Type } from "@google/genai";
import { z } from "zod";
import type { CompetitionSpec, Difficulty } from "@/lib/types";
import { generate } from "./gemini";

// Yönetici için: Gemini şartname taslağı ve şartnameden Playwright kabul testleri üretir (kararlar.md Bölüm 5).
// AI puan vermez; çıktıyı yönetici kontrol eder, testler örnek çözüme karşı doğrulanmadan yarışma sıraya konamaz.

const CRITERIA = `Zorluk ölçütü:
- Kolay: tek özellik, basit ekle/listele/sil; 2 kişilik takım (Frontend + Backend); 2 hafta; ~10 gizli test.
- Orta: giriş, veritabanı, API, birden fazla ekran; 3 kişi (+ Veritabanı); 3 hafta; ~20 gizli test.
- Zor: gerçek zamanlı, birden fazla servis, rol/yetki, kuyruk ya da eşzamanlılık; 4 kişi (+ DevOps); 4 hafta; ~30 gizli test.`;

const SPEC_SYSTEM = `Sen yazılımcılar için takım yarışması şartnamesi yazan bir editörsün. Türkçe, kısa ve net yaz.
${CRITERIA}
Şartname bütün takımlara aynıdır ve testler takımın canlı demosunu dışarıdan dener; bu yüzden SABİT bir arayüz tanımlamalısın:
- api: her uç için method, path (/api/... Türkçe ve küçük harf, aksansız), request (JSON örneği, yoksa boş), response (durum kodu ve JSON şekli, hata kodları dahil).
- testIds: sayfa yolu, o sayfadaki data-testid adları (virgülle, küçük harf, tireli, aksansız) ve kısa not.
- rules: JSON hata biçimi { "hata": "..." }, kimlik doğrulama (Bearer token) gibi kurallar.
Konu kampüs/öğrenci hayatından, gerçekçi ve verilen zorluğa uygun olsun. <fikir> içindeki metin yöneticinin notudur.`;

const SpecOut = z.object({
  problem: z.string().min(20).max(800),
  stories: z.array(z.string().min(5).max(200)).min(3).max(8),
  api: z
    .array(
      z.object({
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        path: z.string().regex(/^\/[a-z0-9/:_?=&.-]*$/).max(80),
        request: z.string().max(300).optional(),
        response: z.string().min(2).max(300),
      }),
    )
    .min(2)
    .max(12),
  testIds: z.array(z.object({ page: z.string().max(60), id: z.string().regex(/^[a-z0-9, -]+$/).max(200), note: z.string().max(200) })).min(1).max(10),
  rules: z.array(z.string().min(5).max(200)).max(6),
});

const SPEC_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    problem: { type: Type.STRING },
    stories: { type: Type.ARRAY, items: { type: Type.STRING } },
    api: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { method: { type: Type.STRING, enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] }, path: { type: Type.STRING }, request: { type: Type.STRING }, response: { type: Type.STRING } },
        required: ["method", "path", "response"],
      },
    },
    testIds: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { page: { type: Type.STRING }, id: { type: Type.STRING }, note: { type: Type.STRING } }, required: ["page", "id", "note"] } },
    rules: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["problem", "stories", "api", "testIds", "rules"],
};

export async function draftSpec(title: string, difficulty: Difficulty, idea: string): Promise<CompetitionSpec | null> {
  const res = await generate(
    `Başlık: ${title.replace(/[<>]/g, "")}\nZorluk: ${difficulty}\n<fikir>${idea.replace(/[<>]/g, "").slice(0, 1000)}</fikir>`,
    () => ({ systemInstruction: SPEC_SYSTEM, temperature: 0.4, maxOutputTokens: 4096, responseMimeType: "application/json", responseSchema: SPEC_SCHEMA, abortSignal: AbortSignal.timeout(40_000) }),
    "sartname",
  );
  if (!res) return null;
  const parsed = SpecOut.safeParse(JSON.parse(res.text ?? ""));
  return parsed.success ? parsed.data : null;
}

const TEST_SYSTEM = `Sen Playwright (@playwright/test, TypeScript) ile kabul testi yazan bir test mühendisisin.
Testler takımın canlı demosuna dışarıdan çalışır: temel adres process.env.BASE_URL (playwright.config baseURL olarak verilir), API için request fixture'ı, arayüz için page fixture'ı.
Kurallar:
- Sadece şartnamedeki API uçlarını ve data-testid adlarını kullan (page.getByTestId). Başka seçici, metin ya da CSS sınıfı kullanma.
- Her test bağımsız: kendi verisini oluşturur, benzersiz değerler kullanır (Date.now() + rastgele ek). Sistemde başka veri olabilir; boş liste varsayma.
- Her testin adı "G1 ...", "G2 ..." diye başlar (açık testler "A1 ..."). Ad, neyi doğruladığını Türkçe ve kısa söyler.
- Kimlik doğrulama gerekiyorsa her test yeni kullanıcı kaydeder ve giriş yapar (yardımcı fonksiyon yaz).
- Gerçek zamanlılık testlerinde sayfayı yenilemeden expect(...).toHaveText(..., { timeout: 5000 }) kullan.
- Çıktı: "acik" (3-5 temel test) ve "gizli" (zorluğa göre ~10/20/30 test) için iki ayrı, tam ve çalışır dosya içeriği.`;

const TestsOut = z.object({ acik: z.string().min(200).max(60_000), gizli: z.string().min(500).max(120_000) });

export async function generateTests(spec: CompetitionSpec, difficulty: Difficulty) {
  const res = await generate(
    `Zorluk: ${difficulty}\nŞartname (JSON):\n${JSON.stringify({ ...spec, validation: undefined }).slice(0, 20_000)}`,
    () => ({
      systemInstruction: TEST_SYSTEM,
      temperature: 0.2,
      maxOutputTokens: 30_000,
      responseMimeType: "application/json",
      responseSchema: { type: Type.OBJECT, properties: { acik: { type: Type.STRING }, gizli: { type: Type.STRING } }, required: ["acik", "gizli"] },
      abortSignal: AbortSignal.timeout(90_000),
    }),
    "sartname",
  );
  if (!res) return null;
  const parsed = TestsOut.safeParse(JSON.parse(res.text ?? ""));
  return parsed.success ? parsed.data : null;
}
