import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkProse, checkText, RULES } from "../scripts/check-prose.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "../scripts/check-prose.mjs");
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
function site(files) {
  const dir = mkdtempSync(join(tmpdir(), "prose-"));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return dir;
}
const count = (text, id, opts) => checkText(text, opts)[id].length;
const total = (text, opts) => Object.values(checkText(text, opts)).flat().length;

describe("checkText: enforced rules", () => {
  test("clean voseo prose has no findings", () => {
    expect(total("Arranqué tarde. No seguí mi propio consejo, y mirá que soy re pesado con esto.\n\nEsta semana, ponele fecha a esa tarea.")).toBe(0);
  });
  test("rayas: asides count, dialogue dashes and code do not", () => {
    expect(count("Todo lo demás — calendario, formato — se decide después.", "rayas")).toBe(2);
    expect(count("— Hola, viejo.\n— Hola.", "rayas")).toBe(0);
    expect(count("– Mmmm, a quien intentó dártelo – respondió uno.\n\nLe miró y preguntó: – ¿Cuánto hace? – ¿Afilar? No tengo tiempo.", "rayas")).toBe(0);
    expect(count("- [Refactoring – Martin Fowler](https://example.com/r)\n- Refactoring – Martin Fowler", "rayas")).toBe(1);
    expect(count("## Sukaro — Términos\n\nsep 2021 — jun 2026, dic 2020 — presente, 2007 — 2011, ene — may 2009.", "rayas")).toBe(0);
    expect(count("Lo hicimos en 2020 — y salió bien.", "rayas")).toBe(1);
    expect(count("Usá `a — b` en el código.\n\n```\nx — y\n```", "rayas")).toBe(0);
  });
  test("vocabulario: brand banned words, with accents and without partial matches", () => {
    expect(count("Cinco tips para desbloquear tu potencial y ser tu mejor versión.", "vocabulario")).toBe(3);
    expect(count("Era uno de sus trucos habituales. Participé en un hackathon. Un equipo empoderado.", "vocabulario")).toBe(1);
    expect(count("Soy apasionado por la tecnología de vanguardia.", "vocabulario")).toBe(2);
    expect(count("Un equipo de alto rendimiento. Un equipo remoto de alto rendimiento. Navegación de alto rendimiento.", "vocabulario")).toBe(2);
  });
  test("meta-anuncio and anzuelo", () => {
    expect(count("En este artículo vamos a ver cómo medir impacto.", "meta-anuncio")).toBe(1);
    expect(count("¿Y vos qué opinás? Te leo en comentarios.", "anzuelo")).toBe(2);
  });
  test("borrador: empty links, placeholders and chat residue; real links and the word «todo» are fine", () => {
    expect(count("[Charla en Droidcon](#) (link interno si aplica)", "borrador")).toBe(2);
    expect(count("TODO: revisar. Espero que esto te ayude.", "borrador")).toBe(2);
    expect(count("Lo hice todo. [La charla](https://example.com/charla) está acá. [Otra](/charlas/x).", "borrador")).toBe(0);
  });
  test("emoji-icono: bullets and headings, not the end of a sentence", () => {
    expect(count("## 👣 Liderazgo\n\n- ✅ Hecho\n\nQué lindo día 😁.", "emoji-icono")).toBe(2);
  });
});

describe("checkText: advisory rules", () => {
  const pad = " Relleno.".repeat(160);
  test("contraste: two per piece are the author's own move, the third reports all", () => {
    const one = "Ser padre no es imponer, es guiar.";
    expect(count(`${one}\n\nNo se trata de velocidad, sino de intención.`, "contraste")).toBe(0);
    expect(count(`${one}\n\nNo se trata de velocidad, sino de intención.\n\nTesting no es una etapa. Es una forma de pensar.`, "contraste")).toBe(3);
  });
  test("cierre: a short stand-alone last line in a long piece", () => {
    expect(count(`Una historia larga.${pad}\n\nUn rey ejecutó a un río.`, "cierre")).toBe(1);
    expect(count(`Una historia larga.${pad}\n\nEsta semana, pedile a alguien feedback sobre lo que más te cuesta escuchar, una sola persona.`, "cierre")).toBe(0);
    expect(count("Corto.\n\nUn rey ejecutó a un río.", "cierre")).toBe(0);
  });
  test("anafora: three sentences in a row opening with the same word", () => {
    expect(count("Porque alguien tiene que abrir. Porque alguien tiene que sostener. Porque alguien tiene que cerrar.", "anafora")).toBe(1);
    expect(count("Porque sí. Entonces fui. Porque quería.", "anafora")).toBe(0);
  });
  test("negritas: more than one per paragraph, lists aside", () => {
    expect(count("Podés **mover la fecha** o **recortar el alcance**.", "negritas")).toBe(1);
    expect(count("Podés **mover la fecha** o recortar.\n\n- **Uno** va\n- **Dos** va", "negritas")).toBe(0);
  });
  test("dos-puntos: two are allowed per piece, headings do not count", () => {
    expect(count("## Episodio 3: producto\n\nLa idea es simple: medir. Y otra: decidir.", "dos-puntos")).toBe(0);
    expect(count("Uno: a. Dos: b. Tres: c. Son las 10:30.", "dos-puntos")).toBe(3);
  });
  test("muletillas, apertura, secciones and tuteo", () => {
    expect(count("Cabe destacar que hoy en día todo cambia.", "muletillas")).toBe(2);
    expect(count("Lo más curioso es que funcionó.", "apertura")).toBe(1);
    expect(count("## Conclusión\n\nTexto.\n\n## Qué haría distinto\n\nTexto.", "secciones")).toBe(1);
    expect(count("Si quieres crecer, tú puedes. Si querés crecer, vos podés con tu equipo.", "tuteo")).toBe(3);
  });
  test("triada: more than three enumerations of three in one piece", () => {
    const t = "Con intención, frecuencia y confianza.";
    expect(count(`${t} ${t} ${t}`, "triada")).toBe(0);
    expect(count(`${t} ${t} ${t} ${t}`, "triada")).toBe(4);
    expect(count("Define propósito, audiencia, voz, símbolo, límites y gobernanza. ".repeat(5), "triada")).toBe(0);
  });
});

describe("checkText: what is not the author's prose", () => {
  test("frontmatter, blockquotes, comments and URLs are skipped", () => {
    const md = '---\ntitle: "Tips — y hacks"\n---\n\n> Cinco tips — dijo alguien.\n\n<!-- TODO(nico): tips -->\n\nMirá https://example.com/tips-y-hacks y [esto](https://example.com/sinergia).';
    expect(total(md)).toBe(0);
  });
  test("prose-ok on the line, or alone on the line before, skips that line only", () => {
    expect(count("Cinco tips. <!-- prose-ok -->\n\nOtros tips.", "vocabulario")).toBe(1);
    expect(count("<!-- prose-ok -->\nCinco tips.\nOtros tips.", "vocabulario")).toBe(1);
  });
  test("prose-ok-file opts a whole document out", () => {
    expect(total("<!-- prose-ok-file -->\n\nCinco tips — y hacks. Te leo en comentarios.")).toBe(0);
  });
  test("locations are 1-based and point into the original file", () => {
    const [hit] = checkText("---\nt: x\n---\n\nHola.\nCinco tips para vos.").vocabulario;
    expect(hit).toMatchObject({ line: 6, col: 7 });
    expect(hit.excerpt).toBe("Cinco tips para vos.");
  });
});

describe("checkText: HTML", () => {
  const page = (main) => `<!doctype html><html><head><title>Tips</title><style>a{}</style></head><body><header>tips</header>\n<main>${main}</main>\n<footer>hacks</footer></body></html>`;
  test("reads only <main>, with entities, bold and headings", () => {
    const r = checkText(page("<h2>Conclusi&oacute;n</h2><h2>Conclusión</h2><p>Todo lo dem&aacute;s &mdash; calendario &mdash; va. <strong>Uno</strong> y <b>dos</b>.</p>"), { html: true });
    expect(r.rayas.length).toBe(2);
    expect(r.negritas.length).toBe(1);
    expect(r.secciones.length).toBe(1);
    expect(r.vocabulario.length).toBe(0);
  });
  test("dialogue, link labels and headings keep their dashes in HTML too", () => {
    const r = checkText(page('<h1>Sukaro — Términos</h1><p>— ¿Pero papá, no escuchás la radio?</p><ul><li><a href="/x">Refactoring – Martin Fowler</a></li></ul><p>Bien — o casi.</p>'), { html: true });
    expect(r.rayas.length).toBe(1);
  });
  test("data-prose-ok skips an element; locations survive the rewrite", () => {
    const html = page('<p>Bien.</p>\n<td data-prose-ok>tips, hacks, trucos de</td>\n<p>Cinco tips.</p>');
    const r = checkText(html, { html: true });
    expect(r.vocabulario.length).toBe(1);
    expect(r.vocabulario[0].line).toBe(4);
    expect(html.split("\n")[3].slice(r.vocabulario[0].col - 1).startsWith("tips.")).toBe(true);
  });
});

describe("checkProse and the CLI", () => {
  const bad = () => site({ "content/posts/a.md": "Cinco tips para vos.", "content/b.mdx": "Hola.", "content/skip.txt": "tips", "content/node_modules/x.md": "tips" });
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

  test("runs when npm invokes it through the node_modules/.bin symlink", () => {
    const dir = mkdtempSync(join(tmpdir(), "chimi-bin-"));
    const link = join(dir, "chimi-check-prose");
    symlinkSync(SCRIPT, link);
    const r = spawnSync(process.execPath, [link, join(dir, "missing")], { encoding: "utf8" });
    rmSync(dir, { recursive: true, force: true });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("check-prose");
  });

  test("walks directories for .md, .mdx and .html", () => {
    const dir = bad();
    const r = checkProse(dir, { cwd: dir });
    expect(r.documents).toBe(2);
    expect(r.rules.find((x) => x.id === "vocabulario").locations[0].file).toBe(join("content", "posts", "a.md"));
  });
  test("strict fails on enforced rules only; strict=all on advisory ones; max raises a limit", () => {
    const enforced = bad();
    expect(checkProse(enforced).failed).toBe(false);
    expect(checkProse(enforced, { strict: true }).failed).toBe(true);
    expect(checkProse(enforced, { strict: true, max: { vocabulario: 1 } }).failed).toBe(false);
    const advisory = site({ "a.md": "Lo más curioso es que funcionó." });
    expect(checkProse(advisory, { strict: true }).failed).toBe(false);
    expect(checkProse(advisory, { strict: "all" }).failed).toBe(true);
  });
  test("every rule has a label, a limit and a hint", () => {
    for (const [, [label, limit, advisory, allowance, hint]] of Object.entries(RULES)) {
      expect(typeof label).toBe("string");
      expect(limit).toBeGreaterThanOrEqual(0);
      expect(typeof advisory).toBe("boolean");
      expect(allowance).toBeGreaterThanOrEqual(0);
      expect(hint.length).toBeGreaterThan(0);
    }
  });
  test("CLI: reports with locations, exit codes 0 / 1 / 2, --json", () => {
    const dir = bad();
    const plain = run(dir);
    expect(plain.status).toBe(0);
    expect(plain.stdout).toContain("a.md:1:7  Cinco tips para vos.");
    expect(run(dir, "--strict").status).toBe(1);
    expect(run(dir, "--strict", "--max", "vocabulario=1").status).toBe(0);
    expect(JSON.parse(run(dir, "--json").stdout).rules.find((x) => x.id === "vocabulario").count).toBe(1);
    expect(run(dir, "--max", "nope=1").status).toBe(2);
    expect(run(join(tmpdir(), "prose-does-not-exist")).status).toBe(2);
  });
});
