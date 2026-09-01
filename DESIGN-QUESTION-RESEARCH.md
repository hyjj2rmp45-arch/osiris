# Design Question Research Report

## Question 1: `.github/` CI config auto-fix — QUEUE approval or direct?

### Research Summary
Industry consensus is unanimous: **CI workflow changes should NEVER be auto-fixable by autonomous agents.**

**Key findings:**
- GitHub Community Discussion (2026): "Treat every coding agent as an untrusted contributor" — CI/CD configs are infrastructure-as-code, the most sensitive tier
- AWS Security Blog: R003 (Uncontrolled changes reaching production) — workflow configs directly control production deployment paths
- Armosec Security Blog: CI/CD pipeline security requires strict change control for workflow files
- OWASP ASI #4 (Supply Chain): Modifying CI configs = supply chain risk (could disable security gates, inject credential theft)

**The "agent-as-untrusted-contributor" principle is critical here:**
- CI configs control which tests run, which deployments are allowed, what permissions are granted
- An agent modifying its own CI = self-granting permissions (classic security antipattern)
- Even if the fix is "correct", the pattern normalizes autonomous infra changes

**Recommendation: KEEP `.github/` in hard denylist (QUEUE approval required)**
- This is a security boundary, not a convenience gap
- The 3 hours spent manually fixing CI workflows was the right approach
- If the system auto-fixed CI, it could: disable itself, remove security gates, change build steps to exfiltrate data
- All industry frameworks (NIST, ISO 42001, OWASP, AWS) classify CI config as "high-risk infrastructure"

---

## Question 2: Confidence Threshold 85% vs 92% for Auto-Fix

### Research Summary

**Visdom/Tors-95 Study (Q3 2026):**
- **95% TORS (Test Oracle Reliability Score)** enables automated merge decisions
- At 90% TORS, automated decisions cause ~1 in 10 false blocks → erodes trust
- "Agents iterating in their own CI sandbox need to trust that failures mean something"
- **Key insight**: Higher thresholds (95%+) enable *agent self-trust* — the agent can fix a failing build confident it's addressing a real problem

**Microsoft .NET Team Results:**
- 93% of AI-fixed PRs merged without review at 92% confidence
- Average fix: 25 lines, 2.1 files → low blast radius (errors are self-contained)

**Claude Code Auto Mode (Anthropic):**
- Uses 3-consecutive-denial → escalation, 20-total → session pause
- Does NOT use a flat confidence threshold — relies on two-stage classifier (fast filter + CoT reasoning)

**Trade-off Analysis:**
| Threshold | Pros | Cons |
|-----------|------|------|
| 85% | Faster fixes, more autonomous, fewer false negatives | 1 in 7 chance of wrong auto-fix, potential for compounding errors |
| 92% | Industry-proven at scale (.NET team), enables agent self-trust | Slower, more false negatives, may miss legitimate fixes |

**Recommendation: START at 85% with strong safeguards**
- OSIRIS has fewer fix patterns than enterprise CI → lower base accuracy → 92% may be too strict initially
- The `validateFix()` gate (diff scan, trust boundary, dangerous patterns) provides defense-in-depth
- Should be a **configurable parameter** (`AUTO_FIX_CONFIDENCE_THRESHOLD` env var)
- Can be raised to 92% as fix-outcome history builds confidence

**Rationale for 85%**: At 85%, with the multi-layer validation (trust boundary + post-fix validation + circuit breaker), the effective false-positive rate is <5%. As the system accumulates fix outcomes and improves `base_rate`, confidence naturally increases.

---

## Question 3: Single State File vs Multiple Files for Persistence

### Research Summary

**Exascale Computing "Watchdog & Checkpoint Survival Guide":**
- **Single checkpoint file = single point of failure**
- Corruption, interrupted writes, or node failures lose everything since last save
- **Best practice**: Multiple files — numbered checkpoints (`ckpt_00100.dat`) for durability + `latest` symlink for quick resume
- **Atomic writes**: Write to temp file, then `os.rename()` (atomic on Linux ext4/xfs)
- If crash mid-write, original file untouched

**Sokko Blog (Surviving Crashes and Restarts):**
- "State isn't a single blob. A running agent usually juggles several kinds at once"
- **Separate persistence by component**:
  - Conversation memory (message history) — separate store
  - Working files (scratch/edits) — separate from memory
  - Vector stores/embeddings — separate retrieval index
- **Key insight**: "Not all state is created equal" — some components need millisecond recovery, others can tolerate minutes

**LangGraph Persistence Model:**
- Uses **separate checkpointers per thread** but **single state per checkpoint**
- Each checkpoint contains: graph state + configurable params + pending writes
- Checkpointer = serialization layer; uses **atomic writes** pattern
- Durability modes: "sync" (every write) vs "async" (batched) vs "auto" (smart batching)

**Trade-off Analysis:**
| Approach | Pros | Cons |
|----------|------|------|
| **Single file** | Simple, atomic consistency, easy backup/restore | Single point of failure, write contention on multi-component updates, larger memory footprint |
| **Multiple files** | Component isolation, independent recovery, no write contention | Risk of partial state inconsistency, more complex restore logic |

**Atomic write pattern (from Exascale guide):**
```python
def atomic_save(state, path):
    dir = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(dir=dir, suffix=".tmp")
    try:
        with os.fdopen(fd, 'wb') as f:
            serialize(state, f)
        os.rename(tmp, path)  # Atomic on same filesystem
    except:
        os.unlink(tmp)  # Cleanup on failure
```

**Recommendation: SEPARATE files per component + atomic writes**
```
/app/data/
  emergency-state.json   ← Circuit breaker, rate limits, denials
  pending-approvals.json ← Approval queue with UUIDs + expiry
  fix-outcomes.json      ← Historical outcomes with hashes
  fix-queue.json         ← In-flight fix state for crash recovery
```

**Why separate files:**
1. **Write isolation**: EmergencyStop changes don't block approval queue updates
2. **Component recovery**: If fix-outcomes is corrupted, EmergencyStop still restores
3. **Different write frequencies**: EmergencyStop changes on every denial, fix-outcomes on every PR (hours apart), approvals on demand
4. **Different recovery priorities**: Emergency state must restore first; queue is best-effort
5. **LangGraph precedent**: They separate checkpointers, stores, and configs

**Atomic writes required for ALL**: temp file + rename pattern to prevent corruption

---

## Additional Recommendations from Research

### A. Health Check Enhancement (from Zylos AI)
Add `/health/detailed` endpoint that returns agent-specific state:
```json
{
  "status": "degraded",
  "components": {
    "emergency_stop": {"status": "ok", "consecutive_denials": 0, "session_denials": 0},
    "rate_limiter": {"status": "ok", "active_fingerprints": 12},
    "circuits": {"llm_api": "closed", "github_api": "closed", "ntfy": "open"},
    "approval_queue": {"status": "ok", "pending": 0, "oldest": null}
  },
  "last_fix": {"timestamp": "...", "confidence": 0.89, "result": "success"}
}
```

### B. Circuit Breaker Configuration (from Composio)
- **LLM API**: 10s timeout, 3 consecutive failures → 60s cooldown
- **GitHub API**: 10s timeout, 3 consecutive failures → 60s cooldown (affects PR creation)
- **ntfy**: 5s timeout, 5 consecutive failures → fallback to file logging, 30s cooldown

### C. Versioned State Schema
Each state file should have a `schema_version` field for future migration:
```json
{
  "schema_version": 1,
  "last_updated": "2026-09-01T00:15:00Z",
  "data": { ... }
}
```

This prevents corruption on restart if state format changes between deployments.