# Prosa: lo que ningún texto Chimi hace

<!-- prose-ok-file -->

Reglas de escritura que se pueden medir, y el script que las mide. Es el hermano de [anti-patterns.md](anti-patterns.md), que cubre lo visual. La voz que estas reglas protegen está en el capítulo «Voz y tono» del brand book; acá vive solo lo que una máquina puede contar.

Origen: las reglas de formato del brand book, la lista de palabras prohibidas de Foundations y la revisión del contenido del blog hecha con la skill humanizer en 2026, que catalogó las señales de texto de plantilla o generado.

## Principio

Un texto Chimi suena a un colega que ya se equivocó primero. Cuenta una historia concreta y cierra empujando una decisión. Lo que delata a una plantilla es lo contrario, o sea estructura repetida, énfasis en todas partes y frases que podrían estar en cualquier post de LinkedIn.

El script no decide si un texto es bueno. Marca dónde mirar.

## Reglas obligatorias

Con `--strict` hacen fallar la comprobación. Son las que no dependen del contexto.

| Regla | Qué cuenta | Por qué | En su lugar |
|---|---|---|---|
| `rayas` | La raya larga y el guion medio con espacios, usados como inciso | En los textos largos de Nico no aparece ninguna | Dos frases, o una coma |
| `vocabulario` | Las palabras prohibidas de Foundations: tips, hacks, sinergia, empoderar, «desbloquear tu potencial», «tu mejor versión», «agregar valor», «apasionado por la», «de alto rendimiento», «al siguiente nivel», «de vanguardia», «ecosistema tech» | Vocabulario de coaching y de LinkedIn corporativo. «Mindset» no está: Foundations lo permite cuando va con sustancia, y eso lo decide quien lee | Lo que hiciste, con un dato real |
| `meta-anuncio` | «En este artículo vamos a ver», «a continuación te cuento», «hoy quiero hablarte de» | Anuncia en vez de contar | Arrancar directo con la historia |
| `anzuelo` | «Te leo en comentarios», «¿qué opinás?», «compartí si te sirvió», «guardalo para después» | Pide interacción en vez de dar algo | Una decisión concreta para la semana |
| `borrador` | Enlaces vacíos, «(link interno si aplica)», marcadores de pendiente en mayúsculas, texto de relleno, corchetes del tipo «[insertar…]», URL cortadas y frases de asistente («espero que esto te ayude») | Es texto que no era para quien lee | El enlace real, o borrar la línea |
| `emoji-icono` | Un emoji al principio de una línea, de una viñeta o dentro de un título | Como ícono es ruido y rompe los lectores de pantalla | Al final de una frase, y solo en piezas informales |

La raya que abre una línea de diálogo no cuenta: así se escribe el diálogo en castellano.

## Reglas orientativas

Avisan, y solo fallan con `--strict=all`. Necesitan que alguien lea, porque el mismo recurso puede ser voz propia o molde.

| Regla | Qué cuenta | Margen por pieza | Por qué |
|---|---|---|---|
| `contraste` | «No es X, es Y», «no se trata de X sino de Y», «no solo X sino Y» | 2 | El reencuadre es un rasgo de la voz. Repetido en cada párrafo deja de reencuadrar |
| `cierre` | Un último párrafo de nueve palabras o menos, en piezas de más de 150 | 0 | Suele repetir el dato o soltar un aforismo. El cierre empuja una decisión |
| `anafora` | Tres frases seguidas que empiezan con la misma palabra | 0 | Ritmo de discurso motivacional |
| `triada` | Enumeraciones de tres palabras al final de la frase («intención, frecuencia y confianza») | 3 | Una está bien. En serie es el molde más reconocible |
| `negritas` | Párrafos con más de una negrita (las listas no cuentan) | 0 | Si todo está en negrita, nada lo está |
| `dos-puntos` | Dos puntos en la prosa. No cuentan los títulos, las horas ni el código | 2 | Nico casi no los usa al escribir para otros |
| `muletillas` | «Cabe destacar», «es importante señalar», «en definitiva», «hoy en día», «la realidad es que» | 0 | La frase se sostiene sin ellas |
| `apertura` | «Lo más curioso es que», «hizo algo distinto», «hay algo que no siempre se dice», «la historia tiene un giro» | 0 | Promete lo interesante en vez de contarlo |
| `secciones` | Títulos «Conclusión», «Key Takeaways», «Puntos clave», «Tesis central», «En resumen» | 0 | Es el esqueleto de una ficha generada. El título dice qué hay debajo |
| `tuteo` | «Tú», «tienes», «puedes», «vosotros» | 0 | Voseo rioplatense en todo lo escrito |

El margen es por pieza. Por debajo, la pieza no se reporta. Al pasarlo, se listan todas las apariciones de esa pieza.

## Lo que no revisa

- **Citas.** Los bloques de cita de markdown y los `<blockquote>` son la voz de otra persona.
- **Código, URL, frontmatter y comentarios HTML.**
- **Lo que hay fuera de `<main>`** en una página compilada.

## Comprobación

```bash
npx chimi-check-prose content
```

Lee `.md`, `.mdx` y `.html`, y recorre carpetas. Sobre markdown revisa el texto de origen. Sobre HTML revisa lo que se lee dentro de `<main>`, así que sirve para el copy que vive en componentes. Cada aviso trae archivo, línea, columna y la frase.

Opciones:

- `--strict` sale con código 1 si una regla obligatoria supera su límite. Es lo que va en CI.
- `--strict=all` hace fallar también a las orientativas.
- `--max regla=n` sube el límite de una regla (`--max rayas=3`). Se puede repetir.
- `--all` muestra todas las ubicaciones, no solo las cinco primeras por regla.
- `--json` da el informe para máquinas.

Sin opciones no falla nunca.

## Excepciones

Un contraejemplo citado («no escribas "tips"») tiene que poder existir.

- En markdown, `<!-- prose-ok -->` al final de la línea, o solo en la línea anterior, salta esa línea.
- En HTML, el contenido de un elemento con el atributo `data-prose-ok` no se revisa.

Un documento que trata de las reglas, como este, puede salir entero con `<!-- prose-ok-file -->`.

Son para citar lo que no hay que hacer. Si hacen falta para que pase un texto propio, el texto es el problema.

## Lo que el script no ve

Hace falta una persona, o la skill humanizer, para decidir:

- Si una moraleja suena a Nico o a plantilla.
- La defensa contra una postura que nadie sostiene («dar feedback no es decir todo sin filtro»).
- El aforismo en dos golpes («pasar del caos al tren fue un salto; del tren al Hyperloop, un compromiso»).
- Los números inventados y los títulos que prometen más de lo que la pieza da.
- Las repeticiones y los «querido oyente» de una historia transcrita del podcast, que sí son su voz.

## Cambiar una regla

Las listas viven en `scripts/check-prose.mjs` (`PATTERNS`, `RULES`). Una palabra nueva se agrega ahí, con su caso en `test/check-prose.test.mjs`, y en la tabla de esta página. Si cambia una regla de voz, primero cambia el brand book y después el script.
