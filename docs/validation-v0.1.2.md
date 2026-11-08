# Creator release v0.1.2

## Naming / layout

Package, repository, provider and entry are dsh-skill-creator. Skill name dsh-skill-creator and tool skill_eval are unchanged. Private case tools are creator_read/write/finish/skill; new output directory is .dsh-skill-creator/runs/. Previous local results are retained, not converted into new measurements. No library/storage publication authority was added.

Implementation, build scripts, CLI and benchmark code stay under src/. Root files are documentation, manifests and DSH discovery metadata. tests/, locale/ and LICENSES/ stay in place. A root-file guard rejects stray executable/build files without moving resource directories. Distribution excludes private experiment logs/transcripts and historical instruction copies. Full license texts are preserved.

## Checks

Offline suite covers scoped native skill loading, resource paths/aliases, text-only file capabilities, hidden objective checks, paired-input fairness, step/global budgets, usage unknowns, cancellation/disposal and package/license/layout guards. GitHub CI uses Node22, build/check, tests and npm pack; no install scripts or runtime npm dependencies are needed. Current release verification is offline plus read-only live activation, not another paid quality trial.

## Historical quality observations, not a new v0.1.2 claim

The preceding 0.1.1 experiment used48logical calls under one cap on openai-codex/gpt-6.1-sol/high. Creator and no-creator agents produced separate release procedures; fresh downstream agents tried1adaptation,2untouched holdout cases and1explicitly exploratory calibration. Both procedures produced correct final JSON on4/4 attempts. The creator-produced procedure completed4/4; the other used its4-call cap on extra verification and did not finish. The predeclared paired-completion gate therefore retained inconclusive, not semantic-quality gain. Scoped positive/near-miss routing was2/2 for the current skill; an unavailable positive baseline was not treated as evidence of helpfulness.

The full draft files were226/222words against a220word request (bodies208/192); this minor contract ambiguity was recorded separately, not concealed by structural checks. No revised skill was accepted from that experiment. Reported input56687/output3465/totalTokens136824 are preserved quantities, not a reconciled billing estimate; cache/HTTP retry/billing details remain unknown.

This release changes naming and distribution only. Tool aliases in the instructions were updated mechanically; it does not claim the renamed body was measured in those historical runs or that quality improved. The original measured artifacts remain local and are excluded from the public repository/package for privacy. No new paid model dispatch is needed for this release.
