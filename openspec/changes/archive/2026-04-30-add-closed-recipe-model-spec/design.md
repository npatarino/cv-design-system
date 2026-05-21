## Context

`@chimi/design-system` está organizado en cuatro capas de tokens (primitives → semantic → recipes → utilities). La capa **recipes** es la única que el código de productos consume hoy: las 5 webs aplicativas (`@chimi/blog`, `@chimi/techconf`, `@chimi/recall-for-papers`, `@chimi/simple-pdf-converter`, `@chimi/simple-scrum-poker`) y los slides de `@chimi/talks` se migraron en los changes `migrate-webs-to-recipes` y los PRs previos. La capa semantic queda como capa interna del DS, usada únicamente para los overrides `data-theme="light"` que aún no se migraron a recipes (deuda explícita tracked como `recipes-light-theme-support`).

Las recipes son **closed combinations** de cinco roles (surface, ink, em, accent, warn) que cubren los casos editoriales del producto. Hoy hay 7 recipes definidas en `tokens/color.recipe.json`. La elección de mantener una lista cerrada (vs. permitir que cada componente o cada web invente la suya) es lo que hace el sistema legible: una persona que llega a un slide o a un layout sabe que `data-recipe="canvas-quiet"` es la misma cosa que en un slide de talks o en una página del blog.

El contrato actual ya está implementado y verificado en producción:
- `data-recipe="<id>"` se pone en `<body>` en webs Astro (via la prop `recipe` del layout `Base.astro`) y en `<section class="slide">` en talks.
- Las CSS rules `:where([data-recipe="<id>"]) { --recipe-surface: ...; --recipe-ink: ...; --recipe-em: ...; --recipe-accent: ...; --recipe-warn: ...; }` están emitidas por el build de tokens en `dist/tokens.css`.
- `web.css` y los layouts de talks consumen `var(--recipe-*)` para todo el chrome.
- El default global cuando un `<body>` no declara `data-recipe`: el selector `:root:not([data-recipe])` en `web.css` aplica los valores de `canvas-quiet` (zero regression vs. el estado pre-recipes).
- El linter `check-recipes.mjs` scanea `packages/{web}/src` y `packages/talks/decks` reportando consumos directos de `--chimi-color-*`. Hoy reporta 0 errores y 1 warning conocido (la deuda de `EventRow.astro` light-theme block).

Esta spec **no introduce comportamiento nuevo**. Captura el contrato shippeado para que cuando alguien (humano o IA) abra el repo en seis meses, encuentre la regla escrita en lugar de inferirla del código.

**Stakeholders**:
- Owner del DS: necesita el contrato escrito como base para futuros changes (ej. `recipes-light-theme-support`, `extend-recipe-catalog` si alguna vez se justifica).
- Implementadores que migran nuevas webs o features: la spec evita re-litigar la regla "no inventar".
- Linter `check-recipes.mjs`: la spec lo legitima como guard rail oficial (no como artefacto interno opcional).

## Goals / Non-Goals

**Goals:**

- Codificar la lista cerrada de 7 recipes con sus combinaciones exactas de roles.
- Codificar el atributo `data-recipe` como único punto de declaración (con la jerarquía: `<body>` para webs, `<section class="slide">` para slides; un wrapper interno con su propio `data-recipe` se permite sólo como excepción).
- Codificar el contrato de consumo: layouts y componentes leen `var(--recipe-*)`, no `var(--chimi-color-*)` directo.
- Codificar el comportamiento bicara de `critical`: como recipe completa (bg plasma) y como modifiers `.critical-fg-<role>` que overridean un rol de la recipe portadora con `plasma` (`stat`, `quote`, `eyebrow`, `marker`, `display-word`).
- Codificar la regla del 1 para `energy-loud` (max 1 instancia por viewport / página / slide).
- Codificar la regla "no inventar": cuando un caso no encaja, marcar `// FIXME(recipes): <motivo>` y elegir la más cercana.
- Codificar el linter `check-recipes.mjs` como guard rail oficial.

**Non-Goals:**

- No proponer cambios al catálogo de recipes (siguen siendo las 7 actuales).
- No diseñar `recipes-light-theme-support` (es un change separado en el roadmap).
- No tocar el pipeline de tokens (Style Dictionary, formato de output) — eso vive como README en `packages/design-system/`.
- No tocar la capa semantic (sigue activa como capa interna mientras dure la deuda de light-theme).
- No prescribir cómo deciden los layouts qué recipe usar (la heurística "qué recipe le toca a esta página" vive en `migrate-webs-to-recipes/proposal.md` §5; esta spec sólo dice "cualquiera de las 7, no una nueva").

## Decisions

### D1 · Cerrar la lista en 7 recipes

**Decisión**: la spec lista las 7 recipes (`canvas-quiet`, `canvas-signal`, `paper`, `paper`, `energy-loud`, `cool-fresh`, `critical`) y declara el catálogo cerrado. Cualquier nueva recipe requiere un change OpenSpec que modifique esta spec con justificación + migración.

**Por qué cerrar la lista**:

- Una recipe es un *vocabulario* compartido entre slides y webs. Si cada feature inventa la suya, perdemos el contrato de "sé qué pinta tiene un `canvas-quiet` sin abrir el archivo".
- 7 recipes cubren todos los casos editoriales que tuvimos en 2 años de evolución (long-form, dashboards, quotes, FAQ, anuncios, lanzamientos, errores). El último gap real (paleta de divergencia en scrum-poker) acabó marcado como `FIXME(recipes)` con la decisión consciente de no agregar una 8ª — la divergencia es bicolor (cool↔warm) y forzaría primitives directos como escape hatch, no una recipe nueva.
- Bajar la barrera ("agregá una recipe nueva si la necesitás") tiene un coste que no es sólo de complejidad: cada recipe nueva multiplica la matriz de testing (¿se ve OK en mobile? ¿en light-theme cuando exista? ¿con `critical-fg-stat` encima?).

**Alternativas consideradas**:

- *Open recipes (cualquiera puede agregar la suya)*: lo que tendríamos si no escribimos esta spec. Riesgo: drift sin techo.
- *2 recipes (canvas + paper)*: insuficiente para los casos `energy-loud` (CTAs cromáticos) y `critical` (errores).
- *15 recipes con todos los acentos cromáticos*: ya lo tuvimos en una iteración temprana antes de cerrar el catálogo; era inmanejable y nadie sabía cuál usar.

### D2 · `data-recipe` en `<body>` (webs) y en `<section class="slide">` (talks)

**Decisión**: una sola declaración por página (web) o por slide (talks). Un wrapper interno con su propio `data-recipe` se permite sólo como excepción documentada (no es la regla — el cascading natural a través de un nuevo `data-recipe` re-resuelve los `--recipe-*` para los descendientes).

**Por qué `<body>` y no `<html>` (webs)**:

- `<html>` ya carga `data-theme` (cubierto por `theming`). Compartir el mismo elemento entre theme y recipe acopla dos contratos ortogonales y dificulta debug.
- `<body>` es el primer container con `width: 100%` y los CSS rules ya cascadean naturalmente desde ahí.
- En Astro, `<body>` lo emite el layout `Base.astro` — punto único donde setear el atributo via prop.

**Por qué `<section class="slide">` y no `<body>` en talks**:

- Cada deck contiene N slides (50-80) y cada slide quiere su propia recipe (cover puede ser `cool-fresh`, body slides `canvas-quiet`, una slide de cierre `critical`). Poner `data-recipe` en `<body>` forzaría una recipe por deck, no por slide.
- `<section class="slide">` es el container natural por slide; ya tiene atributos como `data-recipe` heredados de los layouts njk.

**Alternativas consideradas**:

- *`<html data-recipe>` para todo*: descartado — acopla theme y recipe.
- *`<main data-recipe>` para webs*: equivalente funcional a `<body>`, pero `<main>` es un landmark a11y y queremos mantenerlo neutro (no asumir que la página tiene un sólo `<main>`).

### D3 · Contrato de consumo: `--recipe-*` ✓, `--chimi-color-*` ✗

**Decisión**: layouts y componentes consumen `var(--recipe-{surface,ink,em,accent,warn})`. **No** consumen `var(--chimi-color-*)` directo, **excepto** como escapes hatch a `primitives` para artefactos con paleta local fija (ej. logos duotone, avatares con paleta hardcoded), documentados con un comentario.

**Por qué prohibir `--chimi-color-*` directo**:

- Si un layout consume `--chimi-color-accent-primary` (patagonia), pierde la propiedad de cambiar de pinta cuando se aplica una recipe distinta a su contenedor. Patagonia se vuelve una elección hardcoded en lugar de "el accent de la recipe activa".
- Permitir consumo directo socava el modelo entero: hace impredecible qué pinta tiene un componente reusable cuando se monta debajo de un `data-recipe` distinto.

**Por qué permitir escapes hatch a `primitives.color`**:

- Un logo duotone (ej. el avatar de "sobre-mi" en blog) tiene una paleta local fija que no debe cambiar bajo distintas recipes. Forzarlo a usar `--recipe-*` rompe la identidad gráfica del logo.
- El escape hatch está en `primitives` (`--chimi-primitives-color-plasma-base`, `--chimi-primitives-color-ivory-base`), no en `semantic` (`--chimi-color-accent-primary`). La distinción es importante: primitives son raw brand values; semantic son design roles. Saltarse semantic está bien (eso es lo que hacen las recipes); saltarse primitives no tiene sentido.
- El escape hatch debe estar comentado: `/* primitive escape hatch — duotone logo */`.

**Alternativas consideradas**:

- *Sin escape hatch*: forza a que cada artefacto consuma recipes, rompe casos legítimos como logos.
- *Escape hatch a `semantic`*: equivalente a no tener regla — el linter no podría distinguir consumo legítimo de drift.

### D4 · `critical` es bicara (recipe + modifiers)

**Decisión**: `critical` puede usarse de dos formas:

- **Como recipe** (bg full plasma): `data-recipe="critical"` en una página/slide entera. Uso restringido a errores críticos, disclaimers fuerte, error pages. Regla del 1: máximo 1-2 instancias por deck.
- **Como modifier** (`.critical-fg-<role>`): clases que sobre una recipe portadora (`canvas-quiet`, `paper`, etc.) overridean un único rol con `plasma`. Roles disponibles: `stat`, `quote`, `eyebrow`, `marker`, `display-word`. Regla: máximo 1 modifier por slide/página (un numeral O una quote O un eyebrow, no los tres).

**Por qué bicara**:

- A veces querés un canvas entero plasma (página de error 500). Eso es la recipe completa.
- A veces querés UN elemento plasma sobre un canvas neutral (un numeral en un dashboard que destaca como "critical"). Eso es el modifier. Forzar siempre la recipe entera convertiría toda página con un dato crítico en una página plasma, lo cual rompería la jerarquía.

**Por qué no permitir critical-fg sobre `energy-loud`, `cool-fresh`, `critical`**:

- `energy-loud` (lemon) y `cool-fresh` (patagonia) ya tienen high chroma. Plasma sobre cualquiera de los dos vibra (color clash) y pierde legibilidad.
- `critical` sobre `critical` es ridículo (plasma sobre plasma).

**Alternativas consideradas**:

- *Una sola forma (recipe completa)*: rompe casos como "número rojo en dashboard verde".
- *Modifier expandido a más roles (background, ink)*: invertiría el balance — plasma como bg ya es la recipe entera; plasma como ink quita legibilidad.

### D5 · Regla del 1 para `energy-loud`

**Decisión**: `data-recipe="energy-loud"` o cualquier `--recipe-*` resuelto a la paleta `energy-loud` puede aparecer **máximo una vez** por viewport en webs y por slide en talks.

**Por qué la regla del 1**:

- `energy-loud` es bg lemon. Es deslumbrante por diseño. Dos energy-loud uno al lado del otro pierden el contraste visual que los hace funcionar como CTA — se cancelan mutuamente.
- La regla viene de las pruebas iniciales del slide deck: dos slides energy-loud seguidos producen efecto "neón saturado", el público desconecta.

**Cómo se enforce**:

- No hay regla técnica (CSS no puede contar instancias). Es una regla de revisión humana, documentada en la spec y en `packages/design-system/docs/recipes.md`.
- El linter NO chequea esto — no es un check determinístico (puede haber legítimamente dos energy-loud en una página larga, en distintos viewports).

**Alternativas consideradas**:

- *Sin regla*: histórico — produjo páginas con 4 CTAs en lemon, ilegibles.
- *Hard-enforce en CSS via `:nth-of-type` o counters*: complejo, frágil, no cubre dos componentes hermanos en distintos contenedores.

### D6 · Linter `check-recipes.mjs` como guard rail

**Decisión**: el linter ya existe en `packages/design-system/scripts/check-recipes.mjs`, scanea las webs aplicativas y `packages/talks/`, reporta consumos directos de `--chimi-color-*`. Esta spec lo legitima como **guard rail oficial** (corre en cada build, debe estar verde — el único warning aceptado es la deuda de light-theme tracked en `recipes-light-theme-support`).

**Por qué linter en build, no test unitario**:

- El consumo de tokens vive en CSS, no en código JS testeable. Un test unitario tendría que parsear CSS — es lo que el linter ya hace.
- Build-time es el momento natural: si alguien introduce drift, lo descubre antes de mergear, no en CI separado.

**Alternativas consideradas**:

- *Test unitario en cada web*: dispersa la lógica del linter, dificulta evolución.
- *Pre-commit hook*: requiere setup local de cada contributor, no escalable.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Alguien presenta un caso legítimo que no encaja en las 7 (ej. una nueva web con colorimetría distinta) | La regla "no inventar" es una *política*, no una *prohibición*. Si pasa, se abre un change `extend-recipe-catalog` que modifica esta spec con justificación + migración. La spec no impide evolución; impide drift accidental. |
| El linter reporta falsos positivos en código legítimo (ej. un logo duotone) | El escape hatch a `primitives` está documentado en D3. El linter scanea `--chimi-color-*` (semantic) — no `--chimi-primitives-color-*`. Los falsos positivos serían sobre semantic, que es lo que queremos prohibir. |
| Light-theme rompe la propiedad "recipes son single-source" (porque hoy light se renderea via semantic, no recipes) | Tracked como deuda en `recipes-light-theme-support`. Esta spec no resuelve light-theme; lo declara explícitamente fuera de scope y deja la puerta abierta a que un change posterior añada `$extensions.chimi.theme.light` a cada recipe. |
| La regla del 1 para `energy-loud` no es enforciable automáticamente | Reconocido como trade-off (D5). Vale la pena tener la regla escrita aunque sea humana, porque reglas escritas se enseñan en code review. La alternativa (sin regla) ya falló históricamente. |
| El catálogo cerrado bloquea innovación visual | Mitigation: tres salidas. (a) escape hatch a primitives para artefactos locales con paleta fija. (b) `critical-fg-<role>` modifiers para énfasis sobre cualquier recipe portadora. (c) un change `extend-recipe-catalog` formal cuando los anteriores no alcancen. |
