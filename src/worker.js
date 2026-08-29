/**
 * OSIRIS Always-On Monitor Worker with Error Aggregation
 *
 * Purpose: 
 * 1. Keep fallback payment detection and notification dispatch alive
 * 2. Aggregate errors from various sources
 * 3. Attempt automatic fixes for known error patterns
 * 4. Provide weekly batch processing for regular fixes
 *
 * This worker intentionally does NOT run the Telegram bot polling loop.
 * The Telegram bot uses webhooks via Vercel (`/api/telegram/webhook`) so it
 * does not need a separate 24/7 polling process.
 *
 * NOTE: orkestr.eu deploy watchdog expects an HTTP listener to be running.
 * This worker starts a minimal HTTP server on the PORT env var (defaults to
 * 3000) just to pass the health check, then continues its polling loop.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TREASURY_ADDRESS = process.env.PHANTOM_SOL_ADDRESS || '3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk';
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'OSIRIS';
const NTFY_ERROR_TOPIC = process.env.NTFY_ERROR_TOPIC || 'osiris-errors-raw';
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 30000);
const HTTP_PORT = Number(process.env.PORT || process.env.WORKER_HTTP_PORT || 3000);
const SELF_HEALTH_CHECK_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const ERROR_FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const WEEKLY_BATCH_HOUR = 2; // 2 AM UTC
const ERRORS_FILE = path.join(__dirname, '..', 'errors.json');
const KNOWN_FIXES_FILE = path.join(__dirname, '..', 'known-fixes.json');

let lastSignature = '';
let lastSelfHealthAlert = 0;
let lastErrorFlush = 0;
let lastWeeklyBatch = 0;
let errorBuffer = [];
let knownFixes = [];

// ── HTTP server for orkestr.eu health check ──────────────────────────────────

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  
  // Health check endpoints
  if (url === '/health' || url === '/') {
    if (method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        errorCount: errorBuffer.length
      }));
      return;
    }
  }
  
  // Error reporting endpoint (for applications to report errors)
  if (url === '/api/errors' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const errorData = JSON.parse(body);
        await recordError(errorData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error recorded' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // Get errors (for debugging)
  if (url === '/api/errors' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ errors: errorBuffer }));
    return;
  }
  
  // Not found
  res.writeHead(404);
  res.end();
});

server.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[worker] HTTP health listener on 0.0.0.0:${HTTP_PORT}`);
});

// ── Initialize ──────────────────────────────────────────────────────────────

async function initialize() {
  // Load persistent error storage
  try {
    if (fs.existsSync(ERRORS_FILE)) {
      const data = fs.readFileSync(ERRORS_FILE, 'utf8');
      errorBuffer = JSON.parse(data);
      console.log(`[worker] Loaded ${errorBuffer.length} persistent errors`);
    }
  } catch (err) {
    console.error('[worker] Failed to load errors:', err);
    errorBuffer = [];
  }
  
  // Load known fixes
  try {
    if (fs.existsSync(KNOWN_FIXES_FILE)) {
      const data = fs.readFileSync(KNOWN_FIXES_FILE, 'utf8');
      knownFixes = JSON.parse(data);
      console.log(`[worker] Loaded ${knownFixes.length} known fixes`);
    }
  } catch (err) {
    console.error('[worker] Failed to load known fixes:', err);
    knownFixes = [];
  }
  
  console.log('[worker] Initialization complete');
}

// ── Error Handling ──────────────────────────────────────────────────────────

async function recordError(errorData) {
  try {
    // Add metadata if not present
    const error = {
      id: errorData.id || generateId(),
      timestamp: errorData.timestamp || new Date().toISOString(),
      severity: errorData.severity || 'info',
      source: errorData.source || 'unknown',
      message: errorData.message,
      details: errorData.details || {},
      ...errorData
    };
    
    // Add to buffer
    errorBuffer.push(error);
    
    // Persist periodically
    const now = Date.now();
    if (now - lastErrorFlush > ERROR_FLUSH_INTERVAL_MS) {
      await flushErrors();
    }
    
    // Send to ntfy for immediate visibility if critical/warning
    if (error.severity === 'critical' || error.severity === 'warning') {
      await sendNtfy(
        `[${error.severity.toUpperCase()}] ${error.source}: ${error.message}`,
        `Error ID: ${error.id}\nTime: ${error.timestamp}`,
        error.severity === 'critical' ? 'urgent' : 'high'
      );
    }
    
    // Attempt auto-fix if applicable
    await attemptAutoFix(error);
    
    console.log(`[worker] Recorded ${error.severity} error from ${error.source}: ${error.message.substring(0,100)}`);
  } catch (err) {
    console.error('[worker] Failed to record error:', err);
  }
}

async function flushErrors() {
  try {
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errorBuffer, null, 2));
    lastErrorFlush = Date.now();
    console.log(`[worker] Flushed ${errorBuffer.length} errors to disk`);
  } catch (err) {
    console.error('[worker] Failed to flush errors:', err);
  }
}

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

async function attemptAutoFix(error) {
  // Check against known fixes
  for (const fix of knownFixes) {
    if (matchesPattern(error, fix.pattern)) {
      console.log(`[worker] Attempting auto-fix for error ${error.id}`);
      const success = await applyFix(error, fix);
      if (success) {
        await sendNtfy(
          `🤖 Auto-fix applied for error ${error.id}`,
          `Fix: ${fix.description}\nError: ${error.message}`,
          'high'
        );
        return true;
      } else {
        await sendNtfy(
          `❌ Auto-fix failed for error ${error.id}`,
          `Fix: ${fix.description}\nError: ${error.message}`,
          'high'
        );
      }
    }
  }
  return false;
}

function matchesPattern(error, pattern) {
  // Simple string matching for now
  // Could be enhanced with regex, etc.
  return error.message.includes(pattern) || 
         (error.details && JSON.stringify(error.details).includes(pattern));
}

async function applyFix(error, fix) {
  // Placeholder for actual fix logic
  // In practice, this would:
  // 1. Clone the repo
  // 2. Apply the fix
  // 3. Create a branch
  // 4. Push and create PR
  // For now, just log
  console.log(`[worker] Would apply fix: ${fix.description}`);
  return false; // Not implemented yet
}

// ── Solana polling ─────────────────────────────────────────────────────────────

async function pollTreasury() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [TREASURY_ADDRESS, { limit: 5 }],
      }),
    });

    if (!response.ok) {
      console.error('[worker] RPC error:', response.status);
      await recordError({
        severity: 'warning',
        source: 'solana-rpc',
        message: `Solana RPC error: ${response.status}`,
        details: { status: response.status }
      });
      return null;
    }

    const data = await response.json();
    const signatures = data.result || [];
    if (!signatures.length) {
      return null;
    }

    const newest = signatures[0];
    if (newest.signature === lastSignature) {
      return null;
    }

    lastSignature = newest.signature;
    return newest.signature;
  } catch (err) {
    console.error('[worker] Poll failed:', err);
    await recordError({
      severity: 'warning',
      source: 'solana-poll',
      message: `Solana polling failed: ${err.message}`,
      details: { error: err.message }
    });
    return null;
  }
}

// ── Notifications ────────────────────────────────────────────────────────────

async function sendNtfy(title, message, priority = 'default') {
  if (!NTFY_TOPIC) {
    return;
  }

  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Title': title,
        'Priority': String(priority === 'urgent' ? 5 : priority === 'high' ? 4 : 3),
      },
      body: message,
    });
  } catch (err) {
    console.error('[worker] ntfy send failed:', err);
  }
}

// ── Error topic consumption ────────────────────────────────────────────────

async function consumeErrorTopic() {
  try {
    const response = await fetch(`https://ntfy.sh/${NTFY_ERROR_TOPIC}/json?since=now&timeout=10000`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      // Don't treat this as an error - topic might not exist yet
      return;
    }

    const data = await response.json();
    if (data && data.message) {
      // Forward error from ntfy topic to our error system
      await recordError({
        severity: 'info',
        source: 'ntfy-error-topic',
        message: data.message,
        details: { 
          topic: NTFY_ERROR_TOPIC,
          timestamp: data.time,
          id: data.id
        }
      });
    }
  } catch (err) {
    // Silently ignore errors in error consumption to avoid loops
    // console.error('[worker] Error topic consumption failed:', err);
  }
}

// ── Weekly batch processing ─────────────────────────────────────────────

async function processWeeklyBatch() {
  // Only run at the scheduled time
  const now = new Date();
  if (now.getUTCHours() !== WEEKLY_BATCH_HOUR) {
    return;
  }
  
  // Avoid running multiple times in the same hour
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (lastWeeklyBatch && lastWeeklyBatch.getTime() === today.getTime()) {
    return;
  }
  
  console.log('[worker] Starting weekly batch processing');
  
  // Get errors from the last week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentErrors = errorBuffer.filter(e => 
    new Date(e.timestamp.replace('Z', '+00:00')) > weekAgo
  );
  
  if (recentErrors.length === 0) {
    console.log('[worker] No errors to process in weekly batch');
    lastWeeklyBatch = today;
    return;
  }
  
  // Group by source and severity
  const grouped = {};
  for (const error of recentErrors) {
    const key = `${error.source}:${error.severity}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(error);
  }
  
  // Attempt to fix known patterns
  let fixesApplied = 0;
  let issuesCreated = 0;
  
  for (const error of recentErrors) {
    // Skip if already fixed
    if (error.fixed) {
      continue;
    }
    
    // Try known fixes
    let fixApplied = false;
    for (const fix of knownFixes) {
      if (matchesPattern(error, fix.pattern)) {
        const success = await applyFix(error, fix);
        if (success) {
          error.fixed = true;
          error.fixApplied = fix.description;
          fixesApplied++;
          fixApplied = true;
          break;
        }
      }
    }
    
    if (!fixApplied) {
      // Create GitHub issue for manual review
      const issueCreated = await createGitHubIssue(error);
      if (issueCreated) {
        issuesCreated++;
      }
    }
  }
  
  // Send summary
  await sendNtfy(
    "📊 OSIRIS Weekly Error Batch Complete",
    `Processed ${recentErrors.length} errors\n` +
    `Fixes applied: ${fixesApplied}\n` +
    `Issues created: ${issuesCreated}\n` +
    `Remaining: ${recentErrors.filter(e => !e.fixed).length}`,
    'default'
  );
  
  // Mark errors as processed
  for (const error of recentErrors) {
    if (!error.fixed) {
      error.processedInBatch = new Date().toISOString();
    }
  }
  
  lastWeeklyBatch = today;
  await flushErrors();
}

async function createGitHubIssue(error) {
  // Placeholder for GitHub issue creation
  // Would need GITHUB_TOKEN env var
  // For now, just log
  console.log(`[worker] Would create GitHub issue for error ${error.id}`);
  return false;
}

// ── Health check ─────────────────────────────────────────────────────────────

async function checkMonitoringHealth() {
  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot', params: [] }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return typeof data.result === 'number' && data.result > 0;
  } catch {
    return false;
  }
}

// ── Self health check ────────────────────────────────────────────────────────

async function checkSelfHealth() {
  try {
    const response = await fetch(`http://localhost:${HTTP_PORT}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (err) {
    console.error('[worker] Self health check error:', err);
    return false;
  }
}

// ── Main loop ────────────────────────────────────────────────────────────────

async function main() {
  console.log('[worker] Starting OSIRIS monitor worker with error aggregation...');
  console.log('[worker] Treasury:', TREASURY_ADDRESS);
  console.log('[worker] Poll interval:', POLL_INTERVAL_MS, 'ms');
  console.log('[worker] ntfy topic:', NTFY_TOPIC);
  console.log('[worker] ntfy error topic:', NTFY_ERROR_TOPIC);
  console.log('[worker] HTTP health port:', HTTP_PORT);

  if (!NTFY_TOPIC) {
    console.warn('[worker] NTFY_TOPIC not set; notifications disabled');
  }

  await initialize();
  await sendNtfy('OSIRIS Worker', 'Monitor worker started with error aggregation', 'high');

  const interval = setInterval(async () => {
    try {
      // Treasury polling
      const signature = await pollTreasury();
      if (signature) {
        console.log(`[worker] Payment detected via fallback: ${signature}`);
        await sendNtfy('Payment Detected', `Signature: ${signature}`, 'high');
      }

      // Solana health check
      const healthy = await checkMonitoringHealth();
      if (!healthy) {
        console.warn('[worker] Monitoring health check failed');
        await sendNtfy('OSIRIS Monitor', 'Health check failed', 'default');
      }

      // Error topic consumption
      await consumeErrorTopic();
      
      // Error flushing
      const now = Date.now();
      if (now - lastErrorFlush > ERROR_FLUSH_INTERVAL_MS) {
        await flushErrors();
      }
      
      // Weekly batch processing
      await processWeeklyBatch();
      
      // Self health check
      const selfHealthy = await checkSelfHealth();
      if (!selfHealthy) {
        const now = Date.now();
        if (now - lastSelfHealthAlert > SELF_HEALTH_CHECK_COOLDOWN_MS) {
          console.warn('[worker] Self health check failed');
          await sendNtfy('OSIRIS Self Health Check Failed', `Worker at localhost:${HTTP_PORT} is not responding`, 'high');
          lastSelfHealthAlert = now;
        }
      }
    } catch (err) {
      console.error('[worker] Monitoring error:', err);
      await sendNtfy('OSIRIS Monitor Error', String(err), 'urgent');
    }
  }, POLL_INTERVAL_MS);

  process.on('SIGINT', () => {
    console.log('[worker] Shutting down...');
    clearInterval(interval);
    server.close(() => {
      console.log('[worker] HTTP server closed');
      process.exit(0);
    });
  });

  console.log('[worker] Monitor worker running');
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});