# Recipes

> **Canonical contract**: `openspec/specs/closed-recipe-model/spec.md`. This page is the field guide; the spec is the normative document. If they ever drift, the spec wins and this page must be updated to match.

Canonical reference for the **recipe model** that drives Chimi colors and typography across slides and webs. Recipes are the **only consumed layer** — primitives and semantic exist below them as raw values and design roles, but no surface (slide template, Astro page, brand book) reads them directly.

A recipe is a **closed combination** of five color roles + a typography whitelist. Each surface declares one recipe — slide frontmatter (`recipe: canvas-quiet`) or `<body data-recipe="canvas-quiet">` for webs — and the build emits a `:where([data-recipe="<id>"])` block that populates five short CSS variables (`--recipe-{surface,ink,em,accent,warn}`); surface CSS only ever consumes those.

> **One surface, one recipe.** The rest derives.

---

## The five roles

Every recipe defines exactly five roles. Anything outside them is "no pintita extra."

| Role | What it does |
|---|---|
| `surface` | Dominant background color. |
| `ink` | Primary text color. |
| `em` | Italic argumentativo — the accent color for `<em>`. |
| `accent` | CTAs, links, eyebrows, KPI numerals. |
| `warn` | Outliers, anti-patterns, contradiction. |

---

## The five typography roles

Every recipe also maps the five core font families to semantic roles. Components should consume the role that matches their **intent**.

| Role | Design Intent | Typical Mapping |
24: |---|---|---|
25: | `font-display` | Headlines, big concepts, covers. | `display` (CHANEY) or `editorial` (Scilla) |
26: | `font-body` | Long-form reading, paragraphs. | `body` (At Aero) |
27: | `font-editorial` | Quotes, testimonials, reflexions. | `editorial` (Scilla) |
28: | `font-data` | Numbers, KPIs, technical figures. | `data` (Thunder) |
29: | `font-code` | Monospaced snippets, metadata. | `code` (JetBrains Mono) |
30: 
31: > **Primary/Secondary aliases**: For convenience, recipes also define `font-primary` and `font-secondary` as the "main voice" and "secondary voice" of the mode. For example, in `canvas-quiet` (reading mode), primary is `body`; in `canvas-signal` (data mode), primary is `data`.
32: 
33: ---
34: 
35: ## The seven recipes

### 01 · `canvas-quiet`

> DEFAULT EDITORIAL · BLOG, ARTICLES, DOCS

| Role | Hex | Name |
|---|---|---|
| surface | `#1C1C1C` | charcoal |
| ink | `#F5EFE0` | ivory |
| em | `#F9D71C` | lemon |
| accent | `#02B5B9` | patagonia |
| warn | `#A64132` | red |

**Mood**: lectura larga, editorial. La receta que *no se nota*.

✓ Body extenso, blogs, articles · slides que abren un deck denso · nav y header de [chimi.pro](http://chimi.pro)
✗ Marketing pieces (usar `energy-loud`) · stats heroicas (usar `canvas-signal`)

### 02 · `canvas-signal`

> STATS, KPI WALLS, DASHBOARDS

Misma paleta que `canvas-quiet`. Lo que cambia es el énfasis tipográfico — Thunder en `em` (lemon) como protagonista.

✓ Slides big-stat · KPI grid · stat cards · dashboards
✗ Body extenso (la lemon cansa) · charlas/talks de ideas (es para datos)

### 03 · `paper`

> EDITORIAL CLARO · QUOTES, LONG-FORM, TESTIMONIALS

| Role | Hex | Name |
|---|---|---|
| surface | `#F5EFE0` | ivory |
| ink | `#1C1C1C` | charcoal |
| em | `#02B5B9` | patagonia |
| accent | `#1C1C1C` | charcoal |
| warn | `#A64132` | red |

**Mood**: calidez sin saturación. Soporta doble énfasis: **patagonia** (vía `em`) para tono reflexivo/técnico y **red** (vía `warn` o `<i>` en web) para tono cálido/emocional. Accent colapsa en charcoal porque ivory no admite patagonia/lemon como CTA sin pelearse.

✓ Slides quote, prompts · testimonials · resource-cards · FAQ informativo · tickets, flyers print
✗ UI de producto (ivory agota a 60min) · stats grandes (sin contraste para Thunder)

### 05 · `energy-loud`

> ANUNCIOS, AFICHES, CTAS DE EVENTO

| Role | Hex | Name |
|---|---|---|
| surface | `#F9D71C` | lemon |
| ink | `#1C1C1C` | charcoal |
| em | `#A64132` | red |
| accent | `#1C1C1C` | charcoal |
| warn | `#A64132` | red |

**Regla del 1**: solo *una* `energy-loud` por página, slide o feed-row.

✓ Posters, IG stat-posts · slides cover de techconf
✗ Body de blog · junto a otra `energy-loud` o `critical`

### 06 · `cool-fresh`

> FEATURE LAUNCHES, OPEN BETAS, DIVIDERS

| Role | Hex | Name |
|---|---|---|
| surface | `#02B5B9` | patagonia |
| ink | `#1C1C1C` | charcoal |
| em | `#F5EFE0` | ivory |
| accent | `#F9D71C` | lemon |
| warn | `#1C1C1C` | charcoal |

El em es ivory (no lemon) porque la cool ya tiene cromaticidad — sumar lemon como italic la rompe.

✓ Slide-divider entre bloques · banners de feature
✗ Lectura larga · junto a `paper` (chocan en saturación)

### 07 · `critical` (bicara)

> CRISIS, DENUNCIA, DISCLAIMERS · USABLE COMO BG **Y** COMO FG

| Role | Hex | Name |
|---|---|---|
| surface | `#FF2079` | plasma |
| ink | `#F5EFE0` | ivory |
| em | `#1C1C1C` | charcoal |
| accent | `#1C1C1C` | charcoal |
| warn | `#1C1C1C` | charcoal |

Es la única recipe **bicara**: vive como bg (slide entera plasma) o como fg (numeral / quote / marker plasma sobre otra recipe portadora).

**Modo bg** — surface plasma + ink ivory + em charcoal:
- ✓ Disclaimer slides (1–2 por deck max)
- ✓ Banner "esto es beta / esto duele"
- ✓ `big-concept-disclaimer`
- ✗ Marketing (usar `energy-loud`)
- ✗ Slides contiguas a `energy-loud` o `cool-fresh` (saturaciones que pelean)

**Modo fg** — `critical` como rol dentro de otra recipe (canvas-quiet/signal, paper/cool):
Aplicá una clase `critical-fg-<role>` al root del slide. La clase overridea `--recipe-em` (o `--recipe-warn` para `marker`) a plasma.

| Role | Override | Templates de ejemplo |
|---|---|---|
| `critical-fg-stat` | `--recipe-em` → plasma | `17-big-stat-critical` |
| `critical-fg-quote` | `--recipe-em` → plasma | `13-quote-critical` |
| `critical-fg-marker` | `--recipe-warn` → plasma | `27-big-list-critical` |
| `critical-fg-eyebrow` | `--recipe-em` → plasma | (disponible) |
| `critical-fg-display-word` | `--recipe-em` → plasma | (disponible) |

**Reglas del fg**:
- Máximo 1 critical-fg por slide (numeral *o* quote *o* eyebrow, no los tres).
- No se permite sobre hosts `energy-loud`, `cool-fresh` o `critical` (lemon/patagonia/plasma + plasma vibran). El [linter](#linter) bloquea esto.

---

## Matriz de uso

| id | Surface | Mood | Trabajo | NO usar con |
|---|---|---|---|---|
| 01 · canvas-quiet | charcoal | Editorial neutral | Lectura larga, blog, docs | — |
| 02 · canvas-signal | charcoal | Datos numéricos | KPI, big-stat, dashboards | Long body |
| 03 · paper | ivory | Reflexivo cálido | Quotes, tickets, prints | UI extensa, paper contiguo |
| 04 · paper | ivory | Reflexivo con peso | Testimonios técnicos, team, FAQ | UI extensa, paper contiguo |
| 05 · energy-loud | lemon | Anuncio directo | Posters, social marketing | Otra energy o critical |
| 06 · cool-fresh | patagonia | Cambio · señal | Dividers, lanzamientos | paper contiguo |
| 07 · critical | plasma | Crisis · denuncia | Disclaimers (bg) + numerales/quotes (fg) | Contiguo a energy-loud o cool-fresh |

---

## Cómo declarar una recipe

En el frontmatter del `.md`:

```yaml
---
template: cover
recipe: canvas-quiet
order: 1
label: "Cover · default"
fields:
  ...
---
```

Para usar critical como fg sobre otra recipe:

```yaml
---
template: big-stat
recipe: canvas-signal
criticalFg: stat
order: 42
label: "Big-stat · critical"
fields:
  ...
---
```

El partial `.njk` lee `recipe` y `criticalFg` y aplica `data-recipe="..."` y `class="critical-fg-..."` al `<section>` raíz.

---

## Cómo consumir una recipe en CSS

Solo `--recipe-*`. Nunca `--chimi-color-*` directo desde un slide.

```css
section.slide.s-cover {
  background: var(--recipe-surface);
  color: var(--recipe-ink);
}
.s-cover h1 {
  font-family: var(--recipe-font-display);
  font-weight: var(--recipe-weight-display);
}
.s-cover .kicker { color: var(--recipe-accent); font: var(--web-eyebrow); }
.s-cover h1 em  { color: var(--recipe-em); font-family: var(--recipe-font-editorial); }
```

Para opacidades/hairlines, componé con `color-mix`:

```css
.s-faq .qa { border-top: 2px solid color-mix(in srgb, var(--recipe-ink) 12%, transparent); }
```

Si necesitás un color específico fuera del recipe (un avatar charcoal local, un browser frame ivory), usá `--chimi-primitives-*` directo. Esos son escape hatches conscientes — el linter los acepta.

---

## Excepciones nombradas

Tres patrones aparecen en múltiples templates y están documentados en [tokens/type.recipe.json](../tokens/type.recipe.json) bajo `_namedExceptions`:

| Excepción | Qué permite | Templates afectados |
|---|---|---|
| `allowMultipleAccents` | Los 4 roles del recipe usados a la vez como código visual | kpi-grid, chart-bar, chart-line, matrix, stack, three-ideas |
| `allowMultipleStats` | Más de un Thunder por slide | kpi-grid, comparison-table, chart-bar, chart-line, three-ideas |
| `allowDeckOverride` | El deck puede overridear `recipe:` en el frontmatter | closing-socials |

Estos tres patrones **no se enforzan** en el linter actual — se reportan al final de cada corrida como informativo. Si un template fuera de la whitelist usa los 4 roles, lo vamos a ver visualmente en el diff de baselines.

---

## Mapeo template → recipe

40 templates consecutivos, agrupados por familia:

| # | Template | Recipe | Notas |
|---|---|---|---|
| 01 | cover-default | canvas-quiet | |
| 02 | speaker-bio-default | canvas-quiet | gradient eliminado |
| 03 | agenda-default | paper | |
| 04 | big-concept-default | energy-loud | |
| 05 | big-concept-divider | cool-fresh | |
| 06 | big-concept-transition | canvas-quiet | italic editorial |
| 07 | big-concept-prompt | paper | era surface red |
| 08 | big-concept-disclaimer | critical (bg) | |
| 09 | quote-default | paper | |
| 10 | quote-xl | paper | era charcoal+ivory+em-lemon |
| 11 | quote-testimonial | paper | era patagonia surface |
| 12 | quote-punch | canvas-quiet | highlight em |
| 13 | quote-critical | canvas-quiet + `critical-fg-quote` | em plasma |
| 14 | social-embed-default | canvas-quiet | post = artifact |
| 15 | big-stat-default | canvas-signal | |
| 16 | big-stat-multiplier | canvas-signal | |
| 17 | big-stat-critical | canvas-signal + `critical-fg-stat` | numeral plasma |
| 18 | kpi-grid-default | canvas-signal | `allowMultipleAccents`+`Stats` |
| 19 | chart-bar | canvas-signal | `allowMultipleAccents`+`Stats` |
| 20 | chart-line | canvas-signal | `allowMultipleAccents`+`Stats` |
| 21 | comparison-table-default | canvas-signal | `allowMultipleStats` |
| 22 | three-ideas-default | canvas-signal | `allowMultipleAccents`+`Stats` |
| 23 | big-list-numeric | canvas-quiet | era surface lemon |
| 24 | big-list-bullets | canvas-quiet | |
| 25 | big-list-checklist | canvas-quiet | boxes ✓/✗ a escala big |
| 26 | big-list-glossary | canvas-quiet | grid 2-col término + definición |
| 27 | big-list-critical | canvas-quiet + `critical-fg-marker` | bullets plasma |
| 28 | concept-shift-default | canvas-quiet | old=warn, new=accent |
| 29 | matrix-default | canvas-quiet | `allowMultipleAccents` |
| 30 | code-block-default | canvas-quiet | syntax highlight escapa |
| 31 | code-block-anti | canvas-quiet | warn-marked |
| 32 | stack-default | canvas-quiet | `allowMultipleAccents` |
| 33 | demo-default | canvas-quiet | browser = artifact |
| 34 | roadmap-default | canvas-quiet | |
| 35 | roadmap-timeline | canvas-quiet | |
| 36 | resource-cards-default | paper | |
| 37 | resource-cards-team | paper | avatars duotone |
| 38 | faq-default | paper | |
| 39 | closing-qr-default | paper | |
| 40 | closing-socials-default | canvas-quiet | `allowDeckOverride` |

---

## Linter

```bash
npm run check:recipes
```

Valida:
1. Cada `.md` de slide declara un `recipe:` que existe.
2. Si declara `criticalFg`, el host no es `energy-loud` / `cool-fresh` / `critical`.
3. Escanea las 6 webs (`packages/{blog,techconf,recall-for-papers,simple-pdf-converter,simple-scrum-poker,simple-json-diff}/src`) y reporta cualquier `var(--chimi-color-{text,surface,accent,emphasis,marker}-*)` directo como **error** (ya no como warning — el carve-out de `EventRow.astro` se cerró cuando recipes asumió el theme story; ver `recipes-light-theme-support` archive 2026-05-05). El namespace `--chimi-color-recipe-*` (long-form de `--recipe-*`) y `--chimi-primitives-color-*` (escape hatch documentado) NO se reportan.

Está cableado al `prebuild` de cada web vía `npm --workspace @chimi/design-system run check:recipes -- --web <name>`, así que cualquier deploy de Vercel falla si una web introduce un leak.

---

## Brand assets

Las marcas también son tokens — viven una sola vez y se consumen por nombre. **No se redibujan inline.**

| Asset | Cómo invocarlo | Source |
|---|---|---|
| Mate (glyph solo) | `<BrandMark />` (Astro) · `CCLogo.mark()` (vanilla JS) | [`components/BrandMark.astro`](../components/BrandMark.astro) · [`assets/logos/logo-character.svg`](../assets/logos/logo-character.svg) |
| Wordmark horizontal (mate + CODE®) | `<BrandLogoWordmark />` · `CCLogo.wordmark()` | [`components/BrandLogoWordmark.astro`](../components/BrandLogoWordmark.astro) |
| Sello circular (medallón) | `<BrandLogoCircle />` | [`components/BrandLogoCircle.astro`](../components/BrandLogoCircle.astro) |
| Favicon (mate en squircle) | `<BrandFavicon />` · `CCLogo.favicon()` | [`components/BrandFavicon.astro`](../components/BrandFavicon.astro) |

**Regla del mate**: cualquier representación visual del mate usa `BrandMark` / `CCLogo.mark()` o el SVG de `logo-character.svg` directo. Está prohibido inventar un mate con `<path>` ad-hoc — el linter visual no lo va a cazar, pero el review humano sí. Si necesitás una variante (mate+steam, mate+bombilla, mate+termo), agregala como prop o extension al componente, no como dibujo nuevo.

Color: los componentes son single-color (`fill="currentColor"`) salvo `BrandFavicon` y `BrandLogoCircle` que aceptan dos colores (disco + mark, ring + mark). El wrapper define el color via `color: var(--recipe-em)` o equivalente — el mate hereda y respeta la receta del host.

---

## Tests visuales

Las baselines pre-migration viven en [`packages/talks/tests/snapshots/baseline/`](../../talks/tests/snapshots/baseline/) (commiteadas). Para regenerar el estado actual:

```bash
npm --workspace @chimi/talks run snapshot:current
```

Eso escribe a `packages/talks/tests/snapshots/current/` (gitignored). Comparar manualmente o con un diff tool.
