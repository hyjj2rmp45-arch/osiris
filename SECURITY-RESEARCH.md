# Security & Execution Research Report

## Topics Researched
1. Agent execution sandboxing (Docker, Firecracker, gVisor, E2B, microsandbox)
2. GitHub authentication for CI automation (GitHub App vs Fine-Grained PAT vs GITHUB_TOKEN)
3. Network isolation and egress control for AI agents
4. AWS IAM least-privilege patterns for agent identity
5. AI Agent Sandbox Checklist (files, shell, network, secrets, rollback)

---

## Topic 1: Agent Execution Sandboxing

### Current OSIRIS State
- Agent runs directly on orkestr.eu via systemd-managed Node.js worker
- No containerization — executes in the host environment
- Uses `child_process.execSync` for git operations
- Reads/writes files directly via Node.js fs module

### Research Findings

#### Augment Code Production Sandbox Checklist
**Minimum acceptable isolation for production agent code execution:**
- Firecracker/Kata microVMs for maximum isolation
- gVisa as lighter-weight fallback
- Standard Docker/runc explicitly **insufficient** for untrusted agent code
- **Secrets**: No Docker socket mount, no environment variable injection, no home directory access
- **Network**: Default-deny, explicit egress allowlist
- **Filesystem**: Only the assigned working directory, no host paths

#### Dev.to "How to sandbox AI agents in 2026"
**Market split into layers:**
1. **Primitives (Firecracker/gVisor/LiteBox)**: Maximum control, self-hosted
2. **Embeddable runtimes (E2B, microsandbox)**: Fastest to add, managed API or self-hosted
3. **Managed platforms (Daytona, Modal, Northflank)**: Zero-ops scaling, different isolation tradeoffs
4. **Hybrid (Google Agent Sandbox)**: K8s-based, open-source

**2026 consensus: Docker/runc alone insufficient for untrusted code**:
- "Shared-kernel container isolation isn't cutting it anymore"
- "You need to treat LLM-generated or user-supplied code as hostile"
- "A shared kernel just expands the blast radius"

**Quick picks comparison:**
| Solution | Pros | Cons |
|----------|------|------|
| Docker | Easy, universal | Shared kernel = weak isolation |
| E2B | Firecracker microVMs, <100ms boot | Vendor lock-in, pricing |
| Firecracker | Hardware virtualization, <5MB overhead | Operational overhead |
| gVisa | Strong isolation, open-source | Performance overhead |
| microsandbox | No vendor lock-in | Less mature |

#### Mimir Works Sandbox Checklist
**Blast radius bands:**
- **Read local public files** (docs, tests, logs): Allowed, low risk
- **Change shared state** (commit, push, update tickets): Review or workflow gate required
- **External irreversible action** (publish, refund, delete, email): Explicit approval gate required

**Shell access checklist:**
- Run from task workspace, not `$HOME`
- Foreground commands for short checks
- Background processes for servers (tracked only)
- Timeouts on every command
- Prefer read-only inspection before mutation
- Don't pipe secrets into commands that log stdout
- Treat package installs + lockfile changes as state changes
- Capture command + exit code + output in task log

**Network access checklist:**
- Separate lookup from exfiltration
- Allow public lookup only for tasks that need it
- Block outbound connections to non-allowlisted domains
- Block: POST/PUT/DELETE to external systems
- Allow: GET for package registries, documentation

---

## Topic 2: GitHub Authentication for CI Automation

### Current OSIRIS State
- Uses `gh` CLI for PR creation (`gh pr create` in worker.js line 973)
- Uses `git push` for branch pushes (line 972)
- Authentication likely via `GITHUB_TOKEN` or `GH_TOKEN` environment variable
- GitHub remote configured with HTTPS token auth

### Research Findings

#### GitHub Docs: GitHub App vs Personal Access Token
**GITHUB_TOKEN** (built-in):
- Automatically generated for each workflow run
- Limited to the repository (can't access org-level resources)
- Permissions configured via workflow YAML (`permissions:` key)
- **Best for**: Within-repository automation

**Fine-Grained PAT** (Fine-Grained Personal Access Token):
- More granular permissions than classic PATs
- Can be scoped to specific repos + specific operations
- Expiration: 1-366 days
- **Use for**: When GITHUB_TOKEN lacks needed permissions

**GitHub App**:
- Owned by organization, not individual user
- No user lifecycle dependency (PAT expires, App persists)
- Automatically handles token rotation
- Auditable installation events
- **Best for**: Long-running production automation

#### StepSecurity: Apps & PATs Centralized Visibility
**PAT drawbacks:**
- Associated with specific user → lifecycle management burden
- Long-lived tokens remain active after they're needed
- No automatic rotation

**GitHub App advantages:**
- Centralized visibility: all installations across organization
- Color-coded permissions (red=admin, yellow=write, blue=read)
- Installation scope tracking
- Active status monitoring
- Automatic token rotation via installation tokens

**For OSIRIS specifically:**
- Currently uses GITHUB_TOKEN or GH_TOKEN via gh CLI
- **Recommendation**: Keep using `GITHUB_TOKEN` (configured via workflow `permissions:`) but limit permissions to minimum:
  - `contents: write` (for branch creation + commit)
  - `pull-requests: write` (for PR creation)
  - Nothing else

---

## Topic 3: Network Isolation & Egress Control

### Current OSIRIS State
- Agent runs on orkestr.eu with full network access
- Calls GitHub API, ntfy.sh, and potentially arbitrary URLs
- No egress controls beyond application-level logic

### Research Findings

#### Mimir Works Network Checklist
**Two permissions hiding as one:**
1. **Lookup** (GET): Safe for documentation, package registries
2. **Exfiltration** (POST/PUT/DELETE): High-risk — uploads, webhooks, mutations

**Recommended controls:**
- Allow public lookup only for tasks that need it
- Block outbound to non-allowlisted domains
- Block POST/PUT/DELETE to external systems
- Separate data retrieval from data transmission

#### AWS IAM Least-Privilege for Agent Identity
**From AWS agent IAM research:**
- "Giving the agent all of these permissions permanently — the service account approach — violates least privilege"
- "The agent holds deployment permissions even when it's only doing analysis"
- **Dynamic scope**: Grant permissions only when needed for current operation
- **Cedar policy language**: Attribute-based authorization for multi-agent chains

**For OSIRIS:**
- Agent should NOT have full network egress
- Agent should only be able to call GitHub API + ntfy
- Outbound to arbitrary URLs should require explicit approval

---

## Topic 4: Recommendations for OSIRIS

### Immediate (Phase 1 — Non-Breaking)
1. **Network egress filtering at firewall level**:
   - Allow outbound to: `api.github.com`, `ntfy.sh`, `github.com` (for git operations)
   - Block all other outbound by default
   - This protects against exfiltration via generated fix code

2. **GitHub token scoping**:
   - Ensure the agent's `GH_TOKEN` has ONLY: `contents: write`, `pull-requests: write`
   - No `admin: repo_hook`, no `delete_repo`, no `workflow` permissions
   - Rotate token via GitHub App if currently using PAT (for lifecycle management)

3. **Shell command sanitization**:
   - All `execSync` calls in worker.js use `timeout` option (already present, good)
   - Add validation: no user input in shell commands (currently safe — error patterns come from known-fixes.json)
   - Set `cwd` to repository root only (already doing this)

### Short-term (Phase 2 — When moving to PR-based fixes)
4. **Sandboxed fix validation** (if implementing actual code generation):
   - If OSIRIS ever generates code via LLM, it should execute in:
     - **E2B sandbox** (Firecracker microVM) — sub-100ms boot, strong isolation
     - OR **Docker with --read-only --network=none** (minimum acceptable)
   - Validate fix code in sandbox BEFORE creating PR
   - Test: run `node --check` + any relevant tests in sandbox

5. **Egress allowlist per operation**:
   - `createPR()` → only needs GitHub API
   - `sendNtfy()` → only needs ntfy.sh
   - Any fix code → sandboxed with no network

### Long-term (Phase 3 — If OSIRIS evolves into true autonomous coding agent)
6. **Move to GitHub App** for authentication:
   - Eliminates PAT lifecycle management
   - Automatic rotation
   - Organization-wide visibility
   - Zero long-lived secrets

7. **Firecracker/gVisor sandbox** for code execution:
   - MicroVM isolation for fix validation
   - Hardware-level separation from host
   - Required if agent ever executes external/user-supplied code

---

## Topic 5: AI Agent Sandbox Checklist (Mimir Works)

### File Access
- ✅ Agent should only see: src/worker.js, known-fixes.json, error logs, /app/data/ state files
- ✅ Mount working directory read-write
- ✅ Block access to ~/.ssh, ~/.aws, /etc, /root, Docker socket

### Shell Access  
- ✅ Only allow `git` commands for PR workflow
- ✅ Block `npm install`, `pip install`, `curl`, `wget` by default
- ✅ All commands run from repo working directory (not $HOME)
- ✅ Timeouts enforced on all commands

### Network Access
- ✅ Allow: GitHub API, git operations over HTTPS
- ✅ Allow: ntfy.sh for notifications
- ✅ Block: All other outbound HTTP/HTTPS
- ✅ Block: POST/PUT/DELETE to any external endpoint

### Secrets
- ✅ No Docker socket access
- ✅ No environment variable dumping
- ✅ Token stored in file with restricted permissions only
- ✅ No secrets in working directory (already enforced by .gitignore)

### Rollback
- ✅ Git provides rollback (every fix is a PR)
- ✅ State files should use atomic writes (temp + rename)
- ✅ Kill switch (`/app/NO_AUTO_FIX`) for immediate stop
- ✅ EmergencyStop state persisted for restart recovery