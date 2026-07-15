import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { veriyiOku, veriyiYaz } from "./store.js";
import { tumKaynaklariYenile } from "./scraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5175;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/schools", (req, res) => {
  res.json(veriyiOku());
});

app.post("/api/refresh", async (req, res) => {
  const mevcut = veriyiOku();
  try {
    const sonuc = await tumKaynaklariYenile(mevcut.okullar);
    const guncelVeri = {
      guncellemeZamani: sonuc.guncellemeZamani,
      kaynakNotu: mevcut.kaynakNotu,
      kaynakDurumlari: sonuc.kaynakDurumlari,
      okullar: sonuc.okullar
    };
    veriyiYaz(guncelVeri);
    res.json(guncelVeri);
  } catch (err) {
    res.status(500).json({ hata: err.message || "Yenileme sırasında beklenmeyen hata oluştu." });
  }
});

// Prod build varsa client/dist içeriğini de bu sunucudan servis et.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`LGS Okul Puan Takip API http://localhost:${PORT} adresinde çalışıyor`);
});
