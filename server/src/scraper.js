import axios from "axios";
import * as cheerio from "cheerio";
import { KAYNAKLAR, okulAdindanKategoriTahminEt } from "./sources.js";
import { OKUL_ALIASLARI } from "./okulAdlari.js";

const HTTP_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const PENCERE_UZUNLUGU = 300;
const ONCESI_PENCERE_UZUNLUGU = 100;

// Sitelerde gözlemlenen "Okul Adı (Kız/Erkek): Kontenjan 101, taban puan 482"
// tarzı cümle kalıpları için iki yönlü (kontenjan-puan / puan-kontenjan) regex.
// Bu, genellikle bir kayıt turunun İLK duyurusunda (toplam kontenjan + taban puan)
// görülen bir format.
const DESEN_KONTENJAN_ONCE =
  /([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü.\- ]{2,60}?)\s*(?:\(\s*(Kız|Erkek|Karma)\s*\))?\s*:\s*[Kk]ontenjan[ıi]?\s*(\d{1,4})[^\d]{0,25}taban\s*puan[ıi]?\s*(\d{2,4})/g;

const DESEN_PUAN_ONCE =
  /([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü.\- ]{2,60}?)\s*(?:\(\s*(Kız|Erkek|Karma)\s*\))?\s*:\s*taban\s*puan[ıi]?\s*(\d{2,4})[^\d]{0,25}[Kk]ontenjan[ıi]?\s*(\d{1,4})/g;

// Takip eden turlarda ("serbest kayıt") görülen serbest metin kalıpları:
// "...101 kişilik erkek kontenjanı doldu", "...kontenjandan 8 yer boş kaldı",
// "...47 boş kontenjan bulunuyor", "en fazla boş yer 19 kontenjanla X'de" gibi.
// "doldu" ifadesi, yanlışlıkla başka bir okula ait bir cümleden yakalanmasın
// diye yakınında bir kapasite sayısı ("N kişilik") arandığında güvenilir sayılır.
const DESEN_DOLDU_DOGRULANMIS = /(\d{1,4})\s*ki[sş]ilik[^.,]{0,40}kontenjan[ıi]?\s+doldu/i;
const DESEN_DOLDU_YALIN = /kontenjan[ıi]?\s+doldu/i;
const DESEN_YER_BOS_KALDI_SONRA = /(\d{1,4})\s*yer\s*bo[sş]\s*kald/i;
const DESEN_BOS_SAYI_SONRA = /(\d{1,4})\s*bo[sş]\s*(?:kontenjan|yer)/i;
const DESEN_BOS_SAYI_ONCE = /bo[sş]\s*(?:kontenjan|yer)[^\d]{0,20}(\d{1,4})/i;
const DESEN_KONTENJANLA_ONCESI = /(\d{1,4})\s*kontenjanla\s*$/i;
const DESEN_BOS_YER_ONCESI = /bo[sş]\s*(?:kontenjan|yer)[^\d]{0,60}(\d{1,4})\s*$/i;
const DESEN_PUAN_GERILEDI = /(\d{2,4})\s*['’]?\s*(?:e|a|ye|ya)\s*(?:geriledi|d[üu]şt[üu]|indi)/i;
const DESEN_PUAN_BELIRLENDI = /puan[ıi]?\s*(\d{2,4})\s*olarak\s*belirlendi/i;

function normalizeTr(s) {
  return s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
}

function metniTemizle($) {
  const adaylar = ["article", ".detay-icerik", ".news-detail", ".haber-detay", ".content", "main"];
  for (const secici of adaylar) {
    const el = $(secici).first();
    if (el.length && el.text().trim().length > 200) {
      return el.text().replace(/\s+/g, " ").trim();
    }
  }
  return $("body").text().replace(/\s+/g, " ").trim();
}

function genelDesenEslesmeleriTopla(metin) {
  const sonuc = new Map();

  for (const desen of [DESEN_KONTENJAN_ONCE, DESEN_PUAN_ONCE]) {
    desen.lastIndex = 0;
    let m;
    while ((m = desen.exec(metin)) !== null) {
      const okulAdi = m[1].trim();
      const grup = m[2] || "Karma";
      const kontenjanIndex = desen === DESEN_KONTENJAN_ONCE ? 3 : 4;
      const puanIndex = desen === DESEN_KONTENJAN_ONCE ? 4 : 3;
      const kontenjan = Number(m[kontenjanIndex]);
      const tabanPuan = Number(m[puanIndex]);

      // Taban puanlar LGS'te ~350-500 aralığında olur; makul olmayan
      // eşleşmeleri (yanlış yakalanan sayılar) eleyerek gürültüyü azalt.
      if (tabanPuan < 250 || tabanPuan > 520 || kontenjan <= 0 || kontenjan > 2000) continue;

      const anahtar = `${okulAdi.toLocaleLowerCase("tr-TR")}::${grup}`;
      if (!sonuc.has(anahtar)) {
        sonuc.set(anahtar, { okulAdi, grup, kontenjan, tabanPuan });
      }
    }
  }

  return [...sonuc.values()];
}

// OKUL_ALIASLARI'nı ortak okul adına (ad) göre gruplar; kız/erkek çiftleri
// aynı metin bölgesini paylaştığı için tek bir "occurrence" kümesi üzerinden
// değerlendirilir.
function okulGruplariniOlustur() {
  const gruplar = new Map();
  for (const okul of OKUL_ALIASLARI) {
    if (!gruplar.has(okul.ad)) {
      gruplar.set(okul.ad, { ad: okul.ad, aliaslar: okul.aliaslar, uyeler: [] });
    }
    gruplar.get(okul.ad).uyeler.push(okul);
  }
  return [...gruplar.values()];
}

function tumIndeksleriBul(metin, altDize) {
  const sonuclar = [];
  const normMetin = normalizeTr(metin);
  const normAltDize = normalizeTr(altDize);
  let baslangic = 0;
  while (true) {
    const idx = normMetin.indexOf(normAltDize, baslangic);
    if (idx === -1) break;
    sonuclar.push(idx);
    baslangic = idx + normAltDize.length;
  }
  return sonuclar;
}

function dolduMu(clauseVeyaSegment) {
  return DESEN_DOLDU_DOGRULANMIS.test(clauseVeyaSegment) || DESEN_DOLDU_YALIN.test(clauseVeyaSegment);
}

function bosSayisiBul(metinParcasi) {
  const m =
    metinParcasi.match(DESEN_YER_BOS_KALDI_SONRA) ||
    metinParcasi.match(DESEN_BOS_SAYI_SONRA) ||
    metinParcasi.match(DESEN_BOS_SAYI_ONCE);
  return m ? Number(m[1]) : null;
}

function puanBul(metinParcasi) {
  const m = metinParcasi.match(DESEN_PUAN_GERILEDI) || metinParcasi.match(DESEN_PUAN_BELIRLENDI);
  if (!m) return null;
  const deger = Number(m[1]);
  return deger >= 250 && deger <= 520 ? deger : null;
}

// Bilinen okul adlarını metinde arar; her geçtiği yer için, bir SONRAKİ bilinen
// okul adına kadar olan (ya da belirli bir uzunluğa kadar olan) metin dilimini
// o okula "ait" kabul eder. Bu, "X, Y ve Z'nin kontenjanı doldu" gibi ortak
// yüklemli cümlelerde bile en azından yanlış okula (başka bir okulun net olarak
// ayrıştırılmış cümlesine) atama yapılmasını engeller. Kız/erkek ayrımı olan
// okullarda, dilim virgülle cümleciklere bölünüp ilgili grup kelimesini (kız/
// erkek) içeren cümlecik aranır.
function bosKontenjanEslesmeleriBul(metin) {
  const gruplar = okulGruplariniOlustur();

  // Tüm gruplar için tüm alias geçişlerini topla, pozisyona göre sırala.
  const tumGecisler = [];
  for (const grup of gruplar) {
    for (const alias of grup.aliaslar) {
      for (const idx of tumIndeksleriBul(metin, alias)) {
        tumGecisler.push({ grup, start: idx, end: idx + alias.length });
      }
    }
  }
  tumGecisler.sort((a, b) => a.start - b.start);

  const sonuclarById = new Map();

  for (let i = 0; i < tumGecisler.length; i++) {
    const gecis = tumGecisler[i];

    // Bu geçişten SONRAKİ, farklı bir okula ait ilk geçişe kadar olan dilim.
    let sonrakiSinir = metin.length;
    for (let j = i + 1; j < tumGecisler.length; j++) {
      if (tumGecisler[j].grup.ad !== gecis.grup.ad) {
        sonrakiSinir = tumGecisler[j].start;
        break;
      }
    }
    const segmentSonu = Math.min(sonrakiSinir, gecis.end + PENCERE_UZUNLUGU);
    const segment = metin.slice(gecis.end, segmentSonu);

    // Bu geçişten ÖNCEKİ, farklı bir okula ait geçişten bu yana olan dilim
    // ("...en fazla boş yer 19 kontenjanla X'de" gibi okuldan önce gelen sayılar için).
    let oncekiSinir = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (tumGecisler[j].grup.ad !== gecis.grup.ad) {
        oncekiSinir = tumGecisler[j].end;
        break;
      }
    }
    const oncesiBaslangic = Math.max(oncekiSinir, gecis.start - ONCESI_PENCERE_UZUNLUGU);
    const oncesi = metin.slice(oncesiBaslangic, gecis.start);

    const uyeler = gecis.grup.uyeler;
    const tekUye = uyeler.length === 1 ? uyeler[0] : null;

    if (tekUye) {
      // Karma (tek gruplu) okul: dilimin tamamında ara.
      let bosKontenjan = null;
      if (dolduMu(segment)) bosKontenjan = 0;
      else bosKontenjan = bosSayisiBul(segment);

      if (bosKontenjan === null) {
        const oncekiEslesme = oncesi.match(DESEN_KONTENJANLA_ONCESI) || oncesi.match(DESEN_BOS_YER_ONCESI);
        if (oncekiEslesme) bosKontenjan = Number(oncekiEslesme[1]);
      }

      if (bosKontenjan === null) continue;
      const tabanPuan = puanBul(segment);
      guncelleEnIyi(sonuclarById, tekUye, bosKontenjan, tabanPuan);
      continue;
    }

    // Kız/erkek çifti: dilimi cümleciklere (virgülle) böl, her cümlecikte
    // ilgili grup kelimesini ara.
    const cumlecikler = segment.split(/,\s*/);
    for (const uye of uyeler) {
      const grupKelime = normalizeTr(uye.grup === "Kız" ? "kız" : "erkek");
      const hedefCumlecik = cumlecikler.find((c) => normalizeTr(c).includes(grupKelime));
      if (!hedefCumlecik) continue;

      let bosKontenjan = null;
      if (dolduMu(hedefCumlecik)) bosKontenjan = 0;
      else bosKontenjan = bosSayisiBul(hedefCumlecik);
      if (bosKontenjan === null) continue;

      const tabanPuan = puanBul(segment);
      guncelleEnIyi(sonuclarById, uye, bosKontenjan, tabanPuan);
    }
  }

  return [...sonuclarById.values()];
}

function guncelleEnIyi(sonuclarById, uye, bosKontenjan, tabanPuan) {
  const mevcut = sonuclarById.get(uye.id);
  if (!mevcut || (tabanPuan !== null && mevcut.tabanPuan === null)) {
    sonuclarById.set(uye.id, {
      id: uye.id,
      ad: uye.ad,
      kategori: uye.kategori,
      grup: uye.grup,
      bosKontenjan,
      tabanPuan
    });
  }
}

async function sayfaGetir(url) {
  const { data: html } = await axios.get(url, {
    timeout: HTTP_TIMEOUT_MS,
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "tr-TR,tr;q=0.9" }
  });
  return cheerio.load(html);
}

// "liste" tipi kaynaklarda, kategori/blog sayfasındaki ilk "/detay/" linkinin
// en güncel yazı olduğu varsayılır (çoğu haber sitesinde listeler yeniden
// eskiye sıralanır). Bulunamazsa kaynağın sabit yedek URL'sine düşer.
async function enGuncelMakaleyiBul(kaynak) {
  const $ = await sayfaGetir(kaynak.indexUrl);
  const link = $('a[href*="/detay/"]').first().attr("href");
  if (!link) {
    if (kaynak.yedekUrl) return kaynak.yedekUrl;
    throw new Error("Liste sayfasında makale linki bulunamadı");
  }
  return new URL(link, kaynak.indexUrl).toString();
}

export async function kaynaktanOkullariCek(kaynak) {
  const makaleUrl = kaynak.tur === "liste" ? await enGuncelMakaleyiBul(kaynak) : kaynak.url;
  const $ = await sayfaGetir(makaleUrl);
  const metin = metniTemizle($);

  const genelEslesmeler = genelDesenEslesmeleriTopla(metin).map((e) => ({
    tur: "genel",
    okulAdi: e.okulAdi,
    grup: e.grup,
    kategori: okulAdindanKategoriTahminEt(e.okulAdi, kaynak.varsayilanKategori),
    tabanPuan: e.tabanPuan,
    bosKontenjan: e.kontenjan
  }));

  const bosKontenjanEslesmeler = bosKontenjanEslesmeleriBul(metin).map((e) => ({
    tur: "bos-kontenjan",
    id: e.id,
    okulAdi: e.ad,
    grup: e.grup,
    kategori: e.kategori,
    tabanPuan: e.tabanPuan,
    bosKontenjan: e.bosKontenjan
  }));

  return [...genelEslesmeler, ...bosKontenjanEslesmeler].map((e) => ({ ...e, kaynakId: kaynak.id, kaynakUrl: makaleUrl }));
}

function slugYap(deger) {
  return deger
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Tüm kaynakları sırayla dener; bir kaynak başarısız olursa o kaynağa ait
// önceki veriler korunur ve hata durumu raporlanır, diğer kaynaklar etkilenmez.
export async function tumKaynaklariYenile(mevcutOkullar) {
  const okullarById = new Map(mevcutOkullar.map((o) => [o.id, { ...o }]));
  const kaynakDurumlari = [];
  const simdi = new Date().toISOString();

  for (const kaynak of KAYNAKLAR) {
    try {
      const bulunanlar = await kaynaktanOkullariCek(kaynak);

      if (bulunanlar.length === 0) {
        kaynakDurumlari.push({
          id: kaynak.id,
          ad: kaynak.ad,
          url: kaynak.tur === "liste" ? kaynak.indexUrl : kaynak.url,
          durum: "hata",
          hata: "Sayfada tanınan bir okul/puan deseni bulunamadı (site yapısı değişmiş olabilir).",
          sonDenemeZamani: simdi
        });
        continue;
      }

      for (const b of bulunanlar) {
        const id = b.id || `${slugYap(b.okulAdi)}${b.grup !== "Karma" ? "-" + slugYap(b.grup) : ""}`;
        const oncekiKayit = okullarById.get(id);

        // "bos-kontenjan" türü eşleşmeler ("N boş kontenjan", "kontenjanı doldu")
        // daha spesifik bir sinyaldir ve "genel" türden (ilk duyuru) daha
        // güncel/otoriter kabul edilir; genel eşleşme sadece daha spesifik bir
        // veri henüz yoksa uygulanır.
        if (b.tur === "genel" && oncekiKayit?.__sonGuncellemeTuru === "bos-kontenjan") continue;

        okullarById.set(id, {
          id,
          okulAdi: b.okulAdi,
          kategori: oncekiKayit?.kategori || b.kategori,
          grup: b.grup,
          sehir: oncekiKayit?.sehir || null,
          tabanPuan: b.tabanPuan ?? oncekiKayit?.tabanPuan ?? null,
          toplamKontenjan: oncekiKayit?.toplamKontenjan ?? b.bosKontenjan ?? null,
          bosKontenjan: b.bosKontenjan,
          kayitAsamasi: oncekiKayit?.kayitAsamasi || "Güncel duyuru",
          kaynakUrl: b.kaynakUrl,
          not: oncekiKayit?.not ?? null,
          __sonGuncellemeTuru: b.tur
        });
      }

      kaynakDurumlari.push({
        id: kaynak.id,
        ad: kaynak.ad,
        url: kaynak.tur === "liste" ? kaynak.indexUrl : kaynak.url,
        durum: "basarili",
        bulunanOkulSayisi: bulunanlar.length,
        sonDenemeZamani: simdi,
        sonBasariliZamani: simdi
      });
    } catch (err) {
      kaynakDurumlari.push({
        id: kaynak.id,
        ad: kaynak.ad,
        url: kaynak.tur === "liste" ? kaynak.indexUrl : kaynak.url,
        durum: "hata",
        hata: err.message || "Bilinmeyen hata",
        sonDenemeZamani: simdi
      });
    }
  }

  const okullar = [...okullarById.values()].map(({ __sonGuncellemeTuru, ...okul }) => okul);

  return {
    guncellemeZamani: simdi,
    okullar,
    kaynakDurumlari
  };
}
