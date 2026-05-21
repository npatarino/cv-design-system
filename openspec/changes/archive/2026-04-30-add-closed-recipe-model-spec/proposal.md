## Why

El monorepo ya implementó la arquitectura de **closed recipe model** del design system (7 recipes con `data-recipe` y `--recipe-*` cortos), y migró las 5 webs y los slides a consumirla (changes `migrate-webs-to-recipes` y los PRs previos en `talks`). Pero no existe ninguna spec OpenSpec que codifique las invariantes del modelo: la lista cerrada de 7 recipes, la regla "no inventar recipes nuevas", la dualidad bicara de `critical` (bg recipe vs `.critical-fg-<role>` modifiers), la regla del 1 para `energy-loud`, y el contrato de consumo (`--recipe-*` ✓, `--chimi-color-*` directo ✗). Esa ausencia ya causó fricción una vez (durante el W5 de Scrum Poker apareció una "paleta de divergencia" que no encaja en las 7 y quedó como `FIXME(recipes)` sin guía sobre qué hacer). Si nadie escribe la spec, el día que entre un nuevo colaborador o una nueva web la regla se va a perder.

Esta spec captura el contrato actual ya shippeado — no propone un cambio de implementación. Es una formalización retroactiva con un tickle de tareas mínimas (audit + linter doc + spec).

## What Changes

- **NEW capability** `closed-recipe-model` que define:
  - El conjunto cerrado de 7 recipes (`canvas-quiet`, `canvas-signal`, `paper`, `paper`, `energy-loud`, `cool-fresh`, `critical`).
  - El contrato de declaración: `data-recipe="<id>"` en `<body>` (web layouts) o en `<section class="slide">` (talks).
  - El contrato de consumo: layouts y componentes consumen `var(--recipe-{surface,ink,em,accent,warn})`. **No** consumen `var(--chimi-color-*)` directo (excepto escapes hatch de `primitives` para artefactos con paleta local fija, ej. logos duotone).
  - El comportamiento bicara de `critical`: como recipe completa (bg plasma) y como modifiers `.critical-fg-<role>` que overridean un rol de la recipe portadora.
  - La regla del 1 para `energy-loud`: máximo una instancia por viewport / página / slide.
  - La regla "no inventar": casos que no encajan se marcan `// FIXME(recipes): <motivo>` y eligen la recipe más cercana, no se crea una recipe nueva sin escalation.
  - El contrato del linter `check-recipes.mjs`: warnea (en webs) y opcionalmente erra (en talks) cualquier consumo directo de `--chimi-color-*` fuera de los escapes hatch documentados.
- Documentación corta en `packages/design-system/docs/recipes.md` que ya existe pero se extiende con un puntero a esta spec como contrato canónico.
- El linter `check-recipes.mjs` se mantiene tal cual; sólo se documenta que es la guard rail de esta spec.

## Capabilities

### New Capabilities
- `closed-recipe-model`: contrato del closed-recipe model del DS (7 recipes, `data-recipe`, `--recipe-*`, bicara de critical, regla del 1, regla "no inventar", linter as guard rail).

### Modified Capabilities
<!-- Ninguna. theming cubre data-theme (dark/light), no las recipes. cross-web-seo no toca recipes. blind-voting/etc. son verticales de scrum-poker. -->

## Impact

- **Código afectado**: ninguno funcionalmente. Es una formalización retroactiva. La doc en `packages/design-system/docs/recipes.md` gana un puntero a esta spec.
- **APIs / contratos**: ninguno nuevo. La spec describe el contrato ya existente.
- **Dependencias**: ninguna.
- **Riesgos**: bajo. La única decisión activa es **cerrar la lista en 7** — hoy hay una `FIXME(recipes)` para la paleta de divergencia de scrum-poker que esta spec convierte explícitamente en "registrar como deuda y elegir la más cercana, no extender". Si en el futuro se necesita romper ese contrato, se hará via un change `extend-recipe-catalog` que modifique esta spec.
- **Out of scope**:
  - Soporte de `data-theme="light"` por recipe (deuda separada, cubierta por el follow-up `recipes-light-theme-support` que mencionan los W7.2/7.3/7.4 diferidos del change `migrate-webs-to-recipes`).
  - El pipeline de tokens (Style Dictionary, JSON sources, format de output): es build internals, vive como README en `packages/design-system/`.
