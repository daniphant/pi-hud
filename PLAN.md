# pi-hud OSS extraction plan

Status: DRAFT
Owner: daniphant
Working artifact source: `~/projects/pi-hud/extensions/pi-hud/index.ts`

## Goal

Turn the current local Pi HUD extension into a clean, documented, testable open source repository that can be published on GitHub and later packaged for Pi users.

## Constraints

- Must preserve current working behavior for:
  - context bar
  - Codex quota display
  - GLM / z.ai quota display
  - persisted settings
  - `/hud` command UX
- Must improve maintainability before publishing
- Should be installable by other Pi users without copying files manually

## Deliverables

1. Standalone repository at `~/projects/pi-hud`
2. Extracted extension code under repo-managed source layout
3. Refactored modules with explicit types
4. README with install, usage, commands, screenshots, limitations
5. CONTRIBUTING, LICENSE, CHANGELOG
6. Tests for parsing, formatting, caching, and command/config behavior
7. CI for typecheck + tests
8. Initial release-ready package metadata

---

## Workstreams

These are designed to be parallelizable, even if execution here is sequential.

### Workstream A — Repository scaffolding

**Goal:** Create a real OSS repo skeleton.

Tasks:
- Create repo structure
- Add `package.json`, `tsconfig.json`, `.gitignore`
- Add `LICENSE`
- Add GitHub Actions workflow
- Add basic npm/pi package metadata

Output:
- Buildable repo skeleton

### Workstream B — Code extraction and refactor

**Goal:** Move the extension into a maintainable module layout.

Tasks:
- Copy working extension into repo
- Split into modules under `extensions/pi-hud/`:
  - `extensions/pi-hud/index.ts`
  - `extensions/pi-hud/types.ts`
  - `extensions/pi-hud/render.ts`
  - `extensions/pi-hud/providers/codex.ts`
  - `extensions/pi-hud/providers/zai.ts`
  - `extensions/pi-hud/format.ts`
- Keep behavior unchanged initially
- Add comments only where they reduce ambiguity

Output:
- Refactored source tree with stable public entrypoint

### Workstream C — Quality hardening

**Goal:** Reduce fragility before publishing.

Tasks:
- Normalize error handling
- Make cache/persistence logic explicit
- Verify stale-while-refresh behavior
- Verify provider detection behavior
- Add width/truncation safeguards
- Add optional debug hooks if low effort

Output:
- More robust extension internals

### Workstream D — Test coverage

**Goal:** Make the repo believable and maintainable.

Tasks:
- Add unit tests for:
  - model/provider detection
  - path formatting
  - model label formatting
  - reset countdown formatting
  - Codex response parsing
  - z.ai response parsing
  - cache TTL behavior
  - settings persistence load/save behavior
- Add render-shape tests for representative footer states

Output:
- Repeatable correctness checks

### Workstream E — Documentation

**Goal:** Make it easy for strangers to install and trust.

Tasks:
- README
- CONTRIBUTING
- CHANGELOG
- `docs/configuration.md`
- `docs/architecture.md` (short)
- add placeholder sections for screenshots/GIFs

Output:
- Publishable documentation set

### Workstream F — Release prep

**Goal:** Make GitHub publication low-friction.

Tasks:
- Final sanity pass
- verify installation instructions
- verify repo-local extension loading path
- prepare initial version tag target: `v0.1.0`

Output:
- First public release candidate

---

## Execution order

### Phase 1 — Foundation
1. Workstream A
2. Workstream B

### Phase 2 — Reliability
3. Workstream C
4. Workstream D

### Phase 3 — Public-facing polish
5. Workstream E
6. Workstream F

---

## Parallelization map

If we had true subagents, I would split it like this:

- **Agent 1:** Repo scaffolding + package metadata
- **Agent 2:** Code refactor and module extraction
- **Agent 3:** Test suite and fixtures
- **Agent 4:** Docs, README, CONTRIBUTING, CHANGELOG
- **Agent 5:** QA/review pass on install flow and OSS polish

Because this environment does not expose a true subagent/swarm tool, execution will be done by one agent, but we can still work in those isolated workstreams.

---

## Success criteria

- Repo can be opened by a stranger and understood quickly
- Core behaviors are covered by tests
- Install instructions are clear and accurate
- Extension remains functional in Pi after refactor
- No repo-specific secrets or machine-local assumptions leak into the codebase

---

## Progress update

### Completed
- [x] Scaffolded repository layout under `~/projects/pi-hud`
- [x] Added `package.json`, `tsconfig.json`, `.gitignore`
- [x] Added GitHub Actions CI workflow
- [x] Added OSS docs: `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`
- [x] Added architecture and configuration docs under `docs/`
- [x] Refactored to a canonical Pi extension directory at `extensions/pi-hud/`
- [x] Extracted core logic into testable modules inside the extension directory
- [x] Added unit tests for formatting, providers, rendering, and settings persistence
- [x] Ran `npm run check` successfully
- [x] Removed the duplicate entrypoint approach in favor of a canonical extension directory

### Next
- [ ] Add screenshots / GIFs for the README
- [ ] Symlink `~/projects/pi-hud/extensions/pi-hud` into `~/.pi/agent/extensions/pi-hud`
- [ ] Initialize git and prepare first public commit
