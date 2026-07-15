export default function StatusBanner({ kaynakDurumlari, guncellemeZamani }) {
  if (!kaynakDurumlari || kaynakDurumlari.length === 0) return null

  const basarili = kaynakDurumlari.filter((k) => k.durum === 'basarili')
  const hatali = kaynakDurumlari.filter((k) => k.durum === 'hata')
  const atlanan = kaynakDurumlari.filter((k) => k.durum === 'atlandı')

  return (
    <div className={`durum-banner${hatali.length > 0 ? ' uyari' : ' basarili'}`}>
      <div className="durum-ozet">
        <strong>{basarili.length}</strong> kaynak güncellendi
        {hatali.length > 0 && (
          <>
            , <strong>{hatali.length}</strong> kaynağa ulaşılamadı (bu kaynaklara ait okullarda son bilinen veri
            gösteriliyor)
          </>
        )}
        {atlanan.length > 0 && (
          <>
            , <strong>{atlanan.length}</strong> kaynak yapılandırılmadığı için atlandı
          </>
        )}
        {guncellemeZamani && (
          <span className="durum-zaman">
            {' '}
            · Son deneme: {new Date(guncellemeZamani).toLocaleString('tr-TR')}
          </span>
        )}
      </div>
      {hatali.length > 0 && (
        <ul className="durum-hata-listesi">
          {hatali.map((h) => (
            <li key={h.id}>
              <a href={h.url} target="_blank" rel="noreferrer">
                {h.ad}
              </a>
              : {h.hata}
            </li>
          ))}
        </ul>
      )}
      {atlanan.length > 0 && (
        <ul className="durum-atlanan-listesi">
          {atlanan.map((a) => (
            <li key={a.id}>
              {a.ad}: {a.hata}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
