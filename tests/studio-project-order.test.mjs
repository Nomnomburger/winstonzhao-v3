import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {LexoRank} from 'lexorank';

const compiledModule = {exports: {}};
const alerts = [];
vm.runInNewContext(ts.transpileModule(
  fs.readFileSync(new URL('../studio/projectOrdering.ts', import.meta.url), 'utf8'),
  {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}},
).outputText, {
  module: compiledModule, exports: compiledModule.exports,
  require: createRequire(import.meta.url),
  window: {alert: message => alerts.push(message)},
});
const {newestFirstPatches, resetNewestFirstAction} = compiledModule.exports;
const doc = (_id, year, order) => ({_id, _rev: `rev-${_id}`, year, order});
const orderedIds = patches => Array.from(patches)
  .sort((a, b) => a.set.orderRank < b.set.orderRank ? -1 : 1)
  .map(patch => patch.id);

test('newest-first reset ignores existing ranks and breaks year ties using legacy positions', () => {
  const documents = [doc('old', 2020, 1), doc('new-second', 2026, 5), doc('undated'), doc('new-first', 2026, 2)];
  documents[0].orderRank = '0|000001:';
  const before = JSON.stringify(documents);
  const patches = newestFirstPatches(documents);
  assert.deepEqual(orderedIds(patches), ['new-first', 'new-second', 'old', 'undated']);
  assert.equal(JSON.stringify(documents), before);
  for (const patch of patches) {
    assert.equal(LexoRank.parse(patch.set.orderRank).toString(), patch.set.orderRank);
    assert.deepEqual(Object.keys(patch.set), ['orderRank']);
    assert.equal(patch.ifRevisionID, `rev-${patch.id}`);
  }
});

test('draft/published pairs get identical ranks using the published year; draft-only projects remain sortable', () => {
  const patches = newestFirstPatches([
    doc('drafts.old', 2030), doc('new', 2026), doc('old', 2020), doc('drafts.only', 2025),
  ]);
  assert.equal(patches[0].set.orderRank, patches[2].set.orderRank);
  assert.ok(patches[1].set.orderRank < patches[3].set.orderRank);
  assert.ok(patches[3].set.orderRank < patches[2].set.orderRank);
});

test('reset commits only rank patches in one transaction and uses fresh raw documents', async () => {
  const patches = [];
  let commits = 0;
  const client = {
    withConfig(options) {
      assert.equal(options.perspective, 'raw');
      assert.equal(options.useCdn, false);
      return this;
    },
    async fetch(query) {
      assert.match(query, /versions\.\*\*/);
      assert.match(query, /mock-project/);
      assert.match(query, /test project/);
      return [doc('old', 2020), doc('new', 2026)];
    },
    transaction() {return this;},
    patch(id, patch) {patches.push({id, ...patch}); return this;},
    async commit() {commits++;},
  };
  await resetNewestFirstAction(client)();
  assert.equal(commits, 1);
  assert.deepEqual(orderedIds(patches), ['new', 'old']);
  assert.match(alerts.at(-1), /newest first/);
});

test('empty projects do not commit and failed requests allow retry', async () => {
  let attempts = 0;
  let commits = 0;
  const client = {
    withConfig() {return this;},
    async fetch() {if (++attempts === 1) throw new Error('offline'); return [];},
    transaction() {commits++; return this;},
  };
  const action = resetNewestFirstAction(client);
  await action();
  assert.match(alerts.at(-1), /Could not/);
  await action();
  assert.equal(attempts, 2);
  assert.equal(commits, 0);
});
