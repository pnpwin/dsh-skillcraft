# Writing a useful skill

<!-- Modified DSH edition; Apache-2.0 AND MIT. -->

## What to preserve

A skill is a repeatable method, not a narrative about one conversation. Capture the actionable correction supported by observations, its prerequisites and boundaries. Project conventions can be legitimate skills in DSH; label the project scope and keep deterministic enforcement in code where possible.

Name the actual capability. Describe what it accomplishes and specific situations in which it is useful; separate trigger conditions from a long workflow. Include near misses. Do not expand trigger wording until unrelated tasks load it. Metadata helps discovery; it must not replace reading the procedure.

Keep the main body compact. Put likely-needed adjacent context near each action; link optional references with a clear reason to read them. Use one complete relevant example rather than many generic templates. Separate large reusable scripts/resources only when observed repeated work justifies them. Prefer explanations of non-obvious reasons over redundant MUST/NEVER lists.

## Match form to observed failure

- Agent skips a safety or permission rule: explicit boundary, observable stop condition and relevant counterexample; do not permit instructions to override Host policy.
- Agent produces the wrong shape: a positive output contract with ordered required parts, rather than a long list of prohibitions.
- A required element is omitted: put a named required slot in the template.
- Behavior depends on state: express an observable if/then condition, not an unconditional demand with vague exemptions.

Source principle: read and test actual agent behavior; don't assume that stronger wording always improves compliance. A skill that merely repeats standard model knowledge may add cost without a measurable gain.

## Minimal draft rubric

1. A bounded repeated problem is named, along with applicable and non-applicable conditions.
2. Inputs, prerequisites, available tools and expected outputs are concrete.
3. Steps can be followed; no invented APIs or unavailable services.
4. Examples illustrate the procedure rather than reveal hidden evaluation answers.
5. Checks distinguish correct output from plausible claims.
6. The procedure generalizes within its declared scope; it contains no personal absolute paths, mutable run status or fixed historical test counts.
7. Existing identity/protected constraints are preserved; duplicate skills and contradictory instructions are avoided.
8. Evidence, structural validity, candidate tests, publication and downstream usefulness remain separate claims.

## RED / GREEN / REFACTOR

A first draft is a hypothesis. Observe baseline agents on preregistered tasks before claiming the skill remedies anything. A failing unit test in a deliberately broken program is not the same as a baseline agent failing the task. Keep baseline and treatment conditions equal.

Write the smallest correction grounded in the baseline failure. Re-run identical train scenarios against the unchanged baseline and record every attempt, even aborted/provider-failed cases. Only then try genuinely new variants/holdout. If baseline was already correct, don't claim necessity; collect additional discriminating evidence within the approved budget or stop.

Reference-style skills may be evaluated for retrieval and application; subjective style needs qualitative review, not invented objective assertions. Small wording probes and pressure scenarios can be useful, but the number of samples is selected explicitly for the risk/budget, not forced to five or more in every tiny request. Never turn one favorable run into a broad success claim.
