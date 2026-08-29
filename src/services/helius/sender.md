# OSIRIS Helius Sender API Documentation

## API Reference

### `getRecentBlockhash()`

- **Purpose**: Get latest blockhash from Helius RPC for transaction building
- **Returns**: `{ blockhash: string, feeCalculator: any }`
- **Throws**: Error if RPC call fails
- **Usage**:
  ```ts
  const { blockhash, feeCalculator } = await sender.getRecentBlockhash();
  ```

### `getPriorityFeeQuote(): Promise<number>`

- **Purpose**: Estimate priority fee in lamports per compute unit
- **Returns**: Number (lamports per compute unit)
- **Default**: 1000 (0.001 SOL per compute unit) if API key not configured or error occurs
- **Usage**:
  ```ts
  const fee = await sender.getPriorityFeeQuote();
  ```

### `buildAndSignTransaction(instructions, tradeIntentId?, priorityFeeLamports?)`

- **Purpose**: Build and sign transaction using user's delegated authority
- **Parameters**:
  - `instructions`: Array of transaction instructions
  - `tradeIntentId`: Optional trade intent ID for state machine integration
  - `priorityFeeLamports`: Optional override for priority fee
- **Returns**: `Promise<VersionedTransaction>`
- **Throws**: Error if wallet key cannot be decrypted
- **State Machine**: Updates trade intent status during signing phase

---

## Error Handling

### Common Errors

| Error | Description | How to Handle |
|-------|-------------|---------------|
| `Failed to get recent blockhash` | RPC connection issue | Retry logic handles 3 attempts |
| `Circuit breaker tripped` | 5+ failures in 60s window | Return immediately with error |
| `Transaction confirmation timeout` | 30s wait for confirmation | Return `confirmed: false` |
| `Transaction confirmed with error` | Confirmed but failed (e.g., revert) | Return `confirmed: false` with error |

### Error Response Format

```ts
{
  signature: string;     // Transaction signature
  confirmed: boolean;    // True if transaction confirmed
  error?: string;        // Error message if any
}
```

---

## Error Cases

| Scenario | Error Condition | Result |
|---------|-----------------|--------|
| Blockhash fetch failure | `getLatestBlockhash` throws | Throw error, retry logic starts |
| Fee quote failure | `getPriorityFeeQuote` throws | Use default fee (1000) |
| Send failure | `sendTransaction` throws | Retry up to 3 times, then fail |
| Confirmation timeout | `getConfirmedTransaction` times out | Return `confirmed: false` |
| Circuit breaker | 5+ failures in 60s | Return `error: 'Circuit breaker tripped'` |
| State machine invalid transition | `canTransition()` returns false | Log warning, return unchanged status |
| DB update failure | `tradeIntentService.updateStatus` throws | Log error, continue with error result |

---

## Error Handling Best Practices

1. **Always validate inputs** - Use Zod schemas for request bodies
2. **Never swallow errors** - Log detailed context with tradeIntentId
3. **Fail-closed** - When in doubt, reject the operation
4. **State machine integrity** - Only allow valid transitions
5. **Logging** - Include signature, intentId, and error message in all logs

---

## Testing Notes

- Mock `connection.getConfirmedTransaction` to return quickly for testability
- Mock `tradeIntentService` for state machine updates
- Test circuit breaker with 5 failed attempts + 1 successful attempt
- Verify `simulateTransaction` returns correct fee info
- Test error paths: invalid wallet, invalid transaction, timeout

**Note**: All API endpoints are part of the Helius Sender service and should be tested in integration with the trade intent state machine.