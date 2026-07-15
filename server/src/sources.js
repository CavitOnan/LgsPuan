// Taban puan / kontenjan verilerinin çekilmeye çalışılacağı kaynak sayfalar.
// Bu liste; okulların kendi web siteleri yerine, LGS özel okul kayıt döneminde
// bu bilgiyi düzenli yayınlayan haber/eğitim sitelerinden oluşur. Bir kaynağın
// HTML yapısı değişirse veya erişilemez hale gelirse parser sonuç bulamaz ve
// o kaynak "hata" durumuna düşer; diğer kaynaklar etkilenmez.
//
// tur: "sabit"       -> tek, değişmeyen bir makale URL'si çekilir.
// tur: "liste"       -> her kayıt turunda yeni bir makale yayınlayan sitelerde,
//                       önce indexUrl'deki liste sayfasından en güncel makale linki
//                       bulunur, sonra o makale çekilir. pervinkaplan.com bu şekilde
//                       çalışır: "kalan/boş kontenjan" bilgisini her tur için ayrı
//                       bir yazıda, farklı bir URL'de yayınlıyor.
// tur: "yapay-zeka"  -> URL çekmek yerine, Gemini API'ye (Google Arama ile
//                       temellendirme özelliğiyle) doğrudan soru sorulur.
//                       GEMINI_API_KEY tanımlı değilse bu kaynak "atlandı"
//                       olarak işaretlenir, hata sayılmaz.
// tur: "kayit-sayimi" -> Bir "kesin kayıt listesi" sayfasındaki satır/madde
//                       sayısı sayılır (hedefOkulId zorunlu); bu sayı, o
//                       okulun bilinen toplam kontenjanından düşülerek boş
//                       kontenjan hesaplanır. Toplam kontenjan bilinmiyorsa
//                       hesaplama yapılamaz.
export const KAYNAKLAR = [
  {
    id: "pervinkaplan-yabanci",
    ad: "Pervin Kaplan - Yabancı Özel Liseler",
    tur: "liste",
    indexUrl: "https://www.pervinkaplan.com/blog/yabanci-ozel-liseler/42",
    yedekUrl: "https://www.pervinkaplan.com/detay/2026-lgs-iste-yabanci-ozel-liselerin-taban-puanlari-ve-kontenjanlari/33802",
    varsayilanKategori: "Yabancı Özel Lise"
  },
  {
    id: "egitim-net-yabanci",
    ad: "Eğitim.net - Yabancı Özel Liseler",
    tur: "sabit",
    url: "https://www.egitim.net.tr/egitim/2026-yabanci-ozel-liseler-taban-puanlari-kontenjanlari-16528h",
    varsayilanKategori: "Yabancı Özel Lise"
  },
  {
    id: "egitimsistem-ozel",
    ad: "Eğitim Sistem - Özel Liseler",
    tur: "sabit",
    url: "https://www.egitimsistem.com/2026-ozel-liseler-taban-puanlari-kontenjanlari-113298h.htm",
    varsayilanKategori: "Türk Özel Lise"
  },
  {
    id: "timeturk-yabanci",
    ad: "Timeturk - Yabancı Özel Lise",
    tur: "sabit",
    url: "https://www.timeturk.com/lgs-2026-yabanci-ozel-lise-taban-puanlari-robert-482-ile-zirvede",
    varsayilanKategori: "Yabancı Özel Lise"
  },
  {
    id: "kucuk-prens-kayit",
    ad: "Özel Küçük Prens Lisesi - Kayıt İşlemleri",
    tur: "sabit",
    url: "https://kp.k12.tr/lise/aday-ogrenci/kayit-islemleri/",
    varsayilanKategori: "Fransız"
  },
  {
    id: "kucuk-prens-kesin-kayit-sayimi",
    ad: "Özel Küçük Prens Lisesi - Kesin Kayıt Listesi (sayım)",
    tur: "kayit-sayimi",
    url: "https://kp.k12.tr/lise/aday-ogrenci/kayit-islemleri/kesin-kayit-listesi/",
    hedefOkulId: "kucuk-prens"
  },
  {
    id: "gemini-ai-arama",
    ad: "Google AI (Gemini) ile arama",
    tur: "yapay-zeka",
    varsayilanKategori: "Yabancı Özel Lise"
  }
];

// Okul adında geçen anahtar kelimeye göre kategori belirleme.
const KATEGORI_ANAHTAR_KELIMELER = [
  {
    kategori: "Fransız",
    kelimeler: [
      "fransız",
      "saint joseph",
      "sajev",
      "notre dame",
      "sen benua",
      "saint benoit",
      "pierre loti",
      "sainte pulcherie",
      "sen pulceri",
      "saint michel",
      "sen mişel"
    ]
  },
  { kategori: "Alman", kelimeler: ["alman"] },
  { kategori: "Avusturya", kelimeler: ["avusturya", "sankt georg", "st. georg"] },
  { kategori: "İtalyan", kelimeler: ["italyan", "liceo italiano"] },
  { kategori: "Amerikan", kelimeler: ["amerikan", "robert kolej", "robert koleji", "üsküdar amerikan", "tarsus amerikan", "aci ", "izmir amerikan"] }
];

export function okulAdindanKategoriTahminEt(okulAdi, varsayilan) {
  const normalize = (s) =>
    s
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i");
  const normAd = normalize(okulAdi);
  for (const { kategori, kelimeler } of KATEGORI_ANAHTAR_KELIMELER) {
    if (kelimeler.some((k) => normAd.includes(normalize(k)))) {
      return kategori;
    }
  }
  return varsayilan || "Diğer Özel";
}
