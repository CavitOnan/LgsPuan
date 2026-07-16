import { useEffect, useMemo, useState } from 'react'
import { okullariGetir, okullariYenile } from './api'
import CategoryFilter from './components/CategoryFilter'
import SchoolTable from './components/SchoolTable'
import StatusBanner from './components/StatusBanner'

const GEMINI_TERCIH_ANAHTARI = 'lgs-puan-takip:gemini-etkin'

function depodanGeminiTercihiOku() {
  const kayitli = localStorage.getItem(GEMINI_TERCIH_ANAHTARI)
  return kayitli === null ? false : kayitli === 'true'
}

export default function App() {
  const [veri, setVeri] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenileniyor, setYenileniyor] = useState(false)
  const [hata, setHata] = useState(null)
  const [arama, setArama] = useState('')
  const [secilenKategori, setSecilenKategori] = useState('Tümü')
  const [geminiEtkin, setGeminiEtkin] = useState(depodanGeminiTercihiOku)

  useEffect(() => {
    okullariGetir()
      .then(setVeri)
      .catch((e) => setHata(e.message))
      .finally(() => setYukleniyor(false))
  }, [])

  useEffect(() => {
    localStorage.setItem(GEMINI_TERCIH_ANAHTARI, String(geminiEtkin))
  }, [geminiEtkin])

  async function handleYenile() {
    setYenileniyor(true)
    setHata(null)
    try {
      const guncel = await okullariYenile(geminiEtkin)
      setVeri(guncel)
    } catch (e) {
      setHata(e.message)
    } finally {
      setYenileniyor(false)
    }
  }

  const okullar = veri?.okullar || []

  const kategoriler = useMemo(
    () => [...new Set(okullar.map((o) => o.kategori))].sort((a, b) => a.localeCompare(b, 'tr')),
    [okullar],
  )

  const filtreliOkullar = useMemo(() => {
    return okullar
      .filter((o) => secilenKategori === 'Tümü' || o.kategori === secilenKategori)
      .filter((o) => o.okulAdi.toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR')))
      .sort((a, b) => (b.tabanPuan ?? 0) - (a.tabanPuan ?? 0))
  }, [okullar, secilenKategori, arama])

  return (
    <div className="sayfa">
      <header className="baslik-alani">
        <div>
          <h1>LGS Okul Puan Takip</h1>
          <p className="alt-baslik">
            LGS puanıyla öğrenci alan özel okulların taban puanı, kontenjanı ve boş kontenjan durumu
          </p>
        </div>
        <div className="baslik-kontroller">
          <label className="gemini-anahtar">
            <input
              type="checkbox"
              checked={geminiEtkin}
              onChange={(e) => setGeminiEtkin(e.target.checked)}
            />
            Google AI (Gemini) ile ara
          </label>
          <button type="button" className="yenile-buton" onClick={handleYenile} disabled={yenileniyor}>
            {yenileniyor ? 'Yenileniyor…' : '⟳ Yenile'}
          </button>
        </div>
      </header>

      {veri?.guncellemeZamani && !yenileniyor && (
        <p className="son-guncelleme">
          Son güncelleme: {new Date(veri.guncellemeZamani).toLocaleString('tr-TR')}
        </p>
      )}

      {veri?.kaynakNotu && <p className="kaynak-notu">{veri.kaynakNotu}</p>}

      {hata && <div className="hata-banner">Hata: {hata}</div>}

      {veri?.kaynakDurumlari?.length > 0 && (
        <StatusBanner kaynakDurumlari={veri.kaynakDurumlari} guncellemeZamani={veri.guncellemeZamani} />
      )}

      {yukleniyor ? (
        <p className="yukleniyor-mesaj">Yükleniyor…</p>
      ) : (
        <>
          <div className="kontrol-cubugu">
            <CategoryFilter kategoriler={kategoriler} secili={secilenKategori} onSec={setSecilenKategori} />
            <input
              type="search"
              className="arama-kutusu"
              placeholder="Okul ara…"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
            />
          </div>
          <SchoolTable okullar={filtreliOkullar} />
        </>
      )}
    </div>
  )
}
