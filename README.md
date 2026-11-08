# DSH Skillcraft

**v0.1.3 — DSH Skillcraft:** package, repository, provider and skill are `dsh-skillcraft`. The model tool is `dsh_skillcraft`; isolated case tools use `dsh_skillcraft_*`. New outputs go under `.dsh-skillcraft/runs/`; old experiments are retained unchanged. This release renames identifiers, not evaluation methodology or quality claims. [Migration notes](docs/release-v0.1.3.md).

All implementation, build, CLI and benchmark code belongs in `src/`. Root files are documentation, manifests and DSH discovery metadata. Existing `tests/`, `locale/` and resource directories stay in place. See [validation and quality limits](docs/validation-v0.1.2.md).

Native **dsh-skillcraft** for authoring and evaluating DSH skills. The workflow is intent → draft → actual baseline agent behavior → RED/GREEN/REFACTOR → held-out evaluation → improvement. A failing code fixture is not a baseline agent failure.

v0.1.1 removes migration/history prose: main skill7735→7375characters; full optional resource set23235→19412. These are text lengths, not measured provider tokens. [Scope and checks](docs/context-cleanup-v0.1.1.md).

## What is installed

- Native skill with [progressive resources](src/skills/dsh-skillcraft/SKILL.md).
- `dsh_skillcraft`: explicit paid native paired task/routing evaluation, owned background jobs, objective finite checks and measured/unknown usage/time.
- [Offline CLI](src/skills/dsh-skillcraft/scripts/cli.js) for validation/report regeneration; no model calls.
- [EN](locale/en.json)/[RU](locale/ru.json) display metadata and original [SVG icon](src/icon.svg).

The evaluator never executes generated source or publishes learned skills. It does not change the dsh-skillgrowth library or policy. Skillgrowth uses a separately versioned compact Skillcraft rubric.

## Install / use

Requires DSH0.2.2-rc.1 and Node>=22. No runtime npm dependencies or installation scripts. Author/install through Plugin Manager, not manual profile manifest edits:

```json
{"action":"install_bundle","target":"github:pnpwin/dsh-skillcraft#v0.1.3","enabled":true}
```

Load `dsh-skillcraft` through normal skill discovery; read [native evaluation](src/skills/dsh-skillcraft/references/evaluation.md) before writing a spec. Then:

```json
{"action":"validate","specPath":"evals.json"}
{"action":"run","specPath":"evals.json","split":"train","maxCalls":18,"timeoutMs":300000}
```

Collect the returned native job with `job_output`, cancel with `job_kill`. Report remains available via `dsh_skillcraft` action report or artifact files. Use holdout only for final evaluation, not tuning. Reduce maxCalls across iterations so the **sum** stays within the user's experiment allowance.

### Boundaries

The built-in runner supports text-file tasks with independent in-memory file maps and declared output paths. Only four owned tools are available: read, write, finish, optional native skill load. It never executes file contents. Objective checks are json-equals/text-includes/text-excludes/file-exists, hidden until Host grading. Other domains need a separately authorized trusted evaluator, not model-generated shell scripts.

`mode:task` preloads exact skill content through the native scoped registry. `mode:routing` gives metadata only and records actual on-demand native loading; checks are skill-loaded true/false. It is a controlled description probe, not a claim about full production search accuracy. Model/permissions/task inputs are held equal between paired arms.

Config: maxLogicalCalls18 (1–200), timeoutMs300000 (5000–300000), maxSteps4 per case (1–12), maxOutputTokens1500 (256–6000). A run argument cannot exceed Config. Defaults are not permission for repeated unbounded runs. Every admitted model dispatch in the case scope, including failed and auxiliary calls, consumes the shared cap. Failed/truncated arms and unknown usage remain visible; no JSON repair loop or hidden retries are added by this bundle.

### Interpretation

Reports separate train/holdout, paired wins/regressions, time, reported tokens and sample variance when meaningful. Baseline already passing or equal scores means no observed quality gain, not a reason to manufacture a failure. Loaded is not used; a benchmark artifact is not a publication receipt. No cost/causal improvement claim follows from a single small experiment. Cache/billing/HTTP retries may be unknown even with reported token counts.

## Development

```bash
node --test tests/*.test.mjs
node src/check-package.js
node src/check-package.js --pack
```

See [license notices](NOTICE.md). Evaluation history is retained separately from current model-facing resources; it is not a new quality-gain claim.
