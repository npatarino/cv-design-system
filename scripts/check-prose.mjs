#!/usr/bin/env node
/**
 * check-prose: deterministic pass over written content for the tells of
 * template or machine prose, and for the brand's own writing rules. It is the
 * text sibling of check-slop (which looks at CSS and markup). The rules and
 * the reasons live in docs/prose.md; the voice they protect is the "Voz y
 * tono" chapter of the brand book.
 *
 * Usage:
 *   npx chimi-check-prose content              report only, always exits 0
 *   npx chimi-check-prose content --strict     exit 1 when an enforced rule is over its limit
 *   npx chimi-check-prose content --strict=all advisory rules fail the run too
 *   npx chimi-check-prose content dist/index.html --max rayas=3
 *   npx chimi-check-prose content --all        print every location (default: first 5 per rule)
 *   npx chimi-check-prose content --json       machine-readable report
 *
 * What it reads: `.md` / `.mdx` files (frontmatter, code, URLs, HTML comments
 * and blockquotes are skipped: a quote is someone else's voice) and `.html`
 * files (visible text inside <main>). Directories are walked.
 *
 * Exceptions: a line that carries `<!-- prose-ok -->`, or the line right after
 * a line that is only that comment, is not checked. In HTML, the content of an
 * element with a `data-prose-ok` attribute is not checked. Use them for quoted
 * counter-examples, not to silence a rule. A document that is about the rules
 * themselves can opt out whole with `<!-- prose-ok-file -->`.
 *
 * Enforced rules (fail under --strict): rayas, vocabulario, meta-anuncio,
 * anzuelo, borrador, emoji-icono.
 * Advisory rules (fail only under --strict=all; they need a human read):
 * contraste, cierre, anafora, triada, negritas, dos-puntos, muletillas,
 * apertura, secciones, tuteo.
 *
 * Programmatic use:
 *   import { checkProse } from "@chimichurricode/design-system/check-prose";
 *   const { rules, failed } = checkProse(["content"], { strict: true });
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * id → [label, limit, advisory, allowance per file, hint]
 * `allowance`: how many times a file may do it before the file is reported
 * (then every occurrence in that file is listed).
 */
export const RULES = {
  rayas: ["rayas (—) en la prosa", 0, false, 0, "dos frases o una coma"],
  vocabulario: ["palabras prohibidas de la marca", 0, false, 0, "lo que hiciste, con un dato real (lista en Foundations)"],
  "meta-anuncio": ["anuncia lo que va a contar", 0, false, 0, "arrancar directo con la historia"],
  anzuelo: ["pide interacción (engagement bait)", 0, false, 0, "cerrar con una decisión concreta para la semana"],
  borrador: ["restos de borrador o de chat", 0, false, 0, "enlace real, o borrar la línea"],
  "emoji-icono": ["emoji como viñeta o en un título", 0, false, 0, "al final de una frase, y solo en piezas informales"],
  contraste: ["contraste «no es X, es Y» repetido", 0, true, 2, "es un recurso propio: hasta dos por pieza"],
  cierre: ["cierre en una línea suelta", 0, true, 0, "que el final empuje una decisión, no que repita el dato"],
  anafora: ["tres o más frases seguidas que empiezan igual", 0, true, 0, "una frase que diga las tres cosas"],
  triada: ["enumeraciones de tres al final de la frase", 0, true, 3, "el elemento que importa, solo"],
  negritas: ["párrafos con más de una negrita", 0, true, 0, "una idea en negrita por párrafo"],
  "dos-puntos": ["dos puntos en la prosa", 0, true, 2, "punto y seguido; se permiten en títulos, horarios y código"],
  muletillas: ["frases de relleno", 0, true, 0, "borrarla: la frase suele sostenerse sola"],
  apertura: ["apertura que anuncia que viene algo interesante", 0, true, 0, "contar lo interesante"],
  secciones: ["títulos de sección de plantilla", 0, true, 0, "un título que diga qué hay debajo"],
  tuteo: ["tuteo peninsular", 0, true, 0, "voseo rioplatense en todo lo escrito"],
};

// A word boundary that understands accents (\b does not).
const w = (src, flags = "giu") => new RegExp(`(?<![\\p{L}\\p{N}])(?:${src})(?![\\p{L}\\p{N}])`, flags);

const PATTERNS = {
  rayas: /—| – /g,
  vocabulario: w(
    [
      "hacks", "tips", "trucos (?:para|de)", "sinergias?", "empoderar\\p{L}*", "empodera\\p{L}*",
      "desbloque(?:ar|á|a|es|en) (?:tu|su|el|todo)", "unlock", "(?:tu|su) (?:máximo |verdadero )?potencial",
      "(?:la |tu )?mejor versión(?: de (?:vos|ti|uno) mism[oa])?", "(?:agregar|aportar|añadir|generar) valor",
      "lo que nadie te (?:dice|cuenta)", "te lo cuento todo", "(?:el|un) método definitivo",
      "(?:los |sus )?secretos (?:de|para)", "levantate a las", "no excuses", "discipline > motivation", "apasionad[oa]s? (?:por|de) (?:la|el|los|las)",
      "equipos? (?:\\p{L}+ )?de alto rendimiento", "al siguiente nivel", "de clase mundial", "de vanguardia", "ecosistema tech",
    ].join("|"),
  ),
  "meta-anuncio": w(
    "en est[ea] (?:artículo|post|hilo|episodio|charla|newsletter|edición|guía) (?:voy|vamos|vas|veremos|verás|aprender\\p{L}+|te (?:voy|cuento|muestro)|exploraremos|descubrir\\p{L}+)|a continuación,? (?:te|vamos|veremos|voy)|hoy (?:te )?(?:quiero|vengo a) (?:hablar|contar)\\p{L}*",
  ),
  anzuelo: w(
    "(?:te|los|las) leo en (?:los )?comentarios|comentá (?:abajo|acá|y )|coment[aá] 👇|compart[ií] si te (?:sirvió|gustó)|guard[aá]lo para (?:después|más tarde)|¿(?:y vos,? )?qué opin[aá]s\\?|dale (?:like|me gusta)|seguime para más",
  ),
  borrador: /\]\(\s*#?\s*\)|\((?:link|enlace)[^)\n]{0,30}si aplica\)|lorem ipsum|\[(?:insertar|completar|pendiente|añadir|agregar)[^\]\n]*\]|(?<![\p{L}])(?:espero que (?:esto )?te (?:ayude|sirva|sea útil)|aquí tienes|como modelo de lenguaje|¡claro! (?:aquí|acá)|¿(?:querés|quieres) que (?:lo )?(?:ajuste|amplíe|profundice))|[a-z]-\.\.\.(?=[\s)"])/giu,
  muletillas: w(
    "cabe destacar|es importante (?:destacar|señalar|recordar|mencionar)|vale la pena (?:destacar|mencionar|señalar)|sin lugar a dudas|en definitiva|en conclusión|en resumen|en pocas palabras|en última instancia|a fin de cuentas|la realidad es que|lo cierto es que|no es casualidad|juega un papel (?:clave|crucial|fundamental)|en el (?:vertiginoso|cambiante|dinámico|competitivo) mundo|en la era (?:digital|de la)|hoy en día|en el mundo actual",
  ),
  apertura: w(
    "lo más (?:curioso|interesante|llamativo|sorprendente) (?:es|fue) que|hizo algo (?:distinto|diferente|inesperado)|algo completamente inesperado|hay algo que no siempre se dice|y acá viene lo (?:interesante|bueno|mejor)|pero (?:acá|aquí) viene (?:el|lo)|la historia tiene un giro|(?:déjame|dejame) (?:contarte|que te cuente)|pero hay (?:un giro|más)|esto lo cambia todo",
  ),
  tuteo: w(
    "tú|tienes|puedes|quieres|eres|sabes|haces|debes|necesitas|piensas|sientes|vosotr[oa]s|podéis|tenéis|sois|queréis|sabéis|oye|fíjate|mira,",
  ),
};
const MARKERS = /(?<![\p{L}])(?:TODO|FIXME|TBD|XXX)(?![\p{L}])/gu; // case-sensitive: "todo" is a Spanish word
const CONTRASTE = [
  w("no se trata (?:solo |sólo |tanto |únicamente )?de [^.;\\n]{2,90}?[,;.] ?(?:sino|se trata|es)"),
  w("no (?:es|son|era|fue|va|vino|busca|significa)(?: (?:solo|sólo))? [^.;:\\n]{2,90}?[.;:,] (?:es|son|era|fue|va|vino|busca|significa|sino)"),
  w("no (?:solo|sólo) [^.\\n]{2,90}?,? sino"),
];
const SECCIONES = /^(?:conclusi[oó]n(?:es)?|key takeaways|puntos clave|tesis central|reflexi[oó]n(?:es)? final(?:es)?|en resumen|ideas clave|para llevar|takeaways)$/iu;
const EMOJI_START = /^\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+)?(?:\*\*)?[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}✅❌➡]/u;
const EMOJI_HEADING = /^\s*#{1,6}\s.*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const PROSE_COLON = /[\p{L})?»”"']: +(?=\S)/gu;
const TRIADA = /(?<![\p{L}])(?<!, )\p{L}{3,}, \p{L}{3,} (?:y|e|o) \p{L}{3,}[.!?](?=\s|$)/gu;

const blank = (s) => s.replace(/[^\n]/g, " ");

/** Markdown → same-length text with everything that is not the author's prose blanked out. */
function prepareMarkdown(raw) {
  let t = raw;
  t = t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, blank); // frontmatter
  t = t.replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, blank); // fenced code
  t = t.replace(/`[^`\n]*`/g, blank); // inline code
  t = t.replace(/<!--[\s\S]*?-->/g, blank); // HTML comments (the prose-ok marker is read from the raw text)
  t = t.replace(/!\[\[[^\]\n]*\]\]/g, blank); // Obsidian embeds
  t = t.replace(/^[ \t]*>.*$/gm, blank); // blockquotes: someone else's words
  t = t.replace(/\]\(([^)\s]{2,})\)/g, (m, url) => (url === "#" ? m : `](${"~".repeat(url.length)})`)); // link targets, keep empty ones
  t = t.replace(/https?:\/\/[^\s)>\]]+/g, blank); // bare URLs
  t = t.replace(/<(?!!--)[^>\n]*>/g, blank); // inline HTML tags
  return t;
}

/** HTML → same-length text of what a person reads inside <main>, with light markdown markers. */
function prepareHtml(raw) {
  const pad = (m, s) => s.slice(0, m.length).padEnd(m.length, " "); // never change the length: offsets are locations
  let t = raw.replace(/<!--[\s\S]*?-->/g, blank).replace(/<(script|style|noscript|svg|pre|code|blockquote)\b[\s\S]*?<\/\1>/gi, blank);
  t = t.replace(/<(\w+)\b[^>]*\bdata-prose-ok\b[^>]*>[\s\S]*?<\/\1>/gi, blank);
  const start = Math.max(0, t.search(/<main\b/i));
  const end = t.search(/<\/main>/i);
  t = blank(t.slice(0, start)) + t.slice(start, end === -1 ? undefined : end) + blank(end === -1 ? "" : t.slice(end));
  t = t.replace(/<h[1-6]\b[^>]*>/gi, (m) => pad(m, "\n# "));
  t = t.replace(/<\/?(?:strong|b)>/gi, (m) => pad(m, "**"));
  t = t.replace(/<a\b[^>]*>/gi, (m) => pad(m, "[")).replace(/<\/a>/gi, "](x"); // link labels, as in markdown
  t = t.replace(/<\/(?:p|h[1-6]|li|div|section|article|figcaption|td|th|dd|dt)>|<br\s*\/?>/gi, (m) => pad(m, "\n\n"));
  t = t.replace(/<[^>]*>/g, blank);
  return t.replace(/&(?:nbsp|amp|quot|#39|lt|gt|ldquo|rdquo|laquo|raquo|hellip|mdash|ndash);/g, (m) =>
    pad(m, { "&mdash;": "—", "&ndash;": "–", "&laquo;": "«", "&raquo;": "»", "&quot;": '"', "&amp;": "&" }[m] ?? " "),
  );
}

function lineStarts(text) {
  const starts = [0];
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

/** Check one document. Returns { id: [{ line, col, excerpt }] }. */
export function checkText(raw, { html = false } = {}) {
  if (/<!--\s*prose-ok-file\s*-->/.test(raw)) return Object.fromEntries(Object.keys(RULES).map((id) => [id, []]));
  const text = html ? prepareHtml(raw) : prepareMarkdown(raw);
  const starts = lineStarts(raw);
  const rawLines = raw.split("\n");
  const lineOf = (index) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= index) lo = mid; else hi = mid - 1; }
    return lo;
  };
  const OK = /<!--\s*prose-ok\s*-->/;
  const skipped = (li) => OK.test(rawLines[li] ?? "") || /^\s*<!--\s*prose-ok\s*-->\s*$/.test(rawLines[li - 1] ?? "");

  const found = Object.fromEntries(Object.keys(RULES).map((id) => [id, []]));
  const add = (id, index, length = 0) => {
    const li = lineOf(index);
    if (skipped(li)) return;
    const col = index - starts[li] + 1;
    const before = text.slice(Math.max(0, index - 40), index).split("\n").pop();
    const after = text.slice(index, index + Math.max(length, 20) + 40).split("\n")[0];
    const excerpt = (before + after).replace(/\s+/g, " ").trim();
    found[id].push({ line: li + 1, col, excerpt: excerpt.slice(0, 140), index });
  };

  // Vocabulary and phrase rules.
  for (const [id, re] of Object.entries(PATTERNS)) for (const m of text.matchAll(re)) add(id, m.index, m[0].length);
  for (const m of text.matchAll(MARKERS)) add("borrador", m.index, m[0].length);
  // The dash that opens a line of dialogue is how Spanish writes dialogue, not an aside.
  // Nor are: the one that opens speech mid-paragraph («preguntó: – ¿Cuánto…?»), the
  // separator inside a link label («[Refactoring – Martin Fowler](…)») or a heading
  // («Sukaro — Términos»), and a range («2018 — 2020», «dic 2020 — presente»).
  found.rayas = found.rayas.filter((h) => {
    const from = text.lastIndexOf("\n", h.index - 1) + 1;
    const to = text.indexOf("\n", h.index);
    const line = text.slice(from, to === -1 ? undefined : to);
    const at = h.index - from + (text[h.index] === " " ? 1 : 0);
    const before = line.slice(0, at), after = line.slice(at + 1);
    if (/^\s*(?:[-*+]\s+)?[—–]/.test(line) || /^\s*#{1,6}\s/.test(line)) return false;
    if (/[.?!:…]["”»]?\s*$/.test(before)) return false;
    if (/\[[^\]]*$/.test(before) && /^[^\[]*\]\(/.test(after)) return false;
    return !(/(?:\d{4}|\d{1,2}|(?<![\p{L}])\p{L}{3,4}\.?)\s*$/u.test(before) && /^\s*(?:(?:\p{L}{3,4}\.? )?\d{4}|\d{1,2}(?!\d)|presente|hoy|actualidad|now|present)/iu.test(after));
  });
  // Contrast: the three shapes overlap, so a hit inside the previous one is the same contrast.
  const contrasts = CONTRASTE.flatMap((re) => [...text.matchAll(re)]).sort((a, b) => a.index - b.index);
  let end = -1;
  for (const m of contrasts) {
    if (m.index < end) continue;
    end = m.index + m[0].length;
    add("contraste", m.index, m[0].length);
  }

  // Line rules.
  const lines = text.split("\n");
  const tstarts = lineStarts(text); // the prepared text can break lines the raw file does not
  lines.forEach((line, i) => {
    const heading = line.match(/^\s*#{1,6}\s+(.*?)\s*#*\s*$/);
    if (EMOJI_START.test(line) || EMOJI_HEADING.test(line)) add("emoji-icono", tstarts[i] + line.search(/\S/));
    if (heading && SECCIONES.test(heading[1].replace(/[*_:]/g, "").trim())) add("secciones", tstarts[i] + line.indexOf(heading[1]));
    if (!heading) for (const m of line.matchAll(PROSE_COLON)) add("dos-puntos", tstarts[i] + m.index + 1, 1);
    for (const m of line.matchAll(TRIADA)) add("triada", tstarts[i] + m.index, m[0].length);
  });

  // Paragraph rules. A paragraph is a run of non-empty lines.
  const paragraphs = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const from = i;
    while (i + 1 < lines.length && lines[i + 1].trim()) i++;
    paragraphs.push({ index: tstarts[from], body: lines.slice(from, i + 1).join("\n") });
  }
  const isList = (p) => /^\s*(?:[-*+]|\d+\.)\s/.test(p.body);
  const isHeading = (p) => /^\s*#{1,6}\s/.test(p.body);
  for (const p of paragraphs) {
    if (isHeading(p)) continue;
    if (!isList(p) && (p.body.match(/\*\*[^*\n]+\*\*/g) || []).length > 1) add("negritas", p.index + p.body.indexOf("**"));
    // Anaphora: three sentences in a row opening with the same word.
    const sentences = [...p.body.matchAll(/(?:^|(?<=[.!?…]["»”)]?\s)|\n)\s*(?:[-*+]\s+|\d+\.\s+)?[¿¡"«“(*_]*(\p{L}{4,})/gu)];
    for (let i = 0, run = 1; i < sentences.length; i++) {
      const same = i > 0 && sentences[i][1].toLowerCase() === sentences[i - 1][1].toLowerCase();
      run = same ? run + 1 : 1;
      if (run === 3) add("anafora", p.index + sentences[i - 2].index + sentences[i - 2][0].search(/\p{L}/u), 30);
    }
  }
  // One-line closer: the last paragraph is a short stand-alone sentence.
  const words = (s) => (s.match(/[\p{L}\p{N}]+/gu) || []).length;
  const prose = paragraphs.filter((p) => !isHeading(p));
  const tail = prose[prose.length - 1];
  if (!html && tail && !isList(tail) && words(text) >= 150) {
    const n = words(tail.body);
    if (n >= 2 && n <= 9 && /[.!?…]["»”)*_]*\s*$/.test(tail.body) && !/\]\(/.test(tail.body)) add("cierre", tail.index + tail.body.search(/\S/), tail.body.length);
  }

  // Per-file allowance: under it, the file is clean for that rule.
  for (const [id, [, , , allowance]] of Object.entries(RULES)) {
    found[id] = found[id].length <= allowance ? [] : found[id].map(({ index, ...hit }) => hit);
  }
  return found;
}

const TEXT_EXT = new Set([".md", ".mdx", ".html", ".htm"]);
function collect(target, out = []) {
  if (statSync(target).isDirectory()) {
    for (const name of readdirSync(target)) {
      if (name.startsWith(".") || name === "node_modules" || name === "pagefind") continue;
      collect(join(target, name), out);
    }
  } else if (TEXT_EXT.has(extname(target).toLowerCase())) out.push(target);
  return out;
}

/**
 * @param {string | string[]} targets files or directories
 * @param {{ strict?: boolean | "all", max?: Record<string, number>, cwd?: string }} [opts]
 */
export function checkProse(targets, opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const files = [].concat(targets).flatMap((t) => collect(t));
  const hits = Object.fromEntries(Object.keys(RULES).map((id) => [id, []]));
  for (const file of files) {
    const found = checkText(readFileSync(file, "utf8"), { html: /\.html?$/i.test(file) });
    for (const [id, list] of Object.entries(found)) for (const h of list) hits[id].push({ file: relative(cwd, file), ...h });
  }
  const strict = opts.strict ?? false;
  const rules = Object.entries(RULES).map(([id, [label, limit, advisory, allowance, hint]]) => {
    const max = opts.max?.[id] ?? limit;
    const count = hits[id].length;
    const over = count > max;
    return { id, label, count, max, advisory, allowance, hint, over, fails: over && (strict === "all" || (strict === true && !advisory)), files: new Set(hits[id].map((h) => h.file)).size, locations: hits[id] };
  });
  return { rules, documents: files.length, warnings: rules.filter((r) => r.over).length, failed: rules.some((r) => r.fails) };
}

function main(argv) {
  const opts = { max: {} };
  const targets = [];
  let all = false, json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strict") opts.strict = true;
    else if (a === "--strict=all") opts.strict = "all";
    else if (a === "--all") all = true;
    else if (a === "--json") json = true;
    else if (a === "--max" || a.startsWith("--max=")) {
      const [id, n] = (a === "--max" ? argv[++i] ?? "" : a.slice(6)).split("=");
      if (!(id in RULES) || !/^\d+$/.test(n ?? "")) {
        console.error(`check-prose: --max espera regla=número. Reglas: ${Object.keys(RULES).join(", ")}`);
        return 2;
      }
      opts.max[id] = Number(n);
    } else if (a.startsWith("--")) {
      console.error(`check-prose: opción desconocida ${a}`);
      return 2;
    } else targets.push(a);
  }
  if (!targets.length) targets.push("content");

  let result;
  try {
    result = checkProse(targets, opts);
  } catch (err) {
    console.error(`check-prose: no se pudo leer ${targets.join(", ")} (${err.code ?? err.message})`);
    return 2;
  }
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return result.failed ? 1 : 0;
  }
  for (const r of result.rules) {
    const flag = r.fails ? "✗" : r.over ? "⚠" : "·";
    console.log(`${flag} ${r.id}: ${r.count}${r.over ? ` en ${r.files} ${r.files === 1 ? "archivo" : "archivos"} (límite ${r.max})` : ""} · ${r.label}${r.over ? `. En su lugar: ${r.hint}` : ""}`);
    if (!r.over) continue;
    const shown = all ? r.locations : r.locations.slice(0, 5);
    for (const l of shown) console.log(`    ${l.file}:${l.line}:${l.col}  ${l.excerpt}`);
    if (shown.length < r.locations.length) console.log(`    … y ${r.locations.length - shown.length} más (--all para verlas)`);
  }
  console.log(`check-prose: ${result.documents} documentos, ${result.warnings} avisos${opts.strict ? (result.failed ? ", falla" : ", pasa") : ""}`);
  return result.failed ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
