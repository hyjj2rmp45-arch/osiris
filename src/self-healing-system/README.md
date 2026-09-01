# OSIRIS Self-Healing System - Phase 1

## Overview

Phase 1 safety foundation for the OSIRIS self-healing system. Implements all critical safety layers that protect both the codebase and users' funds during 24/7 autonomous operation.

## Architecture

```
src/self-healing/
├── index.js                        # Main integration entry point
├── README.md                       # This file
│
├── lib/
│   ├── trust-boundary.js          # 🔒 Trust boundary enforcement (allowlist/denylist)
│   ├── emergency-stop.js          # 🚨 Kill switch + circuit breaker + rate limiting
│   ├── state-persistence.js       # 💾 Atomic state writes with schema validation
│   ├── audit-trail.js             # 📜 Immutable audit log with UUIDv7 + hash chain
│   ├── config.js                  # ⚙️ Centralized config management with env overrides
│   ├── rollback.js                # 🔄 Snapshot-based rollback mechanism
│   ├── trust-self-validation.js   # 🔍 Self-monitoring to detect constraint tampering
│   ├── telegram-bot.js            # 📱 Security bot integration (separate @osiris_guard_bot)
│   ├── mode-manager.js            # ⏰ Time-based mode scheduler (Milwaukee timezone)
│   └── health-monitor.js          # 🏥 Comprehensive health endpoint
```

## Safety Layers (Defense in Depth)

Every fix passes through these gates in order:

1. **Kill Switch Check** — `isKillSwitchEngaged()`
2. **Trust Boundary** — Only `src/worker.js` and `known-fixes.json` modifiable
3. **Boundary Self-Validation** — Detect system tampering attempts
4. **Boundary Self-Check** — Verify allowlist hasn't been modified
5. **Post-Fix Validation** — Diff scanning for dangerous patterns
6. **Dangerous Pattern Detection** — Network calls, eval, child_process, secrets
7. **Diff Size Limit** — Max 120 lines (Microsoft .NET standard)
8. **Rate Limiting** — Max 6 fix attempts per 24h per error fingerprint
9. **Emergency Stop** — 3 consecutive denials → auto-engage kill switch
10. **Time-Based Modes** — Milwaukee schedule with morning recap buffer

## Mode Schedule (America/Chicago)

| Mode | Time | Auto-Fix | Payment Fixes | Alerts |
|------|------|----------|---------------|--------|
| Active | 7:00 AM - 3:15 PM weekdays → 3:00 AM | ✅ | ✅ | Normal |
| Recap | 6:00 - 7:00 AM | Review only | ❌ | Summary |
| Night | 3:00 - 6:00 AM | ❌ | ❌ | Critical only |
| School (Unattended) | 7:00 AM - 3:15 PM | ❌ | 🚫 BLOCKED | Immediate |
| Weekend | Sat/Sun | ❌ | ❌ | Priority |
| Holiday | Holiday dates | ❌ | ❌ | Immediate |
| Emergency | Manual | ❌ | ❌ | Urgent |

## Usage

### Initialization

```javascript
const selfHealing = require('./src/self-healing');

await selfHealing.initialize({
  repoRoot: process.cwd(),
  configFile: '/app/self-healing-config.json',
  telegramBotToken: '8822609169:AAH...',  // From @BotFather
  telegramChatId: '7933325051'            // Your chat ID
});
```

### Safety Gate (pre-fix validation)

```javascript
const result = selfHealing.safetyGate({
  file: 'src/worker.js',
  diff: '...',
  pattern: 'payment_timeout'
}, {
  fingerprint: 'payment_webhook_error_v1'
});

// result = { allow: true, route: 'AUTO_FIX', confidence: 0.92, correlationId: '...' }
```

### Apply fix with rollback

```javascript
const result = await selfHealing.applyFixWithRollback(
  'src/worker.js',
  updatedContent,
  { correlationId: '...', confidence: 0.92 }
);
// result = { success: true, rollbackId: 'snap_xxx', snapshotId: 'snap_xxx' }
```

### Get health status

```javascript
const status = selfHealing.healthMonitor.getHealthStatus();
// Returns: { status, mode, emergencyStop, trustBoundary, circuits, ... }
```

## File Structure

```
/app/
├── NO_AUTO_FIX                  # Kill switch file (presence = disabled)
├── data/
│   ├── audit-trail.json         # Immutable audit log
│   ├── emergency-state.json     # Rate limits, denial counters, mode state
│   ├── mode-state.json          # Current mode, manual overrides
│   ├── self-healing-config.json # Runtime configuration
│   ├── snapshots/               # File snapshots for rollback
│   └── pending-approvals.json   # Queued fixes awaiting approval
└── src/bot-token.env            # Telegram bot credentials (.env format)
```

## Security Properties

- **Trust Boundary**: Agent CANNOT modify payment code, configs, secrets, or CI/CD
- **Payment Protection**: Any fix touching payment code is BLOCKED + Telegram alert sent
- **Emergency Stop**: Kill switch file, 3-denial limit, 6-attempt rate limit
- **Immutable Audit**: UUIDv7 correlation IDs + SHA-256 hash chain
- **Rollback Protection**: Pre-fix snapshots + atomic writes + graceful fallback
- **Configuration Integrity**: Schema validation, env override support, integrity checks

## Phase 1 vs Future Phases

**Phase 1 (This implementation):**
- ✅ All safety layers active
- ✅ Time-based mode switching
- ✅ Telegram alerts + manual control
- ✅ Rollback capability
- ✅ Audit trail + health endpoints

**Phase 2+ (Planned):**
- Enhanced confidence scoring (trust_factor × impact_factor × stability × decay)
- Multi-source error correlation
- Anomaly detection for token/step counts
- Production evals on every session
- Canary deployment for fixes
- Dependency drift alerts

## Emergency Procedures

1. **Immediate Stop**: `touch /app/NO_AUTO_FIX`
2. **Telegram Stop**: Send `/school_mode off` to bot (wait — actually `/stop` isn't a command yet)
3. **Manual Rollback**: `git checkout src/worker.js` + remove `/app/NO_AUTO_FIX`
4. **Full Reset**: Delete `/app/data/*.json` + restart worker

## Testing

```bash
# Run component tests
node -e "require('./src/self-healing/lib/trust-boundary')"

# Full module test
node -e "
const sh = require('./src/self-healing');
console.log('Mode:', sh.healthMonitor.getHealthStatus().mode);
"
```

## Related Documentation

- [SELF-IMPROVEMENT-DESIGN.md](SELF-IMPROVEMENT-DESIGN.md) — Research and design
- [PHASE-0-SECURITY-CHECKLIST.md](PHASE-0-SECURITY-CHECKLIST.md) — Security checklist
- [DESIGN-QUESTION-RESEARCH.md](DESIGN-QUESTION-RESEARCH.md) — Design decisions research
- [SECURITY-RESEARCH.md](SECURITY-RESEARCH.md) — Security patterns research
