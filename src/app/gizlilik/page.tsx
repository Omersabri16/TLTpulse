import type { ReactNode } from "react";
import { Card, Container, PageHero, PageShell } from "@/components/page-shell";

export const metadata = { title: "Gizlilik" };

const CONTACT = "tltpulse16@gmail.com";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className="font-medium text-foreground underline underline-offset-4">
      {CONTACT}
    </a>
  );
}

export default function Page() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Son güncelleme: 6 Ekim 2026"
        title="Gizlilik"
        highlight="politikası"
        subtitle="Hangi verilerini neden topladığımız, nerede sakladığımız ve kimlerle paylaştığımız. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamındaki aydınlatma metnimiz budur."
      />
      <Container>
        <Card className="max-w-3xl space-y-6 sm:p-8">
          <Section title="Veri sorumlusu">
            <p>
              TLTpulse ekibi. Bu sayfayla ilgili her soru ve talep için: <Mail />
            </p>
          </Section>

          <Section title="Topladığımız veriler">
            <ul>
              <li>
                <b>Hesap:</b> e-posta adresin ve şifren. Şifren Supabase tarafından geri çevrilemez şekilde (hash) saklanır, biz göremeyiz. Google ile giriş yaparsan Google&apos;ın paylaştığı ad ve e-posta.
              </li>
              <li>
                <b>Profil:</b> ad, kullanıcı adı, başlık, alan, okul, bölüm, şehir, hakkında yazısı, beceriler, ilgi alanları, eğitim ve deneyimler.
              </li>
              <li>
                <b>GitHub:</b> GitHub kullanıcı adın ve eklediğin <b>herkese açık</b> repoların bilgileri (diller, dosya listesi, katkıcılar, commit tarihleri, CI sonuçları). Kopya ve şablon kontrolü için dosyaların <b>içerik özetlerini</b> (GitHub&apos;ın blob özeti) saklarız; dosyaların içeriğini saklamayız. Özel repolarına erişmiyoruz.
              </li>
              <li>
                <b>CV:</b> CV&apos;ni yüklersen dosyan <b>saklanmaz</b>: sunucuda metni çıkarılır, beceri ve deneyimleri ayıklamak için Gemini&apos;ye gönderilir, sonra atılır. Sadece senin onayladığın bilgiler profiline yazılır.
              </li>
              <li>
                <b>Kanıtlar:</b> sertifikaların adı ve linki; onay istediğin kişinin adı, e-posta adresi, seninle ilişkisi ve yazdığı yorum.
              </li>
              <li>
                <b>Yarışmalar:</b> başvuruların, takımın, takım mesajların, teslim ettiğin repo ve demo linki, değerlendirme sonuçları (geçen/kalan testler, kalite ölçümleri, commit katkın) ve akran puanları.
              </li>
              <li>
                <b>Şikayet ve engelleme:</b> şikayet ettiğin içerik ve sebebi, engellediğin kişiler.
              </li>
              <li>
                <b>Mesajlar, bağlantılar ve bildirimler:</b> diğer kullanıcılarla yazışmaların, bağlantıların ve gönderdiğin / aldığın bağlantı istekleri.
              </li>
              <li>
                <b>Puan ve yol haritası:</b> puan geçmişin ve oluşturduğun yol haritaları.
              </li>
              <li>
                <b>İşlem kayıtları:</b> kötüye kullanımı önlemek için hangi işlemi ne zaman yaptığın (ör. bir saatte kaç proje analiz ettiğin). Giriş ve kayıt denemelerinde e-posta adresin ya da IP adresin <b>geri çevrilemez özet</b> olarak 7 gün tutulur.
              </li>
              <li>
                <b>Teknik:</b> giriş için oturum çerezleri. Barındırma sağlayıcımız Vercel&apos;in sunucu kayıtlarında IP adresin ve tarayıcı bilgin kısa süre tutulur.
              </li>
            </ul>
            <p>Pulse asistanına yazdığın sorular veritabanımıza kaydedilmez.</p>
          </Section>

          <Section title="Neden kullanıyoruz">
            <ul>
              <li>Hesabını açmak, giriş yapmanı sağlamak ve e-posta adresini doğrulamak</li>
              <li>Profilini, projelerini ve lig sıranı göstermek</li>
              <li>Projelerini analiz edip puanını hesaplamak (zorluğu yapay zeka sınıflandırır, puanı sabit kurallar verir)</li>
              <li>Yarışmalarda takımların demolarını otomatik testlerle değerlendirmek</li>
              <li>Yarışma takımlarını kurmak ve takım sohbetini çalıştırmak</li>
              <li>Onay istediğin kişiye onay e-postası göndermek</li>
              <li>Yol haritası oluşturmak ve asistanın sorularını cevaplamak</li>
              <li>Siteyi güvende tutmak ve kötüye kullanımı önlemek</li>
            </ul>
            <p>
              Hukuki sebeplerimiz: hizmeti sunabilmek için gerekli olması (KVKK m. 5/2-c), güvenlik için meşru menfaatimiz (m. 5/2-f) ve yurt dışına aktarım için kayıt olurken verdiğin <b>açık rıza</b> (KVKK m. 9). Rızanı istediğin zaman hesabını silerek geri alabilirsin.
            </p>
          </Section>

          <Section title="Herkese açık olanlar">
            <p>Profil sayfan giriş yapmadan da görülebilir. Kurumların seni bulabilmesi için bu şekilde tasarlandı. Herkese açık olanlar:</p>
            <ul>
              <li>Ad, başlık, okul, şehir, GitHub kullanıcı adı ve hakkında yazın</li>
              <li>Projelerin, deneyimlerin, sertifikaların, beceriler ve ilgi alanların</li>
              <li>Onaylar: onaylayanın adı, seninle ilişkisi ve e-posta adresinin sadece alan adı (ör. @firma.com.tr)</li>
              <li>Lig ve puanın, rozetlerin, QR kodlu CV&apos;n, doğrulama sayfası ve README rozetin</li>
              <li>Yarışma sonuçlarında takımın, kişisel puanın, teslim ettiğin repo ve demo linki, takım karnesi</li>
            </ul>
            <p>
              <b>Herkese açık olmayanlar:</b> e-posta adresin, mesajların, takım sohbetin, bildirimlerin ve hangi takım arkadaşına kaç yıldız verdiğin.
            </p>
          </Section>

          <Section title="Kimlerle paylaşıyoruz">
            <p>Verilerini satmıyoruz, reklam göstermiyoruz, analitik ya da izleme aracı kullanmıyoruz. Sadece hizmeti çalıştıran şu sağlayıcılarla paylaşıyoruz:</p>
            <ul>
              <li>
                <b>Supabase</b> (veritabanı ve giriş): sunucular Frankfurt, Almanya.
              </li>
              <li>
                <b>Vercel</b> (barındırma): sunucular Frankfurt, şirket ABD.
              </li>
              <li>
                <b>Google Gemini</b> (yapay zeka, ABD): proje zorluğunu sınıflandırmak için eklediğin repodaki kaynak kodun (yorumlar çıkarılarak), CV&apos;ni yüklersen CV metnin, yol haritası ve asistan için profil bilgilerin, projelerin, puanın ve asistana yazdığın sorular gönderilir. Gemini&apos;nin ücretsiz katmanını kullanıyoruz; bu katmanda <b>Google, gönderilen içerikleri ürünlerini geliştirmek için kullanabilir ve içerikler Google çalışanlarınca incelenebilir.</b> Bu yüzden asistana gizli ya da hassas bilgi yazma.
              </li>
              <li>
                <b>GitHub</b> (ABD): eklediğin repoların herkese açık bilgilerini okuyoruz. GitHub&apos;a senin hakkında veri göndermiyoruz.
              </li>
              <li>
                <b>GitHub Actions</b> (ABD): yarışma değerlendirmesi özel bir GitHub reposunda çalışır; takımın demo linki, repo adresi ve teslim commit&apos;i oraya gönderilir. Kişisel bilgilerin gönderilmez.
              </li>
              <li>
                <b>Gmail</b> (Google): doğrulama, şifre sıfırlama ve onay e-postaları. Onay istediğin kişiye adın ve onaylanacak iş gönderilir.
              </li>
              <li>
                <b>Certifier</b> (AB): bir yarışmayı %50&apos;nin üstünde tamamlarsan ya da sezon şampiyonu olursan, LinkedIn&apos;e eklenebilir sertifikan için adın ve e-posta adresin gönderilir.
              </li>
            </ul>
          </Section>

          <Section title="Yurt dışına aktarım">
            <p>
              Vercel, Google ve GitHub ABD şirketleridir; verilerinin bir kısmı bu nedenle yurt dışına aktarılır. Veritabanımız Avrupa Birliği&apos;nde (Frankfurt) durur. Hizmetin çalışması için bu aktarım gereklidir; kayıt olurken buna açık rıza verirsin.
            </p>
          </Section>

          <Section title="Çerezler">
            <p>
              Sadece giriş yapmış kalman için oturum çerezleri kullanıyoruz. Gece / gündüz tema tercihin tarayıcında saklanır. Reklam ya da izleme çerezi yok.
            </p>
          </Section>

          <Section title="Ne kadar saklıyoruz">
            <p>
              Verilerin hesabın açık olduğu sürece saklanır. Hesabını sildiğimizde profilin, projelerin, mesajların ve sana ait bütün kayıtlar veritabanından silinir. Vercel&apos;in sunucu kayıtları kısa süre sonra kendiliğinden silinir.
            </p>
            <p>
              Hesabını <b>Hesap ve gizlilik</b> sayfasından (sağ üstteki menü) kendin silebilirsin; silme anında gerçekleşir. Takım sohbetlerindeki mesajların, takımın geçmişi bozulmasın diye &quot;Silinmiş kullanıcı&quot; adıyla kalır. Haftalık şifreli veritabanı yedekleri 30 gün sonra kendiliğinden silinir.
            </p>
            <p>
              Aynı sayfadan <b>bütün verilerini JSON olarak indirebilirsin</b>.
            </p>
          </Section>

          <Section title="Hakların">
            <p>KVKK&apos;nın 11. maddesine göre şunları isteyebilirsin:</p>
            <ul>
              <li>Hakkında veri işlenip işlenmediğini ve hangi verilerin işlendiğini öğrenmek</li>
              <li>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenmek</li>
              <li>Verilerinin aktarıldığı yurt içindeki ve yurt dışındaki kişileri bilmek</li>
              <li>Eksik ya da yanlış verilerin düzeltilmesini istemek</li>
              <li>Verilerinin silinmesini ya da yok edilmesini istemek</li>
              <li>Yapılan düzeltme ve silmenin aktarılan kişilere bildirilmesini istemek</li>
              <li>Sadece otomatik sistemlerle yapılan analizle aleyhine bir sonuç çıkmasına itiraz etmek</li>
              <li>Kanuna aykırı işleme yüzünden zarara uğrarsan zararının giderilmesini istemek</li>
            </ul>
            <p>
              Taleplerin için <Mail /> adresine yaz. En geç 30 gün içinde cevap veririz.
            </p>
          </Section>

          <Section title="Güvenlik">
            <ul>
              <li>Bütün bağlantılar şifreli (HTTPS).</li>
              <li>Tarayıcıdan veritabanına doğrudan erişim kapalı; bütün işlemler sunucumuzda, kimliğin doğrulandıktan sonra yapılır.</li>
              <li>Onay linkleri tek kullanımlıktır ve süreleri dolar.</li>
              <li>Yarışma sonuçları sitemize imzalı ve tek kullanımlık isteklerle gelir.</li>
            </ul>
          </Section>

          <Section title="Değişiklikler">
            <p>Bu sayfa değişirse güncel hali burada yayınlanır ve en üstteki tarih değişir.</p>
          </Section>
        </Card>
      </Container>
    </PageShell>
  );
}
