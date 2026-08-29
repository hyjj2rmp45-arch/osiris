# OSIRIS Dashboard Design Spec

## Archetype
- Console / observability dashboard

## Frame
- AppShell + SideNav
- Content padding: 0
- Widget grid: md:grid-cols-3
- Rows for dense data: sessions, positions, alerts

## Widget Policy
- Card = standalone widget only
- Table = columnar dense data
- List/Item = scannable records
- EmptyState = empty filtered state

## Sections
- Portfolio: balances, quick stats
- Sessions: active/suspended list with actions
- Positions: table with unrealized/realized PnL
- Performance: chart + target comparison table
- Alerts: severity filter + time range + acknowledge/resolve
- Admin Multi-Sig: proposal cards + execution history rows
- News/Feed: compact list

## Status Semantics
- ACTIVE = green StatusDot
- SUSPENDED = yellow StatusDot
- PENDING = yellow Badge
- APPROVED = green Badge
- EXECUTED = blue Badge

## Actions
- Primary actions: bg-primary text-surface
- Danger actions: bg-red-600 text-white
- Secondary: border-border hover:bg-surface

## Loading / Error
- Skeleton placeholders for async widgets
- Error banner at widget top, not page-level only
