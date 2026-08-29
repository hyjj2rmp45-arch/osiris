# Osiris ECC Automation

## Project: Osiris - Solana Trading Bot + Dashboard

### Core Rules

1. **Always use `ecc-agent-router`** for code reviews and security analysis
2. **Security first**: Any money-path / trade execution code must go through `llm-trading-agent-security`
3. **TDD required**: All new code must have corresponding tests
4. **Decimal precision**: Never lose SPL token decimals - always track mint.decimals
5. **Fail-closed**: When uncertain about state, refuse the action

### Master Plan Reference

**OSIRIS_AI_READY_MASTER_PLAN_v2.txt** (31,584 lines) is the single source of truth for all implementation. Located at:
```
/c/Users/kathi/workspace/osiris/OSIRIS_AI_READY_MASTER_PLAN_v2.txt
```

Key sections:
- **PART I**: Master Phase Plan (P0-P10) — what to build, in order
- **PART II**: Detailed Implementation Reference — full code, schemas, APIs
- **PART III**: Critical Research Gaps (Resolved) — security, latency, architecture
- **AGENT RULEBOOK**: 622 mandatory rules (R-001..R-622), 75 binding definitions (D-001..D-075), 10 checklists (CL-01..CL-10)

**R-001**: "THE PLAN IS THE LAW" — Treat this document as the single source of truth. Every file created must appear in a "Deliverables" list.

### Agent Routing (via ecc-agent-router)

| Trigger Pattern | Use This Agent |
|---|---|
| `.py` / Python code | `python-reviewer` |
| `.ts` / `.js` / Solidity | `typescript-reviewer` / `solidity-reviewer` |
| Architecture decisions | `architect` |
| Security / auth / secrets | `security-reviewer` |
| Code review / cleanup | `code-reviewer` |
| Performance / slow code | `performance-optimizer` |
| Money-path trade execution | `llm-trading-agent-security` |
| Dead code / refactoring | `refactor-cleaner` |

### Running Tasks

- **Cron jobs**: Use `cronjob` tool for periodic analysis (every 30m, hourly, daily)
- **Manual review**: Run `hermes --conversation "review my code"` 
- **Session management**: Keep osiris-session active for ongoing work

### Quick Start

```bash
# Test the ecc-agent-router
hermes --conversation "Review this Solidity code for reentrancy risks"

# Set up cron for periodic analysis  
cronjob schedule='every 30m' script='hermes run --session osiris-session --task code-review'

# Initialize session
hermes session activate osiris-session
```

## File Structure

```
/osiris/
├── OSIRIS_AI_READY_MASTER_PLAN_v2.txt  # Master plan (31k+ lines)
├── AGENTS.md       # This file (routing rules)
├── src/            # Source code
│   ├── trading.py  # Main trading logic
│   ├── test_reentrancy.sol  # Solidity test file
│   └── dashboard.py # Web dashboard
├── tests/          # Test suite
│   ├── test_trading.py
│   └── test_dashboard.py
└── docs/           # Documentation
```

## Verification

Before any code merge:
1. ✅ ecc-agent-router has reviewed the code
2. ✅ Security checks pass (llm-trading-agent-security for money-path)
3. ✅ Tests pass: `pytest tests/ -v`
4. ✅ Decimal handling verified (no silent precision loss)
5. ✅ No catch blocks silently swallowing errors
6. ✅ All gates from OSIRIS_AI_READY_MASTER_PLAN_v2.txt verified

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- ASTRYX:START -->
Astryx v0.4.5 · 158 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing, page frame included.
- Frame first: read `astryx docs layout` before writing any page or screen — page frame, region widths, breakpoint behavior.
- Dense data = rows (Table, List/Item), never Card-wrapped list items; Card is for standalone widgets. Status = StatusDot/Token; Badge = counts only.
- Custom styling: component props first; else Tailwind utilities backed by tokens (bg-surface, text-primary, rounded-lg) via tailwind-theme.css. No raw hex/px.
- Tokens for every value (`astryx docs tokens`). Brand/accent belongs in the theme (`astryx theme list` / `theme add <slug>`, or `astryx theme template` for a custom one) — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any style={{…}}, raw <div>/<span> layout, imported .css/@apply, or hardcoded/arbitrary value (e.g. bg-[#fff], p-[13px]) with the component or a token-backed utility. If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   158 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
