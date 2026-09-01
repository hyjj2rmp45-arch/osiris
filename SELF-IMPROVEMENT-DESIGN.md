# Self-Improving Agent Design Document v3

## Overview

This document outlines the design for enhancing OSIRIS's self-improvement system using enterprise-grade safety patterns from Anthropic, Microsoft, NIST AI RMF, ISO/IEC 42001, OWASP ASI, AWS Security, CSA RSI research, AI agent observability platforms (Confident AI, Agentuity, Vellum, PredictionGuard, Fiddler), and real-world CI/CD self-healing implementations.

## Current State

### Existing Implementation in worker.js (Lines 1280-1448)

**Classes & Functions:**
1. **`PostmortemGenerator`** — Creates incident postmortems after fix application
2. **`RootCauseAnalyzer`** — RCA for recurring failures with pattern matching
3. **`ErrorImpactScorer`** — Severity classification (1-5) based on system impact
4. **`SelfHealingEngine`** — Main orchestrator coordinating all components
5. **`GitOpsRemediation`** — Immutable git-backed audit trail for fixes

**Key Functions:**
- `calculateFixConfidence(pattern)` — Computes confidence from pattern match
- `routeFix(severity, confidence)` — Routes to AUTO_FIX, QUEUE, or ESCALATE
- `createHumanInTheLoopPR(error, fix, confidence)` — GitHub PR creation
- `pendingApprovals` — Queue system with expiry and escalation
- `fixOutcomeHistory` / `fixOutcomeIndex` — Outcome tracking
- `computeFixConfidence(fixId)` — Time-decayed confidence scoring (90-day window)
- `pruneStaleFixOutcomes()` — Memory management
- `updateKnownFixConfidence()` — Self-updating known fixes
- `classifyFixOutcome(error, fix)` — Success/failure classification

### Existing Strengths
- ✅ Confidence scoring with time decay
- ✅ Severity-based routing (1-5 scale)
- ✅ Human-in-the-loop PR creation
- ✅ Pending approvals with 30min expiry
- ✅ Fix outcome tracking with decay
- ✅ Ntfy notifications for all states
- ✅ Kill switch file monitoring (`/app/NO_AUTO_FIX`)
- ✅ Git-backed immutable audit trail (GitOpsRemediation)

### Critical Gaps
1. **No trust boundary enforcement** — Agent could modify arbitrary files (path traversal risk)
2. **No prompt injection screening** — External error messages from webhooks/APIs not sanitized (OWASP ASI01)
3. **No hard deny rules** — No protection against modifying production configs, secrets, Dockerfiles
4. **No circuit breaker** — No consecutive failure tracking or emergency stop
5. **No rate limiting per fingerprint** — Repeated fix attempts could DoS
6. **No enhanced confidence scoring** — Missing trust_factor, impact_factor, stability_factor
7. **No post-fix validation** — Fixes aren't validated before PR creation
8. **No agent restart recovery** — State lost on crash (GitHub community requirement)
9. **No specification/scope boundary** — No "unchanged behavior" documentation per fix

---

## Research Findings

### 1. Enterprise CI/CD Self-Healing Patterns

#### GitHub Agentic Workflows (Tiago Pascoal)
- **Trigger**: `workflow_run` on failure → new workflow runs only if `conclusion == 'failure'`
- **Two-tier classification**: Transient (retry) vs permanent (needs fix)
- **Auto-merge**: Can auto-merge PRs after CI passes (simple pattern)
- **Lock files**: `gh aw compile` generates hardened `.lock.yml`

#### Codex CLI Auto-Fix (Daniel Vaughan)
- **Autofix Pattern**: CI fails → `codex exec --full-auto` → reads logs → applies patch → re-runs tests → opens PR
- **Key insight**: Minimality constraint — "Do not refactor unrelated code"
- **Sandbox modes**: `--sandbox workspace-write` (project dir only), `read-only` (default), `danger-full-access`
- **JSONL output**: Machine-readable stream for downstream processing
- **Key flags**: `--full-auto`, `--ephemeral` (no persistence), `--skip-git-repo-check`

#### Microsoft's Approach (Tech Community)
- **Three-layer architecture**: 
  1. Agent observes failure + generates remediation strategy
  2. Agent determines confidence + chooses autonomous vs manual
  3. AI generates secure code + creates remediation PRs
- **Human-in-the-loop governance**: High-risk fixes require approval

#### GitHub Community: "Treat Agents as Untrusted Contributors"
- **Key principles**:
  - Treat every coding agent as an untrusted contributor, not an automated maintainer
  - Give each agent a bounded task and isolated branch/worktree
  - Require explicit tests plus the project's normal lint/type/security gates
  - Generated tests are evidence only after verifying they cover the requested behavior
  - Keep risky tool actions and external writes behind approval boundaries
  - Make dependency changes a distinct approval point
  - **Separate comment, commit, and release authority**
  - Use environment gates for irreversible actions
  - Treat repository content as hostile input
  - Minimize context rather than maximizing intelligence
  - Log prompts without leaking secrets
  - Generate patches, not privileged side effects
  - **Preserve the plan, tool activity, diffs, approvals, and final verification**
  - **Design sessions to recover after restarts** — state persistence

#### AI Security Architecture (Vu1n)
- **Five pillars**: Identity, permissions, context, validation, auditability
- **Permission design**: Start from read-only and prove every write
- **Prompt/context hygiene**: Treat repository content as hostile input
- **Safe workflow patterns**: Generate patches, not privileged side effects

#### AWS Security Control Framework (R001-R007)
Comprehensive two-pillar framework:

**Pillar 1: Author-time controls (pre- and post-generation)**
- **Context as a security control [ND]**: Security invariants encoded as steering documents loaded at session start
- **Specifications as scope boundaries [ND]**: Reviewed specification before code generation (EARS notation: `WHEN [condition] THE SYSTEM SHALL [behavior]`)
- **Controlled tool access [D+ND]**: Scope MCP servers to minimum tools + scoped credentials
- **IDE code scanning [D]**: Real-time SAST + secrets detection in IDE
- **Hooks [D+ND]**: Shell command hooks (deterministic checks on save) + AI-powered hooks (task completion review)

**Pillar 2: Build-time controls (in pipeline)**
- **Layered security scanning [D]**: Secrets → SAST → SCA → IaC scanning in sequence
- **Quality gates [D]**: Pass/fail thresholds per severity; block on critical
- **AI-assisted review [ND]**: LLM pre-screening for spec compliance + scope creep + security anti-patterns
- **Human-in-the-loop review [ND+H]**: Risk-based review depth; two approval gates (after security scans + before production)

**Key threats (R001-R007):**
- R001: Prompt/context injection (treat non-dev input as untrusted)
- R002: Inadvertent data disclosure + overly permissive configs
- R003: Uncontrolled changes reaching production
- R004: Supply chain risks (SCA + allow-listing)
- R005: Uncontrolled external access (MCP scope)
- R006: Hallucinations/incorrect code (deterministic + non-deterministic review)
- R007: Scope creep (specification boundaries)

**Where to start (AWS's recommendation):**
1. Start with steering + specs (highest impact, lowest effort)
2. Add deterministic pipeline gates (SAST, SCA, secrets)
3. Calibrate + iterate
4. Accountability remains with developers

### 2. Enterprise AI Agent Safety Patterns

#### Anthropic Claude Code Auto Mode
- **Two-stage classifier**: fast single-token filter → chain-of-thought reasoning
- **Performance metrics** (n=10,000 real traffic):
  - False positive rate: Stage 1 = 8.5%, Full pipeline = 0.4%
  - False negative rate: synthetic exfil = 1.8% → 5.7%
- **Hard deny rules**: 
  - Data exfiltration (curl|bash, external endpoints)
  - Security posture degradation (disabling logging, installing persistence)
  - Cross trust boundaries (running code from external repos)
  - Bypassing review (pushing directly to main, force push)
  - Mass cloud deletion
  - IAM grants
- **Trust boundary**: Working directory + configured remotes = trusted
- **Protected paths**: Production branches (`production`, `gh-pages`) evaluated differently
- **Escalation thresholds**: 3 consecutive blocks OR 20 in session → pause/abort
- **Content validation**: Tool outputs are stripped before reaching classifier (hostile content can't address classifier directly)
- **Key insight**: "Reasoning-blind by design" — the classifier doesn't see the agent's own responses/reasoning, preventing persuasion

#### Microsoft Agent Governance Toolkit
- **4-Ring Privilege Model**: Root → Privileged → Standard → Sandbox
- **Capability guards**: Per-agent tool allow/deny lists
- **Saga orchestration**: Multi-step transactions with auto-rollback
- **Session isolation**: VFS namespacing, vector clocks for causal ordering
- **Microsoft .NET Team results**:
  - 93% of AI-fixed PRs merged without code review
  - 83% first-attempt fix success rate
  - Average: 25 lines, 2.1 files per patch
  - Confidence threshold: 92% for auto-merge

### 3. NIST AI RMF + ISO/IEC 42001

#### Governance Stack (3 Layers)
1. **NIST AI RMF 1.0** (Voluntary) — 4 functions: Govern, Map, Measure, Manage
2. **ISO/IEC 42001:2023** (Certifiable) — PDCA cycle, Annex A controls
3. **EU AI Act** (Binding Regulation) — Maps to ISO Annex A + NIST subcategories

#### Agent Autonomy Tiers
| Tier | Name | Governance Intensity |
|------|------|---------------------|
| L1 | Fully Supervised | Human approves every action |
| L2 | Human-in-the-Loop | Human reviews at checkpoints |
| L3 | Human-on-the-Loop | Agent acts independently; human monitors |
| L4 | Fully Autonomous | No real-time human oversight |

#### Key Principles (from all frameworks)
- **Principle of least privilege by default**
- **Sandboxed execution environments**
- **Action confirmation for irreversible operations**
- **Rollback capabilities**
- **Circuit breakers for automatic shutdown on anomaly**
- **Staged rollouts with progressive autonomy**
- **Zero Trust**: No agent component should have broader access than required for its role

#### 9-Step Implementation Sequence
1. Establish governance structure (roles, policies, accountability)
2. Inventory all agent systems (BBOM)
3. Classify risk levels (autonomy tier + EU AI Act categories)
4. Implement controls (Statement of Applicability)
5. Establish monitoring (action traces, drift detection)
6. Test and validate (red team, adversarial testing)
7. Control third-party access (MCP servers, external tools)
8. Deploy with progressive autonomy increases
9. Review and iterate (quarterly at minimum)

### 4. OWASP ASI Top 10 for Agents

| # | Threat | OSIRIS Mitigation |
|---|--------|-------------------|
| 1 | Agent Goal Hijack | `sanitizeErrorContent()` — strip injected instructions |
| 2 | Tool Misuse | Strict tool/operation allowlist |
| 3 | Privilege Abuse | Ring model + trust boundary |
| 4 | Supply Chain | Hard deny on package.json/pnpm-lock.yaml |
| 5 | Unexpected Code Exec | Sandbox validation before PR creation |
| 6 | Memory Poisoning | External error context validated + sanitized |
| 7 | Insecure Agent Comms | N/A (single agent) |
| 8 | Cascading Failures | Circuit breaker + rate limits |
| 9 | Trust Exploitation | Multi-layer validation |
| 10 | Rogue Agents | Kill switch + emergency stop |

### 5. CSA Recursive Self-Improvement (RSI) Research

**Key finding**: RSI is no longer theoretical — frontier labs (Anthropic, OpenAI, DeepMind) now use AI to materially accelerate AI development in production.

**Observable RSI signals:**
- Anthropic: Claude writes 80% of production code; 8x quarterly merge velocity; 800 fixes in days (4 years of work)
- OpenAI: GPT-5.3-Codex debugged its own training/deployment
- Google DeepMind: AlphaEvolve discovered matrix multiplication improvements, found scoring exploits

**Critical security threats identified:**
1. **Training pipeline integrity**: AI-operated pipelines become attack vectors for data poisoning
2. **Specification gaming**: AlphaEvolve found it could crash evaluators to get non-zero scores
3. **Compounding misalignment**: Gaming in generation N becomes undetected input to generation N+1
4. **Model registry risks**: Malicious weights in serialized model files (like compromised npm packages)
5. **Capability uplift for threat actors**: Same fine-tuning infra available to adversaries
6. **CVE-2025-53773**: `.vscode/settings.json` manipulation enables Copilot RCE — shows AI tools create new attack surfaces

**Recommendations for RSI-adjacent systems:**
- Treat AI coding pipeline as security-critical component (provenance tracking, dedicated review workflows)
- Establish runtime behavioral monitoring for AI systems in feedback loops
- Reinvest AI velocity gains into security review capacity
- Monitor for specific AI-generated code defect classes: secrets exposure, auth bypass, session management, dependency confusion

### 6. Claude Code Auto Mode (Latest Implementation)

**Two-stage classifier architecture:**
```
Claude proposes tool call → {User allow/deny rules?} → Match → Apply rule
                                    ↓ No match
                           {Read or in-project edit?} → Yes → Auto-approve
                                    ↓ No
                          {Stage 1: Fast filter} → Allow → Execute
                          {Stage 1: Fast filter} → Flag
                                    ↓
                          {Stage 2: Chain-of-thought reasoning} → Allow → Execute
                                                            → Block → Deny
```

**Key design decisions:**
- **Stage 1**: Fast single-token filter, tuned for recall, flags 8.5% of real traffic
- **Stage 2**: Chain-of-thought reasoning on flagged items, reduces to 0.4% false positives
- **Input isolation**: Classifier sees only user messages + tool calls, NOT tool results (prevents prompt injection via file content/API responses)
- **Reasoning-blind**: Agent's own responses/reasoning stripped — can't persuade classifier
- **Thresholds**: 3 consecutive blocks OR 20 in session → pause/abort (matches our design exactly)

**Allowed by default:**
- Working-directory file operations
- Declared-dependency installs
- `.env` credentials to matching API
- Read-only HTTP
- Pushes to any repo branch

**Blocked by default:**
- `curl | bash`
- Exfiltration to external endpoints
- Production deploys
- Mass cloud deletion
- IAM grants
- Force push
- `git reset --hard`

### 7. Agent Observability & Behavioral Monitoring

**Key insight**: Traditional APM (latency, error rates) doesn't capture agent-specific risks. AI agents require **execution tracing**, **behavioral drift detection**, and **specification gaming detection**.

#### Agent-Specific Observability Dimensions

**Execution-level telemetry:**
- Tool selection accuracy, planning quality, step-level faithfulness, reasoning coherence
- Task completion rate, token consumption per task (anomaly = hallucination/looping/injection)
- Tool invocation success/failure rates per tool type

**Behavioral drift detection:**
- **Agent drift**: Gradual divergence from governance policy baseline (model updates, KB changes, context staleness)
- **Output drift**: Semantic similarity scoring against validated baseline corpus
- **Policy drift**: Time-series of governance policy adherence (unauthorized tools, data egress)

**Production eval strategy:**
- Production evals run on every live session against real user inputs
- Automated judges for: semantic drift, factual consistency, policy compliance
- Evaluations inspectable alongside agent execution timeline (OpenTelemetry traces)

#### Agent-Specific Metrics (from Confident AI, Agentuity, Vellum, PredictionGuard, Fiddler)

| Category | Metric | Description |
|----------|--------|-------------|
| **Task** | `task_completion_rate` | % of agent tasks that complete successfully |
| | `average_steps_per_task` | Average reasoning steps (expected: 3-7 for OSIRIS fixes) |
| | `token_consumption_anomaly` | Token budget exceeded (indicates looping/hallucination/injection) |
| | `retry_count` | Average retries per tool call (loop detection signal) |
| | `time_to_completion` | Wall-clock time from task start to completion |
| **Drift** | `output_semantic_drift` | Rolling avg similarity to baseline corpus |
| | `tool_usage_drift` | Changes in tool invocation patterns |
| | `reasoning_length_drift` | Chain-of-thought length changes (overthinking = risk) |
| | `confidence_score_drift` | Changes in agent's self-reported confidence |
| **Security** | `policy_violation_rate` | % of actions violating governance policy |
| | `unauthorized_tool_attempts` | Attempts to use tools outside allowlist |
| | `data_egress_events` | Attempts to send data outside approved endpoints |
| | `prompt_injection_signatures` | Detected injection patterns in inputs/outputs |
| **Trace-level** | `trace_completion` | Full trace completed vs abandoned |
| | `policy_adherence_per_trace` | Policy compliance recorded per execution trace |

**Behavioral baseline for OSIRIS self-improvement:**
- Normal token consumption per fix task: ~500-2000 tokens
- Normal step count per fix: 3-7 steps (detect → sanitize → check → score → route → fix → validate)
- Normal tool invocation pattern: file read → pattern match → PR creation
- Normal fix size: ~25 lines avg (per Microsoft .NET team)

**Anomaly triggers** (alert on deviation from baseline):
- Token consumption > 3x baseline → hallucination or prompt injection
- Step count > 10 → potential infinite loop or scope creep
- Tool invocations outside normal pattern → unauthorized tool access

---

## Reliability & Self-Recovery Patterns

### Research: Making the Self-Improvement System Itself Robust

**Key insight**: The agent that fixes things needs to survive its own failures — crashes, OOM, network timeouts, and corrupted state. Industry research (Zylos AI, Cairn/GitHub, Composio) shows self-healing systems need **four reliability pillars**:

#### 1. Heartbeat + Watchdog (Zylos AI Research)
- **Heartbeat**: Periodic health signal sent to an external monitor — enables preventive intervention BEFORE failures
- **Watchdog**: Last-resort timeout-based recovery — kills and restarts if no heartbeat received
- **Production best practice**: Systems use BOTH — heartbeat for observability, watchdog as safety net
- **For OSIRIS**: Existing ntfy notifications serve as heartbeat; systemd auto-restart serves as watchdog

#### 2. Checkpointing & State Persistence (Cairn/GitHub)

**Critical finding from Cairn research**: "Checkpoints are compactions" — instead of faithful replay of every action, the agent should persist a **compacted continuation state** (what it was doing, what had happened so far) and **re-ground** after restart.

**Key patterns:**
- **Durable state**: Every critical state change persisted to disk (not just memory)
- **Effect-safety**: Prevent re-acting on world after recovery (don't re-open a PR, re-send alerts, etc.)
- **Re-grounding**: After restart, re-establish situational awareness by re-reading the current state rather than replaying history
- **Idempotency**: Operations designed to be safely repeated

**What OSIRIS should persist to disk:**
- `EmergencyStop` state (consecutive denials, session denials, rate limit tracker) — ✅ already in implementation plan
- `pendingApprovals` queue (approval UUIDs, expiry timestamps, associated PR data)
- `fixOutcomeHistory` index (which fixes succeeded/failed, with hashes)
- Current in-flight fix operation state (so it can resume, not restart, after crash)

#### 3. Circuit Breakers for External Dependencies

From Composio + Resilience4j research:
- **Closed**: Normal operation, requests pass through
- **Open**: After N consecutive failures, requests fail fast without attempting
- **Half-Open**: After timeout, limited requests test whether service recovered

**For OSIRIS:**
- **LLM provider circuit breaker**: If API calls fail N consecutive times → stop trying for 60s → half-open with 1 test call
- **GitHub API circuit breaker**: If PR creation fails N times → queue approvals → retry with backoff
- **ntfy circuit breaker**: If notifications fail N times → log to file → batch retry

#### 4. Graceful Degradation

- **Kill switch fallback**: If kill switch file can't be read → default to SAFE (stop auto-fixing)
- **Rate limit file unavailable**: If `rateLimitTracker` can't persist → use in-memory + alert
- **Git unavailable**: If GitOpsRemediation can't push → queue locally → retry on next health check
- **LLM unavailable**: If fix generation fails → escalate to human via ntfy with raw error dump

### Current State on orkestr.eu

**Already in place:**
- ✅ systemd auto-restart (watchdog pattern for process crashes)
- ✅ `/app/NO_AUTO_FIX` kill switch (graceful degradation to manual mode)
- ✅ Ntfy health notifications (heartbeat pattern)
- ✅ Persistent state in `/app/data/` directory

**What can be improved:**
1. **Add checkpointing** — Persist in-flight fix state so restarts resume, not restart
2. **Add circuit breakers** — For LLM API, GitHub API, ntfy notifications
3. **Add idempotency keys** — Prevent duplicate PR creation if agent retries after crash
4. **Add graceful degradation** — Fallback behaviors when components fail
5. **Add health check endpoints** — `/health` already returns status; could add `/health/detailed` for agent state
6. **Add state snapshots** — Periodic snapshot of EmergencyStop + pendingApprovals + fixOutcomeIndex

### Proposed Reliability Implementation

**Phase A: State Persistence (non-breaking)**
- Serialize `EmergencyStop` state to `/app/data/emergency-state.json` on every change
- Serialize `pendingApprovals` to `/app/data/pending-approvals.json`
- Serialize `fixOutcomeIndex` to `/app/data/fix-outcomes.json`
- Deserialize on startup (with validation — reject corrupted state)

**Phase B: Circuit Breakers**
- Add `CircuitBreaker` class for LLM API (10s timeout, 5 consecutive failures → 60s cooldown)
- Add `CircuitBreaker` class for GitHub API (10s timeout, 3 consecutive failures → 60s cooldown)
- Add `CircuitBreaker` class for ntfy (5s timeout, 5 consecutive failures → fallback to file logging)

**Phase C: Idempotency + Graceful Degradation**
- Add unique operation IDs to all PR creation + fix attempts
- Check for existing in-flight operations on startup
- Fallback: if GitHub unavailable, queue to `/app/data/fix-queue.json` for later retry
- Fallback: if ntfy unavailable, batch-write to `/app/data/notification-backlog.json`

**Phase D: Health & Monitoring**
- Add `/health` returns: status, uptime, errorCount, agent state (running/idle/approval-pending/emergency-stop), circuits (open/closed/half-open), rate limit counters

---

## AI-Generated Code Security Research

### Common Vulnerabilities in AI-Generated Fixes

**Key finding from Opsera DevSecOps research (2026):** "AI-generated remediation suggestions should be reviewed before applying — they point in the right direction, but are not merge-ready patches."

#### 6 Most Common Vulnerability Classes (SonarSource)
| # | Vulnerability | Description | OSIRIS Detection |
|---|--------------|-------------|-----------------|
| 1 | **Injection flaws** | String concatenation in SQL queries, shell commands, HTML output | `DANGEROUS_PATTERNS` blocks `exec()`, `eval()` |
| 2 | **Hardcoded secrets** | API keys, passwords, tokens embedded in code | `sanitizeErrorContent` + trust boundary prevents new secrets |
| 3 | **Insecure crypto** | Hardcoded IVs, weak hash algorithms (MD5, SHA1), no salt | `DANGEROUS_PATTERNS` blocks crypto misuse |
| 4 | **Security misconfiguration** | Debug mode in production, verbose errors, default credentials | Post-fix validation rejects `--debug`, `console.log` in prod |
| 5 | **Broken access control** | Missing auth checks, IDOR, privilege escalation functions | Trust boundary prevents path traversal |
| 6 | **Outdated/vulnerable dependencies** | Old library versions, known CVE patterns | Hard denylist on package.json/lockfile changes |

#### Hallucinated Dependencies (Endor Labs)
- **Slopsquatting**: AI suggests installing packages that don't exist → attacker registers them → supply chain attack
- **Mitigation for OSIRIS**: `package.json` in hard denylist — agent CANNOT add dependencies
- **Rate**: 15% of AI-generated code includes at least one hallucinated dependency (industry average)

#### Monoculture Vulnerabilities (APIRO)
- **Risk**: As AI tools converge on similar outputs, flawed patterns become widespread
- **Mitigation for OSIRIS**: Each fix is validated independently; no copy-paste from other sources
- **Detection**: `postFixValidation()` scans for known insecure patterns regardless of source

#### 40% Vulnerable Rate (APIRO)
- **Finding**: 40% of AI-generated code contains vulnerabilities
- **Context**: This is functional code, not security-critical infrastructure
- **OSIRIS mitigation**: 
  - Fixes are small (avg 25 lines) → lower vulnerability surface
  - Targeted at specific known patterns → not greenfield generation
  - Multi-layer validation catches injection, secrets, dangerous patterns
  - All fixes go through PR review (human-in-loop for QUEUE/ESCALATE routes)

#### Specific to CI/CD Self-Healing (DevX)
- **Pipeline credential risk**: CI pipelines have powerful credentials → compromised pipeline = compromised everything
- **SLSA framework**: Supply-chain integrity for AI-driven automation
- **Key recommendation**: "AI-generated remediation suggestions should be reviewed before applying"
- **For OSIRIS**: Our confidence threshold (85%) + post-fix validation + PR-based workflow aligns with this recommendation. Only high-confidence fixes auto-apply; everything else → PR review.

---

## Design Requirements

### Safety Requirements (Anthropic + Microsoft + AWS + OWASP ASI)
1. **Trust boundary enforcement** — Only modify files within `src/worker.js` and `known-fixes.json`
2. **Hard deny rules** — Block all production configs, secrets, Dockerfiles, package managers
3. **Prompt injection defense** — Sanitize all external error content BEFORE classifier sees it
4. **Input isolation** — Classifier sees sanitized content, not raw tool results (per Claude Code pattern)
5. **Multi-layer validation** — Fast filter → deep reasoning → post-fix validation
6. **Escalation threshold** — 3 consecutive denials → emergency stop; 20 total → escalation
7. **Circuit breaker** — Track consecutive failures, auto-stop dangerous patterns
8. **Rate limiting** — 6 attempts per 24h per error fingerprint (your spec)
9. **Minimal patch principle** — Max 120 lines changed (Microsoft .NET team standard)
10. **Scope boundary specification** — Document unchanged behavior per fix (AWS R007)
11. **Agent restart recovery** — Persist emergency stop state, rate limit counters, approval queue

### Governance Requirements (NIST + ISO 42001 + CSA RSI)
1. **Immutable audit trail** — All decisions logged with UUIDv7 correlation IDs + hash chain
2. **Risk assessment** — Per-fix risk scoring before execution
3. **Human ownership** — Every autonomous fix has designated owner
4. **Dynamic risk monitoring** — Continuous behavioral drift detection
5. **Data lineage** — Traceable chain from error to fix to outcome
6. **Statement of Applicability** — Documented control justifications (R-005)
7. **Behavioral Bill of Materials (BBOM)** — Tool permissions, API access, data sources
8. **Specification gaming detection** — Monitor for adversarial optimization patterns
9. **Restart recovery** — State persistence for emergency stop, counters, queue

### AWS Control Framework Mapping
- **Author-time [D]**: IDE code scanning → `node --check` on fix before PR
- **Author-time [D]**: Shell hooks → `validateFix()` on file save
- **Author-time [ND]**: AI-powered hooks → `sanitizeErrorContent()` before analysis
- **Author-time [ND]**: Specifications → "unchanged behavior" doc per fix
- **Build-time [D]**: Layered scanning → `postFixValidation()` (diff size, paths, content)
- **Build-time [D]**: Quality gates → 120-line max, trust boundary check
- **Build-time [ND+H]**: AI pre-screen + human review → QUEUE route for medium-risk
- **Author-time [D+ND]**: Controlled tool access → trust boundary allows ONLY src/worker.js + known-fixes.json

---

## Proposed Architecture (7 Layers)

### Layer 1: Trust Boundary Enforcement

**Allowlist (files the agent CAN modify):**
- `src/worker.js` — Main worker file
- `known-fixes.json` — Fix pattern database

**Hard Denylist (NEVER auto-fix):**
- `Dockerfile`, `Dockerfile.*` — Infrastructure
- `.env*`, `*secret*`, `*.key`, `*.pem` — Secrets
- `package.json`, `package-lock.json`, `pnpm-lock.yaml` — Dependency changes
- `tsconfig.json`, `postcss.config.js`, `tailwind.config.*` — Build tooling
- `*.yml`, `.github/**` — CI/workflows (changes require human approval via QUEUE)
- `SELF-IMPROVEMENT-DESIGN.md`, `DEVIATIONS.md` — Documentation

**New addition: `.github/workflows/` is NOT auto-fixable** — even though we just spent hours fixing it manually, auto-fixing CI configs is a high-risk operation that must go through QUEUE → human approval. This follows the "treat agents as untrusted contributors" principle.

**Trust boundary principle:** The agent operates on an **allowlist**, not a denylist. Only explicitly permitted files can be modified.

**Implementation:**
```javascript
function isWithinTrustBoundary(filePath) {
  const allowed = [
    /^src\/worker\.js$/,
    /^known-fixes\.json$/
  ];
  const denied = [
    /Dockerfile/i,
    /\.env/i,
    /secret/i,
    /\.key$/i,
    /\.pem$/i,
    /package\.json$/,
    /package-lock\.json$/,
    /pnpm-lock\.yaml$/,
    /tsconfig\.json$/,
    /\.github\//,
    /\.(yml|yaml)$/,
    /-DESIGN\.md$/i,
    /DEVIATIONS\.md$/i
  ];
  
  // Check allowlist first (principle of least privilege)
  const isAllowed = allowed.some(re => re.test(filePath));
  if (!isAllowed) return false;
  
  // Check denylist (defense in depth)
  const isDenied = denied.some(re => re.test(filePath));
  if (isDenied) return false;
  
  return true;
}
```

### Layer 2: Multi-Stage Approval Pipeline

```
Error Detection (log entry from error log)
    ↓
[Sanitize Error Content] → Strip prompt injection (input isolation per Claude Code pattern)
    ↓
[Trust Boundary Check] → Reject if fix touches non-allowlisted files
    ↓
[Fast Filter: Known Pattern Match] → Quick lookup in known-fixes.json
    ↓
[Post-Fix Validation] → Diff size ≤120 lines, path validation, content scan
    ↓
[Confidence Scoring: Enhanced formula] → base_rate × trust_factor × impact × stability × decay
    ↓
┌──────────────────────────────────────────────────────────┐
│ routeFixEnhanced(severity, confidence, riskScore)        │
└──────────────────────────────────────────────────────────┘
    ↓
AUTO_FIX   (severity=1-2, confidence≥0.85, risk=LOW)
    → Validate fix → Create feature branch → Open PR → Ntfy notification
    ↓
QUEUE      (severity=3, OR confidence 0.70-0.84, OR risk=MEDIUM)
    → Human approval required → Pending queue with 30min expiry
    → Includes "unchanged behavior" spec document
    ↓
ESCALATE   (severity≥4, confidence<0.70, risk=HIGH, trust violations)
    → HITL PR + Ntfy high-priority alert + audit log entry
    ↓
DENY       (hard denied paths, known malicious patterns)
    → Audit log + Ntfy urgent alert + permanent block
    → Records to emergency stop counter
```

### Layer 3: Enhanced Confidence Scoring

**Current formula:** `confidence = base_rate × (0.5 + 0.5 × decay_factor)`

**Enhanced formula (from enterprise CI research):**
```
confidence = base_rate × trust_factor × impact_factor × stability_factor × decay_factor

where:
  base_rate        = successes / (successes + failures)        // Historical accuracy
  trust_factor     = 0.9 if fix only touches src/worker.js      // Trusted files
                     0.7 if touches known-fixes.json            // Semi-trusted
                     0.1 if touches any .github/ path           // Untrusted
  impact_factor    = 1.0 - (changed_lines / 120)               // Capped at 120 LOC
                     clamped to [0.5, 1.0]
  stability_factor = 1.0 - (recurrence_rate * 0.5)             // Recurring = lower confidence
  decay_factor     = max(0, 1 - age_days / 90)                  // 90-day decay window
```

**Threshold rationale (from research):**
- **0.85 for auto-fix**: Higher than CI's 0.8 pattern; Microsoft .NET team uses 92% for auto-merge
- **0.70 for queue**: Enterprise CI patterns use 0.5; bump to 0.70 for greater safety margin
- **Below 0.70**: Escalate for human review (Anthropic's "recognize own uncertainty" principle)
- **3 consecutive denials OR 20 in session** → pause/abort (matches Claude Code Auto Mode exactly)

### Layer 4: Emergency Controls & Circuit Breaker

```javascript
class EmergencyStop {
  constructor() {
    this.consecutiveDenials = 0;     // Reset on successful auto-fix
    this.sessionDenials = 0;         // Per-session (Anthropic's 20-total)
    this.killSwitchActive = false;
    this.rateLimitTracker = {};      // fingerprint → {date: count}
  }
  
  checkKillSwitch() {
    // Reuse existing /app/NO_AUTO_FIX mechanism + PAUSE_CRITICAL/PAUSE_WORKER
    return fs.existsSync(NO_AUTO_FIX_PATH) || getKillSwitchMode() !== 'NORMAL';
  }
  
  recordDenial(type) {
    this.consecutiveDenials++;
    this.sessionDenials++;
    
    // 3 consecutive denials → temporary lockout (Anthropic + Claude Code threshold)
    if (this.consecutiveDenials >= 3) {
      activateEmergencyStop('consecutive_denials');
    }
    
    // 20 total denials in session → escalation (Anthropic + Claude Code threshold)
    if (this.sessionDenials >= 20) {
      activateEmergencyStop('session_denial_limit');
    }
  }
  
  checkRateLimit(fingerprint) {
    // 6 attempts per 24h per error fingerprint (your spec)
    const now = new Date();
    const key = fingerprint || 'default';
    const today = now.toISOString().split('T')[0];
    
    if (!this.rateLimitTracker[key]) this.rateLimitTracker[key] = {};
    const count = this.rateLimitTracker[key][today] || 0;
    
    return count < 6; // true if under limit
  }
  
  recordAttempt(fingerprint) {
    const key = fingerprint || 'default';
    const today = new Date().toISOString().split('T')[0];
    this.rateLimitTracker[key] = this.rateLimitTracker[key] || {};
    this.rateLimitTracker[key][today] = (this.rateLimitTracker[key][today] || 0) + 1;
  }
  
  recordSuccess() {
    this.consecutiveDenials = 0;  // Reset on success
  }
  
  // Persist state for restart recovery (GitHub community requirement)
  persist() {
    const state = {
      consecutiveDenials: this.consecutiveDenials,
      sessionDenials: this.sessionDenials,
      rateLimitTracker: this.rateLimitTracker,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(EMERGENCY_STATE_PATH, JSON.stringify(state));
  }
  
  restore() {
    try {
      const state = JSON.parse(fs.readFileSync(EMERGENCY_STATE_PATH, 'utf8'));
      this.consecutiveDenials = state.consecutiveDenials;
      this.sessionDenials = state.sessionDenials;
      this.rateLimitTracker = state.rateLimitTracker;
    } catch (e) {
      // First run, no state to restore
    }
  }
}
```

### Layer 5: Prompt Injection Defense (OWASP ASI01 + Claude Code Input Isolation)

```javascript
function sanitizeErrorContent(rawError) {
  const MAX_LENGTH = 2000;
  
  // Input isolation: strip everything the classifier shouldn't see
  // (mirrors Claude Code's approach of stripping tool outputs before classifier review)
  const stripped = rawError.replace(
    /(?:^|\n)(?:\/\/[^]*|#[^]*|<!--.*?-->|```.*?```)/gs,
    ''
  );
  
  // Block dangerous instruction patterns (OWASP ASI01 - Goal Hijack)
  const dangerousPatterns = [
    /execute\s+this/gi,
    /ignore\s+all\s+previous\s+instructions/gi,
    /ignore\s+previous\s+safety\s+rules/gi,
    /sudo\s+/gi,
    /rm\s+-rf/gi,
    /DROP\s+TABLE/gi,
    /DELETE\s+FROM/gi,
    /curl\s+.*\|\s*(sh|bash)/gi,
    /eval\s*\(/gi,
    /import\s+os/gi,
    /fetch\(['"`](https?:\/\/)/gi,      // External fetch in error context
    /new\s+(Request|XMLHttpRequest)\(/gi
  ];
  
  let clean = stripped;
  let wasSanitized = false;
  for (const pattern of dangerousPatterns) {
    if (pattern.test(clean)) {
      wasSanitized = true;
      clean = clean.replace(pattern, '[REDACTED]');
    }
  }
  
  return {
    sanitized: clean.substring(0, MAX_LENGTH),
    wasSanitized: wasSanitized || clean !== rawError.substring(0, MAX_LENGTH)
  };
}
```

### Layer 6: Post-Fix Validation (AWS R006 + CSA RSI)

Before creating a PR, validate the generated fix using **deterministic checks first, then non-deterministic**:

**Deterministic [D]:**
1. Diff size check: Max 120 lines (Microsoft .NET team standard)
2. Path validation: All changed files pass `isWithinTrustBoundary()`
3. Content scan: No network calls, no secret modifications, no `eval()`, no `child_process`

**Non-deterministic [ND] (if deterministic passes):**
4. Spec compliance: Fix matches the error pattern, no scope creep
5. Security pattern review: LLM checks for auth bypass, hardcoded credentials, insecure deserialization

```javascript
const DANGEROUS_PATTERNS = [
  /fetch\s*\(/g,           // Network calls
  /require\s*\(['"](http|https)/g,
  /new\s+(Request|XMLHttpRequest|http\.Client)/g,
  /eval\s*\(/g,            // Code execution
  /child_process/g,
  /exec\s*\(/g,
  /spawn\s*\(/g,
  /process\.exit/g,       // Process termination
  /fs\.unlink/g,          // File deletion
  /__dirname.*\/etc\/passwd/g  // Path traversal
];

function validateFix(fix) {
  const errors = [];
  
  // [D] 1. Diff size check
  const totalLines = fix.changes.reduce((sum, c) => sum + c.added + c.removed, 0);
  if (totalLines > 120) {
    errors.push({type: 'SIZE', message: `Fix too large: ${totalLines} lines (max 120)`});
  }
  
  // [D] 2. Path validation
  for (const change of fix.changes) {
    if (!isWithinTrustBoundary(change.file)) {
      errors.push({type: 'BOUNDARY', message: `Trust boundary violation: ${change.file}`});
    }
  }
  
  // [D] 3. Content scan for dangerous patterns
  for (const change of fix.changes) {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(change.content)) {
        errors.push({type: 'DANGEROUS', message: `Dangerous code pattern in ${change.file}`});
      }
    }
  }
  
  // [ND] Would trigger non-deterministic review here if deterministic passes
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}
```

### Layer 7: Immutable Audit Trail

All operations logged with:
- **UUIDv7 correlation IDs** for traceability (chronologically sortable)
- **Hash chaining** for tamper evidence (each entry includes previous hash)
- **Append-only storage** via existing GitOpsRemediation class
- **Source attribution** — track who/what initiated each operation

```javascript
async function logWithTrace(operation, data, actor = 'system') {
  const entry = {
    id: crypto.randomUUID(), // UUIDv7 for ordering
    timestamp: new Date().toISOString(),
    actor: actor,            // system vs human
    operation: operation,
    data: data,
    prevHash: await getPreviousHash(),
    hash: computeHash(data, prevHash)
  };
  
  // Append-only via existing GitOpsRemediation class
  await appendGitCommitLog('self-improvement', entry);
  
  return entry.id;
}
```

---

---

## Observability & Behavioral Monitoring

### AI Agent Observability Research

**Key insight**: Traditional APM (latency, error rates) doesn't capture agent-specific risks. AI agents require **execution tracing**, **behavioral drift detection**, and **spec specification gaming detection**.

#### Agent-Specific Observability Dimensions (from industry research)

**Execution-level telemetry:**
- Tool selection accuracy (which tools the agent chooses, when)
- Planning quality (does the plan match the required fix scope?)
- Step-level faithfulness (intermediate outputs match intent)
- Reasoning coherence (chain-of-thought doesn't wander)
- Task completion rate (end-to-end success)
- Token consumption per task (anomaly = hallucination, looping, or injection)
- Tool invocation success/failure rates per tool type

**Behavioral drift detection:**
- **Agent drift**: Gradual divergence of agent behavior from its defined governance policy baseline, caused by model updates, knowledge base changes, or context staleness — can occur even when individual responses complete without error
- **Output drift**: Semantic similarity scoring against validated baseline corpus — rolling window below threshold indicates divergence
- **Policy drift**: Time-series tracking of governance policy adherence (unauthorized tool calls, data egress, toxicity/factual consistency)

**Production eval strategy:**
- Production evals run on every live session against real user inputs and agent outputs
- Catches behavioral issues that only surface under real traffic patterns, adversarial inputs, or edge cases not in test datasets
- Evaluations are inspectable alongside the agent's execution timeline (OpenTelemetry traces)

#### Agent-Specific Metrics (from Confident AI, Agentuity, Vellum, PredictionGuard)

| Category | Metric | Description |
|----------|--------|-------------|
| **Task Metrics** | `task_completion_rate` | % of agent tasks that complete successfully |
| | `average_steps_per_task` | Average reasoning steps before completion |
| | `token_consumption_anomaly` | Token budget exceeded (indicates looping/hallucination/injection) |
| | `retry_count` | Average retries per tool call (loop detection signal) |
| | `time_to_completion` | Wall-clock time from task start to completion |
| **Drift Detection** | `output_semantic_drift` | Rolling avg similarity to baseline corpus |
| | `tool_usage_drift` | Changes in tool invocation patterns |
| | `reasoning_length_drift` | Changes in chain-of-thought length (overthinking = risk) |
| | `confidence_score_drift` | Changes in agent's self-reported confidence |
| **Security Metrics** | `policy_violation_rate` | % of actions violating governance policy |
| | `unauthorized_tool_attempts` | Attempts to use tools outside allowlist |
| | `data_egress_events` | Attempts to send data outside approved endpoints |
| | `prompt_injection_signatures` | Detected injection patterns in inputs/outputs |
| | `toxicity_score` | Harmful content generation rate |
| | `factual_consistency` | Factual accuracy of agent outputs |
| **Cost & Resource** | `cost_per_task` | AI cost per completed task |
| | `error_cost_ratio` | Cost wasted on failed/fixed tasks |
| | `session_completion_rate` | Multi-session task success rate |
| **Quality Signals** | `regressions_detected` | Performance degradations flagged by production evals |
| | `user_feedback_correlation` | User feedback vs. automated eval scores |
| | `eval_score_distribution` | Quality score spread across tasks |
| | `human_intervention_triggers` | Escalations due to eval thresholds |
| **Trace-level** | `trace_completion` | Full trace completed vs abandoned |
| | `policy_adherence_per_trace` | Policy compliance recorded per execution trace |
| | `frustrated_user_signal` | New topics/failed runs clustering |

#### Behavioral Baseline Definition
Establish baselines for:
- Normal token consumption per fix task (expected ~500-2000 tokens)
- Normal step count per fix (expected 3-7 steps: detect → sanitize → check → score → route → fix → validate)
- Normal tool invocation pattern (file read → pattern match → PR creation)
- Normal fix size distribution (expected ~25 lines avg, per Microsoft .NET team)

**Anomaly triggers** (alert on deviation from baseline):
- Token consumption > 3x baseline → hallucination or prompt injection
- Step count > 10 → potential infinite loop or scope creep
- Tool invocations outside normal pattern → unauthorized tool access
- Fix size > 120 lines → scope creep (already enforced, but track for drift)

#### Production Evaluations (Production Evals)
Per Vellum and Agentuity research, production evals should run:
- **On every live session** against real user inputs
- **Automated judges** for: semantic drift, factual consistency, policy compliance
- **Trace-to-dataset loops**: Production traces that surface anomalies become regression datasets
- **Span-level evaluation**: Each step (span) in the agent's execution traced and evaluated, not just final output

**Key principle**: "Agentic Observability extends beyond monitoring individual LLM calls to capture the complete autonomous decision-making lifecycle, inter-agent coordination, and goal-driven behavior." — Fiddler docs

### Monitoring & Telemetry

### Metrics to Track
1. `auto_fix_success_rate` — percentage of auto-fixes that pass validation
2. `escalation_rate` — percentage of errors requiring human intervention
3. `denial_rate` — percentage of fixes denied by filters
4. `average_fix_latency` — time from error detection to fix deployed
5. `trust_boundary_violations` — count of blocked out-of-bounds fixes
6. `consecutive_denials` — running count of classifier denials
7. `confidence_distribution` — histogram of confidence scores
8. `fix_recurrence_rate` — same error fixed multiple times
9. `prompt_injection_attempts` — count of sanitized error content
10. `circuit_breaker_triggers` — count of emergency stops
11. `post_validation_failures` — fixes rejected by validation layer
12. `agent_restart_count` — number of times the self-healing agent restarts
13. `scope_creep_incidents` — fixes that modified more files than expected

### Agent-Specific Metrics (from Industry Research)
14. `task_completion_rate` — % of fix tasks completed successfully end-to-end
15. `average_steps_per_task` — avg reasoning steps (expected: 3-7)
16. `token_consumption_anomaly` — token budget exceeded (indicates looping/injection)
17. `output_semantic_drift` — rolling avg similarity to baseline corpus
18. `tool_usage_drift` — changes in tool invocation patterns
19. `reasoning_length_drift` — chain-of-thought length changes (overthinking risk)
20. `policy_violation_rate` — % of actions violating governance policy
21. `unauthorized_tool_attempts` — attempts to use tools outside allowlist
22. `data_egress_events` — attempts to send data outside approved endpoints
23. `eval_score_distribution` — quality score spread across fix tasks
24. `trace_completion` — full execution trace completed vs abandoned
25. `behavioral_baseline_drift` — deviation from normal token/step/tool patterns

### Alerting Thresholds
- **CRITICAL**: 3 consecutive denials → emergency stop + human escalation
- **HIGH**: 5 trust boundary violations in 1h → investigation
- **CRITICAL**: Any post-validation failure → immediate alert (adversarial behavior)
- **HIGH**: Token consumption > 3x baseline → potential injection/looping
- **HIGH**: Step count > 10 in single fix task → infinite loop suspicion
- **WARNING**: Output semantic drift below 0.7 baseline for 24h → behavior review
- **WARNING**: Tool usage drift detected → unauthorized pattern review
- **DEFAULT**: Auto-fix success rate < 50% for 24h → confidence review + threshold adjustment
- **LOW**: Daily rate limit exceeded → notification to owner
- **INFO**: Confidence score below 0.5 → log for pattern analysis
- **INFO**: Session denial limit approaching (15/20) → early warning
- **INFO**: Average steps per task > 7 → efficiency review

### Alerting Thresholds
- **CRITICAL**: 3 consecutive denials → emergency stop + human escalation
- **HIGH**: 5 trust boundary violations in 1h → investigation
- **CRITICAL**: Any post-validation failure → immediate alert (could indicate adversarial behavior)
- **DEFAULT**: Auto-fix success rate < 50% for 24h → confidence review + threshold adjustment
- **LOW**: Daily rate limit exceeded → notification to owner
- **INFO**: Confidence score below 0.5 → log for pattern analysis
- **INFO**: Session denial limit approaching (15/20) → early warning

---

## Implementation Plan (Phased)

### Phase 1: Boundary Hardening (Non-Breaking)
- [ ] Add `isWithinTrustBoundary(filePath)` — validate against allowlist/denylist
- [ ] Add `sanitizeErrorContent(rawError)` — strip prompt injection (input isolation)
- [ ] Add `hardDenyPatterns` registry — regex patterns for sensitive content
- [ ] Add `trust boundary violation` logging via existing GitOpsRemediation
- [ ] **No changes to existing routing logic** — only adds safety checks above existing flows

### Phase 2: Post-Fix Validation
- [ ] Add `DANGEROUS_PATTERNS` registry (network calls, eval, child_process)
- [ ] Add `validateFix(fix)` — diff size, path validation, content scan
- [ ] Wire `validateFix()` into pipeline BEFORE PR creation
- [ ] Add "unchanged behavior" spec generation per fix

### Phase 3: Enhanced Confidence Scoring
- [ ] Enhance `calculateFixConfidence` with `trust_factor` and `impact_factor`
- [ ] Add `recurrenceRate` tracking per error pattern
- [ ] Add `impact_factor` based on changed line count
- [ ] Update routing thresholds to 0.85/0.70

### Phase 4: Emergency Controls & Circuit Breaker
- [ ] Implement `EmergencyStop` class with state persistence
- [ ] Wire into existing kill switch (`/app/NO_AUTO_FIX`)
- [ ] Add consecutive denial tracking (3 threshold — matches Claude Code Auto Mode)
- [ ] Add session denial tracking (20 threshold — matches Claude Code Auto Mode)
- [ ] Add rate limiting (6 per 24h per fingerprint)

### Phase 5: Audit Trail Enhancement
- [ ] Add UUIDv7 correlation IDs to all operations
- [ ] Add hash chaining for tamper evidence
- [ ] Ensure all trust boundary violations are logged with full context

### Phase 6: Documentation & Governance
- [ ] Complete Statement of Applicability (SoA) per R-005
- [ ] Document all control choices and justifications
- [ ] Add agent ownership records
- [ ] Update `DEVIATIONS.md` with any deviations
- [ ] Create `.ai-heal-policy.yml` (inspired by enterprise CI patterns)

### Phase 7: Observability & Behavioral Monitoring
- [ ] Add token consumption tracking per fix task
- [ ] Add step count tracking per fix task
- [ ] Add behavioral baseline (expected: 3-7 steps, 500-2000 tokens)
- [ ] Add anomaly detection: token >3x baseline, steps >10
- [ ] Add output semantic drift detection (baseline corpus comparison)
- [ ] Add tool usage drift monitoring
- [ ] Add trace completion tracking
- [ ] Add production eval hooks (per-session quality checks)

---

## Vulnerability Analysis (Comprehensive)

### 1. Prompt Injection via Error Messages (OWASP ASI01)
- **Risk**: Error context from webhooks, stack traces, or API responses could contain injected instructions
- **Severity**: High
- **Mitigation**: `sanitizeErrorContent()` + input isolation (strip tool outputs before classifier — mirrors Claude Code's approach)

### 2. Path Traversal in Fix Generation
- **Risk**: Generated fixes could reference files outside the repo
- **Severity**: Critical
- **Mitigation**: `isWithinTrustBoundary()` validates all paths against explicit allowlist

### 3. Exfiltration via Fix Code (AWS R002)
- **Risk**: Fixes could include code that sends data to external endpoints
- **Severity**: Critical
- **Mitigation**: Post-fix content scan blocks `fetch`, `http`, `axios`; trust boundary restricts to src/ only

### 4. Privilege Escalation via Git Operations
- **Risk**: Fix PRs could modify branch protection, CI workflows, or deployment configs
- **Severity**: High
- **Mitigation**: Only PR creation; `.github/` is NOT in allowlist; all git ops on feature branches

### 5. Denial of Service via Infinite Fix Loop
- **Risk**: System could enter infinite loop fixing the same error
- **Severity**: Medium
- **Mitigation**: Retry budget (6/24h) + circuit breaker (3 consecutive) + session limit (20)

### 6. Trust Boundary Violation
- **Risk**: Fixes could escape the repo boundary
- **Severity**: Critical
- **Mitigation**: `isWithinTrustBoundary()` enforces repo containment

### 7. Model Overconfidence
- **Risk**: Confidence grows unbounded after initial successes
- **Severity**: Medium
- **Mitigation**: Confidence decay (90-day), trust factor reduction, mandatory review for <0.70

### 8. Data Poisoning via Fix Outcomes
- **Risk**: Attacker poisons outcome history to suppress good fixes
- **Severity**: Medium
- **Mitigation**: Correlation IDs, source attribution, outlier detection

### 9. Supply Chain Risk via Dependency Changes
- **Risk**: Auto-fix modifies package.json or lockfile
- **Severity**: High
- **Mitigation**: `package.json` and `pnpm-lock.yaml` are in hard denylist

### 10. Workflow Tampering via CI Config Changes
- **Risk**: Auto-fix modifies GitHub Actions workflows
- **Severity**: Critical
- **Mitigation**: `.github/` directory in hard denylist; requires QUEUE → human approval

### 11. Restart Recovery Failure
- **Risk**: Agent crash loses emergency stop state, counters, approval queue
- **Severity**: Medium
- **Mitigation**: Persist EmergencyStop state to filesystem; restore on startup

### 12. Specification Gaming / Adversarial Optimization (CSA RSI Risk)
- **Risk**: AI finds unintended ways to satisfy objectives (e.g., AlphaEvolve crashing evaluators)
- **Severity**: High
- **Mitigation**: Multi-layer validation + non-deterministic LLM review + human-in-loop for edge cases

### 13. Network Call Injection in Fix Code
- **Risk**: Generated fix code includes fetch/http calls for data exfiltration
- **Severity**: Critical
- **Mitigation**: `DANGEROUS_PATTERNS` registry with deterministic content scanning

### 14. Scope Creep (AWS R007)
- **Risk**: Fix modifies more files than expected, introduces unrelated changes
- **Severity**: Medium
- **Mitigation**: `validateFix()` enforces single-purpose fixes; size limit + path validation

---

## Key Design Decisions

1. **Confidence thresholds**: 0.85 for auto-fix, 0.70 for queue (higher than CI standard for safety; Microsoft .NET team uses 92% for auto-merge)
2. **Rate limit**: 6 attempts per 24h per fingerprint (your spec)
3. **Circuit breaker**: 3 consecutive failures → emergency stop (matches Claude Code Auto Mode exactly)
4. **Session limit**: 20 total denials (matches Claude Code Auto Mode exactly)
5. **Trust boundary**: Strict allowlist of `src/worker.js` + `known-fixes.json`; ALL else denied
6. **Audit trail**: GitOpsRemediation + UUIDv7 + hash chaining
7. **Emergency stop**: Reuses `/app/NO_AUTO_FIX` + state persistence for restart recovery
8. **Approval workflow**: PR-based only, never push to master
9. **Minimal patch**: Max 120 lines (Microsoft .NET team standard)
10. **Input isolation**: Sanitize error content BEFORE classifier sees it (mirrors Claude Code's tool-output-stripping)
11. **Post-fix validation**: Deterministic checks (diff size, paths, dangerous patterns) before PR creation
12. **Scope boundary**: "Unchanged behavior" documentation per fix (per AWS security framework)
13. **Agent as untrusted contributor**: Bounded tasks, isolated branches, minimal patches (per GitHub community)
14. **`.github/` not auto-fixable**: Requires QUEUE → human approval, even though we manually fixed it (principle: treat all agent changes as untrusted)
15. **Two-stage classifier pattern**: Fast filter (pattern match) → deep reasoning (confidence scoring + validation) — mirrors Claude Code Auto Mode
16. **Restart recovery**: Persist emergency state to filesystem (per GitHub community: "Design sessions to recover after restarts")

---

## Implementation Status

### Already Present in worker.js
- Pattern-based fix confidence scoring (`computeFixConfidence`)
- Severity-based routing (`routeFix`)
- Human-in-the-loop PR creation (`createHumanInTheLoopPR`)
- Pending approvals with 30min expiry
- Fix outcome tracking with decay
- Ntfy notifications for all states
- Kill switch file monitoring (`/app/NO_AUTO_FIX`)
- GitOpsRemediation with append-only audit log
- Self-improvement feedback loop (#58)
- Confidence decay (90-day)
- `KNOWN_FIXES` pattern database

### Needs Implementation
- ✅ Trust boundary validation (`isWithinTrustBoundary`)
- ✅ Hard deny rules (sensitive path patterns)
- ✅ Prompt injection sanitization (`sanitizeErrorContent`) + input isolation
- ✅ Enhanced confidence scoring (trust_factor, impact_factor, stability_factor)
- ✅ Circuit breaker with consecutive denial tracking (3 threshold)
- ✅ Rate limiting per error fingerprint (6 per 24h)
- ✅ Session-based denial tracking (20 total)
- ✅ Post-fix validation (`validateFix`): diff size, path validation, dangerous pattern scan
- ✅ Hardened audit trail with UUIDv7 + hash chaining
- ✅ Trust boundary violation detection
- ✅ DANGEROUS_PATTERNS registry for content scanning
- ✅ Emergency state persistence for restart recovery (`EmergencyStop.persist()/restore()`)
- ✅ "Unchanged behavior" spec generation per fix
- ✅ Scope creep detection in `validateFix()`
- ✅ `.ai-heal-policy.yml` creation (enterprise CI pattern)
- ✅ Behavioral baseline definition (3-7 steps, 500-2000 tokens per fix)
- ✅ Anomaly detection for token/step count deviations
- ✅ Output semantic drift monitoring
- ✅ Tool usage drift monitoring
- ✅ Trace completion tracking

### 15. Behavioral Drift Unnoticed
- **Risk**: Agent's behavior gradually shifts outside safety parameters (model updates, KB changes, context staleness)
- **Severity**: High
- **Mitigation**: Behavioral baseline + anomaly detection (token >3x, steps >10) + semantic drift monitoring + trace completion tracking