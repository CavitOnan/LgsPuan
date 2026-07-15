# LGS Okul Puan Takip

LGS puanıyla öğrenci alan özel okulların (Fransız, Alman, Avusturya, İtalyan, Amerikan liseleri
ve diğer özel liseler) **taban puanı**, **toplam kontenjanı** ve **boş kontenjan** durumunu tek
bir tabloda gösteren web sitesi. Sağ üstteki **Yenile** butonuna basıldığında, kaynak sitelerden
güncel veri çekilmeye çalışılır.

## Proje yapısı

```
server/   Express API: veri önbelleği + kaynak sitelerden veri çekme (scraper)
client/   React + Vite arayüzü: tablo, kategori filtresi, arama, Yenile butonu
```

## Geliştirme

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

Bu komut API'yi `http://localhost:5175`, arayüzü `http://localhost:5174` üzerinde başlatır
(Vite, `/api` isteklerini otomatik olarak API'ye yönlendirir).

## Nasıl çalışır

- `server/data/schools.seed.json`: uygulamanın ilk açılışında göstereceği, elle doğrulanmış
  gerçek 2026 verileri (taban puan/kontenjan) içeren başlangıç verisi. Henüz ilk duyurusu
  bilinmeyen okullar (bazı Fransız liseleri) `null` değerlerle, "Bilinmiyor" olarak eklenmiştir.
- `server/data/schools.json`: uygulama çalışırken oluşan, en son bilinen veriyi tutan önbellek
  dosyası (git'e dahil edilmez).
- `GET /api/schools`: önbellekteki en güncel veriyi döner.
- `POST /api/refresh`: `server/src/sources.js` içinde tanımlı kaynak sayfaları tek tek çeker ve
  önbelleği günceller. **Bir kaynak başarısız olursa** (site erişilemiyor, yapısı değişmiş vb.)
  o kaynağa ait okullarda son bilinen veri korunur; arayüzde hangi kaynağın güncellenip
  hangisinin güncellenemediği açıkça gösterilir.

### pervinkaplan.com takibi

`pervinkaplan.com`, taban puan/kontenjan duyurularını **tek sabit bir sayfada değil, her kayıt
turu için ayrı bir yazıda** yayınlıyor (URL'ler her turda değişiyor). Bu yüzden bu kaynak
`server/src/sources.js` içinde `tur: "liste"` olarak tanımlı: önce sitenin "Yabancı Özel
Liseler" kategori sayfasından (`indexUrl`) en güncel yazının linki bulunur, sonra o yazı çekilir.

Makale metninden iki tür bilgi çıkarılır:

1. **İlk duyuru kalıbı** (`"Okul Adı: Kontenjan N, taban puan P"`): genel bir regex ile herhangi
   bir okul için otomatik yakalanır.
2. **"Boş kontenjan" serbest metni** (`server/src/okulAdlari.js`): bilinen okulların isim
   varyasyonlarını (`"Robert Kolej"`, `"Sajev"`, `"Sankt Georg"` vb.) metinde arayıp, geçtiği
   yerin etrafındaki metin diliminde `"kontenjanı doldu"`, `"N yer boş kaldı"`, `"N boş
   kontenjan"`, `"en fazla boş yer N kontenjanla X'de"` gibi ifadeleri çözer. Kız/erkek ayrımı
   olan okullarda (Robert Kolej, Üsküdar Amerikan) ilgili cümlecik ayrıca ayrıştırılır. Bu tür
   bir eşleşme bulunduğunda, ilk duyuru kalıbından daha güncel/otoriter kabul edilir ve "boş
   kontenjan" alanını günceller.

Yeni bir okul takip etmek isterseniz `server/src/okulAdlari.js`'e `id/ad/kategori/grup/aliaslar`
bilgisiyle eklemeniz yeterli; hem ilk duyuru hem de "boş kontenjan" ayrıştırması otomatik
çalışır.

## Kaynakların güncellenmesi

`server/src/sources.js` içindeki `KAYNAKLAR` listesi, veri çekilecek sayfaların adreslerini
tutar. Yeni bir kaynak eklemek veya mevcut bir kaynağın adresini güncellemek için bu listeyi
düzenlemeniz yeterlidir; her kaynak diğerlerinden bağımsız çalışır.

## Bilinen kısıt: canlı veri çekimi, geliştirmenin yapıldığı ortamda doğrulanamadı

Bu proje, dış sitelere doğrudan bağlantıyı tamamen engelleyen bir sandbox ortamında geliştirildi
(yalnızca bu haber sitelerine özgü bir durum değil — rastgele bir site bile denendiğinde aynı
şekilde engellendi). Bu yüzden "boş kontenjan" ayrıştırma mantığı, sitenin **gerçek** HTML'ine
bakılarak değil, arama motoru sonuçlarında görülen gerçek alıntı cümlelere göre yazıldı ve
sentetik (yapay) test metinleriyle doğrulandı — sitenin güncel HTML'i üzerinde uçtan uca
doğrulanamadı.

Projeyi normal internet erişimi olan bir makinede/sunucuda çalıştırdığınızda:

1. `npm run dev` ile başlatıp **Yenile** butonuna basın.
2. Bir kaynak "hata" durumuna düşerse (kırmızı/sarı uyarı bandındaki mesaj), o kaynağın gerçek
   sayfasını tarayıcıda açıp metin kalıbının `server/src/scraper.js` / `server/src/okulAdlari.js`
   içindeki kalıplarla uyuşup uyuşmadığını kontrol edin; gerekirse deseni sitenin gerçek
   ifadesine göre güncelleyin.
3. "Boş kontenjan" bir okul için sürekli "Bilinmiyor" kalıyorsa, o okulun `okulAdlari.js`'teki
   `aliaslar` listesini, makalede geçen gerçek isim yazımıyla eşleşecek şekilde genişletin.
4. Kalıcı olarak engelleyen (403/bot koruması) bir site için, o kaynağı `sources.js`'ten
   çıkarıp yerine erişilebilir başka bir kaynak eklemeniz gerekebilir.

## Üretim (production) build

```bash
npm run build   # client/dist oluşturur
npm run start   # server, client/dist'i de bu adresten servis eder
```
