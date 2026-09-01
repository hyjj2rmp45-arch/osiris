# Phase 0: Critical Financial Security Checklist

## Purpose
Prevent the self-healing agent from causing financial loss by modifying payment-related code without proper safeguards. This checklist must pass completely before ANY code ships to production.

## Security Rules for the Self-Healing Agent

### Rule 1: Code Modification Guards
```javascript
// ❌ DENY - Never allow auto-fix on these files:
const BLOCKED_FILES = [
  'src/payments/',           // Payment processing code
  'src/subscription/',       // Subscription management
  'src/wallet/',            // Wallet/key management
  'src/telegram/bot.ts',     // Auth flow
  'src/api/auth/*',         // Authentication endpoints
  'src/lib/validation.ts',  // Input validation (if shared with payments)
  '*.env',                  // Environment variables
  '.github/**',             // CI/CD workflows
  'package.json',           // Dependencies
  'pnpm-lock.yaml'         // Lockfiles
];

// ✅ ALLOW - Safe for auto-fix:
const ALLOWED_FILES = [
  'src/error-handlers.js',     // Generic error handling
  'src/logging.js',           // Log formatting
  'src/monitor.js'            // Health checks (non-financial)
];

// 🚨 ESCALATE - Requires human approval:
// Any change within 10 lines of payment/webhook code
// Any function calls related to: transfer, withdraw, send, payment, subscribe
```

### Rule 2: Payment Code Change Detection
Before applying ANY fix, scan the diff for:
- `transfer`, `withdraw`, `send`, `payment`, `subscribe`, `unsubscribe`
- `solana`, `web3`, `wallet`, `keypair`, `privateKey`
- `amount`, `lamports`, `fee`, `price`, `cost`
- `0x` prefix (potential hex private key)

If detected → **BLOCK + ESCALATE**

### Rule 3: Transaction Validation for Payment-Related Fixes
```javascript
INSTRUCTIONS = """
If a proposed fix touches payment/webhook code:

1. BLOCK the fix immediately
2. Create a PR with [HUMAN-APPROVAL-REQUIRED] label
3. Send alert to admin Telegram: "⚠️ Payment code fix BLOCKED - manual review required"
4. Include full diff + test plan in alert
5. Do NOT attempt to auto-validate or test payment code
6. If webhook handler was failing, route to manual investigation, not auto-fix
"""
```

### Rule 4: Network Access Control for Self-Healing Agent
**ONLY ALLOW outbound connections to:**
- `api.github.com` (GitHub API for PRs)
- `ntfy.sh` (Notification service)
- `api.telegram.org` (Bot API for alerts)
- One approved Solana RPC endpoint (read-only operations only, if absolutely necessary)
- `raw.githubusercontent.com` (reading known-fixes.json)

**BLOCK ALL OTHER OUTBOUND:**
- No general internet access
- No DNS resolution for arbitrary domains
- No outbound to crypto exchange APIs
- No outbound to payment processors

### Rule 5: Key/Credential Access Prevention
The self-healing agent must NEVER be able to:
- Read `.env` files or environment variables containing secrets
- Access wallet keys, private keys, or signing credentials
- View or modify webhook secrets
- Read Telegram bot tokens
- Access Helius API keys or webhook secrets

**Implementation**: Run agent in restricted environment with minimal file system access.

### Rule 6: Transaction Signature Verification
```javascript
// Every webhook handler must include:
const verifyWebhook = (payload, signature, secret) => {
  // HMAC signature verification
  // Timestamp validation (reject >5min old)
  // Replay attack prevention (check recent signatures)
};
```

For Solana transactions:
- Always verify transaction signatures before processing
- Never auto-fix transaction verification logic
- If verification fails, escalate to human - don't auto-fix

### Rule 7: Rate Limiting Per User
- Limit fixes per error type per user (1 fix per error pattern per user per hour)
- Prevent abuse where attacker triggers many errors to drain resources

### Rule 8: Immutable Audit Trail
Every auto-fix creates an immutable record:
```json
{
  "timestamp": "2026-09-01T00:00:00Z",
  "error_id": "uuid",
  "fix_id": "uuid",
  "affected_files": ["src/file.js"],
  "affected_functions": ["functionName"],
  "confidence_score": 0.85,
  "safety_checks_passed": ["trust_boundary", "post_fix_validation"],
  "safety_checks_skipped": [],
  "applied_by": "autonomous_agent",
  "git_commit_hash": "abc123",
  "git_pr_number": 42,
  "human_verified": false,
  "reverted": false,
  "execution_duration_ms": 1500
}
```

### Rule 9: Health Check Requirements (Pre-Shipping)
Before ANY release:
- [ ] Security scan: Zero critical/high vulnerabilities
- [ ] Dependency audit: No known exploits in package-lock/pnpm-lock
- [ ] Code change analysis: No payment code touched by agent
- [ ] Network policy validation: Egress rules enforced
- [ ] Key access validation: Agent cannot read secrets
- [ ] Transaction simulation: Payment flow works with test transaction
- [ ] Penetration test: Basic attack surface analysis
- [ ] Security review sign-off: Human approves before shipping

## Summary
The self-healing agent operates under a strict principle: **any code touching money movement must never be auto-fixed**. All other code can be auto-fixed with proper validation. The system must be designed so that even if the AI goes rogue, users' funds remain secure.

## Files That REQUIRE Human Approval If Modified:
1. Any file in `src/payments/`, `src/subscription/`, `src/wallet/`
2. Any file containing payment webhook handlers
3. Any file with cryptographic functions
4. Any file reading/modifying environment variables
5. Any file modifying CI/CD configs
6. Any file adding/modifying dependencies

## Files Safe for Auto-Fix:
1. Pure error handlers (non-payment)
2. Logging and formatting code
3. Health check endpoints
4. Non-critical utility functions
