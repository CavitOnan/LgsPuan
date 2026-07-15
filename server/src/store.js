import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "schools.json");
const SEED_PATH = path.join(DATA_DIR, "schools.seed.json");

function bosDurum() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  return {
    guncellemeZamani: seed.guncellemeZamani,
    kaynakNotu: seed.kaynakNotu,
    kaynakDurumlari: [],
    okullar: seed.okullar
  };
}

export function veriyiOku() {
  if (!fs.existsSync(STORE_PATH)) {
    return bosDurum();
  }
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return bosDurum();
  }
}

export function veriyiYaz(veri) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(veri, null, 2), "utf-8");
}
