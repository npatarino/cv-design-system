# Recipes

> **Canonical contract**: the closed catalog lives in [`tokens/color.recipe.json`](../tokens/color.recipe.json) (six recipes). The original OpenSpec change that introduced the model is archived at `openspec/changes/archive/2026-04-30-add-closed-recipe-model-spec/`; it still lists seven recipes because it predates the merge of the two paper variants into `paper`. This page is the field guide; if it ever drifts from the tokens, the tokens win and this page must be updated to match.

Canonical reference for the **recipe model** that drives Chimi colors and typography across slides and webs. Recipes are the **only consumed color layer**: the primitives (`tokens/color.primitive.json`) exist below them as raw values, but no surface (slide template, Astro page, brand book) reads them directly except through the documented escape hatches. (There used to be a semantic color layer between the two; it was removed in 2026-05, see [theming.md](theming.md).) Non-color foundations (spacing, radius, motion, z-index, borders, line measure) live in `tokens/foundation.semantic.json` as `--chimi-space-*`, `--chimi-radius-*`, etc.

A recipe is a **closed combination** of five base color roles, three derived color roles and a typography whitelist. Each surface declares one recipe — slide frontmatter (`recipe: canvas-quiet`) or `<body data-recipe="canvas-quiet">` for webs — and the build emits a `:where([data-recipe="<id>"])` block that populates the short CSS variables (`--recipe-{surface,ink,em,accent,warn}`, `--recipe-accent-text`, `--recipe-on-accent` and `--status-{ok,bad,caution}`); surface CSS only ever consumes those.

> **One surface, one recipe.** The rest derives.

---

## The color roles

Every recipe defines five base roles. Anything outside them is "no pintita extra."

| Role | What it does |
|---|---|
| `surface` | Dominant background color. |
| `ink` | Primary text color. |
| `em` | Italic argumentativo — the accent color for `<em>`. |
| `accent` | The brand accent as a **fill or stroke**: primary button fill, active underline, borders, KPI numerals at display size. |
| `warn` | Outliers, anti-patterns, contradiction. |

Plus three derived roles, so that text never has to guess whether a base role is legible. Each one is ≥4.5:1 where it is meant to be read (checked by `test/contrast.test.mjs`):

| Role | CSS variable | Use it for | Not for |
|---|---|---|---|
| `accent-text` | `--recipe-accent-text` | The accent **as text on the surface**: eyebrows, links, active nav, hover color of links and outline buttons, focus ring. | Fills (use `accent`). |
| `on-accent` | `--recipe-on-accent` | Text and icons **on an accent fill**: the primary button label, the skip link. Also valid on the hover/active fills (`--accent-fill-hover`, `--accent-fill-active`). | Text on the surface. |
| `status-ok` / `status-bad` / `status-caution` | `--status-ok`, `--status-bad`, `--status-caution` | State text on the surface: form errors (`.field-error`, invalid field border), success and warning messages. On the three campaign surfaces (`energy-loud`, `cool-fresh`, `critical`) all three are charcoal, so the state must also be said in words. | Decorative color, backgrounds. |

`accent` and `accent-text` are the same color where the accent already reads as text (canvas recipes in both themes); they differ where it does not (`paper` slides, `cool-fresh`, `critical`, `energy-loud`). When in doubt: fill → `accent`, text → `accent-text`.

---

## The five typography roles

Every recipe also maps the five core font families to semantic roles. Components should consume the role that matches their **intent**.

| Role | Design Intent | Typical Mapping |
|---|---|---|
| `font-display` | Headlines, big concepts, covers. | `display` (CHANEY) or `editorial` (Scilla) |
| `font-body` | Long-form reading, paragraphs. | `body` (At Aero) |
| `font-editorial` | Quotes, testimonials, reflexions. | `editorial` (Scilla) |
| `font-data` | Numbers, KPIs, technical figures. | `data` (Thunder) |
| `font-code` | Monospaced snippets, metadata. | `code` (Nudica Mono) |

> **Primary/Secondary aliases**: For convenience, recipes also define `font-primary` and `font-secondary` as the "main voice" and "secondary voice" of the mode. For example, in `canvas-quiet` (reading mode), primary is `body`; in `canvas-signal` (data mode), primary is `data`.

---

## The six recipes

### 01 · `canvas-quiet`

> DEFAULT EDITORIAL · BLOG, ARTICLES, DOCS

| Role | Hex | Name |
|---|---|---|
| surface | `#1C1C1C` | charcoal |
| ink | `#FAFAF8` | ivory |
| em | `#F9D71C` | lemon |
| accent | `#02B5B9` | patagonia |
| warn | `#A64132` | red |

**Mood**: lectura larga, editorial. La receta que *no se nota*.

✓ Body extenso, blogs, articles · slides que abren un deck denso · nav y header de [chimi.pro](http://chimi.pro)
✗ Marketing pieces (usar `energy-loud`) · stats heroicas (usar `canvas-signal`)

### 02 · `canvas-signal`

> STATS, KPI WALLS, DASHBOARDS

Misma paleta que `canvas-quiet` en los dos temas (lemon como `em` en oscuro, red en claro). Lo que cambia es el énfasis tipográfico: Thunder como fuente primaria y protagonista.

✓ Slides big-stat · KPI grid · stat cards · dashboards
✗ Body extenso (la lemon cansa) · charlas/talks de ideas (es para datos)

### 03 · `paper`

> EDITORIAL CLARO · QUOTES, LONG-FORM, TESTIMONIALS

| Role | Hex | Name |
|---|---|---|
| surface | `#FAFAF8` | ivory |
| ink | `#1C1C1C` | charcoal |
| em | `#02B5B9` | patagonia |
| accent | `#1C1C1C` | charcoal |
| warn | `#A64132` | red |

**On webs** `web.css` remaps the three accent roles of `paper` to patagonia deep (`#017275`): `accent` and `accent-text` = `#017275`, `on-accent` = ivory. Slides keep the charcoal accent of the token.

**In the dark theme**, a page whose recipe is `paper` turns charcoal: ivory ink, patagonia base for `em`, `accent` and `accent-text`, charcoal `on-accent`. The editorial type stays. A nested `paper` block (`.recipe-scope`) and slides stay ivory. See [theming.md](./theming.md).

**Mood**: calidez sin saturación. Soporta doble énfasis: **patagonia** (vía `em`) para tono reflexivo/técnico y **red** (vía `warn` o `<i>` en web) para tono cálido/emocional. Accent colapsa en charcoal porque ivory no admite patagonia/lemon como CTA sin pelearse.

✓ Slides quote, prompts · testimonials · resource-cards · FAQ informativo · tickets, flyers print
✗ UI de producto (ivory agota a 60min) · stats grandes (sin contraste para Thunder)

### 04 · `energy-loud`

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

### 05 · `cool-fresh`

> FEATURE LAUNCHES, OPEN BETAS, DIVIDERS

| Role | Hex | Name |
|---|---|---|
| surface | `#02B5B9` | patagonia |
| ink | `#1C1C1C` | charcoal |
| em | `#FAFAF8` | ivory |
| accent | `#FAFAF8` | ivory |
| warn | `#F9D71C` | lemon |

El em es ivory (no lemon) porque la cool ya tiene cromaticidad — sumar lemon como italic la rompe. `accent` (ivory) y `warn` (lemon) son colores de forma y de palabra display, no de texto: el texto de acento es `accent-text` (charcoal) y el texto sobre un relleno de acento es `on-accent` (charcoal).

✓ Slide-divider entre bloques · banners de feature
✗ Lectura larga · junto a `paper` (chocan en saturación)

### 06 · `critical` (bicara)

> CRISIS, DENUNCIA, DISCLAIMERS · USABLE COMO BG **Y** COMO FG

| Role | Hex | Name |
|---|---|---|
| surface | `#FF2079` | plasma |
| ink | `#FAFAF8` | ivory |
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

**Modo fg** — `critical` como rol dentro de otra recipe (canvas-quiet, canvas-signal o paper):
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
- No se permite sobre hosts `energy-loud`, `cool-fresh` o `critical` (lemon/patagonia/plasma + plasma vibran). Hoy no hay linter que lo bloquee: se revisa a mano (ver [Linter](#linter)).

---

## Contrast (WCAG 2.1)

Generated from the tokens and `web.css` by `CONTRAST_REPORT=1 bun test test/contrast.test.mjs` (values floored to two decimals). The test fails the build if a text role drops below 4.5:1 or the field outline below 3:1, so this table can only get better; regenerate it when a role changes. AA needs 4.5:1 for body text, 3:1 for large text (≥ 24 px, or ≥ 18.7 px bold) and for UI boundaries.

Text roles on the recipe surface (web values: `paper` already carries the patagonia remap; "dark" = no `data-theme`, "light" = `data-theme="light"`):

| Recipe · theme | ink | accent-text | on-accent / accent | on-accent / hover | on-accent / active | muted | muted-strong | status-ok | status-bad | status-caution |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `canvas-quiet` / `canvas-signal` · dark | 16.30 | 6.74 | 6.74 | 7.90 | 8.75 | 6.96 | 10.77 | 8.63 | 6.10 | 11.98 |
| `canvas-quiet` / `canvas-signal` · light | 16.30 | 5.48 | 5.48 | 6.94 | 8.03 | 5.03 | 6.58 | 6.07 | 5.86 | 5.78 |
| `paper` (page) · dark | 16.30 | 6.74 | 6.74 | 7.90 | 8.75 | 6.96 | 10.77 | 8.63 | 6.10 | 11.98 |
| `paper` · light, and nested `paper` | 16.30 | 5.48 | 5.48 | 6.94 | 8.03 | 5.03 | 6.58 | 6.07 | 5.86 | 5.78 |
| `energy-loud` · both | 11.98 | 11.98 | 11.98 | 9.00 | 7.17 | 5.03 | 7.17 | 11.98 | 11.98 | 11.98 |
| `cool-fresh` · both | 6.74 | 6.74 | 16.30 | 10.77 | 8.11 | 4.84 | 5.82 | 6.74 | 6.74 | 6.74 |
| `critical` · both | *3.50* | 4.65 | 16.30 | 8.70 | 5.74 | 4.65 | 4.65 | 4.65 | 4.65 | 4.65 |

Italic = the one documented exception: `critical.ink` (ivory on plasma) is 3.50:1, valid **only for large text**. The test holds it to the 3:1 large-text floor.

Non-text and decorative roles (no AA floor for the decorative ones; listed so nobody uses them as copy by accident):

| Recipe · theme | field-border / surface | field-border / field fill | em | accent | warn |
|---|---:|---:|---:|---:|---:|
| `canvas-quiet` / `canvas-signal` · dark | 3.68 | 3.50 | 11.98 | 6.74 | **2.77** |
| `canvas-quiet` / `canvas-signal` · light | 3.67 | 3.59 | 5.86 | 5.48 | 5.86 |
| `paper` (page) · dark | 5.60 | 5.14 | 6.74 | 6.74 | **2.77** |
| `paper` · light, and nested `paper` | 3.67 | 3.59 | **2.41** | 5.48 | 5.86 |
| `energy-loud` · dark / light | 5.03 | 4.75 / 4.84 | *4.31* | 11.98 | *4.31* |
| `cool-fresh` · dark / light | 4.84 | 4.48 / 4.59 | **2.41** | **2.41** | **1.77** |
| `critical` · dark / light | 4.65 | 4.81 / 4.75 | 4.65 | 4.65 | 4.65 |

Bold = below 3:1 (decoration only). Italic = large text only. What that means in practice:

- Text in the accent color is always `--recipe-accent-text`; text on an accent fill is always `--recipe-on-accent`. `--recipe-accent` is for fills and strokes.
- `warn` on charcoal is a stroke/marker color, never body text in dark mode.
- `paper` `em` (patagonia on ivory) is only for display-size italics (slides, ≥ 48 px). On webs use `--recipe-ink` or red for inline emphasis (`.prose em` keeps the ink).
- `cool-fresh` text is `ink` (charcoal). Ivory `em`/`accent` and lemon `warn` are for display words and shapes, not for copy.
- `critical` ink (ivory on plasma) is large-text only; keep disclaimers short and big. Secondary text on plasma (`--muted`, `--muted-strong`) is charcoal.
- `.critical-fg-*` on light surfaces (plasma on ivory, 3.50:1) is large-text only.
- `--muted` and `--muted-strong` clear 4.5:1 in every recipe and theme (light theme at 64 %; the campaign recipes pin their own mix). `--field-border` is the outline for form controls (`.input`), ≥3:1 against the surface and the field fill; `--hairline` / `--hairline-strong` (~1.2–1.4:1) are separators, never the only boundary of a control.

---

## Matriz de uso

| id | Surface | Mood | Trabajo | NO usar con |
|---|---|---|---|---|
| 01 · canvas-quiet | charcoal | Editorial neutral | Lectura larga, blog, docs | — |
| 02 · canvas-signal | charcoal | Datos numéricos | KPI, big-stat, dashboards | Long body |
| 03 · paper | ivory | Reflexivo | Quotes, tickets, prints, testimonios técnicos, FAQ | UI extensa |
| 04 · energy-loud | lemon | Anuncio directo | Posters, social marketing | Otra energy o critical |
| 05 · cool-fresh | patagonia | Cambio · señal | Dividers, lanzamientos | paper contiguo |
| 06 · critical | plasma | Crisis · denuncia | Disclaimers (bg) + numerales/quotes (fg) | Contiguo a energy-loud o cool-fresh |

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
.s-cover .kicker { color: var(--recipe-accent-text); font: var(--web-eyebrow); }
.s-cover h1 em  { color: var(--recipe-em); font-family: var(--recipe-font-editorial); }
```

Para opacidades/hairlines, componé con `color-mix`:

```css
.s-faq .qa { border-top: 2px solid color-mix(in srgb, var(--recipe-ink) 12%, transparent); }
```

Si necesitás un color específico fuera del recipe (un avatar charcoal local, un browser frame ivory), usá `--chimi-primitives-*` directo. Esos son escape hatches conscientes, aceptados en review.

---

## Excepciones nombradas

Tres patrones aparecen en múltiples templates y están documentados en [tokens/type.recipe.json](../tokens/type.recipe.json) bajo `_namedExceptions`:

| Excepción | Qué permite | Templates afectados |
|---|---|---|
| `allowMultipleAccents` | Los 4 roles del recipe usados a la vez como código visual | kpi-grid, chart-bar, chart-line, matrix, stack, three-ideas |
| `allowMultipleStats` | Más de un Thunder por slide | kpi-grid, comparison-table, chart-bar, chart-line, three-ideas |
| `allowDeckOverride` | El deck puede overridear `recipe:` en el frontmatter | closing-socials |

Estos tres patrones **no se enforzan** automáticamente (no hay linter de recetas desde la separación en repos). Si un template fuera de la whitelist usa los 4 roles, se ve en el diff de baselines de `cv-talks` o en review.

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

The monorepo had a recipe linter (`check-recipes.mjs`) that checked every slide template declared an existing `recipe:`, that `criticalFg` never sat on an `energy-loud` / `cool-fresh` / `critical` host, and that no web consumed `var(--chimi-color-{text,surface,accent,emphasis,marker}-*)` directly. It scanned the talks templates and the sibling webs' sources, so it was removed when the packages split into separate repos; the rules still apply and are enforced in review. `--chimi-color-recipe-*` (long form of `--recipe-*`) and `--chimi-primitives-color-*` (documented escape hatch) are allowed.

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

## Visual tests

The pre-migration baselines live in the `cv-talks` repo under `tests/snapshots/baseline/` (committed). The capture harness is documented in [`responsive.md`](responsive.md#mobile-usability-checklist); it writes the current state to `tests/snapshots/current/` (git-ignored) for diffing against the baselines.
