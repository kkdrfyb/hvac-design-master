# Automated Test Report

- Generated At: `2026-02-23 18:59:26`

## Summary

- Unit Tests: `PASS` (1.6s)
- Production Build: `PASS` (1.2s)
- Backend Syntax: `PASS` (0.1s)

## Details

### Unit Tests

- Command: `npm test -- --run`
- Exit Code: `0`
- Duration: `1.6s`

```text
> hvac-design-master-(暖通设计管家)@0.0.0 test
> vitest --run


[1m[46m RUN [49m[22m [36mv4.0.18 [39m[90mD:/python/hvac-design-master-main[39m

 [32m✓[39m src/tests/DataHardening.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m src/tests/useStageNavigation.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/tests/useProjectSync.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/tests/useProjectCreation.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/tests/useTaskOperations.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/tests/useKnowledgePanels.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 60[2mms[22m[39m
 [32m✓[39m src/tests/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 55[2mms[22m[39m
 [32m✓[39m src/tests/useProjectBootstrap.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[32m 201[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m16 passed[39m[22m[90m (16)[39m
[2m   Start at [22m 18:59:27
[2m   Duration [22m 1.10s[2m (transform 686ms, setup 429ms, import 1.43s, tests 388ms, environment 4.13s)[22m
```

### Production Build

- Command: `npm run build`
- Exit Code: `0`
- Duration: `1.2s`

```text
> hvac-design-master-(暖通设计管家)@0.0.0 build
> vite build

[36mvite v6.4.1 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 47 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  1.54 kB[22m[1m[22m[2m │ gzip:  0.69 kB[22m
[2mdist/[22m[35massets/index-3JuP6iDe.css  [39m[1m[2m 28.07 kB[22m[1m[22m[2m │ gzip:  5.17 kB[22m
[2mdist/[22m[36massets/index-DStehqna.js   [39m[1m[2m272.05 kB[22m[1m[22m[2m │ gzip: 80.88 kB[22m
[32m✓ built in 752ms[39m
```

### Backend Syntax

- Command: `python -m py_compile server/app.py`
- Exit Code: `0`
- Duration: `0.1s`

```text
[No output]
```
