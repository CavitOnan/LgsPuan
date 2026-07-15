import axios from "axios";
import { OKUL_ALIASLARI } from "./okulAdlari.js";

const VARSAYILAN_MODEL = "gemini-2.5-flash";
const HTTP_TIMEOUT_MS = 30000;

function normalizeTr(s) {
  return s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
}

function benzersizOkulAdlari() {
  const gorulen = new Set();
  const sonuc = [];
  for (const okul of OKUL_ALIASLARI) {
    if (!gorulen.has(okul.ad)) {
      gorulen.add(okul.ad);
      sonuc.push(okul);
    }
  }
  return sonuc;
}

function promptOlustur() {
  const okulListesi = benzersizOkulAdlari()
    .map((o) => `- ${o.ad}`)
    .join("\n");

  return `Aşağıdaki İstanbul'daki özel liseler için, 2026 LGS özel okul kayıt sürecinin EN GÜNCEL
(en son açıklanan) turundaki taban puanı ve boş/kalan kontenjan sayısını Google araması ile
araştırıp bul:

${okulListesi}

Kız/erkek kontenjanı ayrı olan okullar (ör. Robert Kolej, Üsküdar Amerikan Lisesi) için kız ve
erkek değerlerini AYRI satırlar olarak ver. Emin olmadığın veya güncel bilgi bulamadığın
okulları listeye hiç dahil etme (uydurma veri verme).

Yalnızca aşağıdaki JSON formatında, başka hiçbir açıklama metni eklemeden cevap ver:

\`\`\`json
[
  {"okulAdi": "...", "grup": "Kız", "tabanPuan": 480, "bosKontenjan": 5, "kontenjanDoldu": false}
]
\`\`\`

Kurallar:
- "grup" değeri "Kız", "Erkek" veya "Karma" olmalı.
- Kontenjan tamamen dolmuşsa "kontenjanDoldu": true yaz ve "bosKontenjan": 0 ver.
- "tabanPuan" ve "bosKontenjan" sayısal (JSON number) olmalı, tırnak içinde olmamalı.`;
}

function aliasIleEsle(okulAdi, grup) {
  if (!okulAdi) return null;
  const normAd = normalizeTr(okulAdi);
  const adaylar = OKUL_ALIASLARI.filter((o) =>
    o.aliaslar.some((a) => normAd.includes(normalizeTr(a)))
  );
  if (adaylar.length === 0) return null;
  if (adaylar.length === 1) return adaylar[0];

  // Birden fazla aday varsa (kız/erkek çifti aynı aliaslara sahip olduğundan)
  // grup bilgisiyle daralt.
  const grupNorm = normalizeTr(grup || "Karma");
  return adaylar.find((o) => normalizeTr(o.grup) === grupNorm) || adaylar[0];
}

export function geminiYapilandirilmisMi() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Modelin ham metin yanıtından JSON'u çıkarıp bilinen okullarla eşleştirir.
// Ağ çağrısından ayrı tutulur ki gerçek bir API anahtarı olmadan da (sentetik
// bir model yanıtıyla) test edilebilsin.
export function sonuclariAyristirVeEsle(metin) {
  const jsonEslesme = metin.match(/```json\s*([\s\S]*?)```/) || metin.match(/(\[[\s\S]*\])/);
  if (!jsonEslesme) throw new Error("Gemini yanıtından JSON ayrıştırılamadı: " + metin.slice(0, 200));

  let ayristirilan;
  try {
    ayristirilan = JSON.parse(jsonEslesme[1]);
  } catch {
    throw new Error("Gemini yanıtı geçerli JSON değil");
  }
  if (!Array.isArray(ayristirilan)) throw new Error("Beklenmeyen Gemini yanıt formatı (dizi bekleniyor)");

  const sonuc = [];
  for (const kayit of ayristirilan) {
    const eslesenUye = aliasIleEsle(kayit.okulAdi, kayit.grup);
    if (!eslesenUye) continue;

    const bosKontenjan = kayit.kontenjanDoldu ? 0 : Number(kayit.bosKontenjan);
    if (!Number.isFinite(bosKontenjan) || bosKontenjan < 0 || bosKontenjan > 2000) continue;

    const tabanPuanHam = Number(kayit.tabanPuan);
    const tabanPuan = Number.isFinite(tabanPuanHam) && tabanPuanHam >= 250 && tabanPuanHam <= 520 ? tabanPuanHam : null;

    sonuc.push({
      id: eslesenUye.id,
      ad: eslesenUye.ad,
      kategori: eslesenUye.kategori,
      grup: eslesenUye.grup,
      bosKontenjan,
      tabanPuan
    });
  }

  return sonuc;
}

export async function geminiIleOkullariSorgula() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil (server/.env dosyasına ekleyin)");

  const model = process.env.GEMINI_MODEL || VARSAYILAN_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const { data } = await axios.post(
    url,
    {
      contents: [{ parts: [{ text: promptOlustur() }] }],
      // "Google ile arama" temellendirmesi: model, cevabı güncel arama
      // sonuçlarına dayandırır. Gemini API sürümüne göre alan adı değişebilir;
      // güncel adı https://ai.google.dev/gemini-api/docs/grounding adresinden
      // doğrulayın ve gerekirse burayı güncelleyin.
      tools: [{ google_search: {} }]
    },
    {
      params: { key: apiKey },
      timeout: HTTP_TIMEOUT_MS,
      headers: { "Content-Type": "application/json" }
    }
  );

  const parcalar = data?.candidates?.[0]?.content?.parts || [];
  const metin = parcalar.map((p) => p.text || "").join("\n");
  return sonuclariAyristirVeEsle(metin);
}
