# OSIRIS Site Design Spec

## Brand
- Name: OSIRIS
- Market: Solana trading platform
- Mood: High-performance, dark, precise, secure

## Frame / Layout
- AppShell with side nav on desktop
- Collapse to MobileNav at <= 768px
- Side nav width: 256px
- Content region: fluid
- No wrapper Card soup; use region-level spacing

## Tokens
- Surface: bg-surface
- Elevated: bg-surface-elevated
- Border: border-border
- Body text: text-body
- Muted: text-muted-foreground
- Primary: text-primary / bg-primary
- Accent: rose/thorn-red for alerts/critical actions

## Typography
- Headings: font-semibold
- Body: font-body
- Mono: font-mono for IDs, hashes, amounts

## Components
- Use Astryx frame components: AppShell, Layout, LayoutContent
- Status = StatusDot/Token; Badge = counts only
- Dense lists = Table or List/Item rows

## Responsive Contract
- > 1024px: nav 256 | content fluid
- <= 1024px: nav collapses to drawer
- <= 768px: toolbar actions wrap; full-width cards allowed

## Motion
- Subtle hover transitions only
- No decorative motion on data-dense screens

## Iconography
- lucide-react icons only
- Consistent 4px icon padding
