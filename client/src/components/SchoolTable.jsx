function BosKontenjanRozeti({ deger }) {
  if (deger === null || deger === undefined) {
    return <span className="rozet rozet-bilinmiyor">Bilinmiyor</span>
  }
  if (deger === 0) {
    return <span className="rozet rozet-dolu">Kontenjan doldu</span>
  }
  return <span className="rozet rozet-bos">{deger} boş yer</span>
}

export default function SchoolTable({ okullar }) {
  if (okullar.length === 0) {
    return <p className="bos-mesaj">Bu filtreyle eşleşen okul bulunamadı.</p>
  }

  return (
    <div className="tablo-sarmalayici">
      <table className="okul-tablosu">
        <thead>
          <tr>
            <th>Okul</th>
            <th>Kategori</th>
            <th>Grup</th>
            <th>Taban Puan</th>
            <th>Toplam Kontenjan</th>
            <th>Boş Kontenjan</th>
            <th>Kayıt Aşaması</th>
            <th>Kaynak</th>
          </tr>
        </thead>
        <tbody>
          {okullar.map((o) => (
            <tr key={o.id}>
              <td className="okul-adi-hucre">{o.okulAdi}</td>
              <td>
                <span className="rozet rozet-kategori">{o.kategori}</span>
              </td>
              <td>{o.grup}</td>
              <td className="sayi-hucre">{o.tabanPuan ?? '-'}</td>
              <td className="sayi-hucre">{o.toplamKontenjan ?? '-'}</td>
              <td>
                <BosKontenjanRozeti deger={o.bosKontenjan} />
              </td>
              <td>{o.kayitAsamasi || '-'}</td>
              <td>
                {o.kaynakUrl ? (
                  <a href={o.kaynakUrl} target="_blank" rel="noreferrer">
                    Kaynak
                  </a>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
