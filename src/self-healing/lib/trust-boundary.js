/**
 * Trust Boundary Enforcement
 * 
 * Enforces strict allowlist/denylist for file modifications.
 * This is the FIRST line of defense - everything must pass here.
 * 
 * Security Model: Allowlist-first with denylist override.
 * Only explicitly permitted files can be modified.
 * 
 * Based on:
 * - Anthropic Claude Code Auto Mode (trust boundary + protected paths)
 * - GitHub Community: "Treat agents as untrusted contributors"
 * - AWS Security Framework R003 (uncontrolled changes reaching production)
 * - OWASP ASI #4 (supply chain risk)
 */

'use strict';

const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const ALLOWED_FILES = [
  /^src\/worker\.js$/,
  /^known-fixes\.json$/
];

const DENIED_PATTERNS = [
  // Infrastructure
  /Dockerfile/i,
  /\.dockerignore$/i,
  
  // Secrets & Credentials
  /\.env/i,
  /secret/i,
  /\.key$/i,
  /\.pem$/i,
  /\.env\.bot_token$/i,
  
  // Dependencies (supply chain risk)
  /package\.json$/,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  
  // Build tooling
  /tsconfig\.json$/,
  /postcss\.config/i,
  /tailwind\.config/i,
  
  // CI/CD (supply chain risk)
  /\.github\//,
  /\.(yml|yaml)$/,
  
  // Documentation (can't self-modify)
  /-DESIGN\.md$/i,
  /DEVIATIONS\.md$/i,
  /README\.md$/i,
  /SECURITY.*\.md$/i,
  
  // Self-healing config (prevent self-modification)
  /self-healing-config\.json$/,
  /emergency-state\.json$/,
  /bot-token\.env$/i,
  
  // State files (agent shouldn't write these directly)
  /\.fix_in_progress$/,
  /fix-queue\.json$/,
  /pending-approvals\.json$/
];

// ═══════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a file path is within the trust boundary.
 * 
 * @param {string} filePath - Relative or absolute path to check
 * @returns {{allowed: boolean, reason: string}} - Whether modification is allowed
 */
function isWithinTrustBoundary(filePath) {
  // Normalize path to relative form
  const normalized = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  
  // Check allowlist first (principle of least privilege)
  const isAllowed = ALLOWED_FILES.some(re => re.test(normalized));
  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Path '${normalized}' is not in the allowlist. Only src/worker.js and known-fixes.json are permitted.`
    };
  }
  
  // Check denylist (defense in depth)
  const isDenied = DENIED_PATTERNS.some(re => re.test(normalized));
  if (isDenied) {
    return {
      allowed: false,
      reason: `Path '${normalized}' matches a denylist pattern. This file is protected from auto-fix.`
    };
  }
  
  return { allowed: true, reason: 'Path is within trust boundary.' };
}

/**
 * Scan a list of file paths and return only those within trust boundary.
 * 
 * @param {string[]} filePaths - Array of file paths to check
 * @returns {{allowed: string[], denied: Array<{path: string, reason: string}>}}
 */
function filterByTrustBoundary(filePaths) {
  const allowed = [];
  const denied = [];
  
  for (const fp of filePaths) {
    const result = isWithinTrustBoundary(fp);
    if (result.allowed) {
      allowed.push(fp);
    } else {
      denied.push({ path: fp, reason: result.reason });
    }
  }
  
  return { allowed, denied };
}

/**
 * Check if a diff touches any file outside the trust boundary.
 * 
 * @param {string} diffText - Unified diff text
 * @returns {{safe: boolean, violations: string[]}}
 */
function validateDiffTrustBoundary(diffText) {
  const violations = [];
  
  // Extract file paths from diff headers (--- a/path or +++ b/path)
  const filePathRegex = /^(?:---|\+\+\+) [ab]\/(.+)$/gm;
  let match;
  
  while ((match = filePathRegex.exec(diffText)) !== null) {
    const filePath = match[1];
    const result = isWithinTrustBoundary(filePath);
    if (!result.allowed) {
      violations.push(`${filePath}: ${result.reason}`);
    }
  }
  
  return {
    safe: violations.length === 0,
    violations
  };
}

/**
 * Get the current trust boundary configuration (for audit/health reporting).
 */
function getTrustBoundaryStatus() {
  return {
    allowedFiles: ALLOWED_FILES.map(re => re.source),
    deniedPatterns: DENIED_PATTERNS.map(re => re.source),
    version: '1.0.0'
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  isWithinTrustBoundary,
  filterByTrustBoundary,
  validateDiffTrustBoundary,
  getTrustBoundaryStatus,
  ALLOWED_FILES,
  DENIED_PATTERNS
};
