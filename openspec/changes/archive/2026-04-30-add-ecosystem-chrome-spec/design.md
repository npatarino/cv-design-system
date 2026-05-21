## Context

Las cinco webs aplicativas del monorepo — `@chimi/blog`, `@chimi/techconf`, `@chimi/recall-for-papers`, `@chimi/simple-pdf-converter`, `@chimi/simple-scrum-poker` — comparten un *chrome* mínimo: el header con brand mark + nav + theme toggle, y el footer con sección "Chimiverse" para saltar a las otras webs. Ese chrome vive en `@chimi/design-system` como dos componentes Astro (`SiteHeader.astro`, `SiteFooter.astro`) y un módulo TS (`components/ecosystem.ts`) con el catálogo `ECOSYSTEM_SITES` y un helper `ecosystemLinksExcluding(currentId)`.

El catálogo `ECOSYSTEM_SITES` tiene **5 entradas** — las webs aplicativas. Cada entrada es `{ id, name, url, description }`. El helper `ecosystemLinksExcluding(currentId)` filtra la web actual para no auto-listarse en el footer.

Hay una distinción importante entre dos catálogos del DS:

- `ECOSYSTEM_SITES` (este, 5 sitios): catálogo de UI / chrome cross-web. Su uso es "muestra estas webs como destinos navegables al usuario final".
- `SEO_SITE_CATALOG` (`packages/design-system/seo/defaults.mjs`, 7 sitios — los 5 + `talks` + `brand`): catálogo de SEO para alternates entre sitios y para sitemap-index. Su uso es "estas son todas las propiedades web que indexar y cross-linkear desde meta-tags".

Talks (slides técnicos) y brand (book de marca) están en SEO pero **no** en chrome porque no son destinos productivos — talks es una doc tool, brand es contenido de referencia para humanos curiosos.

`SiteHeader` ya consume el catálogo (a través de la prop `siteId` opcional) sólo para `aria-label` del brand link y para el filtrado eventual; el catálogo aparece **literalmente** en `SiteFooter`, donde se rendea la sección "Chimiverse" como tira horizontal (variante rich) o como bloque vertical (variante minimal).

El theme toggle está físicamente *montado dentro de* `SiteHeader` (botón con `[data-theme-toggle]`) y dentro de `SiteFooter` para algunas configuraciones. Su comportamiento (pintar el icono correcto, persistir en localStorage, despachar `themechange`) está cubierto por la spec `theme-toggle`. Esta spec sólo dice "el chrome es donde vive el botón".

**Stakeholders**:
- Owner del DS: el chrome es uno de los pocos artefactos compartidos que cosen las webs en un ecosistema; el contrato debe ser estable.
- Owner de cada web: cada web pasa `siteId`, `brand`, `links`, `socials` al componente; el contrato evita que el shape de las props rompa silenciosamente entre versiones.
- Compliance / a11y: las navegaciones, el theme toggle, los socials están bajo escrutinio de a11y; la spec captura las invariantes.

## Goals / Non-Goals

**Goals:**

- Codificar `ECOSYSTEM_SITES` como catálogo cerrado de **5** entradas (los 5 ids: `blog`, `techconf`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`) con shape estable `{ id, name, url, description }`.
- Codificar la distinción explícita con `SEO_SITE_CATALOG` (cubierto por `cross-web-seo`, 7 sitios) y argumentar por qué los 2 sitios extra (`talks`, `brand`) **no** entran en chrome.
- Codificar el contrato de `SiteHeader`: props (`brand`, `links`, `socials`, `mobileMenu`, `themeToggle`), brand link siempre apuntando al home del sitio actual, soporte para logo dual-theme, hamburger nav móvil con `aria-expanded`, submenús (hover desktop / click+aria mobile), tap target ≥44×44, theme toggle integrado.
- Codificar el contrato de `SiteFooter`: variantes `rich` y `minimal`, sección Chimiverse derivada del catálogo via `ecosystemLinksExcluding(siteId)`, byline "Powered with ♥ by Chimichurri Code" excepto para el blog (auto-referencia), todos los enlaces externos con `rel="noopener" target="_blank"`.
- Codificar la regla de auto-referencia: cuando `siteId` está presente, el switcher omite la entrada del propio sitio.
- Codificar el linter `check-ecosystem-chrome.mjs` que valida ids/longitud del catálogo (drift detector).

**Non-Goals:**

- No definir cómo se ven los componentes (estilos, tipografía, padding) — eso vive en el CSS de cada componente y no es contrato externo.
- No prescribir las navegaciones específicas de cada web (qué links pone el blog vs techconf) — cada web pasa sus propios `links` al componente.
- No cubrir el comportamiento del theme toggle en sí (`theme-toggle` ya lo cubre); sólo decir que vive aquí.
- No cubrir el componente `BrandMark` ni los iconos sociales — son sub-componentes del DS con sus propios contratos implícitos.
- No internacionalizar el chrome (sigue siendo Spanish-only por ahora).
- No promover la sección Chimiverse a un componente standalone `EcosystemSwitcher` — hoy es markup en `SiteFooter`. Si se promueve en el futuro, requiere modificación de esta spec.

## Decisions

### D1 · 5 sitios en chrome, 7 en SEO — distinción explícita

**Decisión**: `ECOSYSTEM_SITES` mantiene **exactamente** 5 entradas. La spec menciona expresamente que `cross-web-seo` opera con 7 (los 5 + `talks` + `brand`) y argumenta por qué se diferencian.

**Por qué 5 vs 7**:

- *Talks* (`https://chimi.pro/talks/`) es una herramienta interna y para públicos especializados (charlas técnicas). Listarlo en el footer del blog/techconf/etc. distrae al usuario común — la mayor parte no quiere los slides crudos.
- *Brand* (book de marca) es un sitio de referencia, no productivo. Aún más nicho que talks. Listar `https://brand.chimi.pro` como destino del footer sería pretencioso.
- En cambio, **SEO sí los necesita**: los buscadores deben conocerlos (sitemap, alternates) para indexarlos correctamente cuando un buscador llega vía búsqueda específica.

**Por qué codificarlo en spec**:

- Si alguien hoy mira el código y ve la diferencia, puede (legítimamente) pensar "oh, debe haber sido un olvido — agreguemos talks al chrome". La spec previene esa confusión: la diferencia es intencional.

**Alternativas consideradas**:

- *Un único catálogo de 7*: rompe el chrome (talks/brand no pertenecen al footer del visitante final).
- *Dos catálogos sin spec que los relacione*: lo que tenemos hoy. Ya causó una confusión durante la migración del SEO.

### D2 · Shape estable `{ id, name, url, description }`

**Decisión**: el shape de `EcosystemSite` es `{ id: string; name: string; url: string; description: string }`. Cambios al shape (agregar campos, renombrar) requieren un change OpenSpec que modifique esta spec.

**Por qué cuatro campos exactos**:

- `id`: handle estable para `siteId` prop y para `ecosystemLinksExcluding(currentId)`. Distinto del `name` para permitir que el name cambie (rebrand) sin romper el filtrado.
- `name`: display name humano para el footer/header. Puede ser distinto del id (ej. `id: "recall-for-papers"`, `name: "reCall4Papers"`).
- `url`: absoluto + canonical. Siempre con `https://`, sin trailing slash.
- `description`: tagline corta (≤80 chars) que aparece en metadata y, eventualmente, en tooltips/lists. Hoy se usa poco en chrome pero está presente para futuras visualizaciones.

**Por qué estable**:

- Tres consumers leen el shape: `SiteFooter` (campos `name`, `url`), `SiteHeader` (`siteId` se cruza con `id`), y eventualmente cualquier nuevo componente que rendee el ecosistema. Un cambio de shape rompe los tres a la vez.
- Estabilidad → puede haber un único package (`@chimi/design-system`) que lo declare y los webs/talks/brand lo consuman como SSOT.

**Alternativas consideradas**:

- *Shape extensible (open record)*: produciría drift entre consumers (cada uno asume su propio campo extra).
- *Múltiples shapes (uno por uso)*: redundancia y desincronización.

### D3 · Variantes `rich` y `minimal` del footer

**Decisión**: `SiteFooter` tiene dos variantes que el consumer elige via prop `variant`:

- **`minimal`** (default): layout horizontal de una sola fila — meta-links inline, sección Chimiverse opcional, byline powered-by. Ideal para sitios chicos (PDF Converter, RFP) o páginas internas (privacy, about).
- **`rich`**: grid editorial con `brand-col` (logo + descripción + socials), N columnas custom, tira Chimiverse separada, copyright. Ideal para landings con mucho contenido (blog, techconf).

**Por qué dos variantes y no una configurable única**:

- Las dos variantes son *visualmente distintas* (no solo cantidad de contenido); tienen layouts grid distintos y rules CSS distintas.
- Una variante única súper-configurable acababa con 12 props para ocultar/mostrar piezas, lo que era peor que dos componentes con menos cuestiones.

**Alternativas consideradas**:

- *Una sola variante*: imposible — los layouts son demasiado distintos.
- *Tres variantes (rich, medium, minimal)*: medium era duplicación de minimal con padding distinto; descartada.

### D4 · Auto-referencia se filtra siempre que `siteId` esté presente

**Decisión**: `ecosystemLinksExcluding(siteId)` se aplica automáticamente en `SiteFooter` cuando el consumer pasa `siteId`. Sin `siteId`, el footer muestra los 5 sitios completos (caso edge, no recomendado en producción).

**Por qué pasar `siteId`**:

- Auto-listarse en el switcher es feo y pierde el sentido (no es una alternativa, es la web actual).
- El filtrado es responsabilidad del DS, no del consumer — los webs no deberían tener que conocer la lista de los otros sitios.

**Alternativas consideradas**:

- *Auto-detectar siteId del hostname*: SSR-incompatible, frágil con previews/staging.
- *Filtrado manual en cada consumer*: rompe el principio "el DS sabe del ecosistema; las webs no".

### D5 · Byline "Powered by Chimichurri Code" excluye al propio blog

**Decisión**: el footer minimal muestra "Powered with ♥ by Chimichurri Code" linkeando a `https://chimi.pro` *excepto* cuando `siteId === "blog"`. La regla está hardcodeada en `SiteFooter` (`isCurrentSiteByline`).

**Por qué**:

- Auto-promocionarse al final del propio sitio (el blog promoviendo el blog) es ridículo.
- Es una regla simple, no requiere prop adicional. La condición `siteId === "blog"` es expresiva y no escala mal (si en el futuro hay más sitios "raíz", se extiende).

**Alternativas consideradas**:

- *Prop `showPoweredBy`*: traslada decisión al consumer; cada web tendría que recordarlo.
- *Heurística por URL*: equivalente pero menos legible.

### D6 · Linter `check-ecosystem-chrome.mjs` como guard rail (ligero)

**Decisión**: un script Node nuevo en `packages/design-system/scripts/check-ecosystem-chrome.mjs` corre como parte del build del DS y verifica:

1. `ECOSYSTEM_SITES` exporta exactamente 5 entradas.
2. Los `id`s del catálogo son exactamente `["blog", "techconf", "recall-for-papers", "simple-pdf-converter", "simple-scrum-poker"]` (set match).
3. Cada entrada tiene los 4 campos esperados (`id`, `name`, `url`, `description`), todos no vacíos.
4. Cada `url` empieza con `https://` y termina sin trailing slash.

**Por qué ligero**:

- El check es trivial (~50 líneas Node), no merece reuse de un linter existente.
- Drift en el catálogo es lo único que importa estructuralmente; los detalles visuales no se chequean.

**Por qué en build del DS y no de cada web**:

- El catálogo vive en el DS, no en las webs. El linter es responsabilidad del owner del catálogo.
- Si el linter falla, falla el build del DS, que cascadea a todas las webs (cada web depende del DS).

**Alternativas consideradas**:

- *Test unitario en typescript*: equivalente; el shell script es más rápido y no requiere setup.
- *Sin linter, sólo doc*: histórico — la regla "5 sitios" se reinventa.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| El catálogo cerrado bloquea la incorporación de una sexta web aplicativa (ej. una herramienta nueva de diseño) | El bloqueo es deseado: agregar al catálogo es una decisión consciente que pasa por una PR + actualización de spec + actualización de `cross-web-seo` (sus alternates). El proceso es ligero — un change pequeño. |
| `SiteHeader` y `SiteFooter` evolucionan y rompen consumers silenciosamente | El contrato de props está en la spec; cualquier cambio breaking requiere modificar la spec. La doc en `packages/design-system/docs/ecosystem-chrome.md` mantiene el changelog. |
| El distinción "5 chrome vs 7 SEO" se pierde en la cabeza del próximo contributor | Está documentada en la spec, en `cross-web-seo`, y en `packages/design-system/docs/ecosystem-chrome.md`. Los tres puntos de doc apuntan entre sí. |
| `EcosystemSwitcher` se promueve a componente standalone (caso futuro) y rompe la spec | Si se promueve, se modifica esta spec con un change explícito. Hasta entonces, "switcher" es markup interno del footer. |
| El theme toggle (cubierto por `theme-toggle`) se mueve fuera del chrome | El acoplamiento físico está documentado en esta spec: si alguien intenta moverlo, debe modificar tanto `theme-toggle` como esta spec. La spec deja claro que "el chrome es donde vive el botón" sin definir el comportamiento — eso queda a `theme-toggle`. |
| Las variantes `rich`/`minimal` divergen y no se puede pasar fácilmente de una a otra | Reconocido como trade-off por D3. Las dos variantes son intencionalmente distintas; cambiar de variante en una web es una decisión editorial, no un toggle trivial. |
