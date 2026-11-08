# Human review, blind comparison and routing

## Quantitative and qualitative evidence

Read benchmark.md plus arm output files and bounded visible tool transcripts. Programmatic checks answer only the declared assertions; author/model self-ratings do not establish correctness. Token/time differences are separately measured and must not be substituted for quality. Look for nondiscriminating assertions, variance, incomplete arms, ceiling effects and task-specific overfitting.

Record human feedback as a plain file, for example:

```json
{"reviews":[{"caseId":"example","arm":"with_skill","feedback":"Describe the observed output issue and evidence."}],"status":"complete"}
```

Empty feedback means no comment, not proof of success or approval to publish. Discuss subjective quality with the user; don't automatically translate satisfaction into a trusted benchmark receipt.

For blind review, prepare A/B artifact labels without arm identity, give the reviewer the same rubric, preserve the private mapping, and compare outputs before revealing labels. A fresh native subagent may provide a qualitative comparison, but its judgment remains model opinion; no raw private reasoning, missing usage, or unrelated checks are invented. A separate reviewer is optional and consumes the explicitly approved shared experiment allowance if it calls a model.

## Controlled native routing probes

Task mode preloads the skill. To test the description separately, create a spec with `mode:"routing"`; cases use normal `id/split/prompt/files/writable`, with `files:{}` and `writable:[]` allowed. Checks are `{"type":"skill-loaded","expected":true}` or false. The optional body is not preloaded. The native child receives only its name/description and must call `creator_skill` if relevant, then finish. The tool performs the actual exact scoped native registry load.

Use realistic should-trigger/should-not-trigger prompts, especially adjacent near misses. For new skills the no-skill baseline is unavailable; evaluate the candidate's positive/negative routing correctness rather than calling absence of a skill a quality failure. For description revisions give baselineSkill the frozen old version. Retain inputs before optimizing, train on one split and finalize against untouched variants. The report is explicitly a **controlled description-routing probe**, not a measurement of the entire production catalog/search pipeline.

Do not generate twenty vague keyword queries just to meet a quota. Choose enough representative cases for the available budget, then expand if warranted. Keep the total cost across iterations, graders and routing trials under one declared cap. User approval of an evaluation is not permission for an unbounded optimization loop.

## Full DSH discovery check

After an independently authorized installation, verify actual catalog discovery using `skill_search` and native `skill` in the real target workspace. Record the exact registered skill name/revision/body and the task context. Loading is exposure, not proof of use; completing a task afterwards is association, not by itself causal benefit. Do not install a target in the baseline environment or register a second active mirror under another provider.

## Native skill-loop boundary

The creator workbench never confirms, changes mode, approves, archives, rolls back, or restores skill-loop storage. Keep using native human commands for those decisions. Current auto policy may permit bounded verified additions, but an evaluation artifact here is not an unforgeable skill-loop evaluator receipt. Integrating new evaluator authority requires its own explicit contract, not a copied JSON success flag.
