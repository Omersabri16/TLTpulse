// Asistanın hazır cevapları: genel "nasıl çalışır" soruları Gemini'ye gitmeden, sınırsız ve anında cevaplanır.
// Kişiye özel sorular ("puanımı", "bana", "eksiğim") Gemini'ye gider; Gemini kullanılamazsa yine bunlara düşülür.

const FAQ: { keys: string[]; answer: string }[] = [
  {
    keys: ["puan", "hesap", "nereden", "kaynak", "nasıl"],
    answer:
      "Puanın altı yerden gelir: projeler, yarışmalar, akran puanı, sertifikalar, amir/hoca onayları ve yol haritası adımları. Üst sınır yok. Lig sıran sadece bu sezon kazandığın puanla belirlenir; ayrıntısı \"Puanım\" sayfasında.",
  },
  {
    keys: ["proje", "ekle", "github", "repo"],
    answer:
      "Önce Profili düzenle'den GitHub kullanıcı adını ekleyip doğrula (bio'na verilen kodu yazıyorsun). Sonra Projeler → Proje ekle'de repo linkini yapıştır. AI kodu okuyup zorluğu sınıflandırır (Kolay 10, Orta 40, Zor 70), kalite en fazla 30: CI'da yeşil testler, açılan demo, anlamlı README, 10+ günde geliştirme. Kopya ve şablon kod puan almaz.",
  },
  {
    keys: ["onay", "staj", "amir", "hoca", "referans", "deneyim"],
    answer:
      "Profilinde deneyiminin yanındaki \"Onay iste\"ye bas, amirinin ya da hocanın e-postasını gir. Ona tek kullanımlık bir link gider; hesap açmadan onaylar ve istersen yorum yazar. Kurumsal e-postadan gelen onay 30, kişisel e-postadan gelen 10 puan; yorum varsa +5.",
  },
  {
    keys: ["yarışma", "takım", "başvur", "pozisyon", "şartname", "test"],
    answer:
      "Yarışmalar sayfasında bir yarışma seç ve bir pozisyona başvur; herkes her yarışmaya katılabilir. Başvurular bitince sistem dengeli takımlar kurar. Kazanan yok: takımın şartnameyi ne kadar karşılarsa o kadar puan alır (Kolay 100, Orta 150, Zor 200'e kadar; %50 altı 0). Gizli testler demonuza karşı otomatik çalışır.",
  },
  {
    keys: ["sertifika", "btk", "credly", "coursera", "udemy"],
    answer:
      "Profilinde \"Sertifika ekle\" ile linki yapıştır. BTK Akademi 20, Credly 25 puan; doğrulanamayan sertifika 5. Üzerindeki isim profilindekiyle uyuşmazsa puan verilmez.",
  },
  {
    keys: ["lig", "seviye", "kıdemli", "orta", "yeni başlayan", "sezon", "yüksel", "düş"],
    answer:
      "Ligler 6 aylık sezonlarla işler. Herkes Yeni başlayan liginde başlar; sezon sonunda her ligin ilk %20'si (en az 100 puanla) bir üst lige çıkar, Orta ve Kıdemli'nin son %10'u (100'ün altındaysa) düşer. Her sezon lig puanı sıfırdan başlar, kanıtların kalıcıdır.",
  },
  {
    keys: ["akran", "yıldız", "arkadaş", "puanla", "mentor"],
    answer: "Yarışma bitince takım arkadaşların seni 1–5 yıldızla puanlar; puanlar anonimdir. Her yarışmada ortalaman 30 üzerinden eklenir. Orta ya da Kıdemli ligdeysen ve takımındaki yeni başlayanlardan ortalama 4+ yıldız alırsan +15 mentor puanı ve rozet.",
  },
  {
    keys: ["yol", "harita", "adım"],
    answer: "Yol haritası profilin en az %75 doluyken açılır. Hedef pozisyonunu seçersin, AI kanıtlarına bakıp sıradaki adımları çıkarır; adımları tamamladıkça adım başına 5–10 puan kazanırsın.",
  },
  {
    keys: ["cv", "doğrula", "qr", "yükle"],
    answer:
      "Profilinde \"CV'mi yükle\" ile PDF ya da Word CV'ni yükleyebilirsin; AI becerilerini ve deneyimlerini çıkarır, sen onaylarsın, dosya saklanmaz. \"Doğrulanmış CV\" ise sadece kanıtı olan bilgileri içerir; QR kodla işveren gerçek olduğunu kontrol eder.",
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
