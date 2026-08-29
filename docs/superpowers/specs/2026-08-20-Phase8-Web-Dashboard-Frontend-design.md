# Web Dashboard & Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive web dashboard with trading interface, portfolio management, session controls, and security features, following Phase 8 specifications.

**Architecture:** Modular frontend components consuming REST API endpoints with authentication, implementing trust tier enforcement and real-time updates via SSE. Components are separated by UI sections with clear interfaces.

**Tech Stack:** Next.js 14 (app router), TypeScript, Tailwind CSS, shadcn/ui components, Recharts for charts, Zustand for state management.

**Spec:** docs/superpowers/specs/2026-08-20-Phase8-Web-Dashboard-Frontend-design.md
---

## Architecture Overview

The frontend follows a modular approach where each UI section (Sidebar, Header, Portfolio, Trading Panel, Session Management) is a self-contained component with clear responsibilities and interfaces. 

Key aspects of the architecture:
- API integration: Components consume REST APIs exposing session management, trade execution, and wallet balance data
- Real-time updates: Uses SSE bus (from session-state-machine.ts events) for session lifecycle notifications
- Trust tier enforcement: Frontend components verify user permissions before rendering sensitive controls
- Paper trading isolation: Clear UI distinction between paper and real trading modes
- Security hardening: CSP strict nonce-based implementation, no inline scripts, sensitive operations require re-authentication

## Component Structure

### Sidebar Navigation
- Links to Portfolio, Trading, Sessions, Settings, Security, Onboarding
- Active link highlighting based on current route
- Responsive collapse for mobile view

### Header
- User identity display (name, role, tier)
- Security controls visibility based on trust tier
- Notifications dropdown with actionable items
- User avatar and logout button

### Portfolio View
- Wallet balances display (real and paper)
- Open positions table with PNL
- Performance charts using Recharts
- Trade history table with filtering/sorting
- Position detail view with analytics

### Trading Panel
- Session creation form with parameters
- Trade execution form with slippage selector
- Token search/selector component
- Trade confirmation modal
- Trade status indicators (pending, confirmed, failed)

### Session Management UI
- Active sessions list with parameters
- Revoke button with confirmation modal
- Prominent panic button (always visible)
- Session history tracking

### Settings & Security
- User settings form (theme, notifications)
- Security score display with actionable recommendations
- 2FA setup flow (TOTP + WebAuthn)
- Withdrawal whitelist management
- Circuit breaker configuration

### Copy Trading UI
- Target wallet list with copy percentage slider
- Performance tracking of copied trades
- Copy trade history display

## Security Implementation

- API calls authenticated via existing session tokens
- Sensitive operations require re-authentication (e.g., changing withdrawal destinations)
- CSP strict implementation with nonce-based scripts
- No secrets in frontend bundle (validated via bundle analysis)
- Security score display reflects actual security posture

## Responsive Design

- Desktop layout: Full-featured interface with multi-column structures
- Mobile layout: Collapsed navigation, stacked components, simplified views
- Responsive components using Tailwind CSS breakpoints
- Touch-friendly controls for mobile interaction

## Real-time Updates

- SSE bus events from session-state-machine.ts trigger UI updates
- Session state changes reflected in active sessions list and panic button visibility
- Trade execution updates reflected in portfolio PNL and trade history
- Real-time price updates via WebSocket/SSE for portfolio values