#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../../");

async function main() {
  const pkgStr = await readFile(join(REPO_ROOT, "package.json"), "utf8");
  const pkg = JSON.parse(pkgStr);
  const checkScripts = Object.keys(pkg.scripts).filter(s => s.startsWith("check:"));

  const agentsPath = join(REPO_ROOT, "AGENTS.md");
  const agentsContent = await readFile(agentsPath, "utf8").catch(() => "");

  const archPath = join(REPO_ROOT, "docs/architecture.md");
  const archContent = await readFile(archPath, "utf8").catch(() => "");

  const combinedDocs = agentsContent + "\n" + archContent;
  
  const matches = [...combinedDocs.matchAll(/`check:[a-z-]+`/g)].map(m => m[0].replace(/`/g, ""));
  const uniqueMatches = [...new Set(matches)];

  let hasError = false;

  console.log("Checking doc-linter coherence...\n");

  for (const match of uniqueMatches) {
    if (!checkScripts.includes(match)) {
      console.log(`❌ Documented linter '${match}' does not exist in root package.json scripts.`);
      hasError = true;
    }
  }

  for (const script of checkScripts) {
    // We ignore check:docs-coherence itself as it's optional
    if (!uniqueMatches.includes(script) && script !== "check:docs-coherence") {
      console.log(`⚠️  Linter '${script}' from package.json is not documented in AGENTS.md or docs/architecture.md.`);
    }
  }

  if (hasError) {
    process.exit(1);
  } else {
    console.log("✅ All documented linters exist in package.json.");
    process.exit(0);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
