#!/usr/bin/env node
/**
 * check:workspace-conventions
 * 
 * Enforces the canonical inside-an-app architecture for tool apps (simple-*).
 * v1: Informational (exits 0, prints matrix).
 * 
 * Rules:
 * 1. Required directories: pages, domain, infra, seo, styles, ui (or components).
 * 2. Dependency direction: domain -> (infra|ui|app) is FORBIDDEN.
 * 3. Domain side-effects: domain/ must not use localStorage, window, document, fetch, firebase.
 * 4. No top-level src files (except env.d.ts).
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../../");

export const REQUIRED_DIRS = ["pages", "domain", "infra", "seo", "styles"];
export const UI_DIR_OPTIONS = ["ui", "components"];
export const FORBIDDEN_DOMAIN_PATTERNS = ["localStorage", "window", "document", "fetch", "firebase"];

const isMain = (() => {
  try {
    return import.meta.url === new URL(`file://${process.argv[1]}`).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  await main();
}

async function main() {
  const packagesPath = join(REPO_ROOT, "packages");
  const entries = await readdir(packagesPath, { withFileTypes: true });
  const toolApps = entries
    .filter(e => e.isDirectory() && e.name.startsWith("simple-"))
    .map(e => e.name);

  console.log("Workspace Conventions Check (v1 - Informational)\n");

  const results = [];
  for (const app of toolApps) {
    const appPath = join(packagesPath, app);
    const result = await checkApp(app, appPath);
    results.push(result);
  }

  printMatrix(results);
  const hasErrors = results.some(r => !r.layout.pass || !r.dependencies.pass || !r.topLevel.pass);
  process.exit(hasErrors ? 1 : 0);
}

export async function checkApp(appName, appPath) {
  const srcPath = join(appPath, "src");
  const report = {
    appName,
    layout: { pass: true, details: [] },
    dependencies: { pass: true, details: [] },
    sideEffects: { pass: true, details: [] },
    topLevel: { pass: true, details: [] }
  };

  try {
    const srcExists = await stat(srcPath).then(s => s.isDirectory()).catch(() => false);
    if (!srcExists) {
      report.layout.pass = false;
      report.layout.details.push("Missing src/ directory");
      return report;
    }

    const srcEntries = await readdir(srcPath);
    
    // 1. Layout Check
    for (const dir of REQUIRED_DIRS) {
      if (!srcEntries.includes(dir)) {
        report.layout.pass = false;
        report.layout.details.push(`Missing src/${dir}/`);
      }
    }
    const hasUi = UI_DIR_OPTIONS.some(opt => srcEntries.includes(opt));
    if (!hasUi) {
      report.layout.pass = false;
      report.layout.details.push("Missing src/ui/ (or legacy components/)");
    } else if (srcEntries.includes("components")) {
      report.layout.details.push("Warning: src/components/ is deprecated, rename to src/ui/");
    }

    // 2. Top-level files Check
    const topLevelFiles = (await readdir(srcPath, { withFileTypes: true }))
      .filter(e => e.isFile() && e.name !== "env.d.ts" && e.name !== ".DS_Store");
    if (topLevelFiles.length > 0) {
      report.topLevel.pass = false;
      report.topLevel.details.push(`Forbidden top-level files: ${topLevelFiles.map(f => f.name).join(", ")}`);
    }

    // 3. Side Effects & Dependency Direction Check
    await walkDir(srcPath, async (filePath) => {
      const relPath = relative(srcPath, filePath);
      const content = await readFile(filePath, "utf8");
      
      validateContent(relPath, content, report);
    });

  } catch (err) {
    report.layout.pass = false;
    report.layout.details.push(`Error checking app: ${err.message}`);
  }

  return report;
}

export function validateContent(relPath, content, report) {
  // Side Effects in domain/
  if (relPath.startsWith("domain/")) {
    for (const pattern of FORBIDDEN_DOMAIN_PATTERNS) {
      if (content.includes(pattern)) {
        report.sideEffects.pass = false;
        report.sideEffects.details.push(`${relPath}: suspicious side-effect pattern "${pattern}"`);
      }
    }
  }

  // Dependency Direction
  const imports = findImports(content);
  if (relPath.startsWith("domain/")) {
    for (const imp of imports) {
      if (imp.startsWith("../infra") || imp.startsWith("../ui") || imp.startsWith("../components") || imp.startsWith("../app") || imp.startsWith("../pages")) {
        report.dependencies.pass = false;
        report.dependencies.details.push(`${relPath}: forbidden import "${imp}" (domain -> outside)`);
      }
    }
  }
  if (relPath.startsWith("infra/")) {
    for (const imp of imports) {
      if (imp.startsWith("../ui") || imp.startsWith("../components") || imp.startsWith("../app") || imp.startsWith("../pages")) {
        report.dependencies.pass = false;
        report.dependencies.details.push(`${relPath}: forbidden import "${imp}" (infra -> ui/app/pages)`);
      }
    }
  }
}

async function walkDir(dir, callback) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(res, callback);
    } else {
      await callback(res);
    }
  }
}

export function findImports(content) {
  const imports = [];
  const re = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function printMatrix(results) {
  const head = "| App | Layout | Dependencies | Side Effects | Top-level |";
  const sep = "| :--- | :---: | :---: | :---: | :---: |";
  console.log(head);
  console.log(sep);

  for (const r of results) {
    const l = r.layout.pass ? "✅" : "❌";
    const d = r.dependencies.pass ? "✅" : "❌";
    const s = r.sideEffects.pass ? "✅" : "❌";
    const t = r.topLevel.pass ? "✅" : "❌";
    console.log(`| ${r.appName} | ${l} | ${d} | ${s} | ${t} |`);
  }

  console.log("\nDetails:");
  for (const r of results) {
    const allDetails = [
      ...r.layout.details.map(d => `[Layout] ${d}`),
      ...r.dependencies.details.map(d => `[Deps] ${d}`),
      ...r.sideEffects.details.map(d => `[SideEffects] ${d}`),
      ...r.topLevel.details.map(d => `[TopLevel] ${d}`)
    ];
    if (allDetails.length > 0) {
      console.log(`\n### ${r.appName}`);
      allDetails.forEach(d => console.log(`- ${d}`));
    }
  }
}
