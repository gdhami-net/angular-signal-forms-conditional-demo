#!/usr/bin/env node
// Builds the app and runs the test suite, then asserts the lines the blog post
// quotes. A version bump that changes any of them fails here instead of
// quietly making the post wrong.
//
//   npm run check
//
// Exit code 0 means every line below printed PASS.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const NG = require.resolve('@angular/cli/bin/ng.js');
const ANSI = /\[[0-9;]*m/g;

let failures = 0;

function report(ok, line) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${line}`);
}

function ng(args) {
  const run = spawnSync(process.execPath, [NG, ...args], {
    encoding: 'utf8',
    shell: false,
  });
  return {
    code: run.status,
    out: `${run.stdout ?? ''}${run.stderr ?? ''}`.replace(ANSI, ''),
  };
}

// 1. The app compiles. Every snippet in the post comes out of src/app.
const build = ng(['build', '--configuration', 'development']);
report(build.code === 0, 'ng build (the form, the schema and the submit helper compile)');

// 2. The suite that asserts the post's claims.
const test = ng(['test', '--no-watch', '--reporters=dot']);
report(test.code === 0, 'ng test exits 0');
report(/Tests\s+13 passed/.test(test.out), 'ng test reports: Tests  13 passed');
report(/Test Files\s+2 passed/.test(test.out), 'ng test reports: Test Files  2 passed');

// 3. The versions the post names.
const pkg = (name) =>
  JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8')).version;

const core = pkg('@angular/core');
const forms = pkg('@angular/forms');
report(core.startsWith('22.'), `@angular/core is 22.x (${core})`);
report(forms.startsWith('22.'), `@angular/forms is 22.x (${forms})`);

// 4. Signal Forms is a stable entry point of @angular/forms, not a separate
//    package and not behind an experimental flag.
const formsPkg = JSON.parse(readFileSync(require.resolve('@angular/forms/package.json'), 'utf8'));
report(
  Boolean(formsPkg.exports?.['./signals']),
  '@angular/forms exports the ./signals entry point',
);

const types = readFileSync(
  new URL('./node_modules/@angular/forms/types/_structure-chunk.d.ts', import.meta.url),
  'utf8',
);
report(
  /A signal indicating whether a field is hidden\.\s*\*\s*\*\s*When a field is hidden it is ignored when determining the valid, touched, and dirty states\./.test(
    types,
  ),
  "@angular/forms types say a hidden field is ignored for the form's valid state",
);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
