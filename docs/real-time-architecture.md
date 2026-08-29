# Real-Time Communication Architecture — OSIRIS Phase 4

## Decision: Server-Sent Events (SSE) over WebSocket (WS) for simplicity and reliability

### Rationale
- SSE provides automatic reconnection, event-id tracking, and built-in parsing
- Lower complexity than WS for unidirectional server-to-client updates (telegram bot -> dashboard)
- Works well with HTTP/2 multiplexing and existing Next.js API routes
- Fallback to polling available if needed

### Architecture Overview
```
Telegram Bot → [Webhook Handler] → [Event Publisher] → [SSE Endpoint] → [Dashboard Client]
                                                ↑
                                        [Internal Message Bus]
```

### Components

#### 1. Event Publisher (src/lib/events/publisher.ts)
- Publishes typed events to internal message bus
- Supports: trade events, session updates, wallet alerts, system notifications
- Uses async iterator pattern for fan-out to multiple subscribers

#### 2. SSE Endpoint (src/app/api/sse/route.ts)
- Next.js API route that sets up SSE connection
- Authenticates user via session cookie
- Subscribes to event publisher for user-specific events
- Sends keep-alive pings every 15 seconds
- Handles client disconnection cleanup

#### 3. Message Bus (src/lib/events/bus.ts)
- In-memory event bus using async iterators
- Each subscription gets its own iterator
- Events are typed with Zod schemas for validation
- Supports wildcard subscriptions (e.g., "trade:*")

#### 4. Dashboard Client (src/lib/events/client.ts)
- Wrapper for EventSource API
- Automatic reconnection with exponential backoff
- Event-type routing to handlers
- Message queuing during reconnect attempts

### Event Types
All events follow the format: `{ type: string, payload: unknown, timestamp: number }`

#### Trade Events
- `trade:new` - New copy trade detected
- `trade:success` - Trade executed successfully
- `trade:failed` - Trade failed with reason
- `trade:cancelled` - Trade cancelled by user

#### Session Events
- `session:started` - Copy trading session started
- `session:paused` - Session paused by user
- `session:resumed` - Session resumed
- `session:revoked` - Session revoked (panic or manual)

#### Wallet Events
- `wallet:balance_update` - Balance change detected
- `wallet:new_token` - New token received
- `wallet:approval` - Token approval transaction

#### System Events
- `system:alert` - Critical system alert
- `system:maintenance` - Maintenance mode notification
- `system:update` - Bot version/update notification

### Security Considerations
- All SSE endpoints require authentication
- Events are scoped to user ID (no cross-user leakage)
- Input validation on all incoming webhook events
- Rate limiting per connection to prevent abuse
- TLS encryption for all connections (handled by reverse proxy)

### Implementation Notes
- Uses native EventSource API in browser (no extra dependencies)
- Server-side uses `sse-channel` package for reliable SSE implementation
- Fallback to polling implemented for environments blocking SSE
- Memory leak prevention: automatic cleanup of stale subscriptions
- Backpressure handling: drop oldest events if queue exceeds 1000 items

### Configuration
- SSE endpoint: `/api/sse`
- Reconnect interval: 3000ms base, exponential backoff to 30s max
- Heartbeat interval: 15000ms
- Event retention: 5 minutes in memory bus
- Max concurrent SSE connections per user: 5

### Verification Checklist
- [ ] SSE endpoint returns correct Content-Type: `text/event-stream`
- [ ] Authentication middleware validates session
- [ ] Events are properly formatted as `data: JSON\\n\\n`
- [ ] Client handles reconnection and event ordering
- [ ] Heartbeat pings keep connection alive
- [ ] Memory bus cleans up subscriptions on disconnect
- [ ] Event types are validated with Zod schemas
- [ ] Rate limiting prevents abuse (max 10 events/sec/connection)