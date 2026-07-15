import axios from "axios";
import * as cheerio from "cheerio";
import { KAYNAKLAR, okulAdindanKategoriTahminEt } from "./sources.js";

const HTTP_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Sitelerde gözlemlenen "Okul Adı (Kız/Erkek): Kontenjan 101, taban puan 482"
// tarzı cümle kalıpları için iki yönlü (kontenjan-puan / puan-kontenjan) regex.
const DESEN_KONTENJAN_ONCE =
  /([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü.\- ]{2,60}?)\s*(?:\(\s*(Kız|Erkek|Karma)\s*\))?\s*:\s*[Kk]ontenjan[ıi]?\s*(\d{1,4})[^\d]{0,25}taban\s*puan[ıi]?\s*(\d{2,4})/g;

const DESEN_PUAN_ONCE =
  /([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü.\- ]{2,60}?)\s*(?:\(\s*(Kız|Erkek|Karma)\s*\))?\s*:\s*taban\s*puan[ıi]?\s*(\d{2,4})[^\d]{0,25}[Kk]ontenjan[ıi]?\s*(\d{1,4})/g;

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

function eslesmeleriTopla(metin) {
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

export async function kaynaktanOkullariCek(kaynak) {
  const { data: html } = await axios.get(kaynak.url, {
    timeout: HTTP_TIMEOUT_MS,
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "tr-TR,tr;q=0.9" }
  });

  const $ = cheerio.load(html);
  const metin = metniTemizle($);
  const eslesmeler = eslesmeleriTopla(metin);

  return eslesmeler.map((e) => ({
    okulAdi: e.okulAdi,
    grup: e.grup,
    kategori: okulAdindanKategoriTahminEt(e.okulAdi, kaynak.varsayilanKategori),
    tabanPuan: e.tabanPuan,
    kontenjan: e.kontenjan,
    kaynakId: kaynak.id,
    kaynakUrl: kaynak.url
  }));
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
          url: kaynak.url,
          durum: "hata",
          hata: "Sayfada tanınan bir okul/puan deseni bulunamadı (site yapısı değişmiş olabilir).",
          sonDenemeZamani: simdi
        });
        continue;
      }

      for (const b of bulunanlar) {
        const id = `${slugYap(b.okulAdi)}${b.grup !== "Karma" ? "-" + slugYap(b.grup) : ""}`;
        const oncekiKayit = okullarById.get(id);
        okullarById.set(id, {
          id,
          okulAdi: b.okulAdi,
          kategori: oncekiKayit?.kategori || b.kategori,
          grup: b.grup,
          sehir: oncekiKayit?.sehir || null,
          tabanPuan: b.tabanPuan,
          toplamKontenjan: oncekiKayit?.toplamKontenjan ?? b.kontenjan,
          bosKontenjan: b.kontenjan,
          kayitAsamasi: oncekiKayit?.kayitAsamasi || "Güncel duyuru",
          kaynakUrl: b.kaynakUrl,
          not: oncekiKayit?.not ?? null
        });
      }

      kaynakDurumlari.push({
        id: kaynak.id,
        ad: kaynak.ad,
        url: kaynak.url,
        durum: "basarili",
        bulunanOkulSayisi: bulunanlar.length,
        sonDenemeZamani: simdi,
        sonBasariliZamani: simdi
      });
    } catch (err) {
      kaynakDurumlari.push({
        id: kaynak.id,
        ad: kaynak.ad,
        url: kaynak.url,
        durum: "hata",
        hata: err.message || "Bilinmeyen hata",
        sonDenemeZamani: simdi
      });
    }
  }

  return {
    guncellemeZamani: simdi,
    okullar: [...okullarById.values()],
    kaynakDurumlari
  };
}
