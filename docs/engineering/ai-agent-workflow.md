# AI Agent Workflow

This document defines the operating modes and approval workflow for AI coding agents working on Recess Studio. The root constitution lives in [AGENTS.md](../../AGENTS.md).

The core principle: **approval to plan is not approval to implement.** An agent must not begin editing files until the user has explicitly authorized implementation.

---

## Modes

### Review mode

**Purpose:** Inspect the repository and report findings. Do not modify the working tree.

- Read relevant source, tests, docs, ADRs, and the current Git state.
- Report findings with evidence (file paths, line numbers, command output).
- Assign severity: informational, minor, major, critical.
- Do not edit files, run refactors, or change configuration.
- Do not fix problems found; record them for a follow-up.

Output: a concise findings report. No changes to the working tree.

### Planning mode

**Purpose:** Inspect the repository and propose a solution. Stop before implementing.

- Read the same materials as Review mode.
- Produce a plan identifying:
  - Affected files and their ownership.
  - Architectural boundaries crossed.
  - Risks and how they are mitigated.
  - Tests to add or update.
  - Verification steps.
- For ambiguous requirements, identify the ambiguity and ask, rather than guessing.
- Do not edit application code, tests, migrations, manifests, or assets.
- Stop and wait for explicit user approval before implementing.

Output: a written plan. No changes to the working tree except, if appropriate, documentation the user asked for during planning.

### Implementation mode

**Purpose:** Execute an approved plan within its authorized scope.

- Begin only when the user has explicitly authorized implementation (e.g., "approved," "proceed," or a task that clearly requests implementation).
- Stay within the authorized scope. Do not broaden a focused task into a refactor.
- Preserve unrelated work and existing decisions.
- Follow the agreed plan and existing architecture.
- If a material discovery requires a different approach, or a gameplay / contract / architectural decision is needed, **stop and explain** before proceeding.
- Run relevant tests, type checks, and linting. Do not modify or remove existing tests to make them pass unless the test is demonstrably wrong (and then explain why).

Output: working-tree changes matching the approved scope.

### Verification mode

**Purpose:** Inspect the diff and confirm the work is correct and complete.

- Run `git status` and `git diff --check`.
- Inspect `git diff` for scope creep or unrelated changes.
- Run relevant checks: type checks, linting, tests, builds.
- For visual or interactive work, verify the rendered output in an actual browser where tooling permits.
- Verify that assets load and that error / loading / empty states behave.
- Report results **and limitations** accurately. Do not mark a requirement as passed if it could not be verified.

Output: a verification report stating what was checked, what passed, what failed, and what was not verified.

---

## Approval gates

```
Review  →  (findings)
Planning →  (plan)  →  USER APPROVES IMPLEMENTATION  →  Implementation  →  Verification  →  Final report
```

- A plan without explicit implementation approval does not authorize edits.
- If the user says "looks good" to a plan, confirm whether that means approval to implement.
- If scope changes during implementation, return to planning and re-approve.

---

## Escalation rules

Stop and ask the user when:

- The requirement is ambiguous and multiple reasonable approaches exist.
- A change would cross an architectural boundary (game rules into React, database into game logic, etc.).
- A change would alter established game mechanics, API contracts, database schemas, or privacy guarantees.
- Existing tests would need to be weakened or removed.
- Required verification tooling is unavailable.

Do not silently pick the easiest option. Preserve uncertainty and document unresolved decisions rather than turning assumptions into requirements.

---

## Definition of done

An implementation is complete only when all applicable criteria from [AGENTS.md](../../AGENTS.md#8-definition-of-done) are satisfied. In summary:

1. Meets authorized requirements.
2. Respects architectural boundaries.
3. Has meaningful tests for changed behavior.
4. Type checks, linting, tests, and builds pass.
5. Critical interactions exercised where applicable.
6. Visual work inspected in rendered output where tooling permits.
7. Assets exist and load.
8. Accessibility, responsiveness, error handling considered.
9. Diff contains no unrelated changes.
10. Final report distinguishes verified facts from assumptions.

If a verification cannot be completed, report the limitation and remaining risk. Do not mark it passed.

---

## Final reporting

Every implementation task ends with a concise report containing:

- Files changed (with links).
- Substantive changes per file.
- Tests run and results.
- Verification performed and any limitations.
- Unresolved decisions requiring follow-up.
- Confirmation that the work stayed within scope.

Do not claim the application improved as a result of documentation-only changes.
