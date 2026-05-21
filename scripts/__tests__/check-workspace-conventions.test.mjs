import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';


import { findImports, validateContent } from "../check-workspace-conventions.mjs";

it("findImports picks up relative and absolute imports", () => {
  const content = `
    import { x } from "./local";
    import y from "../parent";
    import { z } from "@chimi/utils";
  `;
  const imports = findImports(content);
  expect(imports).toEqual(["./local", "../parent", "@chimi/utils"]);
});

it("validateContent flags domain -> infra violation", () => {
  const report = { 
    dependencies: { pass: true, details: [] },
    sideEffects: { pass: true, details: [] }
  };
  const content = `import { db } from "../infra/firebase";`;
  validateContent("domain/state.ts", content, report);
  expect(report.dependencies.pass).toEqual(false);
  expect(report.dependencies.details[0]).toMatch(/forbidden import "\.\.\/infra\/firebase"/);
});

it("validateContent flags domain -> ui violation", () => {
  const report = { 
    dependencies: { pass: true, details: [] },
    sideEffects: { pass: true, details: [] }
  };
  const content = `import { Button } from "../ui/Button";`;
  validateContent("domain/state.ts", content, report);
  expect(report.dependencies.pass).toEqual(false);
  expect(report.dependencies.details[0]).toMatch(/forbidden import "\.\.\/ui\/Button"/);
});

it("validateContent flags domain side-effects (localStorage)", () => {
  const report = { 
    dependencies: { pass: true, details: [] },
    sideEffects: { pass: true, details: [] }
  };
  const content = `const x = localStorage.getItem("key");`;
  validateContent("domain/state.ts", content, report);
  expect(report.sideEffects.pass).toEqual(false);
  expect(report.sideEffects.details[0]).toMatch(/suspicious side-effect pattern "localStorage"/);
});

it("validateContent flags domain side-effects (fetch)", () => {
  const report = { 
    dependencies: { pass: true, details: [] },
    sideEffects: { pass: true, details: [] }
  };
  const content = `fetch("/api/data");`;
  validateContent("domain/state.ts", content, report);
  expect(report.sideEffects.pass).toEqual(false);
  expect(report.sideEffects.details[0]).toMatch(/suspicious side-effect pattern "fetch"/);
});

it("validateContent allows infra -> domain import", () => {
  const report = { 
    dependencies: { pass: true, details: [] },
    sideEffects: { pass: true, details: [] }
  };
  const content = `import { state } from "../domain/state";`;
  validateContent("infra/firebase.ts", content, report);
  expect(report.dependencies.pass).toEqual(true);
});

it("validateContent flags infra -> ui violation", () => {
  const report = { 
    dependencies: { pass: true, details: [] },
    sideEffects: { pass: true, details: [] }
  };
  const content = `import { Button } from "../ui/Button";`;
  validateContent("infra/firebase.ts", content, report);
  expect(report.dependencies.pass).toEqual(false);
  expect(report.dependencies.details[0]).toMatch(/forbidden import "\.\.\/ui\/Button"/);
});
