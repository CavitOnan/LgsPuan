import { useEffect, useMemo, useState } from 'react'
import { okullariGetir, okullariYenile } from './api'
import CategoryFilter from './components/CategoryFilter'
import SchoolTable from './components/SchoolTable'
import StatusBanner from './components/StatusBanner'

export default function App() {
  const [veri, setVeri] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [yenileniyor, setYenileniyor] = useState(false)
  const [hata, setHata] = useState(null)
  const [arama, setArama] = useState('')
  const [secilenKategori, setSecilenKategori] = useState('Tümü')

  useEffect(() => {
    okullariGetir()
      .then(setVeri)
      .catch((e) => setHata(e.message))
      .finally(() => setYukleniyor(false))
  }, [])

  async function handleYenile() {
    setYenileniyor(true)
    setHata(null)
    try {
      const guncel = await okullariYenile()
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
        <button type="button" className="yenile-buton" onClick={handleYenile} disabled={yenileniyor}>
          {yenileniyor ? 'Yenileniyor…' : '⟳ Yenile'}
        </button>
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
