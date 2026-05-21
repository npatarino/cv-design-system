## Why

`@chimi/design-system` exporta tres piezas de chrome compartido que cosen las webs del ecosistema entre sí: el catálogo `ECOSYSTEM_SITES` (5 entradas: blog, techconf, recall-for-papers, simple-pdf-converter, simple-scrum-poker), el componente `SiteHeader` (brand mark + nav + theme toggle + socials) y el componente `SiteFooter` (variantes `rich` y `minimal`, con sección "Chimiverse" derivada del catálogo). Estas tres piezas son load-bearing para tres garantías cross-web:

1. Cada visitante puede saltar de un producto a los otros 4 desde cualquier footer, sin perder contexto.
2. Las cinco webs muestran la misma topbar/footer reconocibles como "Chimi", lo que hace al ecosistema *parecer* un ecosistema.
3. El theme toggle (cubierto por la spec `theme-toggle`) está físicamente *montado dentro de* `SiteHeader` y `SiteFooter`. Si esos contenedores cambian de contrato, `theme-toggle` rompe.

A pesar de eso, el contrato no está escrito en ningún spec: `cross-web-seo` lo *menciona* (los 5 vs los 7 sites de SEO) sin definirlo. Si alguien hoy renombra `ECOSYSTEM_SITES`, mueve el catálogo a otro paquete, o cambia el shape de `EcosystemSite`, no hay regla que lo bloquee. Esta spec captura el contrato shippeado y lo blinda.

Hay además una sutileza importante: el catálogo de UI ecosystem-chrome tiene **5 sitios** (las webs aplicativas), mientras que el catálogo de SEO `SEO_SITE_CATALOG` (covered by `cross-web-seo`) tiene **7 sitios** (los 5 + `talks` + `brand`). La spec aclara explícitamente esa distinción para evitar que alguien intente colapsarlos en uno solo (talks y brand no son destinos productivos del switcher; son una doc tool y un brand book respectivamente).

## What Changes

- **NEW capability** `ecosystem-chrome` que define:
  - **`ECOSYSTEM_SITES`**: catálogo cerrado de 5 entradas (id, name, url, description) con id estable como source-of-truth para `SiteFooter` y para el filtrado `ecosystemLinksExcluding(currentId)`.
  - Distinción explícita con `SEO_SITE_CATALOG` (7 sitios, covered por `cross-web-seo`): los 2 sitios extra (talks, brand) **no** aparecen en chrome porque no son destinos productivos para el visitante final.
  - **`SiteHeader`**: contrato del componente — props (`brand`, `links`, `socials`, `mobileMenu`, `themeToggle`), comportamiento del brand link (siempre apunta al home del sitio actual, soporta logo dual-theme via `logoSrc.{light,dark}` o texto con `emText`), comportamiento de la nav móvil (overlay a 100% width con hamburger + `aria-expanded`), submenús (hover en desktop ≥`--lg`, click+`aria-expanded` en mobile), tap target del hamburger ≥44×44, theme toggle integrado siempre que `themeToggle !== false`.
  - **`SiteFooter`**: dos variantes — `minimal` (default; meta inline + sección Chimiverse opcional + powered-by-byline) y `rich` (grid de columnas + brand-col con socials + Chimiverse strip horizontal + copyright). Ambas variantes consumen `ECOSYSTEM_SITES` via `ecosystemLinksExcluding(siteId)` cuando el consumer pasa `siteId` y `showEcosystem !== false`.
  - **Filtrado de auto-referencia**: cuando `siteId` está presente, el switcher omite la entrada del sitio actual (no muestra "Chimichurri Code" en el footer del propio blog).
  - **Powered-by byline**: el footer minimal muestra "Powered with ♥ by Chimichurri Code" linkeando a `https://chimi.pro` *excepto* cuando el propio site es el blog (`siteId === "blog"`); ese caso oculta el byline para no auto-publicitarse.
  - **Accesibilidad**: navegaciones identificadas con `aria-label`, links externos con `rel="noopener" target="_blank"`, theme toggle con `aria-label` que **describe la acción** (no el estado actual).
  - **Estabilidad del shape `EcosystemSite`**: `{ id: string; name: string; url: string; description: string }`. Cambios al shape requieren un change OpenSpec que modifique esta spec.
- Documentación corta nueva en `packages/design-system/docs/ecosystem-chrome.md` que enlaza esta spec como contrato canónico.

## Capabilities

### New Capabilities
- `ecosystem-chrome`: catálogo cerrado `ECOSYSTEM_SITES` (5) y los componentes shared `SiteHeader`/`SiteFooter` que cosen las webs aplicativas del ecosistema en una experiencia coherente.

### Modified Capabilities
<!-- Ninguna formal. theme-toggle queda mejor *contextualizado* por esta spec (queda claro dónde se monta el botón) pero su contrato no cambia. cross-web-seo ya menciona la distinción 5-vs-7 — esta spec la formaliza del lado de chrome sin tocar la SEO. -->

## Impact

- **Código afectado**: ninguno funcionalmente. Se agrega doc en `packages/design-system/docs/ecosystem-chrome.md` y un linter ligero `check-ecosystem-chrome.mjs` que verifica que `ECOSYSTEM_SITES` mantiene exactamente 5 entradas con los ids esperados (drift detector). El linter corre en el build del DS.
- **APIs / contratos**: ningún cambio en la API pública. Estabilidad del shape ya existente queda *promovida* a contrato.
- **Dependencias**: ninguna externa.
- **Riesgos**: bajo. Único riesgo real: que el "linter de catálogo" se quede obsoleto cuando se sume una sexta web (ej. una nueva herramienta que sí pertenece al chrome). Mitigación: cualquier cambio al catálogo pasa por modificar esta spec, lo que ya forza a re-ejecutar el linter con la lista nueva.
- **Out of scope**:
  - Brand kit / logos / colores del sitio (cubierto por `theming` y por `closed-recipe-model`).
  - SEO alternates entre sitios (cubierto por `cross-web-seo`).
  - El componente `EcosystemSwitcher` standalone — no existe como componente separado del footer; es la tira "Chimiverse" rendereada por `SiteFooter`. Si en el futuro se promueve a componente independiente, se modifica esta spec.
  - Internalización (ES → EN) del chrome: hoy el chrome es Spanish-only; agregar un toggle de idioma no está cubierto.
