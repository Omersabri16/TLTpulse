// Asistanın hazır cevapları: genel "nasıl çalışır" soruları Gemini'ye gitmeden, sınırsız ve anında cevaplanır.
// Kişiye özel sorular ("puanımı", "bana", "eksiğim") Gemini'ye gider; Gemini kullanılamazsa yine bunlara düşülür.

const FAQ: { keys: string[]; answer: string }[] = [
  {
    keys: ["puan", "hesap", "nereden", "kaynak", "nasıl"],
    answer:
      "Puanın altı yerden gelir: projeler, yarışmalar, akran puanı, sertifikalar, amir/hoca onayları ve yol haritası adımları. Üst sınır yok; ne kadar çok kanıt, o kadar puan. Ayrıntısı \"Puanım\" sayfasında.",
  },
  {
    keys: ["proje", "ekle", "github", "repo"],
    answer:
      "Önce Profili düzenle'den GitHub kullanıcı adını ekleyip doğrula (bio'na verilen kodu yazıyorsun). Sonra Projeler → Proje ekle'de repo linkini yapıştır. README, test, CI ve commit yazarlığı GitHub'dan otomatik okunur; zorluk ve kaliteye göre 4–10 puan alırsın.",
  },
  {
    keys: ["onay", "staj", "amir", "hoca", "referans", "deneyim"],
    answer:
      "Profilinde deneyiminin yanındaki \"Onay iste\"ye bas, amirinin ya da hocanın e-postasını gir. Ona tek kullanımlık bir link gider; hesap açmadan onaylar ve istersen yorum yazar. Kurumsal e-postadan gelen onay 5, kişisel e-postadan gelen 2 puan; yorum varsa +1.",
  },
  {
    keys: ["yarışma", "takım", "başvur", "pozisyon"],
    answer:
      "Yarışmalar sayfasında açık bir yarışma seç ve bir pozisyona başvur. Başvurular bitince sistem dengeli takımlar kurar; takımın özel sohbeti olur ve işi GitHub reposu olarak teslim edersiniz. Tamamlayınca 4 puan, ilk üçe girersen 8/6/4 puan daha.",
  },
  {
    keys: ["sertifika", "btk", "credly", "coursera", "udemy"],
    answer:
      "Profilinde \"Sertifika ekle\" ile linki yapıştır. BTK Akademi ve Credly sertifikaları doğrulanırsa 4, Coursera ve Udemy 3 puan alır. Üzerindeki isim profilindekiyle uyuşmazsa puan verilmez.",
  },
  {
    keys: ["lig", "seviye", "kıdemli", "orta", "yeni başlayan"],
    answer: "Üç lig var: Yeni başlayan (0–59), Orta (60–79) ve Kıdemli (80+). Puanın arttıkça bir üst lige geçersin; lig sıran aynı ligdeki herkese göre hesaplanır.",
  },
  {
    keys: ["akran", "yıldız", "arkadaş", "puanla"],
    answer: "Yarışma bitince takım arkadaşların seni 1–5 yıldızla puanlar; puanlar anonimdir. Her yarışmada ortalaman 15 üzerinden puana eklenir.",
  },
  {
    keys: ["yol", "harita", "adım"],
    answer: "Yol haritası profilin en az %75 doluyken açılır. Hedef pozisyonunu seçersin, AI kanıtlarına bakıp sıradaki adımları çıkarır; adımları tamamladıkça 1–2 puan kazanırsın.",
  },
  {
    keys: ["cv", "doğrula", "qr"],
    answer: "Profilinde \"Doğrulanmış CV\"ye bas. CV sadece kanıtı olan bilgileri içerir; üzerindeki QR kod ve doğrulama kodu ile işveren bilgilerin gerçek olduğunu kontrol edebilir.",
  },
];

// "Benim durumuma göre" sorular: hazır cevap yerine kişiye özel cevap gerekir.
const PERSONAL = /(benim|bana|\bben\b|puanım|projelerim|profilim|eksi[kğ]|ne yapmal|öneri|tavsiye|hangi|neden|niye|artır|yükselt|geçebilir|sıram)/i;

export function faqAnswer(text: string, { allowPersonal = false } = {}) {
  const t = text.toLocaleLowerCase("tr");
  if (!allowPersonal && PERSONAL.test(t)) return null;
  const best = FAQ.map((f) => ({ f, n: f.keys.filter((k) => t.includes(k)).length })).sort((a, b) => b.n - a.n)[0];
  return best && best.n > 0 ? best.f.answer : null;
}

export const FAQ_FALLBACK =
  "Şu an bu soruyu ayrıntılı cevaplayamıyorum. Puan, proje ekleme, onay, yarışma, sertifika, lig ya da yol haritası hakkında sorabilirsin.";
