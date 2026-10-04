// Başlangıç (demo) verisi. Sadece scripts/seed.mts kullanır; uygulama bu dosyayı içe aktarmaz.
import type {
  Certificate,
  Competition,
  Conversation,
  Notification,
  Profile,
  Project,
  PublicUser,
  Reference,
  ScoreEvent,
} from "../src/lib/types.ts";

export const ME_USERNAME = "denizkaya";

export const USERS: PublicUser[] = [
  { username: "eceyilmaz", name: "Ece Yılmaz", school: "Boğaziçi Üniversitesi", city: "İstanbul", field: "Frontend", score: 79, trend: 3, github: "eceyilmaz", about: "Erişilebilir arayüzler ve tasarım sistemleri üzerine çalışıyorum.", skills: ["React", "TypeScript", "Tailwind", "Figma"], interests: ["Erişilebilirlik", "Tasarım sistemleri"], projects: [{ name: "a11y-kit", techs: ["React", "TypeScript"], difficulty: "Zor", description: "Erişilebilir React bileşenleri." }, { name: "portfolio", techs: ["Next.js"], difficulty: "Kolay", description: "Kişisel site." }] },
  { username: "ardademir", name: "Arda Demir", school: "İstanbul Teknik Üniversitesi", city: "İstanbul", field: "Backend", score: 78, trend: 5, github: "ardademir", about: "Dağıtık sistemler ve Go ile servis yazmayı seviyorum.", skills: ["Go", "PostgreSQL", "gRPC", "Docker"], interests: ["Dağıtık sistemler", "Açık kaynak"], projects: [{ name: "queue-go", techs: ["Go", "Redis"], difficulty: "Zor", description: "Basit bir iş kuyruğu." }, { name: "url-short", techs: ["Go", "PostgreSQL"], difficulty: "Orta", description: "Link kısaltıcı." }] },
  { username: "selinaksoy", name: "Selin Aksoy", school: "Yıldız Teknik Üniversitesi", city: "İstanbul", field: "Mobil", score: 76, trend: 2, github: "selinaksoy", about: "Flutter ile mobil uygulamalar geliştiriyorum.", skills: ["Flutter", "Dart", "Firebase"], interests: ["Mobil", "Oyun"], projects: [{ name: "yesil-rota-app", techs: ["Flutter"], difficulty: "Orta", description: "Rota planlama uygulaması." }] },
  { username: "keremoral", name: "Kerem Oral", school: "ODTÜ", city: "Ankara", field: "Veritabanı", score: 70, trend: 1, github: "keremoral", about: "Sorgu optimizasyonu ve veri modelleme.", skills: ["PostgreSQL", "SQL", "Python"], interests: ["Veri", "Performans"], projects: [{ name: "pg-tuner", techs: ["Python", "PostgreSQL"], difficulty: "Zor", description: "Sorgu planı analiz aracı." }] },
  { username: "minakaya", name: "Mina Kaya", school: "Koç Üniversitesi", city: "İstanbul", field: "DevOps", score: 66, trend: 4, github: "minakaya", about: "CI/CD ve bulut altyapısı.", skills: ["Docker", "Kubernetes", "GitHub Actions"], interests: ["Bulut", "Otomasyon"], projects: [{ name: "ci-templates", techs: ["GitHub Actions"], difficulty: "Orta", description: "Hazır CI şablonları." }] },
  { username: "emrecelik", name: "Emre Çelik", school: "Uludağ Üniversitesi", city: "Bursa", field: "DevOps", score: 63, trend: -1, github: "emrecelik", about: "Linux ve otomasyon.", skills: ["Linux", "Ansible", "Docker"], interests: ["Altyapı"], projects: [{ name: "homelab", techs: ["Ansible", "Docker"], difficulty: "Orta", description: "Ev sunucusu kurulumu." }] },
  { username: "burakatan", name: "Burak Tan", school: "Sabancı Üniversitesi", city: "İstanbul", field: "Backend", score: 91, trend: 2, github: "buraktan", about: "Ödeme sistemlerinde 5 yıl.", skills: ["Java", "Kotlin", "Kafka", "PostgreSQL"], interests: ["Fintek", "Mentorluk"], projects: [{ name: "ledger", techs: ["Kotlin", "PostgreSQL"], difficulty: "Zor", description: "Çift kayıtlı muhasebe servisi." }] },
  { username: "zeynepacar", name: "Zeynep Acar", school: "Bilkent Üniversitesi", city: "Ankara", field: "Frontend", score: 88, trend: 1, github: "zeynepacar", about: "Performans odaklı web arayüzleri.", skills: ["React", "Next.js", "Web Vitals"], interests: ["Performans", "Mentorluk"], projects: [{ name: "fast-table", techs: ["React", "TypeScript"], difficulty: "Zor", description: "Sanal kaydırmalı tablo." }] },
  { username: "mehmetsahin", name: "Mehmet Şahin", school: "Ege Üniversitesi", city: "İzmir", field: "Frontend", score: 85, trend: 0, github: "mehmetsahin", about: "8 yıllık frontend geliştirici, yarışmalarda mentor.", skills: ["Vue", "React", "TypeScript"], interests: ["Mentorluk", "UI"], projects: [{ name: "ui-lab", techs: ["Vue", "TypeScript"], difficulty: "Zor", description: "Bileşen deneyleri." }] },
  { username: "canerer", name: "Can Eren", school: "ODTÜ", city: "Ankara", field: "DevOps", score: 82, trend: 3, github: "caneren", about: "Kubernetes ve gözlemlenebilirlik.", skills: ["Kubernetes", "Prometheus", "Terraform"], interests: ["SRE"], projects: [{ name: "k8s-starter", techs: ["Kubernetes", "Helm"], difficulty: "Zor", description: "Başlangıç kümesi." }] },
  { username: "aysayildiz", name: "Ayşe Yıldız", school: "Cumhuriyet Üniversitesi", city: "Sivas", field: "Veritabanı", score: 52, trend: 6, github: "ayseyildiz", about: "Bilgisayar mühendisliği 3. sınıf, veritabanına meraklıyım.", skills: ["SQL", "MySQL", "Python"], interests: ["Veri", "Eğitim"], projects: [{ name: "kutuphane-db", techs: ["MySQL"], difficulty: "Orta", description: "Kütüphane veritabanı tasarımı." }] },
  { username: "alidemirci", name: "Ali Demirci", school: "Ege Üniversitesi", city: "İzmir", field: "Frontend", score: 42, trend: 4, github: "alidemirci", about: "Yeni başladım, her gün kod yazıyorum.", skills: ["HTML", "CSS", "JavaScript"], interests: ["Web"], projects: [{ name: "todo", techs: ["JavaScript"], difficulty: "Kolay", description: "Yapılacaklar listesi." }] },
  { username: "defneucar", name: "Defne Uçar", school: "Marmara Üniversitesi", city: "İstanbul", field: "Mobil", score: 37, trend: 2, github: "defneucar", about: "Kotlin öğreniyorum.", skills: ["Kotlin", "Android"], interests: ["Mobil"], projects: [{ name: "hava-durumu", techs: ["Kotlin"], difficulty: "Kolay", description: "Hava durumu uygulaması." }] },
  { username: "mertaydin", name: "Mert Aydın", school: "Gazi Üniversitesi", city: "Ankara", field: "Backend", score: 29, trend: 1, github: "mertaydin", about: "Node.js ile ilk API'lerimi yazıyorum.", skills: ["Node.js", "Express"], interests: ["Backend"], projects: [{ name: "notes-api", techs: ["Node.js"], difficulty: "Kolay", description: "Not API'si." }] },
];

export const findUser = (u: string) => USERS.find((x) => x.username === u);

// ---- Demo hesabı: Deniz Kaya ----

export const DEMO_PROFILE: Profile = {
  username: ME_USERNAME,
  name: "Deniz Kaya",
  email: "deniz@ornek.com",
  headline: "Backend geliştirici",
  field: "Backend",
  school: "İstanbul Teknik Üniversitesi",
  department: "Bilgisayar Mühendisliği",
  city: "İstanbul",
  github: "",
  githubVerified: false,
  githubCode: "",
  about: "API ve veritabanı tarafında çalışmayı seviyorum. Gerçek zamanlı sistemler ve temiz şema tasarımı ilgimi çekiyor.",
  interests: ["Gerçek zamanlı sistemler", "Açık kaynak", "Veritabanı tasarımı"],
  skills: [
    { name: "Node.js", proof: "Kod" },
    { name: "PostgreSQL", proof: "Kod" },
    { name: "TypeScript", proof: "Kod" },
    { name: "Docker", proof: "Yarışma" },
    { name: "SQL", proof: "Sertifika" },
    { name: "Kubernetes", proof: "Beyan" },
  ],
  experiences: [
    { id: "exp-1", kind: "Staj", title: "Backend stajyeri", org: "Pusula Yazılım", start: "Haz 2025", end: "Ağu 2025", description: "Bildirim servisinin kuyruk yapısını yeniden yazdım." },
    { id: "exp-2", kind: "Gönüllü", title: "Topluluk ekibi", org: "İTÜ Bilgisayar Kulübü", start: "Eki 2024", end: "Devam ediyor" },
  ],
  education: [{ school: "İstanbul Teknik Üniversitesi", department: "Bilgisayar Mühendisliği", start: "2022", end: "2026" }],
  connections: ["ardademir", "eceyilmaz", "selinaksoy", "keremoral", "aysayildiz", "mehmetsahin"],
};

export const DEMO_PROJECTS: Project[] = [
  {
    id: "p-1", name: "pulse-api", repoUrl: "https://github.com/denizkaya/pulse-api", description: "Gerçek zamanlı bildirim ve kullanıcı yönetimi API'si.", techs: ["Node.js", "PostgreSQL", "Docker"], role: "Tek başıma", language: "TypeScript", addedAt: "2026-09-12",
    analysis: { difficulty: "Zor", quality: "Çok iyi", authorship: 96, commits: 148, checks: { readme: true, tests: true, ci: true, demo: false }, points: 10, summary: "WebSocket katmanı ve kuyruk yapısı projeyi zorlaştırıyor. Testler ve CI var." },
  },
  {
    id: "p-2", name: "taskflow", repoUrl: "https://github.com/denizkaya/taskflow", description: "Takımlar için sade, hızlı bir görev yönetimi uygulaması.", techs: ["React", "TypeScript", "Tailwind"], role: "Takımla", language: "TypeScript", addedAt: "2026-09-20",
    analysis: { difficulty: "Orta", quality: "İyi", authorship: 58, commits: 64, checks: { readme: true, tests: false, ci: true, demo: true }, points: 7, summary: "Standart bir CRUD uygulaması; canlı demo ve CI artı, test eksik." },
  },
  {
    id: "p-3", name: "query-lab", repoUrl: "https://github.com/denizkaya/query-lab", description: "SQL sorguları ve veritabanı performans deneyleri.", techs: ["Python", "SQL"], role: "Tek başıma", language: "Python", addedAt: "2026-09-28",
    analysis: { difficulty: "Orta", quality: "Zayıf", authorship: 100, commits: 21, checks: { readme: true, tests: false, ci: false, demo: false }, points: 6, summary: "İlginç deneyler var ama test ve CI yok, commit geçmişi kısa." },
  },
];

export const DEMO_CERTS: Certificate[] = [
  { id: "c-1", name: "SQL ile Veritabanı Programlama", provider: "BTK Akademi", link: "https://www.btkakademi.gov.tr/portal/certificate/validate?certificateId=AB12CD", date: "2026-05-14", status: "Doğrulandı", points: 4 },
  { id: "c-2", name: "AWS Cloud Practitioner", provider: "Credly", link: "https://www.credly.com/badges/1f3a", date: "2026-07-02", status: "Doğrulandı", points: 4 },
];

export const DEMO_REFERENCES: Reference[] = [
  {
    token: "ref-pusula-01", targetType: "experience", targetId: "exp-1", targetLabel: "Backend stajyeri · Pusula Yazılım", approverName: "Ahmet Er", approverEmail: "ahmet.er@pusulayazilim.com.tr", relation: "Staj amiri", status: "Onaylandı",
    comment: "Deniz staj boyunca bildirim servisimizin kuyruk yapısını tek başına yeniden yazdı. Sorumluluk alan, soru sormaktan çekinmeyen biri.", requestedAt: "2026-09-01", answeredAt: "2026-09-03", points: 6,
  },
];

export const DEMO_PEER: { from: string; competitionId: string; stars: number; note?: string }[] = [
  { from: "selinaksoy", competitionId: "y-05", stars: 5, note: "API'yi erkenden hazırladı, işimizi çok kolaylaştırdı." },
  { from: "keremoral", competitionId: "y-05", stars: 4 },
];

export const DEMO_HISTORY: ScoreEvent[] = [
  { id: "h-1", at: "2026-09-03", source: "Referanslar", label: "Ahmet Er stajını onayladı", points: 6 },
  { id: "h-2", at: "2026-09-12", source: "Projeler", label: "pulse-api eklendi", points: 10 },
  { id: "h-3", at: "2026-09-20", source: "Projeler", label: "taskflow eklendi", points: 7 },
  { id: "h-4", at: "2026-09-28", source: "Projeler", label: "query-lab eklendi", points: 6 },
  { id: "h-5", at: "2026-09-29", source: "Yarışmalar", label: "Y-05 Yeşil Rota · 2. takım", points: 10 },
  { id: "h-6", at: "2026-09-30", source: "Akran puanı", label: "Y-05 takım arkadaşlarından", points: 14 },
  { id: "h-7", at: "2026-05-14", source: "Sertifikalar", label: "BTK Akademi · SQL", points: 4 },
  { id: "h-8", at: "2026-07-02", source: "Sertifikalar", label: "Credly · AWS Cloud Practitioner", points: 4 },
];

export const COMPETITIONS: Competition[] = [
  {
    id: "y-08", code: "Y-08", title: "Kampüs Pazarı", tagline: "Öğrenciler arasında ikinci el alışverişi kolaylaştır.", theme: "E-ticaret", status: "Başvurular açık",
    description: "Kampüste kitap, eşya ve not alışverişi dağınık WhatsApp gruplarında dönüyor. Güvenli, okul e-postasıyla giriş yapılan bir pazar yeri istiyoruz.",
    brief: ["Okul e-postasıyla doğrulanan kullanıcılar", "İlan verme, arama ve mesajlaşma", "Mobilde rahat kullanılabilen arayüz"],
    deliverables: ["Herkese açık GitHub reposu", "README'de kurulum adımları", "2 dakikalık demo videosu linki"],
    positions: [{ field: "Frontend", perTeam: 1, applicants: 14 }, { field: "Backend", perTeam: 1, applicants: 9 }, { field: "Mobil", perTeam: 1, applicants: 6 }],
    applyDeadline: "2026-10-20", start: "2026-10-22", end: "2026-11-19", teams: [],
  },
  {
    id: "y-07", code: "Y-07", title: "Şehrin Nabzı", tagline: "Açık veriyle şehir yaşamını kolaylaştır.", theme: "Açık veri", status: "Başvurular açık",
    description: "Belediyelerin açık veri portallarındaki ulaşım, otopark ve hava kalitesi verilerini kullanarak şehirde yaşayanların işine yarayacak bir ürün geliştirin.",
    brief: ["En az bir açık veri kaynağı kullanılmalı", "Veri düzenli aralıklarla güncellenmeli", "Sonuçlar harita ya da grafikle gösterilmeli"],
    deliverables: ["Herkese açık GitHub reposu", "Veritabanı şeması", "Canlı demo linki (varsa)"],
    positions: [{ field: "Frontend", perTeam: 1, applicants: 21 }, { field: "Backend", perTeam: 1, applicants: 17 }, { field: "Veritabanı", perTeam: 1, applicants: 8 }],
    applyDeadline: "2026-10-12", start: "2026-10-14", end: "2026-11-11", teams: [],
  },
  {
    id: "y-06", code: "Y-06", title: "Erişilebilir Web", tagline: "Daha kapsayıcı bir internet için.", theme: "Web", status: "Devam ediyor",
    description: "Ekran okuyucu ve klavye ile sorunsuz kullanılabilen, WCAG AA kriterlerini karşılayan bir web uygulaması geliştirin.",
    brief: ["WCAG 2.2 AA kontrast ve odak kuralları", "Klavyeyle tam gezinme", "Otomatik erişilebilirlik testi CI'da çalışmalı"],
    deliverables: ["Herkese açık GitHub reposu", "Erişilebilirlik raporu (README'de)"],
    positions: [{ field: "Frontend", perTeam: 1, applicants: 18 }, { field: "Backend", perTeam: 1, applicants: 12 }, { field: "DevOps", perTeam: 1, applicants: 7 }],
    applyDeadline: "2026-09-24", start: "2026-09-27", end: "2026-10-25",
    teams: [
      { id: "t-kontrast", competitionId: "y-06", name: "Kontrast", members: [{ username: "eceyilmaz", name: "Ece Yılmaz", field: "Frontend" }, { username: "denizkaya", name: "Deniz Kaya", field: "Backend" }, { username: "canerer", name: "Can Eren", field: "DevOps" }] },
      { id: "t-odak", competitionId: "y-06", name: "Odak", members: [{ username: "zeynepacar", name: "Zeynep Acar", field: "Frontend" }, { username: "mertaydin", name: "Mert Aydın", field: "Backend" }, { username: "minakaya", name: "Mina Kaya", field: "DevOps" }], repoUrl: "https://github.com/odak-takim/erisim", submitted: true },
      { id: "t-alt-metin", competitionId: "y-06", name: "Alt Metin", members: [{ username: "alidemirci", name: "Ali Demirci", field: "Frontend" }, { username: "ardademir", name: "Arda Demir", field: "Backend" }, { username: "emrecelik", name: "Emre Çelik", field: "DevOps" }] },
    ],
  },
  {
    id: "y-05", code: "Y-05", title: "Yeşil Rota", tagline: "Sürdürülebilir ulaşım için akıllı rota.", theme: "Mobil", status: "Tamamlandı",
    description: "Toplu taşıma, bisiklet ve yürüyüşü birleştirip karbon ayak izini gösteren bir rota planlayıcı.",
    brief: ["En az iki ulaşım türü birleştirilmeli", "Karbon tahmini gösterilmeli", "Çevrimdışı temel kullanım"],
    deliverables: ["Herkese açık GitHub reposu", "APK ya da web demo linki"],
    positions: [{ field: "Mobil", perTeam: 1, applicants: 11 }, { field: "Backend", perTeam: 1, applicants: 13 }, { field: "Veritabanı", perTeam: 1, applicants: 6 }],
    applyDeadline: "2026-08-20", start: "2026-08-24", end: "2026-09-28",
    teams: [
      { id: "t-pedal", competitionId: "y-05", name: "Pedal", rank: 1, juryScore: 92, submitted: true, repoUrl: "https://github.com/pedal-takim/yesil-rota", members: [{ username: "defneucar", name: "Defne Uçar", field: "Mobil" }, { username: "burakatan", name: "Burak Tan", field: "Backend" }, { username: "aysayildiz", name: "Ayşe Yıldız", field: "Veritabanı" }] },
      { id: "t-durak", competitionId: "y-05", name: "Durak", rank: 2, juryScore: 88, submitted: true, repoUrl: "https://github.com/durak-takim/rota", members: [{ username: "selinaksoy", name: "Selin Aksoy", field: "Mobil" }, { username: "denizkaya", name: "Deniz Kaya", field: "Backend" }, { username: "keremoral", name: "Kerem Oral", field: "Veritabanı" }] },
      { id: "t-aktarma", competitionId: "y-05", name: "Aktarma", rank: 3, juryScore: 81, submitted: true, repoUrl: "https://github.com/aktarma/green-route", members: [{ username: "mehmetsahin", name: "Mehmet Şahin", field: "Mobil" }, { username: "ardademir", name: "Arda Demir", field: "Backend" }, { username: "minakaya", name: "Mina Kaya", field: "Veritabanı" }] },
      { id: "t-iz", competitionId: "y-05", name: "İz", rank: 4, juryScore: 74, submitted: true, repoUrl: "https://github.com/iz-takim/karbon", members: [{ username: "alidemirci", name: "Ali Demirci", field: "Mobil" }, { username: "mertaydin", name: "Mert Aydın", field: "Backend" }, { username: "emrecelik", name: "Emre Çelik", field: "Veritabanı" }] },
    ],
  },
];

export const findCompetition = (id: string) => COMPETITIONS.find((c) => c.id === id);
export const findTeam = (id: string) => COMPETITIONS.flatMap((c) => c.teams).find((t) => t.id === id);

export const DEMO_CONVERSATIONS: Conversation[] = [
  { id: "cv-ayse", with: "aysayildiz", messages: [{ id: "m1", from: "aysayildiz", text: "Merhaba Deniz! query-lab'ı gördüm, indeks deneylerini merak ediyorum.", at: "10:24" }] },
  { id: "cv-mehmet", with: "mehmetsahin", messages: [{ id: "m2", from: "me", text: "Y-05'teki geri bildirimin için teşekkürler.", at: "Dün" }, { id: "m3", from: "mehmetsahin", text: "Rica ederim, Y-07'de görüşürüz!", at: "Dün" }] },
  { id: "cv-arda", with: "ardademir", messages: [{ id: "m4", from: "ardademir", text: "Go'da kuyruk yazdım, bakmak ister misin?", at: "Pzt" }] },
];

export const TEAM_CHAT_SEED: Record<string, { from: string; text: string; at: string }[]> = {
  "t-kontrast": [
    { from: "eceyilmaz", text: "Ana sayfanın klavye gezinmesi tamam. Odak halkalarını da ekledim.", at: "09:12" },
    { from: "canerer", text: "axe testini CI'a bağladım, PR'larda çalışıyor.", at: "09:40" },
    { from: "me", text: "Form API'sindeki hata mesajlarını ekran okuyucuya uygun hale getiriyorum.", at: "10:05" },
  ],
  "t-durak": [
    { from: "selinaksoy", text: "Teslim ettik, emeğinize sağlık!", at: "28 Eyl" },
    { from: "keremoral", text: "Sıralama açıklandı, ikinciyiz 🎉", at: "29 Eyl" },
  ],
};

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: "n-1", text: "Y-05 sonuçları açıklandı. Takımın 2. oldu.", href: "/yarismalar/y-05", at: "29 Eyl", read: false },
  { id: "n-2", text: "Y-05 takım arkadaşlarını puanlamayı unutma.", href: "/yarismalar/y-05", at: "29 Eyl", read: false },
  { id: "n-3", text: "Ahmet Er stajını onayladı ve yorum yazdı.", href: "/profil", at: "3 Eyl", read: true },
];
