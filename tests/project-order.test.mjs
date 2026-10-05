import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = new URL('../src/lib/project-order.ts', import.meta.url);
const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const compiledModule = { exports: {} };
vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports });
const { sortProjectList, sortHomeProjects } = compiledModule.exports;
const ids = (projects) => Array.from(projects, (project) => project._id);

test('older manual positions cannot override newest-first project years', () => {
  const projects = [
    { _id: 'oldest', year: 2020, order: 1 },
    { _id: 'newest', year: 2026, order: 29 },
    { _id: 'middle', year: 2025, order: 18 },
  ];
  assert.deepEqual(ids(sortProjectList(projects)), ['newest', 'middle', 'oldest']);
});

test('projects in the same year retain ascending researched positions', () => {
  const projects = [
    { _id: 'january', year: 2025, order: 16 },
    { _id: 'november', year: 2025, order: 8 },
    { _id: 'august', year: 2025, order: 9 },
  ];
  assert.deepEqual(ids(sortProjectList(projects)), ['november', 'august', 'january']);
});

test('featured cards keep their curated placement before the chronological list', () => {
  const projects = [
    { _id: 'new-list', year: 2026, order: 5 },
    { _id: 'second-feature', featured: true, year: 2025, order: 2 },
    { _id: 'old-list', year: 2020, order: 1 },
    { _id: 'first-feature', featured: true, year: 2023, order: 1 },
  ];
  assert.deepEqual(ids(sortHomeProjects(projects)), [
    'first-feature', 'second-feature', 'new-list', 'old-list',
  ]);
});

test('missing years follow dated projects and missing within-year positions stay stable', () => {
  const projects = [
    { _id: 'undated', order: 0 },
    { _id: 'unpositioned-one', year: 2025 },
    { _id: 'positioned', year: 2025, order: 10 },
    { _id: 'unpositioned-two', year: 2025 },
  ];
  assert.deepEqual(ids(sortProjectList(projects)), [
    'positioned', 'unpositioned-one', 'unpositioned-two', 'undated',
  ]);
});

test('sorting never mutates the incoming server or CMS array', () => {
  const projects = Object.freeze([
    Object.freeze({ _id: 'older', year: 2020, order: 1 }),
    Object.freeze({ _id: 'newer', year: 2026, order: 2 }),
  ]);
  assert.deepEqual(ids(sortHomeProjects(projects)), ['newer', 'older']);
  assert.deepEqual(ids(projects), ['older', 'newer']);
});
