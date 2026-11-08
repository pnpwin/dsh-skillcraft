---
name: dsh-skillcraft
description: Create, evaluate and improve DSH skills. Use for creating a new skill, repairing an existing skill, testing when it should trigger, or checking whether it improves real agent work versus a no-skill or prior-version baseline.
---

# DSH Skillcraft

<!-- Modified DSH edition; Apache-2.0 AND MIT. -->

## Outcome and boundaries

Produce a discoverable, usable skill and evidence about its effects. A valid document or a passing code regression is not proof that an agent benefits from the skill. The unit under test is **agent behavior with versus without the skill**, on the same task and inputs.

Use existing DSH tools and permissions. Do not read credential files, start a replacement server, grant tools or publish a skill merely to make an evaluation pass. `dsh_skillcraft` is a separate explicit paid workbench; it does not change dsh-skillgrowth mode, confirm evidence, or approve candidates. Case child sessions are subagents excluded from production learning.

## 1. Capture intent

Recover from the conversation before asking questions:
- What repeatable capability should improve, and for whom?
- What observable condition should trigger it, and which near misses should not?
- What inputs, outputs, tools and project boundary apply?
- What failure or unnecessary repeated work has actually occurred?
- What would count as success, regression or inconclusive evidence?

Confirm missing material decisions with the user. Project-specific skills are valid; label their scope instead of pretending the procedure is universal. Do not make another skill for an already adequate instruction or deterministic validator.

## 2. Draft a small hypothesis

Use name + a clear description of purpose/trigger, then a concise procedure. Native ACE entries may use description and trigger separately; do not stuff the whole workflow into catalog metadata. State when not to use the procedure, ordered actions, expected output and useful checks. Explain non-obvious reasons. Keep volatile run status, dates, personal paths and test counts out of reusable rules.

A draft before testing is allowed but remains an unvalidated hypothesis. Follow [writing guidance](references/writing.md) for examples, progressive loading and the rubric. Preserve existing skill identity when revising. Snapshot the exact prior body/resources before an edit; never delete an untested original on principle.

## 3. Register evaluations before interpreting results

Read [native evaluation](references/evaluation.md). Start with a few realistic train prompts plus untouched holdout variants. Both arms get the same task, input files, model/reasoning, tools and step limits; only the frozen skill treatment changes. For a new skill baseline means no target skill; for revision it means the frozen prior version.

Choose objective checks for objective outputs. Keep qualitative judgment explicitly separate. Private expected values are for the Host grader, not model prompts or the skill. Do not hide task requirements from the baseline and then give the answer in the skill. Freeze cases/checks before a measured run and retain failed attempts.

The built-in runner safely supports text-file tasks and finite declarative checks; it does **not** execute generated JavaScript, shell, arbitrary graders, or general project builds. For other tasks use separately authorized trusted evaluators/native agents and report their isolation/measurement limits, not invented support.

## 4. RED → GREEN → REFACTOR

1. Validate the JSON spec using `dsh_skillcraft` action `validate` (no model calls).
2. Obtain user approval for the bounded paid experiment when not already covered by the request. Set a total logical-call cap; count failures and both arms.
3. Run `dsh_skillcraft` action `run`; collect its native job with `job_output`, cancel via `job_kill`. Continue useful independent work rather than polling or sleeping.
4. **RED:** inspect actual baseline agent behavior, outputs and failing assertions. A deliberately broken input function alone is not a baseline agent failure.
5. If baseline already succeeds, report that honestly. Investigate costs/variance or choose a genuinely different task; do not manufacture failure, weaken baseline tools, or force a skill.
6. **GREEN:** if there is an observed deficiency, put the smallest reusable correction into the skill, not into case inputs or expected answers. Run the same paired train cases against the frozen baseline.
7. **REFACTOR:** improve generality and clarity, then rerun paired checks. Use new variants and untouched holdout before claiming transfer. Never tune on holdout outputs or choose the final variant using its holdout score repeatedly.

If candidate and baseline both pass, correctness benefit is unestablished. Lower measured costs can be reported separately, not promoted to general quality superiority. Small samples are observations, not causal or statistical guarantees.

## 5. Review and iterate

Read [review and routing](references/review.md). Inspect visible tool transcripts as well as final files: a result can be right through the wrong or unsafe process. Host objective grades, blind qualitative review, and author self-judgments are different evidence classes. Record conflicts; do not convert a model opinion into a trusted receipt.

Use a fixed iteration/call budget and a stop condition. Keep the original and each attempt. If there is no discriminating case or no meaningful progress, finish with an inconclusive report rather than an automatic rewrite loop. No mandatory commit, push, installation, or publication follows from creating skills.

## 6. Check discovery separately

Describe the purpose and specific trigger without over-broad keyword bait. Build realistic should-trigger and should-not-trigger prompts, including adjacent near misses. Task execution with a preloaded skill does not test discovery. In native fresh-session routing trials, record actual `skill` loads and exact body identity; a model saying it would load is not a load. Use the controlled native `mode:"routing"` probe in [review and routing](references/review.md), then a separately authorized real-catalog check. The routing probe records actual scoped loads, but is not a measurement of the entire production search pipeline; do not label a preloaded task score a trigger rate.

## 7. Deliver

Return the skill, exact revision/hash, cases, all attempted runs, objective scores, actual/unknown tokens and time, baseline comparison, limitations and next action. Use `present` for final files when useful. No claim of use/helpfulness follows from availability/loading alone.

For ACE-managed skills, respect the existing native human commands and selected policy. A generated pending candidate is not an active instruction. This creator skill never bypasses confirmation, candidate validation, review, protected entries or the current project scope.

## Resources

- [Evaluation schema and calls](references/evaluation.md): read before creating a spec or running paid tests.
- [Writing rubric](references/writing.md): read when drafting/refining text or choosing guidance form.
- [Human/blind review and routing trials](references/review.md): read for qualitative review or trigger accuracy.
- `scripts/cli.js`: offline spec validation and Markdown report regeneration; invoke through Node. It never calls a model.
