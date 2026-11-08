# Context cleanup — v0.1.1 / skill-loop v0.2.3

The active skill/resources now contain only the DSH workflow and short license/modification markers. Source history, platform migration comparisons and redundant descriptions of discarded rules were removed. Full license/copyright texts remain unchanged in LICENSES; legal attribution and modified-work notices are isolated in NOTICE.md. No license file is linked as a normal skill-reading step.

## Measured scope

| Material | Before chars | After chars | Before UTF-8 bytes | After UTF-8 bytes |
|---|---:|---:|---:|---:|
| Main skill, normally loaded |7735|7375|7739|7379|
| Main + all optional references |23235|19412|23241|19416|
| Curator working rubric |979|979|979|979|

Main body reduction:360characters,4.65%. Complete model-facing resource set reduction:3823characters,16.45%. References are progressively loaded, not all injected on every call. The Curator rubric already contained no vendor history and was left behaviorally unchanged; its source provenance version/hash was updated separately. No reduction in Curator prompt tokens is claimed.

The obsolete migration resource was deleted. Two original vendor instruction copies (49906UTF-8bytes) were removed from the source/distribution; they had NOT been automatically injected, so their size is distribution reduction, not extra per-request context savings. Historical measured transcripts remain preserved locally but are excluded from the new authoring package; they are not rewritten to pretend they tested the cleaned instructions.

These measurements are exact text lengths/bytes, NOT actual tokenizer/provider-token or billing measurements. No paid evaluation/model runs were performed for this cleanup; no quality/cost-saving claim is inferred.

## Verification

- Authoring:113offline tests, including resource keyword/link checks, byte-identical license hashes and package exclusion of obsolete sources/transcripts.
- Skill-loop:316offline tests, including vendor-free actual auxiliary prompts, unchanged979character rubric and the existing paired-gain/publication/protection/quota guards.
- Fresh native installation uses new versioned packages; skill-loop mode, persistent counters, pending hashes and library are checked before/after. No permissions, credentials, learned-skill confirmations or publication policy changed.
- Native evaluator behavior is unchanged. This documentation-only cleanup is not a new baseline/with-skill quality experiment.
