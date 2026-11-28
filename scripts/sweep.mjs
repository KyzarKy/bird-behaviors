// Runs the simulated bird tests under N random seeds (default 20) and lists what failed under which seed.
// Usage: npm run sweep [-- N]. Each failing seed is rerun once to tell a repeatable failure from one that isn't.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const n = Number(process.argv[2] ?? 20);
const dir = mkdtempSync(join(tmpdir(), 'sweep-'));

const run = (seed) => {
  const out = join(dir, `${seed}.json`);
  spawnSync('npx', ['vitest', 'run', 'src/birds/birds.test.ts', '--reporter=json', `--outputFile=${out}`], {
    env: { ...process.env, SEED: String(seed) },
    shell: true,
    stdio: 'ignore',
  });
  try {
    const r = JSON.parse(readFileSync(out, 'utf8'));
    return r.testResults.flatMap((f) => f.assertionResults.filter((a) => a.status === 'failed').map((a) => a.fullName));
  } catch {
    return ['(the test run itself failed)'];
  }
};

const failed = new Map();
for (let i = 0; i < n; i++) {
  const seed = 1 + Math.floor(Math.random() * 2147483645);
  const names = run(seed);
  console.log(`${i + 1}/${n} SEED=${seed}: ${names.length ? `${names.length} failed` : 'ok'}`);
  if (names.length) failed.set(seed, names);
}

if (!failed.size) {
  console.log(`\nAll ${n} seeds passed.`);
  process.exit(0);
}
console.log('');
for (const [seed, names] of failed) {
  const again = new Set(run(seed));
  console.log(`SEED=${seed}`);
  for (const name of names) console.log(`  ${again.has(name) ? 'repeats ' : 'once    '} ${name}`);
}
console.log(`\n${failed.size} of ${n} seeds failed.`);
process.exit(1);
