// Başlangıç (demo) verisi. Sadece scripts/seed.mts kullanır; uygulama bu dosyayı içe aktarmaz.
// Kurgu: iki deneme sezonu geçmiş (ligler bu yüzden dolu), "Sezon 1" açık. Deniz Orta ligde tam yükselme çizgisinin
// altında (21.); demoda bir proje ekleyince çizginin üstüne çıkar. Y-05 tamamlandı (karneler), Y-06 değerlendirilmeye
// hazır, Y-07 ve Y-08 başvuruya açık, Y-09 sırada, Y-10 taslak.
import type { Difficulty, Field, Level } from "../src/lib/types.ts";

export const ME_USERNAME = "denizkaya";

export const SEASONS = [
  { id: -1, name: "Deneme sezonu A", starts_at: "2025-10-01T00:00:00+03:00", ends_at: "2026-04-01T00:00:00+03:00", closed_at: "2026-04-01T00:00:00+03:00" },
  { id: 0, name: "Deneme sezonu B", starts_at: "2026-04-01T00:00:00+03:00", ends_at: "2026-10-01T00:00:00+03:00", closed_at: "2026-10-01T00:00:00+03:00" },
  { id: 1, name: "Sezon 1", starts_at: "2026-10-01T00:00:00+03:00", ends_at: "2027-01-01T00:00:00+03:00", closed_at: null },
];
export const seasonOf = (iso: string) => (iso < "2026-04-01" ? -1 : iso < "2026-10-01" ? 0 : 1);

export interface Quality {
  ci?: boolean;
  demo?: boolean;
  readme?: boolean;
  days?: number;
}

export interface SeedProject {
  name: string;
  description: string;
  techs: string[];
  difficulty: Difficulty;
  q: Quality;
  at: string; // YYYY-AA-GG
  reasons?: { feature: string; file: string }[];
}

export interface SeedUser {
  username: string;
  name: string;
  school: string;
  city: string;
  field: Field;
  league: Level;
  about: string;
  skills: string[];
  interests: string[];
  /** Bu sezonun puan hedefi (projelerle tam tutturulur) */
  season: number;
  /** Deneme sezonlarındaki puan hedefi */
  pilot: number;
  github?: string;
}

// ---------- Örnek yazılımcılar ----------

const U = (username: string, name: string, school: string, city: string, field: Field, league: Level, season: number, pilot: number, about: string, skills: string[], interests: string[]): SeedUser => ({
  username,
  name,
  school,
  city,
  field,
  league,
  season,
  pilot,
  about,
  skills,
  interests,
});

export const USERS: SeedUser[] = [
  // Kıdemli (8): ilk 20'si (100+) sezon şampiyonu adayı; 100'ün altındaki düşme bölgesinde.
  U("burakatan", "Burak Tan", "Sabancı Üniversitesi", "İstanbul", "Backend", "Kıdemli", 420, 520, "Ödeme sistemlerinde 5 yıl.", ["Java", "Kotlin", "Kafka", "PostgreSQL"], ["Fintek", "Mentorluk"]),
  U("zeynepacar", "Zeynep Acar", "Bilkent Üniversitesi", "Ankara", "Frontend", "Kıdemli", 380, 470, "Performans odaklı web arayüzleri.", ["React", "Next.js", "Web Vitals"], ["Performans", "Mentorluk"]),
  U("canerer", "Can Eren", "ODTÜ", "Ankara", "DevOps", "Kıdemli", 340, 440, "Kubernetes ve gözlemlenebilirlik.", ["Kubernetes", "Prometheus", "Terraform"], ["SRE"]),
  U("mehmetsahin", "Mehmet Şahin", "Ege Üniversitesi", "İzmir", "Frontend", "Kıdemli", 300, 420, "8 yıllık frontend geliştirici, yarışmalarda mentor.", ["Vue", "React", "TypeScript"], ["Mentorluk", "UI"]),
  U("elifkoc", "Elif Koç", "Hacettepe Üniversitesi", "Ankara", "Backend", "Kıdemli", 262, 400, "Dağıtık önbellek ve kuyruk sistemleri.", ["Go", "Redis", "NATS"], ["Dağıtık sistemler"]),
  U("onurbal", "Onur Bal", "İTÜ", "İstanbul", "Mobil", "Kıdemli", 210, 380, "Flutter ve yerel modüller.", ["Flutter", "Kotlin", "Swift"], ["Mobil", "Oyun"]),
  U("gizemyurt", "Gizem Yurt", "Dokuz Eylül Üniversitesi", "İzmir", "Veritabanı", "Kıdemli", 150, 360, "Veri ambarı ve sorgu optimizasyonu.", ["PostgreSQL", "dbt", "Python"], ["Veri"]),
  U("hakanarslan", "Hakan Arslan", "Gazi Üniversitesi", "Ankara", "DevOps", "Kıdemli", 60, 350, "Bulut altyapısı ve maliyet optimizasyonu.", ["AWS", "Terraform", "Docker"], ["Bulut"]),

  // Orta (24 + Deniz): Deniz 130 puanla 21.; ilk 20'nin en sonu 138.
  U("eceyilmaz", "Ece Yılmaz", "Boğaziçi Üniversitesi", "İstanbul", "Frontend", "Orta", 360, 210, "Erişilebilir arayüzler ve tasarım sistemleri üzerine çalışıyorum.", ["React", "TypeScript", "Tailwind", "Figma"], ["Erişilebilirlik", "Tasarım sistemleri"]),
  U("ardademir", "Arda Demir", "İstanbul Teknik Üniversitesi", "İstanbul", "Backend", "Orta", 322, 190, "Dağıtık sistemler ve Go ile servis yazmayı seviyorum.", ["Go", "PostgreSQL", "gRPC", "Docker"], ["Dağıtık sistemler", "Açık kaynak"]),
  U("selinaksoy", "Selin Aksoy", "Yıldız Teknik Üniversitesi", "İstanbul", "Mobil", "Orta", 300, 180, "Flutter ile mobil uygulamalar geliştiriyorum.", ["Flutter", "Dart", "Firebase"], ["Mobil", "Oyun"]),
  U("keremoral", "Kerem Oral", "ODTÜ", "Ankara", "Veritabanı", "Orta", 284, 170, "Sorgu optimizasyonu ve veri modelleme.", ["PostgreSQL", "SQL", "Python"], ["Veri", "Performans"]),
  U("minakaya", "Mina Kaya", "Koç Üniversitesi", "İstanbul", "DevOps", "Orta", 270, 160, "CI/CD ve bulut altyapısı.", ["Docker", "Kubernetes", "GitHub Actions"], ["Bulut", "Otomasyon"]),
  U("emrecelik", "Emre Çelik", "Uludağ Üniversitesi", "Bursa", "DevOps", "Orta", 256, 150, "Linux ve otomasyon.", ["Linux", "Ansible", "Docker"], ["Altyapı"]),
  U("berkaygul", "Berkay Gül", "Anadolu Üniversitesi", "Eskişehir", "Backend", "Orta", 240, 150, "Node.js ile gerçek zamanlı servisler.", ["Node.js", "Socket.IO", "Redis"], ["Gerçek zamanlı sistemler"]),
  U("nazlicetin", "Nazlı Çetin", "Ankara Üniversitesi", "Ankara", "Frontend", "Orta", 228, 140, "Svelte ve veri görselleştirme.", ["Svelte", "D3", "TypeScript"], ["Veri görselleştirme"]),
  U("tolgaozer", "Tolga Özer", "Pamukkale Üniversitesi", "Denizli", "Mobil", "Orta", 216, 140, "Android ve çevrimdışı senkronizasyon.", ["Kotlin", "Room", "Android"], ["Mobil"]),
  U("ilaydasen", "İlayda Şen", "Marmara Üniversitesi", "İstanbul", "Veritabanı", "Orta", 204, 130, "MongoDB ve veri modelleme.", ["MongoDB", "Node.js", "SQL"], ["Veri"]),
  U("serkanbulut", "Serkan Bulut", "Erciyes Üniversitesi", "Kayseri", "Backend", "Orta", 196, 130, "Java Spring ile mikroservisler.", ["Java", "Spring", "PostgreSQL"], ["Mikroservis"]),
  U("pelinakin", "Pelin Akın", "Akdeniz Üniversitesi", "Antalya", "Frontend", "Orta", 188, 120, "React Native ve web.", ["React", "React Native", "TypeScript"], ["Mobil", "UI"]),
  U("ugurkaya", "Uğur Kaya", "Sakarya Üniversitesi", "Sakarya", "DevOps", "Orta", 180, 120, "GitOps ve izleme.", ["ArgoCD", "Kubernetes", "Grafana"], ["SRE"]),
  U("melisdag", "Melis Dağ", "Trakya Üniversitesi", "Edirne", "Backend", "Orta", 172, 120, "Python ve FastAPI.", ["Python", "FastAPI", "PostgreSQL"], ["Yapay zeka"]),
  U("baransoylu", "Baran Soylu", "Fırat Üniversitesi", "Elazığ", "Frontend", "Orta", 166, 110, "Angular ve kurumsal arayüzler.", ["Angular", "TypeScript", "RxJS"], ["Kurumsal yazılım"]),
  U("ezgitas", "Ezgi Taş", "Karadeniz Teknik Üniversitesi", "Trabzon", "Veritabanı", "Orta", 160, 110, "Zaman serisi verileri.", ["TimescaleDB", "SQL", "Go"], ["IoT"]),
  U("kaanyildirim", "Kaan Yıldırım", "Çukurova Üniversitesi", "Adana", "Mobil", "Orta", 152, 110, "Swift ve SwiftUI.", ["Swift", "SwiftUI", "Firebase"], ["Mobil"]),
  U("ceren", "Ceren Uysal", "Kocaeli Üniversitesi", "Kocaeli", "Backend", "Orta", 146, 104, "Rust ile CLI araçları.", ["Rust", "Tokio", "SQLite"], ["Açık kaynak"]),
  U("alpergun", "Alper Gün", "Selçuk Üniversitesi", "Konya", "Frontend", "Orta", 142, 104, "Vue ve Nuxt.", ["Vue", "Nuxt", "Tailwind"], ["Web"]),
  U("sudeerkan", "Sude Erkan", "Atatürk Üniversitesi", "Erzurum", "DevOps", "Orta", 138, 104, "Docker ve CI şablonları.", ["Docker", "GitHub Actions", "Bash"], ["Otomasyon"]),
  U("yusufkara", "Yusuf Kara", "Ondokuz Mayıs Üniversitesi", "Samsun", "Backend", "Orta", 120, 104, "PHP ve Laravel.", ["PHP", "Laravel", "MySQL"], ["Web"]),
  U("irempolat", "İrem Polat", "Mersin Üniversitesi", "Mersin", "Frontend", "Orta", 94, 104, "Arayüz animasyonları.", ["React", "Framer Motion"], ["UI"]),
  U("cagrituna", "Çağrı Tuna", "Bursa Teknik Üniversitesi", "Bursa", "Mobil", "Orta", 50, 104, "Flutter ile ilk uygulamalarım.", ["Flutter", "Dart"], ["Mobil"]),
  U("deryaak", "Derya Ak", "Kırıkkale Üniversitesi", "Kırıkkale", "Veritabanı", "Orta", 0, 104, "SQL Server ve raporlama.", ["SQL Server", "T-SQL"], ["Veri"]),

  // Yeni başlayan (15): Ayşe 96 puanla çizginin hemen altında.
  U("aysayildiz", "Ayşe Yıldız", "Cumhuriyet Üniversitesi", "Sivas", "Veritabanı", "Yeni başlayan", 96, 60, "Bilgisayar mühendisliği 3. sınıf, veritabanına meraklıyım.", ["SQL", "MySQL", "Python"], ["Veri", "Eğitim"]),
  U("alidemirci", "Ali Demirci", "Ege Üniversitesi", "İzmir", "Frontend", "Yeni başlayan", 104, 40, "Yeni başladım, her gün kod yazıyorum.", ["HTML", "CSS", "JavaScript"], ["Web"]),
  U("defneucar", "Defne Uçar", "Marmara Üniversitesi", "İstanbul", "Mobil", "Yeni başlayan", 120, 50, "Kotlin öğreniyorum.", ["Kotlin", "Android"], ["Mobil"]),
  U("mertaydin", "Mert Aydın", "Gazi Üniversitesi", "Ankara", "Backend", "Yeni başlayan", 140, 60, "Node.js ile ilk API'lerimi yazıyorum.", ["Node.js", "Express"], ["Backend"]),
  U("zehrakurt", "Zehra Kurt", "Harran Üniversitesi", "Şanlıurfa", "Frontend", "Yeni başlayan", 260, 40, "React ve TypeScript öğreniyorum.", ["React", "TypeScript"], ["Web"]),
  U("efeyalcin", "Efe Yalçın", "Bilecik Şeyh Edebali Üniversitesi", "Bilecik", "Backend", "Yeni başlayan", 220, 30, "Go ile küçük servisler.", ["Go", "SQLite"], ["Açık kaynak"]),
  U("buseoz", "Buse Öz", "Muğla Sıtkı Koçman Üniversitesi", "Muğla", "Veritabanı", "Yeni başlayan", 190, 20, "PostgreSQL ve veri modelleme.", ["PostgreSQL", "SQL"], ["Veri"]),
  U("arascan", "Aras Can", "Van Yüzüncü Yıl Üniversitesi", "Van", "DevOps", "Yeni başlayan", 160, 20, "Linux sunucular.", ["Linux", "Docker"], ["Altyapı"]),
  U("nisaay", "Nisa Ay", "Kastamonu Üniversitesi", "Kastamonu", "Mobil", "Yeni başlayan", 80, 10, "Flutter ile ilk uygulamam.", ["Flutter"], ["Mobil"]),
  U("omerfaruk", "Ömer Faruk Er", "Düzce Üniversitesi", "Düzce", "Backend", "Yeni başlayan", 60, 0, "Python öğreniyorum.", ["Python", "Flask"], ["Yapay zeka"]),
  U("hilalsoy", "Hilal Soy", "Bartın Üniversitesi", "Bartın", "Frontend", "Yeni başlayan", 50, 0, "HTML ve CSS.", ["HTML", "CSS"], ["Tasarım"]),
  U("kemalduru", "Kemal Duru", "Aksaray Üniversitesi", "Aksaray", "DevOps", "Yeni başlayan", 40, 0, "Bash ve otomasyon.", ["Bash", "Linux"], ["Otomasyon"]),
  U("sevgiekin", "Sevgi Ekin", "Ordu Üniversitesi", "Ordu", "Veritabanı", "Yeni başlayan", 20, 0, "SQL'e yeni başladım.", ["SQL"], ["Veri"]),
  U("tunaari", "Tuna Arı", "Giresun Üniversitesi", "Giresun", "Mobil", "Yeni başlayan", 10, 0, "Kotlin.", ["Kotlin"], ["Mobil"]),
  U("ruyasu", "Rüya Su", "Sinop Üniversitesi", "Sinop", "Frontend", "Yeni başlayan", 0, 0, "Web geliştirmeye yeni başladım.", ["JavaScript"], ["Web"]),
];

// ---------- Proje üretimi ----------

/** Proje değerleri: puan → (zorluk, kalite). DP ile hedef puan tam tutturulur. */
export const PROJECT_KINDS: { pts: number; difficulty: Difficulty; q: Quality }[] = [
  { pts: 100, difficulty: "Zor", q: { ci: true, demo: true, readme: true, days: 14 } },
  { pts: 92, difficulty: "Zor", q: { ci: true, readme: true, days: 12 } },
  { pts: 80, difficulty: "Zor", q: { readme: true, days: 11 } },
  { pts: 74, difficulty: "Zor", q: { readme: true, days: 4 } },
  { pts: 70, difficulty: "Orta", q: { ci: true, demo: true, readme: true, days: 13 } },
  { pts: 62, difficulty: "Orta", q: { ci: true, readme: true, days: 10 } },
  { pts: 52, difficulty: "Orta", q: { demo: true, readme: true, days: 3 } },
  { pts: 44, difficulty: "Orta", q: { readme: true, days: 2 } },
  { pts: 40, difficulty: "Orta", q: {} },
  { pts: 10, difficulty: "Kolay", q: { readme: true } },
];

/** En az projeyle hedefi tam tutturan kombinasyon (yoksa en yakın alt değer). */
export function combo(target: number): number[] {
  const best = new Map<number, number[]>([[0, []]]);
  for (let s = 0; s <= target; s++) {
    const cur = best.get(s);
    if (!cur || cur.length >= 6) continue;
    for (const k of PROJECT_KINDS) {
      const n = s + k.pts;
      if (n > target) continue;
      const next = [...cur, k.pts].sort((a, b) => b - a);
      const old = best.get(n);
      if (!old || next.length < old.length) best.set(n, next);
    }
  }
  for (let s = target; s >= 0; s--) if (best.has(s)) return best.get(s)!;
  return [];
}

const NAMES: Record<Field, { name: string; desc: string; techs: string[]; file: string; feature: string }[]> = {
  Frontend: [
    { name: "ui-kit", desc: "Erişilebilir React bileşen kütüphanesi.", techs: ["React", "TypeScript"], file: "src/components/Dialog.tsx", feature: "Odak tuzağı ve klavye yönetimi" },
    { name: "dashboard", desc: "Gerçek zamanlı satış panosu.", techs: ["Next.js", "WebSocket"], file: "app/api/stream/route.ts", feature: "Sunucudan canlı veri akışı" },
    { name: "portfolio", desc: "Kişisel site ve blog.", techs: ["Next.js"], file: "app/page.tsx", feature: "Tek sayfalık statik site" },
    { name: "kanban", desc: "Sürükle bırak görev panosu.", techs: ["React", "Zustand"], file: "src/board/useDrag.ts", feature: "Sürükle bırak durum yönetimi" },
  ],
  Backend: [
    { name: "queue-go", desc: "Tekrar denemeli iş kuyruğu.", techs: ["Go", "Redis"], file: "internal/queue/worker.go", feature: "Tekrar denemeli iş kuyruğu" },
    { name: "auth-api", desc: "JWT ile kimlik doğrulama servisi.", techs: ["Node.js", "PostgreSQL"], file: "src/routes/auth.ts", feature: "Kimlik doğrulama ve oturum" },
    { name: "url-short", desc: "Link kısaltıcı.", techs: ["Go", "PostgreSQL"], file: "main.go", feature: "Basit CRUD servisi" },
    { name: "chat-server", desc: "WebSocket sohbet sunucusu.", techs: ["Node.js", "Socket.IO"], file: "server/ws.ts", feature: "WebSocket sunucusu" },
  ],
  Veritabanı: [
    { name: "pg-tuner", desc: "Sorgu planı analiz aracı.", techs: ["Python", "PostgreSQL"], file: "tuner/explain.py", feature: "Sorgu planı ayrıştırma" },
    { name: "kutuphane-db", desc: "Kütüphane veritabanı tasarımı.", techs: ["MySQL"], file: "schema.sql", feature: "İlişkisel şema" },
    { name: "etl-pipe", desc: "Günlük veri aktarım hattı.", techs: ["Python", "Airflow"], file: "dags/daily.py", feature: "Zamanlanmış veri hattı" },
    { name: "migrator", desc: "Şema göç aracı.", techs: ["Go", "PostgreSQL"], file: "cmd/migrate.go", feature: "Sürüm takipli şema göçü" },
  ],
  Mobil: [
    { name: "rota-app", desc: "Rota planlama uygulaması.", techs: ["Flutter"], file: "lib/route_service.dart", feature: "Harita ve rota servisi" },
    { name: "hava-durumu", desc: "Hava durumu uygulaması.", techs: ["Kotlin"], file: "app/src/main/MainActivity.kt", feature: "Tek ekranlı uygulama" },
    { name: "offline-notes", desc: "Çevrimdışı senkronize not uygulaması.", techs: ["Flutter", "SQLite"], file: "lib/sync/sync_engine.dart", feature: "Çevrimdışı senkronizasyon" },
    { name: "fit-track", desc: "Adım sayar ve hedefler.", techs: ["Swift"], file: "FitTrack/HealthStore.swift", feature: "Sağlık verisi entegrasyonu" },
  ],
  DevOps: [
    { name: "ci-templates", desc: "Hazır CI şablonları.", techs: ["GitHub Actions"], file: ".github/workflows/node.yml", feature: "Yeniden kullanılabilir iş akışları" },
    { name: "k8s-starter", desc: "Başlangıç Kubernetes kümesi.", techs: ["Kubernetes", "Helm"], file: "charts/app/templates/deployment.yaml", feature: "Helm ile çok servisli dağıtım" },
    { name: "homelab", desc: "Ev sunucusu kurulumu.", techs: ["Ansible", "Docker"], file: "playbooks/site.yml", feature: "Otomatik sunucu kurulumu" },
    { name: "observe", desc: "Prometheus ve Grafana ile izleme.", techs: ["Prometheus", "Grafana"], file: "prometheus/rules.yml", feature: "Uyarı kuralları" },
  ],
};

/** Hedef puanı tam tutturan projeler; tarihleri verilen aralığa yayılır. */
export function projectsFor(u: SeedUser, target: number, from: string, to: string, offset = 0): SeedProject[] {
  const pts = combo(target);
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return pts.map((p, i) => {
    const k = PROJECT_KINDS.find((x) => x.pts === p)!;
    const n = NAMES[u.field][(i + offset) % NAMES[u.field].length];
    const at = new Date(a + ((b - a) * (i + 1)) / (pts.length + 1)).toISOString().slice(0, 10);
    return {
      name: `${n.name}${i + offset >= NAMES[u.field].length ? `-${i + offset}` : ""}`,
      description: n.desc,
      techs: n.techs,
      difficulty: k.difficulty,
      q: k.q,
      at,
      reasons: k.difficulty === "Kolay" ? [] : [{ feature: n.feature, file: n.file }],
    };
  });
}

// ---------- Demo hesabı: Deniz Kaya ----------

export const DEMO = {
  username: ME_USERNAME,
  name: "Deniz Kaya",
  headline: "Backend geliştirici",
  field: "Backend" as Field,
  league: "Orta" as Level,
  school: "İstanbul Teknik Üniversitesi",
  department: "Bilgisayar Mühendisliği",
  city: "İstanbul",
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
    { key: "exp-1", kind: "Staj", title: "Backend stajyeri", org: "Pusula Yazılım", start: "Haz 2025", end: "Ağu 2025", description: "Bildirim servisinin kuyruk yapısını yeniden yazdım." },
    { key: "exp-2", kind: "Gönüllü", title: "Topluluk ekibi", org: "İTÜ Bilgisayar Kulübü", start: "Eki 2024", end: "Devam ediyor" },
  ],
  education: [{ school: "İstanbul Teknik Üniversitesi", department: "Bilgisayar Mühendisliği", start: "2022", end: "2026" }],
  connections: ["ardademir", "eceyilmaz", "selinaksoy", "keremoral", "aysayildiz", "mehmetsahin"],
  projects: [
    {
      name: "pulse-api",
      description: "Gerçek zamanlı bildirim ve kullanıcı yönetimi API'si.",
      techs: ["Node.js", "PostgreSQL", "Docker", "TypeScript"],
      difficulty: "Zor" as Difficulty,
      q: { ci: true, readme: true, days: 31 },
      at: "2026-06-12",
      reasons: [
        { feature: "WebSocket ile canlı bildirim sunucusu", file: "src/realtime/ws-server.ts" },
        { feature: "Redis tabanlı iş kuyruğu ve tekrar deneme", file: "src/queue/worker.ts" },
        { feature: "Docker Compose ile birden fazla servis", file: "docker-compose.yml" },
      ],
    },
    {
      name: "taskflow",
      description: "Takımlar için sade, hızlı bir görev yönetimi uygulaması.",
      techs: ["React", "TypeScript", "Tailwind"],
      difficulty: "Orta" as Difficulty,
      q: { ci: true, demo: true, readme: true, days: 8 },
      at: "2026-07-20",
      reasons: [
        { feature: "Giriş ve oturum yönetimi", file: "src/auth/session.ts" },
        { feature: "REST API istemcisi ve birden fazla ekran", file: "src/api/client.ts" },
      ],
    },
    {
      name: "query-lab",
      description: "SQL sorguları ve veritabanı performans deneyleri.",
      techs: ["Python", "SQL"],
      difficulty: "Orta" as Difficulty,
      q: { readme: true, days: 12 },
      at: "2026-10-02",
      reasons: [{ feature: "PostgreSQL bağlantısı ve indeks deneyleri", file: "lab/indexes.py" }],
    },
  ] satisfies SeedProject[],
  certs: [
    { name: "SQL ile Veritabanı Programlama", provider: "BTK Akademi", link: "https://www.btkakademi.gov.tr/portal/certificate/validate?certificateId=AB12CD", date: "2026-10-04", status: "Doğrulandı", points: 20 },
    { name: "AWS Cloud Practitioner", provider: "Credly", link: "https://www.credly.com/badges/1f3a", date: "2026-10-05", status: "Doğrulandı", points: 25 },
  ],
  references: [
    {
      targetKey: "exp-1",
      targetLabel: "Backend stajyeri · Pusula Yazılım",
      approverName: "Ahmet Er",
      approverEmail: "ahmet.er@pusulayazilim.com.tr",
      relation: "Staj amiri",
      comment: "Deniz staj boyunca bildirim servisimizin kuyruk yapısını tek başına yeniden yazdı. Sorumluluk alan, soru sormaktan çekinmeyen biri.",
      requestedAt: "2026-10-01",
      answeredAt: "2026-10-03",
      points: 35,
    },
  ],
};

// ---------- Yarışmalar ----------

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export interface SeedTeam {
  key: string;
  name: string;
  members: { username: string; field: Field; commits: number; points?: number }[];
  repo?: string;
  demo?: string;
  result?: {
    tests: { id: string; title: string; public: boolean; passed: boolean }[];
    quality: number;
    teamwork: number;
    lighthouse?: { accessibility: number; performance: number; mobile: number };
    lint?: number;
    audit?: number;
    ci?: boolean;
    eliminated?: string;
  };
  signals?: { ci: boolean; teamwork: number; eliminated?: string };
  chat?: { from: string; text: string }[];
}

export interface SeedCompetition {
  id: string;
  code: string;
  specId: string;
  status: "Taslak" | "Sırada" | "Başvurular açık" | "Devam ediyor" | "Tamamlandı";
  publishOn: string;
  applyDeadline: string;
  start: string;
  end: string;
  isDemo: boolean;
  teams: SeedTeam[];
  applicants?: { username: string; field: Field }[];
  peer?: { from: string; to: string; stars: number; note?: string }[];
  calibration?: string;
}

// Y-05 Kitap Listesi gizli testleri (degerlendirme/sartnameler/kitap-listesi/gizli.spec.ts ile aynı adlar).
const KITAP_GIZLI = [
  "G1 POST başlıksız kitapta 400 döner",
  "G2 POST yazarsız kitapta 400 döner",
  "G3 Eklenen kitap listede başlık ve yazarıyla görünür",
  "G4 DELETE sonrası kitap listede olmaz",
  "G5 Olmayan kitabı silmek 404 döner",
  "G6 ?ara= başlığa göre süzer",
  "G7 ?ara= büyük-küçük harf duyarsız ve yazarda da arar",
  "G8 Arayüzde sil düğmesi satırı kaldırır",
  "G9 Arayüzde boş başlıkla eklemede hata mesajı çıkar",
  "G10 Sayfa yenilenince eklenen kitap kaybolmaz",
  "G11 Arayüzde arama kutusu listeyi süzer",
];
const KITAP_ACIK = ["A1 GET /api/kitaplar dizi döner", "A2 POST /api/kitaplar geçerli kitapta 201 ve id döner", "A3 Ana sayfada form ve liste var", "A4 Formdan eklenen kitap listede görünür"];
const kitapTests = (failHidden: string[]) => [
  ...KITAP_ACIK.map((t) => ({ id: t.split(" ")[0], title: t, public: true, passed: true })),
  ...KITAP_GIZLI.map((t) => ({ id: t.split(" ")[0], title: t, public: false, passed: !failHidden.includes(t.split(" ")[0]) })),
];

export const COMPETITIONS: SeedCompetition[] = [
  {
    id: "y-05",
    code: "Y-05",
    specId: "kitap-listesi",
    status: "Tamamlandı",
    publishOn: "2026-08-10",
    applyDeadline: "2026-08-20",
    start: "2026-08-24",
    end: "2026-09-07",
    isDemo: true,
    calibration: "Dengeli",
    teams: [
      {
        key: "pedal",
        name: "Pedal",
        repo: "https://github.com/tltpulse-ornek/pedal-kitap",
        members: [
          { username: "zeynepacar", field: "Frontend", commits: 41 },
          { username: "mertaydin", field: "Backend", commits: 37 },
        ],
        result: { tests: kitapTests([]), quality: 0.86, teamwork: 0.9, lighthouse: { accessibility: 0.98, performance: 0.95, mobile: 0.88 }, lint: 2, audit: 0, ci: true },
      },
      {
        key: "durak",
        name: "Durak",
        repo: "https://github.com/tltpulse-ornek/durak-kitap",
        members: [
          { username: "selinaksoy", field: "Frontend", commits: 33 },
          { username: ME_USERNAME, field: "Backend", commits: 39 },
        ],
        result: { tests: kitapTests(["G7"]), quality: 0.78, teamwork: 0.85, lighthouse: { accessibility: 0.93, performance: 0.9, mobile: 0.81 }, lint: 5, audit: 0, ci: true },
      },
      {
        key: "aktarma",
        name: "Aktarma",
        repo: "https://github.com/tltpulse-ornek/aktarma-kitap",
        members: [
          { username: "mehmetsahin", field: "Frontend", commits: 30 },
          { username: "alidemirci", field: "Backend", commits: 22 },
        ],
        result: { tests: kitapTests(["G5", "G7", "G11"]), quality: 0.7, teamwork: 0.75, lighthouse: { accessibility: 0.9, performance: 0.84, mobile: 0.76 }, lint: 9, audit: 1, ci: false },
      },
      {
        key: "iz",
        name: "İz",
        repo: "https://github.com/tltpulse-ornek/iz-kitap",
        members: [
          { username: "emrecelik", field: "Frontend", commits: 12 },
          { username: "ardademir", field: "Backend", commits: 15 },
        ],
        result: { tests: [], quality: 0, teamwork: 0, eliminated: "Teslim anında demo açılmıyor." },
      },
    ],
    peer: [
      { from: "selinaksoy", to: ME_USERNAME, stars: 5, note: "API'yi erkenden hazırladı, işimizi çok kolaylaştırdı." },
      { from: ME_USERNAME, to: "selinaksoy", stars: 5 },
      { from: "alidemirci", to: "mehmetsahin", stars: 5, note: "Her akşam kod incelemesi yaptı, çok şey öğrendim." },
      { from: "mehmetsahin", to: "alidemirci", stars: 4 },
      { from: "mertaydin", to: "zeynepacar", stars: 5 },
      { from: "zeynepacar", to: "mertaydin", stars: 4 },
    ],
  },
  {
    id: "y-06",
    code: "Y-06",
    specId: "etkinlik-kayit",
    status: "Devam ediyor",
    publishOn: "2026-09-01",
    applyDeadline: "2026-09-12",
    start: "2026-09-15",
    end: addDays(today, -1),
    isDemo: true,
    teams: [
      {
        key: "kontrast",
        name: "Kontrast",
        repo: "https://github.com/tltpulse-ornek/kontrast-etkinlik",
        demo: "ornek:etkinlik-kayit",
        members: [
          { username: "eceyilmaz", field: "Frontend", commits: 48 },
          { username: ME_USERNAME, field: "Backend", commits: 52 },
          { username: "keremoral", field: "Veritabanı", commits: 31 },
        ],
        signals: { ci: true, teamwork: 0.88 },
        chat: [
          { from: "eceyilmaz", text: "Giriş ve kayıt sayfaları hazır, data-testid'leri şartnameden birebir aldım." },
          { from: "keremoral", text: "Katılım tablosuna (etkinlik_id, kullanici_id) için unique kısıt ekledim, kontenjan da kilitli güncelleniyor." },
          { from: "me", text: "Aynı anda gelen katılma isteklerini transaction ile sıraya koydum. Açık testler 5/5 geçti." },
          { from: "eceyilmaz", text: "Süper! Demo linkini teslim bölümüne ekledim." },
        ],
      },
      {
        key: "odak",
        name: "Odak",
        repo: "https://github.com/tltpulse-ornek/odak-etkinlik",
        demo: "ornek:etkinlik-kayit?hata=kontenjan,cikis",
        members: [
          { username: "nazlicetin", field: "Frontend", commits: 40 },
          { username: "mertaydin", field: "Backend", commits: 35 },
          { username: "minakaya", field: "Veritabanı", commits: 18 },
        ],
        signals: { ci: true, teamwork: 0.7 },
      },
      {
        key: "alt-metin",
        name: "Alt Metin",
        repo: "https://github.com/tltpulse-ornek/altmetin-etkinlik",
        demo: "ornek:etkinlik-kayit?hata=kontenjan,cift-katilim,yetki,geri-cek,cikis",
        members: [
          { username: "alidemirci", field: "Frontend", commits: 9 },
          { username: "ardademir", field: "Backend", commits: 44 },
          { username: "emrecelik", field: "Veritabanı", commits: 6 },
        ],
        signals: { ci: false, teamwork: 0.32 },
      },
      {
        key: "isik",
        name: "Işık",
        repo: "https://github.com/tltpulse-ornek/isik-etkinlik",
        members: [
          { username: "defneucar", field: "Frontend", commits: 14 },
          { username: "serkanbulut", field: "Backend", commits: 20 },
          { username: "ilaydasen", field: "Veritabanı", commits: 11 },
        ],
        signals: { ci: false, teamwork: 0.6, eliminated: "Teslimde demo linki yok." },
      },
    ],
  },
  {
    id: "y-07",
    code: "Y-07",
    specId: "anket",
    status: "Başvurular açık",
    publishOn: addDays(today, -4),
    applyDeadline: addDays(today, 6),
    start: addDays(today, 8),
    end: addDays(today, 29),
    isDemo: false,
    teams: [],
    applicants: [
      { username: "aysayildiz", field: "Veritabanı" },
      { username: "mehmetsahin", field: "Frontend" },
      { username: "eceyilmaz", field: "Frontend" },
      { username: "zehrakurt", field: "Frontend" },
      { username: "alidemirci", field: "Frontend" },
      { username: "ardademir", field: "Backend" },
      { username: "efeyalcin", field: "Backend" },
      { username: "melisdag", field: "Backend" },
      { username: "keremoral", field: "Veritabanı" },
      { username: "buseoz", field: "Veritabanı" },
      { username: "ezgitas", field: "Veritabanı" },
    ],
  },
  {
    id: "y-08",
    code: "Y-08",
    specId: "link-kisaltici",
    status: "Başvurular açık",
    publishOn: addDays(today, -2),
    applyDeadline: addDays(today, 10),
    start: addDays(today, 12),
    end: addDays(today, 26),
    isDemo: false,
    teams: [],
    applicants: [
      { username: "hilalsoy", field: "Frontend" },
      { username: "ruyasu", field: "Frontend" },
      { username: "omerfaruk", field: "Backend" },
      { username: "pelinakin", field: "Frontend" },
      { username: "yusufkara", field: "Backend" },
    ],
  },
  { id: "y-09", code: "Y-09", specId: "canli-siparis", status: "Sırada", publishOn: addDays(today, 12), applyDeadline: addDays(today, 19), start: addDays(today, 21), end: addDays(today, 49), isDemo: false, teams: [] },
  { id: "y-10", code: "Y-10", specId: "bilet-satisi", status: "Taslak", publishOn: addDays(today, 40), applyDeadline: addDays(today, 47), start: addDays(today, 49), end: addDays(today, 77), isDemo: false, teams: [] },
];

export const DEMO_CONVERSATIONS = [
  { with: "aysayildiz", messages: [{ from: "aysayildiz", text: "Merhaba Deniz! query-lab'ı gördüm, indeks deneylerini merak ediyorum." }] },
  { with: "mehmetsahin", messages: [{ from: "me", text: "Y-05'teki geri bildirimin için teşekkürler." }, { from: "mehmetsahin", text: "Rica ederim, Y-07'de görüşürüz!" }] },
  { with: "ardademir", messages: [{ from: "ardademir", text: "Go'da kuyruk yazdım, bakmak ister misin?" }] },
];

export const DEMO_NOTIFICATIONS = [
  { text: "Y-06 teslim süresi doldu; değerlendirme yakında.", href: "/yarismalar/y-06", read: false },
  { text: "Y-07 Anket başvuruya açıldı. Herkes katılabilir, en fazla 150 puan.", href: "/yarismalar/y-07", read: false },
  { text: "Ahmet Er stajını onayladı ve yorum yazdı.", href: "/profil", read: true },
  { text: "Y-05 sonuçları açıklandı: takımın şartnamenin %87'sini karşıladı.", href: "/yarismalar/y-05", read: true },
];
