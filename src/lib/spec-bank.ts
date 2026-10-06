// Şartname bankası (kararlar.md Bölüm 5, "Yarışma zorluğu ve şartname bankası"). 11 şartname; her biri farklı alanlardan pozisyonlar ister.
// Sabit arayüz şart: gizli testler takımın demosunu dışarıdan denediği için herkes aynı API uçlarını ve data-testid'leri sunar.
// Burada sadece herkese açık kısım var (şartname + açık testlerin adı + gizli test sayısı). Gizli testlerin kodu ve
// adları özel değerlendirme reposunda (degerlendirme/sartnameler/<id>/); örnek çözümle doğrulandılar.
import type { CompetitionSpec, Difficulty, Field, SpecTest } from "./types";

export interface BankSpec {
  id: string;
  title: string;
  tagline: string;
  difficulty: Difficulty;
  /** Takımdaki pozisyonlar (her biri 1 kişi; sayı zorluğa göre 2 / 3 / 4). Yönetici değiştirebilir. */
  positions: Field[];
  /** Önerilen süreler (gün) */
  applyDays: number;
  buildDays: number;
  spec: CompetitionSpec;
  publicTests: SpecTest[];
  hiddenCount: number;
  /** Testler örnek çözümde %100 geçti, boş projede geçmedi */
  verified: boolean;
}

const AUTH_API = [
  { method: "POST" as const, path: "/api/kayit", request: '{ "eposta": "a@b.com", "sifre": "en az 8 karakter", "ad": "Ayşe" }', response: '201 { "id", "eposta", "ad" } · aynı e-posta 409 · şifre kısa 400' },
  { method: "POST" as const, path: "/api/giris", request: '{ "eposta", "sifre" }', response: '200 { "token" } · yanlış bilgi 401' },
];
const AUTH_IDS = [
  { page: "/kayit", id: "kayit-ad, kayit-eposta, kayit-sifre, kayit-gonder", note: "Kayıt formu; başarılıysa /giris'e yönlendirir" },
  { page: "/giris", id: "giris-eposta, giris-sifre, giris-gonder", note: "Giriş formu; başarılıysa / adresine yönlendirir" },
  { page: "her sayfa", id: "hata-mesaji", note: "Form hatası olduğunda görünen metin" },
];
const ROLE_IDS = { page: "/kayit", id: "kayit-rol", note: "Rol seçimi (select ya da input; değerler API'deki rol adları)" };
const AUTH_RULE = "Korumalı uçlar `Authorization: Bearer <token>` başlığı ister; yoksa 401.";
const JSON_RULE = "Bütün API cevapları JSON; hata cevapları { \"hata\": \"açıklama\" } biçiminde.";

export const SPEC_BANK: BankSpec[] = [
  {
    id: "kitap-listesi",
    title: "Kitap Listesi",
    tagline: "Okuduğun kitapları ekle, ara, sil.",
    difficulty: "Kolay",
    positions: ["Frontend", "Backend"],
    applyDays: 7,
    buildDays: 14,
    verified: true,
    hiddenCount: 11,
    spec: {
      problem: "Kulüp kütüphanesindeki kitaplar bir deftere yazılıyor ve aranamıyor. Kitap ekleyip silebilen, başlığa ya da yazara göre arama yapılabilen basit bir web uygulaması istiyoruz.",
      stories: ["Kitap ekleyebilirim (başlık, yazar, isteğe bağlı yıl).", "Bütün kitapları listede görürüm.", "Başlık ya da yazara göre arama yaparım.", "Bir kitabı silebilirim.", "Sayfayı yenilesem de kitaplar kaybolmaz."],
      api: [
        { method: "GET", path: "/api/kitaplar", response: '200 [{ "id", "baslik", "yazar", "yil" }]' },
        { method: "GET", path: "/api/kitaplar?ara=metin", response: "200, başlıkta ya da yazarda geçenler (büyük/küçük harf duyarsız)" },
        { method: "POST", path: "/api/kitaplar", request: '{ "baslik": "Kürk Mantolu Madonna", "yazar": "Sabahattin Ali", "yil": 1943 }', response: '201 { "id", "baslik", "yazar", "yil" } · başlık ya da yazar boşsa 400' },
        { method: "DELETE", path: "/api/kitaplar/:id", response: "204 · yoksa 404" },
      ],
      testIds: [
        { page: "/", id: "kitap-form, kitap-baslik, kitap-yazar, kitap-yil, kitap-ekle", note: "Ekleme formu" },
        { page: "/", id: "kitap-ara", note: "Arama kutusu; yazdıkça listeyi süzer" },
        { page: "/", id: "kitap-listesi, kitap-satiri, kitap-sil", note: "Liste, her kitap satırı ve satırdaki sil düğmesi" },
        { page: "/", id: "hata-mesaji", note: "Boş başlık ya da yazarla eklemede görünür" },
      ],
      rules: [JSON_RULE, "Veri sunucuda saklanır (sayfa yenilenince kaybolmaz)."],
    },
    publicTests: [
      { id: "A1", title: "GET /api/kitaplar dizi döner", public: true },
      { id: "A2", title: "POST /api/kitaplar geçerli kitapta 201 ve id döner", public: true },
      { id: "A3", title: "Ana sayfada form ve liste var", public: true },
      { id: "A4", title: "Formdan eklenen kitap listede görünür", public: true },
    ],
  },
  {
    id: "link-kisaltici",
    title: "Link Kısaltıcı",
    tagline: "Uzun linkleri kısalt, tıklanmaları say.",
    difficulty: "Kolay",
    positions: ["Full Stack", "Test / QA"],
    applyDays: 7,
    buildDays: 14,
    verified: true,
    hiddenCount: 10,
    spec: {
      problem: "Kulüp duyurularındaki uzun form linkleri afişe sığmıyor. Linki kısaltan, kısa linke gidenleri asıl adrese yönlendiren ve tıklanma sayısını gösteren bir uygulama istiyoruz.",
      stories: ["Uzun bir linki yapıştırıp kısa kod alırım.", "Kısa linke giden asıl adrese yönlendirilir.", "Her linkin kaç kez tıklandığını görürüm.", "Geçersiz linki kısaltamam."],
      api: [
        { method: "POST", path: "/api/linkler", request: '{ "url": "https://ornek.com/cok/uzun/link" }', response: '201 { "kod", "url", "tiklama": 0 } · url http(s) değilse 400' },
        { method: "GET", path: "/api/linkler", response: '200 [{ "kod", "url", "tiklama" }]' },
        { method: "GET", path: "/api/linkler/:kod", response: '200 { "kod", "url", "tiklama" } · yoksa 404' },
        { method: "GET", path: "/r/:kod", response: "302, Location: asıl url; tıklama 1 artar · yoksa 404" },
      ],
      testIds: [
        { page: "/", id: "link-form, link-url, link-kisalt", note: "Kısaltma formu" },
        { page: "/", id: "kisa-link", note: "Son kısaltılan linkin tam adresi (…/r/kod) metin olarak" },
        { page: "/", id: "link-listesi, link-satiri, link-tiklama", note: "Liste, her link satırı, satırdaki tıklama sayısı" },
        { page: "/", id: "hata-mesaji", note: "Geçersiz linkte görünür" },
      ],
      rules: [JSON_RULE, "Kod 4-10 karakter, sadece harf ve rakam; her link için farklı."],
    },
    publicTests: [
      { id: "A1", title: "POST /api/linkler 201 ve kod döner", public: true },
      { id: "A2", title: "Ana sayfada kısaltma formu var", public: true },
      { id: "A3", title: "Formdan kısaltılan link sayfada görünür", public: true },
    ],
  },
  {
    id: "etkinlik-kayit",
    title: "Etkinlik Kayıt",
    tagline: "Etkinlik aç, katıl; kontenjan dolunca kapansın.",
    difficulty: "Orta",
    positions: ["Frontend", "Backend", "Veritabanı"],
    applyDays: 7,
    buildDays: 21,
    verified: true,
    hiddenCount: 22,
    spec: {
      problem: "Kulüp etkinliklerine kayıt WhatsApp'tan toplanıyor, kontenjan aşılıyor. Üyelerin giriş yapıp etkinlik oluşturabildiği, katılabildiği ve kontenjan dolunca kaydın kapandığı bir uygulama istiyoruz.",
      stories: [
        "Kayıt olup giriş yaparım.",
        "Giriş yaptıysam etkinlik oluştururum (başlık, tarih, kontenjan).",
        "Etkinliklere katılır ya da katılımımı geri çekerim.",
        "Kontenjan dolunca kimse katılamaz ve etkinlik dolu görünür.",
        "Bir etkinliğe kimlerin katıldığını görürüm.",
      ],
      api: [
        ...AUTH_API,
        { method: "GET", path: "/api/etkinlikler", response: '200 [{ "id", "baslik", "tarih", "kontenjan", "katilimci", "dolu" }]' },
        { method: "POST", path: "/api/etkinlikler", request: '{ "baslik", "tarih": "2026-11-20T18:00:00Z", "kontenjan": 30 }', response: "201 etkinlik · giriş yoksa 401 · başlık boş ya da kontenjan < 1 ise 400" },
        { method: "GET", path: "/api/etkinlikler/:id", response: '200 etkinlik + "katilimcilar": ["ad"] · yoksa 404' },
        { method: "POST", path: "/api/etkinlikler/:id/katil", response: '200 { "katilimci" } · zaten katıldıysa ya da doluysa 409 · giriş yoksa 401' },
        { method: "DELETE", path: "/api/etkinlikler/:id/katil", response: '200 { "katilimci" } · katılmamışsa 404' },
      ],
      testIds: [
        ...AUTH_IDS,
        { page: "/", id: "etkinlik-listesi, etkinlik-karti, etkinlik-katil, etkinlik-dolu", note: "Liste, her kart, katıl düğmesi, doluysa görünen etiket" },
        { page: "/", id: "kullanici-adi, cikis", note: "Giriş yapanın adı ve çıkış düğmesi" },
        { page: "/etkinlik/yeni", id: "etkinlik-baslik, etkinlik-tarih, etkinlik-kontenjan, etkinlik-olustur", note: "Oluşturma formu; başarılıysa / adresine döner" },
      ],
      rules: [JSON_RULE, AUTH_RULE, "Şifreler düz metin saklanmaz.", "Aynı anda gelen katılma istekleri kontenjanı aşmaz."],
    },
    publicTests: [
      { id: "A1", title: "Kayıt ve giriş token döner", public: true },
      { id: "A2", title: "GET /api/etkinlikler dizi döner", public: true },
      { id: "A3", title: "Girişli kullanıcı etkinlik oluşturur (201)", public: true },
      { id: "A4", title: "Giriş sayfası formu var", public: true },
      { id: "A5", title: "Arayüzden giriş yapınca kullanıcı adı görünür", public: true },
    ],
  },
  {
    id: "anket",
    title: "Anket",
    tagline: "Anket aç, oy topla, sonuçları canlı gör.",
    difficulty: "Orta",
    positions: ["Frontend", "Backend", "Veri Bilimi"],
    applyDays: 7,
    buildDays: 21,
    verified: true,
    hiddenCount: 20,
    spec: {
      problem: "Sınıf temsilcisi seçimi ve etkinlik tarihleri kâğıtla oylanıyor. Herkesin bir kez oy verebildiği, sonuçların yüzdeyle göründüğü, anketi açanın kapatabildiği bir uygulama istiyoruz.",
      stories: [
        "Kayıt olup giriş yaparım.",
        "Soru ve 2-6 seçenekle anket açarım.",
        "Bir ankette sadece bir kez oy veririm.",
        "Sonuçları sayı ve yüzde olarak görürüm.",
        "Anketi açan kişi anketi kapatır; kapalı ankete oy verilmez.",
      ],
      api: [
        ...AUTH_API,
        { method: "GET", path: "/api/anketler", response: '200 [{ "id", "soru", "acik", "toplamOy" }]' },
        { method: "POST", path: "/api/anketler", request: '{ "soru", "secenekler": ["A", "B"] }', response: '201 { "id", "soru", "acik": true, "secenekler": [{ "id", "metin", "oy": 0 }] } · 2-6 seçenek değilse 400 · giriş yoksa 401' },
        { method: "GET", path: "/api/anketler/:id", response: '200 { "id", "soru", "acik", "toplamOy", "secenekler": [{ "id", "metin", "oy", "yuzde" }] } · yoksa 404' },
        { method: "POST", path: "/api/anketler/:id/oy", request: '{ "secenekId" }', response: "200 güncel anket · ikinci oy ya da kapalı anket 409 · giriş yoksa 401 · seçenek yoksa 400" },
        { method: "POST", path: "/api/anketler/:id/kapat", response: "200 · anketi açan değilse 403" },
      ],
      testIds: [
        ...AUTH_IDS,
        { page: "/", id: "anket-listesi, anket-karti", note: "Liste ve her anket kartı (karta tıklayınca /anket/:id)" },
        { page: "/anket/yeni", id: "anket-soru, anket-secenek, secenek-ekle, anket-olustur", note: "Soru, seçenek kutuları (başta 2), yeni seçenek kutusu, oluştur" },
        { page: "/anket/:id", id: "anket-baslik, oy-secenek, oy-gonder, sonuc-satiri, sonuc-yuzde, anket-kapat, anket-kapali", note: "Soru, seçenekler, oy düğmesi, sonuç satırları ve yüzdeleri, kapat düğmesi, kapalı etiketi" },
      ],
      rules: [JSON_RULE, AUTH_RULE, "Yüzdeler tam sayıya yuvarlanır; hiç oy yoksa 0.", "Şifreler düz metin saklanmaz."],
    },
    publicTests: [
      { id: "A1", title: "Kayıt ve giriş token döner", public: true },
      { id: "A2", title: "Girişli kullanıcı anket açar (201)", public: true },
      { id: "A3", title: "GET /api/anketler/:id seçenekleri döner", public: true },
      { id: "A4", title: "Anket oluşturma sayfasında form var", public: true },
    ],
  },
  {
    id: "canli-siparis",
    title: "Canlı Sipariş Takibi",
    tagline: "Kampüs kafesi için sipariş; durum anlık değişsin.",
    difficulty: "Zor",
    positions: ["Frontend", "Backend", "Veritabanı", "DevOps"],
    applyDays: 7,
    buildDays: 28,
    verified: true,
    hiddenCount: 30,
    spec: {
      problem: "Kampüs kafesinde siparişler bağırarak takip ediliyor. Müşterinin menüden sipariş verdiği, personelin durumu ilerlettiği ve müşterinin sayfayı yenilemeden durumu anlık gördüğü bir sistem istiyoruz.",
      stories: [
        "Müşteri ya da personel olarak kayıt olurum.",
        "Müşteri menüyü görür, sepet oluşturup sipariş verir.",
        "Müşteri sadece kendi siparişlerini görür.",
        "Personel bütün siparişleri görür ve durumu sırayla ilerletir: alındı → hazırlanıyor → yolda → teslim.",
        "Müşterinin sipariş sayfasındaki durum, sayfa yenilenmeden 5 saniye içinde değişir.",
      ],
      api: [
        { method: "POST", path: "/api/kayit", request: '{ "eposta", "sifre", "ad", "rol": "musteri" | "personel" }', response: "201 · aynı e-posta 409 · rol geçersizse 400" },
        { method: "POST", path: "/api/giris", request: '{ "eposta", "sifre" }', response: '200 { "token", "rol" } · yanlışsa 401' },
        { method: "GET", path: "/api/menu", response: '200 [{ "id", "ad", "fiyat" }] (en az 3 ürün, önceden yüklü)' },
        { method: "POST", path: "/api/siparisler", request: '{ "kalemler": [{ "urunId", "adet" }] }', response: '201 { "id", "durum": "alindi", "toplam", "kalemler" } · sadece müşteri (personel 403) · boş sepet ya da adet < 1 ise 400' },
        { method: "GET", path: "/api/siparisler", response: "200 müşteri kendi siparişlerini, personel hepsini görür" },
        { method: "GET", path: "/api/siparisler/:id", response: "200 · başkasının siparişi 403 (personel hariç) · yoksa 404" },
        { method: "PATCH", path: "/api/siparisler/:id/durum", request: '{ "durum": "hazirlaniyor" }', response: "200 · sadece personel (müşteri 403) · sıra atlanırsa ya da geri gidilirse 409" },
      ],
      testIds: [
        ...AUTH_IDS,
        ROLE_IDS,
        { page: "/menu", id: "menu-urun, urun-adet, sepete-ekle, sepet-toplam, siparis-ver", note: "Ürün kartı, adet kutusu, sepete ekle, sepet toplamı, sipariş ver (başarılıysa /siparis/:id)" },
        { page: "/siparis/:id", id: "siparis-durum, siparis-toplam", note: "Durum metni: alindi / hazirlaniyor / yolda / teslim (sayfa yenilenmeden güncellenir)" },
        { page: "/personel", id: "siparis-listesi, siparis-satiri, durum-ilerlet", note: "Personelin listesi, her satır (data-siparis-id özelliğiyle), durumu bir adım ilerleten düğme" },
      ],
      rules: [JSON_RULE, AUTH_RULE, "Toplam sunucuda menü fiyatlarından hesaplanır; istemcinin gönderdiği fiyata güvenilmez.", "Gerçek zamanlılık için WebSocket, SSE ya da benzeri kullanılabilir."],
    },
    publicTests: [
      { id: "A1", title: "GET /api/menu en az 3 ürün döner", public: true },
      { id: "A2", title: "Müşteri sipariş verir (201, durum alindi)", public: true },
      { id: "A3", title: "Personel durumu hazirlaniyor yapar", public: true },
      { id: "A4", title: "Menü sayfasında ürünler görünür", public: true },
      { id: "A5", title: "Sipariş sayfasında durum görünür", public: true },
    ],
  },
  {
    id: "bilet-satisi",
    title: "Bilet Satışı",
    tagline: "Konser biletleri; aynı anda yüz kişi alsa da fazla satılmasın.",
    difficulty: "Zor",
    positions: ["Frontend", "Backend", "Bulut Bilişim", "Test / QA"],
    applyDays: 7,
    buildDays: 28,
    verified: true,
    hiddenCount: 30,
    spec: {
      problem: "Bahar şenliği biletleri satışa açıldığı dakikada tükeniyor ve elle tutulan listede fazla satış oluyor. Organizatörün etkinlik açtığı, müşterilerin bilet aldığı, aynı anda gelen isteklerde koltuk sayısının asla aşılmadığı ve kalan koltuğun canlı göründüğü bir sistem istiyoruz.",
      stories: [
        "Organizatör ya da müşteri olarak kayıt olurum.",
        "Organizatör koltuk sayısıyla etkinlik açar.",
        "Müşteri tek seferde 1-4 bilet alır; yer yoksa alamaz.",
        "Aynı anda gelen alımlar koltuk sayısını asla aşmaz.",
        "Müşteri biletini iade eder, koltuk geri açılır.",
        "Etkinlik sayfasındaki kalan koltuk, başkası bilet alınca sayfa yenilenmeden 5 saniye içinde güncellenir.",
      ],
      api: [
        { method: "POST", path: "/api/kayit", request: '{ "eposta", "sifre", "ad", "rol": "organizator" | "musteri" }', response: "201 · aynı e-posta 409 · rol geçersizse 400" },
        { method: "POST", path: "/api/giris", request: '{ "eposta", "sifre" }', response: '200 { "token", "rol" } · yanlışsa 401' },
        { method: "POST", path: "/api/etkinlikler", request: '{ "ad", "koltuk": 100 }', response: '201 { "id", "ad", "koltuk", "kalan" } · sadece organizatör (müşteri 403) · koltuk < 1 ise 400' },
        { method: "GET", path: "/api/etkinlikler/:id", response: '200 { "id", "ad", "koltuk", "kalan" } · yoksa 404' },
        { method: "POST", path: "/api/etkinlikler/:id/bilet", request: '{ "adet": 2 }', response: '201 { "biletId", "etkinlikId", "adet" } · yer yoksa 409 · adet 1-4 değilse 400 · organizatör 403' },
        { method: "GET", path: "/api/biletlerim", response: '200 [{ "biletId", "etkinlikId", "adet" }]' },
        { method: "DELETE", path: "/api/biletler/:id", response: "200 iade · başkasının bileti 403 · yoksa 404" },
      ],
      testIds: [
        ...AUTH_IDS,
        ROLE_IDS,
        { page: "/etkinlik/:id", id: "etkinlik-ad, kalan-koltuk, bilet-adet, bilet-al, bilet-sonuc", note: "Kalan koltuk sayısı (sadece sayı) canlı güncellenir; alım sonucu metni" },
        { page: "/biletlerim", id: "bilet-satiri, bilet-iade", note: "Her bilet satırı ve iade düğmesi" },
      ],
      rules: [JSON_RULE, AUTH_RULE, "Eşzamanlı alımlar (ör. 10 koltuğa aynı anda 30 istek) tam koltuk sayısı kadar 201 döner, gerisi 409.", "Gerçek zamanlılık için WebSocket, SSE ya da benzeri kullanılabilir."],
    },
    publicTests: [
      { id: "A1", title: "Organizatör etkinlik açar (201)", public: true },
      { id: "A2", title: "Müşteri 2 bilet alır, kalan 2 azalır", public: true },
      { id: "A3", title: "Yer yoksa 409 döner", public: true },
      { id: "A4", title: "Etkinlik sayfasında kalan koltuk görünür", public: true },
    ],
  },
  {
    id: "hafiza-oyunu",
    title: "Hafıza Oyunu",
    tagline: "Kartları eşleştir, en az hamleyle bitir, skor tablosuna gir.",
    difficulty: "Kolay",
    positions: ["Oyun Geliştirme", "Backend"],
    applyDays: 7,
    buildDays: 14,
    verified: true,
    hiddenCount: 13,
    spec: {
      problem: "Kulüp tanıtım gününde standa gelenlerin oynayacağı, tarayıcıda çalışan bir kart eşleştirme oyunu istiyoruz. Skor tablosu hile kaldırmamalı: oyunun durumunu ve hamle sayısını sunucu tutar.",
      stories: ["Yeni oyuna başlarım; 16 kapalı kart (8 çift) görürüm.", "İki kart açarım; eşleşirse açık kalır, eşleşmezse kapanır.", "Her iki kart açışım bir hamle sayılır.", "Bütün çiftleri bulunca kazandığımı görür, adımı skor tablosuna yazarım.", "Skor tablosunda en az hamleyle bitirenler üstte."],
      api: [
        { method: "POST", path: "/api/oyunlar", response: '201 { "id", "kartSayisi": 16, "hamle": 0, "eslesen": [], "bitti": false } · kartlar her oyunda karışık' },
        { method: "GET", path: "/api/oyunlar/:id", response: '200 { "id", "kartSayisi", "hamle", "eslesen": [kart sırası], "bitti" } · yoksa 404' },
        { method: "POST", path: "/api/oyunlar/:id/cevir", request: '{ "kart": 0 }', response: '200 { "kart", "deger", "hamle", "eslesti": null | true | false, "bitti" } · ikinci kartta hamle 1 artar · geçersiz kart ya da aynı karta üst üste 400 · eşleşmiş kart ya da biten oyun 409 · oyun yoksa 404' },
        { method: "POST", path: "/api/skorlar", request: '{ "oyunId", "ad": "Ayşe" }', response: '201 { "ad", "hamle" } · hamleyi sunucu yazar · oyun bitmediyse ya da skor zaten kaydedildiyse 409 · ad boşsa 400' },
        { method: "GET", path: "/api/skorlar", response: '200 [{ "ad", "hamle" }] · hamleye göre artan, en fazla 10' },
      ],
      testIds: [
        { page: "/", id: "oyun-tahtasi, kart", note: "Tahta ve 16 kart (sırası kart numarası). Açık kartta değer metin olarak görünür ve data-acik=\"1\"; eşleşen kartta data-eslesti=\"1\"" },
        { page: "/", id: "hamle-sayaci", note: "Sadece sayı" },
        { page: "/", id: "kazandin, skor-ad, skor-kaydet", note: "Oyun bitince görünen bölüm ve skor formu" },
        { page: "/", id: "skor-tablosu, skor-satiri", note: "Skor tablosu ve her satır" },
      ],
      rules: [JSON_RULE, "Eşleşmeyen iki kart en geç 2 saniye içinde kapanır.", "Kartların değerleri çevrilmeden istemciye gönderilmez."],
    },
    publicTests: [
      { id: "A1", title: "POST /api/oyunlar 201 ve 16 kartlık oyun döner", public: true },
      { id: "A2", title: "Kart çevirince değeri döner", public: true },
      { id: "A3", title: "Ana sayfada 16 kartlık tahta var", public: true },
      { id: "A4", title: "GET /api/skorlar dizi döner", public: true },
    ],
  },
  {
    id: "alisveris-listesi",
    title: "Mobil Alışveriş Listesi",
    tagline: "Telefona kurulan, internet yokken de açılan liste.",
    difficulty: "Kolay",
    positions: ["Cross-Platform", "Backend"],
    applyDays: 7,
    buildDays: 14,
    verified: true,
    hiddenCount: 12,
    spec: {
      problem: "Ev arkadaşlarıyla ortak alışveriş listesi tutmak istiyoruz. Uygulama telefona kurulabilmeli (PWA), markette internet çekmese de açılmalı ve küçük ekranda rahat kullanılmalı.",
      stories: ["Ürün ve adet eklerim.", "Aldığım ürünü işaretlerim; yenilesem de işaretli kalır.", "Ürünü silerim.", "Uygulamayı telefonun ana ekranına eklerim.", "İnternet yokken uygulama açılır, son listeyi ve bir uyarı görürüm."],
      api: [
        { method: "GET", path: "/api/urunler", response: '200 [{ "id", "ad", "adet", "alindi" }]' },
        { method: "POST", path: "/api/urunler", request: '{ "ad": "Süt", "adet": 2 }', response: "201 ürün · ad 1-60 karakter, adet 1-99 tam sayı değilse 400" },
        { method: "PATCH", path: "/api/urunler/:id", request: '{ "alindi": true }', response: "200 ürün · alindi true/false değilse 400 · yoksa 404" },
        { method: "DELETE", path: "/api/urunler/:id", response: "204 · yoksa 404" },
      ],
      testIds: [
        { page: "/", id: "urun-ad, urun-adet, urun-ekle", note: "Ekleme formu" },
        { page: "/", id: "urun-listesi, urun-satiri, urun-alindi, urun-sil", note: "Satırda alındıysa data-alindi=\"1\"; düğmeler en az 44×44 px" },
        { page: "/", id: "cevrimdisi-uyari", note: "İnternet yokken görünür" },
        { page: "/", id: "hata-mesaji", note: "Geçersiz eklemede görünür" },
      ],
      rules: [JSON_RULE, "Sayfada <link rel=\"manifest\">: name, short_name, start_url, display standalone, 192 ve 512 px PNG ikon.", "Service worker kayıtlı; uygulama bir kez açıldıktan sonra internet yokken de açılır.", "375 px genişlikte yatay kaydırma olmaz."],
    },
    publicTests: [
      { id: "A1", title: "GET /api/urunler dizi döner", public: true },
      { id: "A2", title: "POST /api/urunler geçerli üründe 201 döner", public: true },
      { id: "A3", title: "Telefon ekranında (375 px) form ve liste görünür", public: true },
      { id: "A4", title: "Sayfa bir web uygulaması manifest'ine bağlı", public: true },
    ],
  },
  {
    id: "duygu-analizi",
    title: "Geri Bildirim Duygu Analizi",
    tagline: "Yorumları olumlu / olumsuz / nötr diye sınıflandır, istatistiğini çıkar.",
    difficulty: "Orta",
    positions: ["Yapay Zeka", "Veri Bilimi", "Frontend"],
    applyDays: 7,
    buildDays: 21,
    verified: true,
    hiddenCount: 17,
    spec: {
      problem: "Etkinliklerden sonra yüzlerce geri bildirim geliyor, kimse okuyamıyor. Türkçe yorumları olumlu, olumsuz ya da nötr diye sınıflandıran bir servis ve etkinlik bazında istatistik gösteren bir panel istiyoruz. Model serbest: kendi eğittiğiniz model, kural tabanlı yöntem ya da açık kaynak bir kütüphane.",
      stories: ["Bir metin gönderip etiketini ve güven değerini alırım.", "Toplu metin gönderip hepsini birden sınıflandırırım (en fazla 100).", "Etkinliğe yorum eklerim; yorum sınıflandırılıp kaydedilir.", "Etkinliğin yorumlarını etikete göre süzerim.", "Etkinliğin olumlu / olumsuz / nötr sayılarını ve olumlu oranını görürüm."],
      api: [
        { method: "POST", path: "/api/tahmin", request: '{ "metin": "Harika bir etkinlikti!" }', response: '200 { "etiket": "olumlu" | "olumsuz" | "notr", "guven": 0-1 } · metin boş ya da 2000 karakterden uzunsa 400 · aynı metin hep aynı sonuç' },
        { method: "POST", path: "/api/toplu", request: '{ "metinler": ["...", "..."] }', response: "200 [{ etiket, guven }] aynı sırayla · boş liste ya da 100'den fazla 400" },
        { method: "POST", path: "/api/yorumlar", request: '{ "etkinlik": "Git atölyesi", "metin": "..." }', response: '201 { "id", "etkinlik", "metin", "etiket", "guven", "tarih" } · etkinlik ya da metin boşsa 400' },
        { method: "GET", path: "/api/yorumlar?etkinlik=x&etiket=olumsuz", response: "200 yorumlar (iki filtre de isteğe bağlı)" },
        { method: "GET", path: "/api/istatistik?etkinlik=x", response: '200 { "toplam", "olumlu", "olumsuz", "notr", "olumluOrani": 0-1 iki basamak, "ortalamaGuven" } · yorum yoksa hepsi 0' },
      ],
      testIds: [
        { page: "/", id: "yorum-etkinlik, yorum-metin, yorum-gonder, yorum-sonuc", note: "Yorum formu; gönderince yorum-sonuc etiketi gösterir" },
        { page: "/", id: "istatistik-toplam, istatistik-olumlu, istatistik-olumsuz, istatistik-notr", note: "Formdaki etkinliğin sayıları (sadece sayı), gönderdikçe güncellenir" },
        { page: "/", id: "filtre-etiket, yorum-satiri", note: "Etiket süzgeci (select: boş / olumlu / olumsuz / notr) ve her yorum (data-etiket)" },
      ],
      rules: [JSON_RULE, "Gizli testler etiketli bir veri setinde doğruluğa bakar (en az %70); olumsuzluk ('değildi', 'beğenmedim') anlaşılmalı.", "Model dışarıdan ücretli bir API'ye bağlı olmamalı (demo her an çalışmalı)."],
    },
    publicTests: [
      { id: "A1", title: "POST /api/tahmin etiket ve güven döner", public: true },
      { id: "A2", title: "Açıkça olumlu bir yorum olumlu bulunur", public: true },
      { id: "A3", title: "POST /api/yorumlar yorumu sınıflandırıp kaydeder (201)", public: true },
      { id: "A4", title: "Ana sayfada yorum formu ve istatistikler var", public: true },
    ],
  },
  {
    id: "guvenli-not",
    title: "Güvenli Not Defteri",
    tagline: "Not defteri yap, güvenlik denetiminden geçir.",
    difficulty: "Orta",
    positions: ["Siber Güvenlik", "Backend", "Frontend"],
    applyDays: 7,
    buildDays: 21,
    verified: true,
    hiddenCount: 18,
    spec: {
      problem: "Kulüp yönetimi şifreler ve iç notlar için bir not defteri kullanacak. Uygulama basit ama bir güvenlik denetiminden geçmek zorunda: gizli testler gerçek bir sızma testi gibi zayıf noktaları arar.",
      stories: ["Kayıt olup giriş yaparım; zayıf şifre kabul edilmez.", "Kendi notlarımı ekler, görür ve silerim; başkasının notlarına hiçbir yoldan ulaşılamaz.", "Çıkış yapınca oturumum gerçekten kapanır.", "Biri şifremi denemeye kalkarsa hesabım bir süre kilitlenir.", "Not içeriğine HTML ya da script yazılsa da sayfada sadece metin olarak görünür."],
      api: [
        { method: "POST", path: "/api/kayit", request: '{ "eposta", "sifre", "ad" }', response: "201 { id, eposta, ad } (şifre ya da özeti dönmez) · şifre en az 10 karakter, harf ve rakam içermezse 400 · aynı e-posta 409" },
        { method: "POST", path: "/api/giris", request: '{ "eposta", "sifre" }', response: "200 { token } · yanlışsa 401 (olmayan e-postayla aynı cevap) · 15 dakikada 5 hatalı denemeden sonra 429" },
        { method: "POST", path: "/api/cikis", response: "204 · token geçersiz olur" },
        { method: "GET", path: "/api/notlar", response: "200 sadece kendi notların" },
        { method: "POST", path: "/api/notlar", request: '{ "baslik", "icerik" }', response: "201 not · başlık 1-100, içerik en fazla 5000 karakter değilse 400" },
        { method: "GET", path: "/api/notlar/:id", response: "200 not · başkasının ya da olmayan not 404" },
        { method: "DELETE", path: "/api/notlar/:id", response: "204 · başkasının ya da olmayan not 404" },
      ],
      testIds: [
        ...AUTH_IDS,
        { page: "/", id: "not-baslik, not-icerik, not-ekle", note: "Not formu (girişsizse /giris'e yönlendirir)" },
        { page: "/", id: "not-listesi, not-satiri, not-sil, cikis", note: "Notlar, her not, sil ve çıkış düğmeleri" },
      ],
      rules: [JSON_RULE, AUTH_RULE, "Sayfalar şu başlıkları gönderir: Content-Security-Policy (script-src'de 'unsafe-inline' yok), X-Content-Type-Options: nosniff, X-Frame-Options ya da frame-ancestors, Referrer-Policy.", "Şifreler yavaş bir özetle (bcrypt, scrypt, argon2) saklanır."],
    },
    publicTests: [
      { id: "A1", title: "Kayıt 201, giriş token döner", public: true },
      { id: "A2", title: "Girişli kullanıcı not ekler (201) ve listesinde görür", public: true },
      { id: "A3", title: "Girişsiz not listesi 401 döner", public: true },
      { id: "A4", title: "Giriş ve kayıt sayfalarında formlar var", public: true },
    ],
  },
  {
    id: "akilli-sera",
    title: "Akıllı Sera",
    tagline: "Sensörler ölçüm göndersin, panel alarm versin, cihaz komut alsın.",
    difficulty: "Orta",
    positions: ["Gömülü / IoT", "Backend", "Frontend"],
    applyDays: 7,
    buildDays: 21,
    verified: true,
    hiddenCount: 18,
    spec: {
      problem: "Kampüs serasında sıcaklık, nem ve toprak nemi ölçen cihazlar var (ESP32, Raspberry Pi ya da bir simülatör). Cihazların kendi anahtarlarıyla ölçüm gönderdiği, panelin son değerleri ve alarmları canlı gösterdiği, fan ve sulama komutlarının cihaza iletildiği bir sistem istiyoruz.",
      stories: ["Cihaz eklerim; cihaza özel bir anahtar alırım.", "Cihaz anahtarıyla ölçüm gönderir; anahtarsız ölçüm kabul edilmez.", "Panelde son ölçümü sayfayı yenilemeden görürüm.", "Sıcaklık eşiği aşılınca alarm oluşur; toprak kuruyunca sulama komutu kendiliğinden verilir.", "Panelden fan ve sulama komutu gönderirim; cihaz komutu çeker, bitirince bildirir."],
      api: [
        { method: "POST", path: "/api/cihazlar", request: '{ "ad": "Sera 1" }', response: '201 { "id", "ad", "anahtar" }' },
        { method: "POST", path: "/api/olcumler", request: 'X-Cihaz-Anahtari başlığı · { "sicaklik": 24.5, "nem": 60, "toprakNemi": 45 }', response: "201 ölçüm · anahtar yok ya da yanlışsa 401 · sicaklik -40..85, nem ve toprakNemi 0..100 sayı değilse 400" },
        { method: "GET", path: "/api/cihazlar/:id/son", response: "200 son ölçüm · ölçüm ya da cihaz yoksa 404" },
        { method: "GET", path: "/api/cihazlar/:id/olcumler?limit=20", response: "200 yeniden eskiye (limit en fazla 100)" },
        { method: "GET", path: "/api/cihazlar/:id/ozet", response: '200 { "adet", "ortalamaSicaklik" (1 basamak), "enYuksekSicaklik", "enDusukSicaklik" }' },
        { method: "PUT", path: "/api/cihazlar/:id/esikler", request: '{ "sicaklikMax": 35, "toprakNemiMin": 20 }', response: "200 · geçersizse 400" },
        { method: "GET", path: "/api/cihazlar/:id/alarmlar", response: '200 [{ "tur": "sicaklik" | "toprak", "deger", "zaman" }] yeniden eskiye' },
        { method: "POST", path: "/api/cihazlar/:id/komutlar", request: '{ "komut": "fan-ac" | "fan-kapat" | "sulama-baslat" }', response: '201 { "id", "komut", "durum": "bekliyor" } · geçersiz komut 400' },
        { method: "GET", path: "/api/cihazlar/:id/komutlar", response: "200 komutlar ve durumları (bekliyor, iletildi, tamamlandi), yeniden eskiye" },
        { method: "GET", path: "/api/cihaz/komutlar", request: "X-Cihaz-Anahtari başlığı", response: '200 [{ "id", "komut" }] bekleyenler; çekilen komut "iletildi" olur, tekrar gelmez' },
        { method: "POST", path: "/api/cihaz/komutlar/:id/tamam", request: "X-Cihaz-Anahtari başlığı", response: "200 · başka cihazın komutu 404" },
      ],
      testIds: [
        { page: "/cihaz/:id", id: "son-sicaklik, son-nem, son-toprak", note: "Son ölçüm (sadece sayı); en geç 5 saniyede kendiliğinden güncellenir" },
        { page: "/cihaz/:id", id: "komut-fan-ac, komut-fan-kapat, komut-sulama", note: "Komut düğmeleri" },
        { page: "/cihaz/:id", id: "komut-listesi, komut-satiri", note: "Her komut satırı data-komut ve data-durum taşır, canlı güncellenir" },
        { page: "/cihaz/:id", id: "alarm-listesi, alarm-satiri", note: "Her alarm data-tur taşır" },
      ],
      rules: [JSON_RULE, "Toprak nemi eşiğin altına düşünce, bekleyen ya da iletilmiş bir sulama komutu yoksa tek bir sulama-baslat komutu oluşur.", "Cihaz anahtarı sadece ölçüm gönderme ve komut çekme/tamamlama için."],
    },
    publicTests: [
      { id: "A1", title: "POST /api/cihazlar 201, id ve anahtar döner", public: true },
      { id: "A2", title: "Cihaz anahtarıyla ölçüm gönderir (201)", public: true },
      { id: "A3", title: "Son ölçüm okunur", public: true },
      { id: "A4", title: "Cihaz sayfasında son değerler ve komut düğmeleri var", public: true },
    ],
  },
];

export const bankSpec = (id: string | null | undefined) => SPEC_BANK.find((s) => s.id === id) ?? null;
