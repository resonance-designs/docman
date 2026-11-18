# PR 47 check triage — November 18, 2026

Inspected GitHub check 134713187637 and the exact historical source lines. Values are intentionally omitted.

| GitGuardian incident | Commit / location | Source assessment |
| --- | --- | --- |
| 40181310 | 88d01a1, docker-compose.yml:24 | Local Redis fixture healthcheck credential. Compose file was subsequently removed. Test credential; confirm it was never reused outside testing before dismissing. |
| 40181311 | 88d01a1, backend/src/scripts/smokeTest.js:19 | Hard-coded fallback for seeded administrator login. Removed from current code; explicitly supplied environment password is now required. Confirm no deployed account still uses the historical default; rotate any such account. |
| 40181312 | 024e24e, backend/src/__tests__/compliance/redisProvider.test.js:178 | Credential for an in-process fake Redis server. Current fixture now generates a fresh random password. |
| 40181313 | 024e24e, backend/src/__tests__/compliance/redisProvider.test.js:119 | Synthetic value testing environment-based Redis configuration. Current fixture now generates a random value. |
| 40181314 | 88d01a1, backend/src/scripts/smokeTest.js:94 | Generated test-registration password, not a production service credential. Current code uses independent cryptographic randomness. |
| 40242291 | 7398d49, backend/src/services/emailSettingsService.js:26 | False positive: allowlist of input field names (including smtpPassword and sesSecretAccessKey), not secret values. Keep the allowlist intact. |

The verification wrapper now generates one random administrator password per run and passes the same value to seeding and smoke-test login. It does not print the password.

Historical findings remain in the PR's commits. A new commit does not erase them. No incidents were dismissed, no checks bypassed, and no history rewritten during this investigation. Maintainers must review/classify the exact incidents in GitGuardian; the historical administrator default requires deployment/reuse confirmation. Do not blanket-ignore files or all secret findings.

The dependency check runs on both push and pull_request. Both failures represent the same outstanding Picomatch advisory, not separate regressions. Rechecked https://github.com/advisories/GHSA-fc5q-39xc-vjpf: affected versions <=4.0.7, patched versions None. Retain the failing audit and the exposure assessment in dependency-security-review.md; no package downgrade or suppression was applied.

CodeRabbit skipped analysis because 362 files exceed the reported 100-file limit. It has not reviewed this PR. A maintainer must arrange review within its plan limits or a separate human review; disabling the status message is not a code review.
