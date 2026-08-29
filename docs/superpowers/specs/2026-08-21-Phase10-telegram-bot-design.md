# OSIRIS Telegram Bot Design Spec

## Identity
- Bot name: OSIRIS Assistant
- Tone: concise, action-oriented, security-aware

## Commands
- /start — onboarding + menu
- /status — system health summary
- /alerts — recent security alerts
- /multisig — pending proposals + quick actions
- /pnl — today's realized/unrealized PnL
- /help — command reference

## UX Rules
- Inline keyboards for actions
- One action per message when possible
- Critical alerts: high priority notification + actionable button
- No secrets sent in chat
- Rate-limit command feedback

## Security
- Whitelist Telegram user IDs
- Require /auth code for admin actions
- Sensitive actions require multisig confirmation via bot

## Delivery
- grammy framework
- Use existing ntfy/security-monitor alerts as event source
- Polling interval: 30s for alerts
