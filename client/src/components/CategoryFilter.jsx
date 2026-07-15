export default function CategoryFilter({ kategoriler, secili, onSec }) {
  return (
    <div className="kategori-filtre" role="tablist" aria-label="Kategori filtresi">
      {['Tümü', ...kategoriler].map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={secili === k}
          className={`kategori-sekme${secili === k ? ' aktif' : ''}`}
          onClick={() => onSec(k)}
        >
          {k}
        </button>
      ))}
    </div>
  )
}
