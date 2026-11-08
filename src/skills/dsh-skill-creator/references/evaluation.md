# Native DSH evaluation

<!-- Modified DSH edition; Apache-2.0 AND MIT. -->

Use native `skill_eval`; generated file contents are never executed.

## Explicit data contract

Write a JSON spec inside the current workspace. Candidate/resource paths are relative to that spec; symlinks escaping the workspace and sensitive credential filenames are denied. Resources should be inside the candidate skill directory and are exposed read-only under `.skill/` in controlled cases. Snapshot hashes freeze the body, description, resources and case set before dispatch.

```json
{
  "schemaVersion":1,
  "mode":"task",
  "skill":{"name":"example-skill","description":"When to use this procedure.","contentPath":"candidate/SKILL.md","resources":[]},
  "baselineSkill":null,
  "repetitions":1,
  "seed":42,
  "cases":[
    {"id":"train-example","split":"train","prompt":"Read input.json and write result.json according to the supplied task contract.","files":{"input.json":"{\"value\":2}"},"writable":["result.json"],"checks":[{"type":"json-equals","path":"result.json","expected":{"value":2}}]}
  ]
}
```

The prompt example above demonstrates the schema, not a useful discriminating benchmark. Supply actual task requirements and fixtures available equally to both arms. New skill baseline=null; for editing, give baselineSkill the old frozen name/description/contentPath/resources.

Allowed checks: `json-equals` (complete parsed JSON equality), `file-exists`, `text-includes`, `text-excludes`. Checks are hidden from the agent and evaluated by the Host only after `creator_finish`. A correct-looking string, self-printed exit marker or final claim is not a passing objective check. Output source code remains text; this evaluator cannot certify code execution or OS-dependent procedures. Register/use a separate trusted evaluator for those tasks, with explicit permission and budget.

## Operations

1. `skill_eval({action:"validate",specPath:"evals.json"})`: schema, snapshots, scope and hashes; zero model calls.
2. `skill_eval({action:"run",specPath:"evals.json",split:"train",maxCalls:18,timeoutMs:300000})`: starts a native owned job; returns jobId/runId/artifact directory.
3. Collect via `job_output`; stop via `job_kill`. Those are ordinary DSH job controls. Do not poll agent/status or use an external server.
4. `skill_eval({action:"report",runId:"..."})`: bounded summary and report paths for the owning session. Files persist in the workspace even after plugin restart; read them directly if the in-memory index is gone.
5. Use `split:"holdout"` only for final checks, or `all` for a predeclared one-shot comparison. Default=train; refinements use train only. Reduce maxCalls to the remaining total experiment allowance across successive runs; every run's limit is NOT a fresh permission to spend the original experiment cap again.

Outputs are under `.dsh-skill-creator/runs/<runId>/`: frozen plan, arm results, output files, bounded visible tool transcripts, benchmark.json and benchmark.md. No raw private reasoning is stored. No arbitrary HTML viewer is embedded. Use normal file links/present for review.

## Fairness and accounting

- Each arm is a fresh native `agentLoop` child, origin=subagent, same provider/model/reasoning, prompt, input snapshot, tool schemas, max output and step cap. Pair launch order is seeded, two arms run concurrently, pairs are processed sequentially.
- Each arm owns a separate memory file map and artifact directory. Only explicit read/write/finish/optional-skill tools exist. This is a capability-scoped text environment, not a general OS sandbox.
- Task mode preloads exact candidate content through the native case-scoped skill registry; baseline gets no candidate or the old version. Native body/provider equality is checked. Preload is availability, not proof that an entry influenced behavior.
- One shared logical budget reserves before every native model dispatch, including failed and auxiliary/title requests admitted in that scope. Step/deadline/cancel and budget denials cannot become success.
- Reported provider tokens are recorded separately from input/output character lengths and wall-clock time. Missing tokens/cache are null, never zero. Provider usage is not an assertion about hidden HTTP retries or final billing.
- Pair/split statistics are descriptive. One complete pair has no sample standard deviation estimate. Missing, failed or truncated arms make results incomplete/inconclusive rather than evidence of a win.

Do not repeatedly tune using holdout score. For stronger evaluation, have an independent owner provide held-out tasks; a case labeled holdout is not magically unknown to its author.
