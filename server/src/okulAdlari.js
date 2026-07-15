// Bilinen okullar için haber metinlerinde geçebilecek isim varyasyonları.
// Serbest metin içindeki "boş kontenjan" / "kontenjanı doldu" gibi ifadeleri
// doğru okul + gruba (kız/erkek/karma) eşlemek için kullanılır. Türkçe ekler
// (Robert Kolejinin, Avusturya Lisesinin gibi) boşluksuz eklendiğinden, eşleme
// tam okul adı geçtikten sonraki ~280 karakterlik pencerede yapılır; grup ayrımı
// olan okullarda pencere içinde "kız"/"erkek" kelimesi de aranır.
export const OKUL_ALIASLARI = [
  {
    id: "robert-kolej-kiz",
    ad: "Robert Kolej",
    kategori: "Amerikan",
    grup: "Kız",
    aliaslar: ["Robert Kolej", "Robert Koleji", "Amerikan Robert Lisesi"]
  },
  {
    id: "robert-kolej-erkek",
    ad: "Robert Kolej",
    kategori: "Amerikan",
    grup: "Erkek",
    aliaslar: ["Robert Kolej", "Robert Koleji", "Amerikan Robert Lisesi"]
  },
  {
    id: "uskudar-amerikan-kiz",
    ad: "Üsküdar Amerikan Lisesi",
    kategori: "Amerikan",
    grup: "Kız",
    aliaslar: ["Üsküdar Amerikan"]
  },
  {
    id: "uskudar-amerikan-erkek",
    ad: "Üsküdar Amerikan Lisesi",
    kategori: "Amerikan",
    grup: "Erkek",
    aliaslar: ["Üsküdar Amerikan"]
  },
  {
    id: "alman-lisesi",
    ad: "Alman Lisesi (İstanbul Erkek Lisesi)",
    kategori: "Alman",
    grup: "Karma",
    aliaslar: ["Alman Lisesi", "İstanbul Erkek Lisesi"]
  },
  {
    id: "sankt-georg-avusturya",
    ad: "Sankt Georg Avusturya Lisesi",
    kategori: "Avusturya",
    grup: "Karma",
    aliaslar: ["Avusturya Lisesi", "Sankt Georg", "St. Georg"]
  },
  {
    id: "italyan-lisesi",
    ad: "İtalyan Lisesi (Liceo Italiano)",
    kategori: "İtalyan",
    grup: "Karma",
    aliaslar: ["İtalyan Lisesi", "Liceo Italiano"]
  },
  {
    id: "saint-joseph-fransiz",
    ad: "Saint Joseph Fransız Lisesi",
    kategori: "Fransız",
    grup: "Karma",
    // "Sajev" tek başına belirsiz: hem bu okulun mezunlar vakfının adı hem de
    // vakfın işlettiği ayrı bir okul olan "Küçük Prens"in duyurularında geçiyor.
    // Bu yüzden burada sadece Saint Joseph'e özgü, daha isabetli kalıplar var.
    aliaslar: ["Saint Joseph", "Sen Jozef", "Sajev Saint Joseph", "Sajev Lisesi"]
  },
  {
    id: "kucuk-prens",
    ad: "Özel Küçük Prens Lisesi (Sajev)",
    kategori: "Fransız",
    grup: "Karma",
    aliaslar: ["Küçük Prens", "Sajev Küçük Prens"]
  },
  {
    id: "saint-benoit-fransiz",
    ad: "Saint Benoit Fransız Lisesi",
    kategori: "Fransız",
    grup: "Karma",
    aliaslar: ["Saint Benoit", "Sen Benua"]
  },
  {
    id: "sainte-pulcherie-fransiz",
    ad: "Sainte Pulcherie Fransız Lisesi",
    kategori: "Fransız",
    grup: "Karma",
    aliaslar: ["Sainte Pulcherie", "Sen Pulceri"]
  },
  {
    id: "notre-dame-sion-fransiz",
    ad: "Notre Dame de Sion Fransız Lisesi",
    kategori: "Fransız",
    grup: "Karma",
    aliaslar: ["Notre Dame de Sion"]
  },
  {
    id: "saint-michel-fransiz",
    ad: "Saint Michel Fransız Lisesi",
    kategori: "Fransız",
    grup: "Karma",
    aliaslar: ["Saint Michel", "Sen Mişel"]
  }
];
