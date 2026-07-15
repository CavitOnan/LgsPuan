# LGS Okul Puan Takip

LGS puanıyla öğrenci alan özel okulların (Fransız, Alman, Avusturya, İtalyan, Amerikan liseleri
ve diğer özel liseler) **taban puanı**, **toplam kontenjanı** ve **boş kontenjan** durumunu tek
bir tabloda gösteren web sitesi. Sağ üstteki **Yenile** butonuna basıldığında, kaynak sitelerden
güncel veri çekilmeye çalışılır.

## Proje yapısı

```
lgs-okul-puan-takip/
  server/   Express API: veri önbelleği + kaynak sitelerden veri çekme (scraper)
  client/   React + Vite arayüzü: tablo, kategori filtresi, arama, Yenile butonu
```

## Geliştirme

```bash
cd lgs-okul-puan-takip
npm install
npm run dev
```

Bu komut API'yi `http://localhost:5175`, arayüzü `http://localhost:5174` üzerinde başlatır
(Vite, `/api` isteklerini otomatik olarak API'ye yönlendirir).

İlk kurulumda `server` ve `client` klasörlerinin kendi `node_modules`'ları için ayrıca
`npm install` çalıştırmanız gerekebilir (`npm run dev` her ikisini de `--prefix` ile çalıştırır
ama bağımlılıkları otomatik kurmaz):

```bash
cd server && npm install && cd ../client && npm install
```

## Nasıl çalışır

- `server/data/schools.seed.json`: uygulamanın ilk açılışında göstereceği, elle doğrulanmış
  gerçek 2026 verileri (taban puan/kontenjan) içeren başlangıç verisi.
- `server/data/schools.json`: uygulama çalışırken oluşan, en son bilinen veriyi tutan önbellek
  dosyası (git'e dahil edilmez).
- `GET /api/schools`: önbellekteki en güncel veriyi döner.
- `POST /api/refresh`: `server/src/sources.js` içinde tanımlı kaynak sayfaları tek tek çeker,
  sayfa metninden "Okul Adı: Kontenjan N, taban puan P" kalıbına uyan okulları ayıklar ve
  önbelleği günceller. **Bir kaynak başarısız olursa** (site erişilemiyor, yapısı değişmiş vb.)
  o kaynağa ait okullarda son bilinen veri korunur; arayüzde hangi kaynağın güncellenip
  hangisinin güncellenemediği açıkça gösterilir.
- "Boş kontenjan" alanı, bir okul için en son başarıyla çekilen duyurudaki kontenjan sayısını
  gösterir. Özel okul LGS kayıt sürecinde okullar her yeni kayıt turunda (kesin kayıt →
  serbest kayıt turları) kalan/boş kontenjanı yeniden ilan eder; bu yüzden en güncel çekilen
  kontenjan rakamı, o an için boş olan yer sayısını temsil eder. Henüz hiç başarılı bir
  çekim yapılmamışsa "Bilinmiyor" gösterilir (uydurma veri gösterilmez).

## Kaynakların güncellenmesi

`server/src/sources.js` içindeki `KAYNAKLAR` listesi, veri çekilecek sayfaların adreslerini
tutar. Yeni bir kaynak eklemek veya mevcut bir kaynağın adresini güncellemek için bu listeyi
düzenlemeniz yeterlidir; her kaynak diğerlerinden bağımsız çalışır.

## Bilinen kısıt: canlı veri çekimi bu geliştirme ortamında doğrulanamadı

Bu proje, bu oturumun çalıştığı sandbox ortamında geliştirildi. Bu ortamın ağ politikası,
**tüm** dış sitelere doğrudan bağlantıyı engelliyor (yalnızca bu haber sitelerine özgü bir
durum değil — `example.com` gibi rastgele bir site bile denendiğinde aynı şekilde engellendi).
Bu yüzden scraper kodu, kaynak sitelerin **gerçek** HTML yapısına bakılarak değil, arama
sonuçlarında görülen tipik cümle kalıplarına (`"Okul Adı: Kontenjan N, taban puan P"`) göre
yazıldı ve bu sandbox içinde uçtan uca doğrulanamadı.

Projeyi normal internet erişimi olan bir makinede/sunucuda çalıştırdığınızda:

1. `npm run dev` ile başlatıp **Yenile** butonuna basın.
2. Bir kaynak "hata" durumuna düşerse (kırmızı/sarı uyarı bandındaki mesaj), o kaynağın gerçek
   sayfasını tarayıcıda açıp metin kalıbının `server/src/scraper.js` içindeki regex'lerle
   uyuşup uyuşmadığını kontrol edin; gerekirse deseni o sitenin gerçek ifadesine göre güncelleyin.
3. Kalıcı olarak engelleyen (403/bot koruması) bir site için, o kaynağı `sources.js`'ten
   çıkarıp yerine erişilebilir başka bir kaynak eklemeniz gerekebilir.

## Üretim (production) build

```bash
npm run build   # client/dist oluşturur
npm run start   # server, client/dist'i de bu adresten servis eder
```
