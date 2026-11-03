# OG fallback images

One 1200×630 WebP per site id (`<siteId>.webp`). `SEOHead` / `renderSEOHeadHTML()` use
`/og/<siteId>.webp` as the default `og:image` (see `defaultOgImage` in `seo/defaults.mjs`),
so a consumer must copy its own file into `public/og/` — `scripts/seo-prebuild.mjs` does it.

The images are curated assets: replace a file to change a site's card. Pages can still
override the image per page by passing `og.image` to `<SEOHead>`.
