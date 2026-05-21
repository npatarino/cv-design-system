import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "../../../");
const SOURCE = join(__dirname, "../site-registry.ts");
const TARGET = join(__dirname, "../seo/site-registry-runtime.generated.mjs");


/**
 * Tiny build step that reads the .ts registry source and emits a plain .mjs mirror.
 * This allows .mjs consumers (SEO defaults, brand HTML) to consume the registry
 * without a TS toolchain.
 *
 * We use a simple regex to extract the SITE_REGISTRY array literal. This is
 * deterministic because the registry is a pure data structure.
 */

import { readFileSync } from "node:fs";

const content = readFileSync(SOURCE, "utf8");
const match = content.match(/const SITE_REGISTRY: readonly SiteEntry\[\] = Object\.freeze\(\s*([\s\S]+?)\s*\);/);

if (!match) {
  console.error("❌ Failed to extract SITE_REGISTRY from site-registry.ts");
  process.exit(1);
}

const literal = match[1];

const output = `/** @file Generated mirror of site-registry.ts. Do not edit. */

export const SITE_REGISTRY_RUNTIME = Object.freeze(${literal});
`;

writeFileSync(TARGET, output);
console.log(`✅ Emitted site-registry-runtime.generated.mjs`);
