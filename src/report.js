const number=x=>typeof x==='number'&&Number.isFinite(x)?String(Math.round(x*100)/100):'unknown';
const cell=x=>String(x??'unknown').replaceAll('|','\\|').replace(/[\r\n]/g,' ');
export function renderReport(report){
  const s=report.summary;
  return '# DSH paired skill evaluation\n\n'+
    `Mode: **${report.mode??'task'}**, split: ${report.split??'all'}. Verdict: **${s.verdict}**. Complete pairs: ${s.samples}; observed wins: ${s.observedWins}; regressions: ${s.observedRegressions}.\n\n`+
    `Manifest hash: \`${report.manifestHash}\`\n\nCandidate hash: \`${report.skillHash}\`\n\nCase-set hash: \`${report.caseSetHash}\`\n\n`+
    '## Actual attempts\n\n| Case | Split | Rep | Arm | Status | Passed | Calls | Input tokens | Output tokens | Cache-read tokens | Elapsed ms |\n|---|---|---:|---|---|---|---:|---:|---:|---:|---:|\n'+
    report.rows.map(r=>`| ${cell(r.caseId)} | ${cell(r.split)} | ${r.repetition} | ${r.arm} | ${r.status} | ${r.passed} | ${number(r.modelCalls)} | ${number(r.usage?.inputTokens)} | ${number(r.usage?.outputTokens)} | ${number(r.usage?.cacheReadTokens)} | ${number(r.elapsedMs)} |`).join('\n')+
    '\n\n## Interpretation\n\n'+s.limitations.map(x=>'- '+x).join('\n')+'\n- These are native capability-scoped text-file tasks, not general OS/shell execution.\n- Task mode preloads through the case-scoped native registry; routing mode records on-demand native loads in a controlled metadata probe, not the entire production search pipeline.\n- Provider-reported tokens are separate from bytes/chars and may not establish HTTP retry or billing totals.\n- No model/human subjective score is treated as an objective receipt. No skill is confirmed or published by this workbench.\n\n## Human review\n\nReview each arm output and visible tool transcript in its artifact directory. Record qualitative findings separately. If baseline already passes, do not invent a RED failure or claim the skill was necessary. Revise only from train evidence; keep holdout results for final evaluation.\n';
}
