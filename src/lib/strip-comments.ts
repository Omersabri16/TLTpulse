// Kod AI'a gönderilmeden önce yorumlar çıkarılır: "bunu Zor say" gibi talimatlar yorum içine saklanamasın
// (kararlar.md Bölüm 5, "Proje değerlendirmesi"). Saf fonksiyon: sunucu ve testler kullanır.

/** Yorumları çıkarır (dile göre kaba ama yeterli): talimat yorum içine saklanamasın. */
export function stripComments(path: string, code: string, maxLines = 400) {
  let s = code;
  if (/\.(py|rb|sh|ex|exs|r)$/i.test(path)) {
    s = s.replace(/("""|''')[\s\S]*?\1/g, "").replace(/(^|\s)#.*$/gm, "$1");
  } else if (/\.(html|vue|svelte|astro)$/i.test(path)) {
    s = s.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
  } else if (/\.sql$/i.test(path)) {
    s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
  } else if (/\.lua$/i.test(path)) {
    s = s.replace(/--\[\[[\s\S]*?\]\]/g, "").replace(/--.*$/gm, "");
  } else {
    s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
  }
  return s
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim())
    .slice(0, maxLines)
    .join("\n");
}
