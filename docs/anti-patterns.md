# Anti-patterns: lo que ninguna superficie Chimi hace

Lista de señales de "plantilla generada" que el design system evita a propósito. Aplica a todas las webs del Chimiverse (blog, techconf, herramientas) y a quien las construya, humano o agente. Complementa a [recipes.md](recipes.md) (qué sí) con el qué no.

Origen: la auditoría del blog de octubre de 2026 y el catálogo de 16 patrones de [AI design slop and how to spot it](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it). El script `scripts/check-slop.mjs` detecta de forma determinista los que se pueden detectar.

## Principio

Una superficie Chimi se reconoce por **una opinión fuerte y pocas excepciones**: display pesado (CHANEY) y editorial itálica (Scilla) sobre carbón o marfil, un acento (patagonia) y un color de energía (limón) usado como banda, no como adorno. La jerarquía la hace la tipografía, no las cajas. Si una pantalla podría ser la landing de cualquier SaaS, está mal.

## Prohibido

| Patrón | Por qué | En su lugar |
|---|---|---|
| Grid de tarjetas idénticas con icono arriba, título, dos líneas y "→" | Es el bloque más repetido de las landings generadas | Lista de filas con hairline; eyebrow + título + párrafo; numeración display |
| Emojis o glifos (`◉ ◇ ★ ▶ 📑`) como iconografía | Ruido, inconsistencia entre sistemas, lectura de pantalla | Texto, o SVG de línea 1.5 px del mismo set |
| Bordes de color a la izquierda o arriba de cajas; cajas con tinte de fondo | Señal de "callout" genérico | Hairline neutra, sangría, o la cita en Scilla itálica |
| Degradados de relleno, glows, sombras de color | Decoración sin información | Color plano de la receta |
| Cristal esmerilado (`backdrop-filter`) | Default de plantilla | Superficie sólida (`--recipe-surface`) |
| Filas de estadísticas ("50+ · 90 % · 5.0") | Prueba social vacía; suele ser inventada | El número dentro de una frase con contexto, solo si es real |
| Secuencias "1, 2, 3" con icono | Idem tarjetas | Numeración display tipográfica (`.list-numbered-display`) |
| Badge sobre el h1; hero centrado genérico | Default de plantilla | Hero alineado a la izquierda con foto real o nada |
| Una palabra en serif itálica dentro de un titular sans | Tic de las landings de 2024-2026 | Scilla itálica para bloques enteros (ledes, citas) o nada |
| Cuerpo de texto gris medio sobre fondo oscuro | Falla WCAG AA con facilidad | Cuerpo en `--recipe-ink`; `--muted-strong` solo para meta y ledes |
| Eyebrow en mayúsculas en cada bloque | Pierde el valor de señal | Uno por sección, y solo si estructura |
| Más de un botón primario por pantalla | Sin jerarquía | Uno primario; el resto enlaces o `.btn-ghost` |
| Footer corporativo de cuatro columnas en una web personal | Escala falsa | Una frase, redes, seis enlaces |
| Copy genérico: "potenciar", "soluciones", "apasionado", superlativos, cifras o testimonios inventados | Mata la credibilidad | Datos reales o nada; voz propia |
| Fuentes Inter, Geist, Space Grotesk, Instrument Serif | Defaults de modelo | Las del DS (`font.semantic.json`) |
| Dibujar el mate con `<path>` ad hoc | Ver la regla del mate en recipes.md | `BrandMark` / `logo-character.svg` |

## Permitido a propósito

- Mayúsculas en Nudica Mono para eyebrows, botones y meta: es parte del sistema (también en slides). Vigilar la densidad, no eliminarlas.
- Modo oscuro por defecto en home y listados (`canvas-quiet`) siempre que siga al sistema del usuario y la lectura larga use `paper`.
- Scilla itálica en bloques enteros.
- Una excepción de layout por página: foto a sangre, cita a toda página o banda `energy-loud` (rule-of-one, ver closed-recipe-model).

## Comprobación

Después de construir un sitio:

```bash
npx chimi-check-slop dist
```

Lee todos los `.css`, los bloques `<style>` y los atributos `style` de todos los `.html` (salta `pagefind/`). Cada aviso trae archivo, línea, columna y el selector, para encontrarlo aunque el CSS esté minificado.

| Regla | Qué cuenta | Límite | Tipo |
|---|---|---|---|
| `gradients` | `linear-`, `radial-` y `conic-gradient` | 2 | obligatoria |
| `glass` | `backdrop-filter` distinto de `none` | 1 | obligatoria |
| `color-shadows` | `box-shadow` con un color que no sea gris | 1 | obligatoria |
| `side-borders` | Borde izquierdo o superior de 2 px o más con color, en forma corta, en hex o como `border-left-color` | 0 | obligatoria |
| `banned-fonts` | Inter, Geist, Space Grotesk o Instrument Serif en `font`, `font-family` o un enlace a Google Fonts | 0 | obligatoria |
| `stat-rows` | Tres o más números sueltos seguidos | 0 | obligatoria |
| `icon-cards` | Tres o más bloques hermanos con icono y título | 0 | obligatoria |
| `multi-h1` | Páginas con más de un `h1` | 0 | obligatoria |
| `uppercase` | Reglas `text-transform: uppercase` | 40 | orientativa |
| `emoji` | Emojis o glifos dentro de `<main>` | 0 | orientativa |
| `multi-primary` | Páginas con más de un botón primario dentro de `<main>` | 0 | orientativa |
| `copy` | Frases hechas de landing dentro de `<main>` | 0 | orientativa |

Las orientativas necesitan una lectura humana (un emoji en un post es legítimo), así que solo avisan.

Opciones:

- `--strict`: sale con código 1 si una regla obligatoria supera su límite. Es lo que va en CI.
- `--strict=all`: las orientativas también hacen fallar.
- `--max regla=n`: sube el límite de una regla cuando hay una excepción decidida (`--max gradients=4`). Se puede repetir.
- `--all`: muestra todas las ubicaciones, no solo las cinco primeras por regla.
- `--json`: informe para máquinas.

Sin opciones no falla nunca: sigue sirviendo como recordatorio.

Lo que no detecta, porque no se puede decidir sin mirar: badge sobre el `h1`, hero centrado, una palabra en itálica dentro de un titular, texto gris sobre oscuro (lo cubre el test de contraste del sistema), footer de cuatro columnas y el mate dibujado a mano.

## Histórico

- 0.8.0: los tokens de rol (`--muted`, `--hairline`, `--surface-raised`…) pasan a declararse en `[data-recipe]` además de `:root`. Antes resolvían contra la tinta de `:root` (canvas-quiet) y el texto secundario de las páginas `paper` se renderizaba marfil sobre marfil. `SiteHeader` deja el cristal esmerilado. El preload de fuentes declara el `type` correcto por extensión. Se exporta `./postcss` para consumidores fuera del monorepo.
