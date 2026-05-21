import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_REGISTRY_RUNTIME } from "../seo/site-registry-runtime.generated.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SOURCE_PATH = join(__dirname, "../site-registry.ts");

const sourceContent = readFileSync(SOURCE_PATH, "utf8");

let errors = 0;

function report(msg) {
  console.error(`❌ ${msg}`);
  errors++;
}

console.log("🔍 Checking Site Registry for drift...");

// 1. Invariants from design spec
for (const site of SITE_REGISTRY_RUNTIME) {
  if (!site.url.startsWith("https://")) {
    report(`Site ${site.id} URL must start with https://`);
  }
  if (site.url.endsWith("/")) {
    report(`Site ${site.id} URL must not end with /`);
  }
  if (!site.themeColor || !site.backgroundColor || !site.maskIconColor) {
    report(`Site ${site.id} is missing theme colors.`);
  }
}

// 2. Sync check (source vs runtime)
// This is basic — Step 2.1 in tasks.md handles the emit, 
// here we just ensure the count matches as a proxy for freshness.
const sourceIds = [...sourceContent.matchAll(/id: "([^"]+)"/g)].map(m => m[1]);
const uniqueSourceIds = [...new Set(sourceIds)];

if (uniqueSourceIds.length !== SITE_REGISTRY_RUNTIME.length) {
  report(`Registry source (${uniqueSourceIds.length} sites) and runtime mirror (${SITE_REGISTRY_RUNTIME.length} sites) are out of sync. Run npm run build:tokens.`);
}

if (errors === 0) {
  console.log("✨ Site Registry is healthy and unified.");
  process.exit(0);
} else {
  console.log(`\n🚨 Found ${errors} drift errors.`);
  process.exit(1);
}
