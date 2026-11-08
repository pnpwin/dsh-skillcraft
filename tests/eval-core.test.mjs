import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSpec, createBudget, gradeFiles, aggregate, runPaired } from '../src/eval-core.js';

const clone = value => JSON.parse(JSON.stringify(value));
const validSpec = () => ({
  schemaVersion: 1,
  skill: { name: 'sample-skill', description: 'Use for controlled file transformations.', contentPath: 'skills/sample.md' },
  cases: [{ id: 'case-train', split: 'train', prompt: 'Write the transformed result.',
    files: { 'input.txt': 'input only' }, writable: ['output.json'],
    checks: [{ type: 'json-equals', path: 'output.json', expected: { answer: 'PRIVATE_GRADING_ORACLE' } }] }],
});
const rejects = (spec, label) => assert.throws(() => validateSpec(spec), TypeError, label);
const noPassingGrade = (files, checks) => {
  try { assert.notEqual(gradeFiles(files, checks).passed, true); }
  catch (error) { if (!(error instanceof TypeError)) throw error; }
};

test('validateSpec normalizes defaults without mutating the caller', () => {
  const input = validSpec();
  const before = clone(input);
  const result = validateSpec(input);
  assert.deepEqual(input, before);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.repetitions, 1);
  assert.equal(result.seed, 42);
  assert.equal(result.cases[0].id, 'case-train');
  assert.notEqual(result, input);
});

test('prior-version baseline and declared resources remain explicit', () => {
  const input = validSpec();
  input.skill.resources = ['skills/resources/reference.md'];
  input.baselineSkill = { name: 'sample-skill-v1', description: 'Prior version.', contentPath: 'skills/prior.md' };
  input.repetitions = 5;
  input.seed = 123;
  const result = validateSpec(input);
  assert.equal(result.baselineSkill.contentPath, 'skills/prior.md');
  assert.deepEqual(result.skill.resources, ['skills/resources/reference.md']);
  assert.equal(result.repetitions, 5);
  assert.equal(result.seed, 123);
});

for (const input of [null, false, 1, 'spec', [], {}, { schemaVersion: 2 }, { schemaVersion: 1, skill: null, cases: [] }]) {
  test(`invalid top-level spec rejected: ${JSON.stringify(input)}`, () => rejects(input));
}

for (const [label, mutate] of [
  ['empty cases', spec => { spec.cases = []; }],
  ['duplicate case ids', spec => { spec.cases.push(clone(spec.cases[0])); }],
  ['missing case id', spec => { delete spec.cases[0].id; }],
  ['unsupported split', spec => { spec.cases[0].split = 'test'; }],
  ['empty prompt', spec => { spec.cases[0].prompt = ''; }],
  ['non-string prompt', spec => { spec.cases[0].prompt = ['text']; }],
  ['non-text file', spec => { spec.cases[0].files['input.txt'] = { content: 'text' }; }],
  ['files array', spec => { spec.cases[0].files = []; }],
  ['missing writable list', spec => { delete spec.cases[0].writable; }],
  ['writable non-string', spec => { spec.cases[0].writable = [null]; }],
  ['missing checks', spec => { delete spec.cases[0].checks; }],
  ['empty checks', spec => { spec.cases[0].checks = []; }],
  ['unknown check type', spec => { spec.cases[0].checks[0].type = 'execute-script'; }],
  ['json check missing expected', spec => { delete spec.cases[0].checks[0].expected; }],
  ['includes check missing text', spec => { spec.cases[0].checks[0] = { type: 'text-includes', path: 'output.json' }; }],
  ['repetitions zero', spec => { spec.repetitions = 0; }],
  ['repetitions too high', spec => { spec.repetitions = 6; }],
  ['fractional repetitions', spec => { spec.repetitions = 1.5; }],
  ['malformed baseline', spec => { spec.baselineSkill = {}; }],
  ['missing skill content path', spec => { delete spec.skill.contentPath; }],
]) {
  test(`invalid specification rejects ${label}`, () => {
    const input = validSpec();
    mutate(input);
    rejects(input, label);
  });
}

for (const path of ['../outside.txt', 'folder/../../outside.txt', '/tmp/outside.txt', 'C:\\outside.txt', '..\\outside.txt', 'folder\\..\\outside.txt', 'folder/./output.txt', './output.txt', 'folder//output.txt', 'output\0.txt']) {
  for (const field of ['contentPath', 'resource', 'input', 'writable', 'check']) {
    test(`unsafe ${field} path rejected: ${JSON.stringify(path)}`, () => {
      const input = validSpec();
      if (field === 'contentPath') input.skill.contentPath = path;
      if (field === 'resource') input.skill.resources = [path];
      if (field === 'input') input.cases[0].files = { [path]: 'text' };
      if (field === 'writable') input.cases[0].writable = [path];
      if (field === 'check') input.cases[0].checks[0].path = path;
      rejects(input);
    });
  }
}

test('budget reserves before dispatch and never allows dispatch beyond the cap', () => {
  const budget = createBudget(2);
  let dispatched = 0;
  const dispatch = () => { budget.reserve(); dispatched++; };
  dispatch(); dispatch();
  assert.deepEqual(budget.snapshot(), { limit: 2, used: 2, denied: 0 });
  assert.throws(dispatch);
  assert.equal(dispatched, 2);
  assert.deepEqual(budget.snapshot(), { limit: 2, used: 2, denied: 1 });
  assert.throws(dispatch);
  assert.deepEqual(budget.snapshot(), { limit: 2, used: 2, denied: 2 });
});

test('budget snapshots cannot mutate the live allowance', () => {
  const budget = createBudget(1);
  const snapshot = budget.snapshot();
  try { snapshot.used = -100; snapshot.limit = 999; } catch {}
  budget.reserve();
  assert.throws(() => budget.reserve());
  assert.deepEqual(budget.snapshot(), { limit: 1, used: 1, denied: 1 });
});

for (const limit of [-1, NaN, Infinity, 1.5, '2', null]) {
  test(`invalid budget limit rejected: ${String(limit)}`, () => assert.throws(() => createBudget(limit), TypeError));
}

test('grading JSON compares complete values, not formatting or key order', () => {
  const checks = [{ type: 'json-equals', path: 'out.json', expected: { answer: 42, nested: { y: [1, 2], x: true } } }];
  const result = gradeFiles({ 'out.json': '{"nested":{"x":true,"y":[1,2]},"answer":42}' }, checks);
  assert.equal(result.passed, true);
  assert.deepEqual(result.checks, [{ type: 'json-equals', path: 'out.json', passed: true }]);
  assert.equal(gradeFiles({ 'out.json': '{"answer":42,"nested":{"y":[2,1],"x":true}}' }, checks).passed, false);
  assert.equal(gradeFiles({ 'out.json': '{"answer":42,"nested":{"y":[1,2],"x":true},"extra":1}' }, checks).passed, false);
  assert.equal(gradeFiles({ 'out.json': 'not json' }, checks).passed, false);
});

test('text and existence assertions require actual own string files', () => {
  assert.equal(gradeFiles({ 'empty.txt': '' }, [{ type: 'file-exists', path: 'empty.txt' }]).passed, true);
  assert.equal(gradeFiles({ 'out.txt': 'before NEEDLE after' }, [{ type: 'text-includes', path: 'out.txt', text: 'NEEDLE' }]).passed, true);
  assert.equal(gradeFiles({ 'out.txt': 'plain text' }, [{ type: 'text-excludes', path: 'out.txt', text: 'NEEDLE' }]).passed, true);
  for (const type of ['file-exists', 'json-equals', 'text-includes', 'text-excludes']) {
    const checks = [{ type, path: 'missing.txt', text: 'NEEDLE', expected: {} }];
    noPassingGrade({}, checks);
    noPassingGrade({ 'missing.txt': null }, checks);
    noPassingGrade(Object.create({ 'missing.txt': 'NEEDLE' }), checks);
  }
});

test('no empty or executable grader can produce a vacuous pass', () => {
  noPassingGrade({}, []);
  noPassingGrade({ 'out.txt': 'anything' }, [{ type: 'shell', path: 'out.txt', command: 'true' }]);
  noPassingGrade({ 'out.txt': 'anything' }, [{ type: 'javascript', path: 'out.txt', code: 'return true' }]);
});

// Aggregate and runPaired tests are appended once the Lead freezes the exact
// reporting and injected-runner API. They do not perform paid/provider calls.
