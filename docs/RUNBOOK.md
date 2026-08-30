# OSIRIS Solo Operator Runbook

## Overview
OSIRIS runs as a Docker worker on orkestr.eu plus a Vercel frontend. Most incidents are recoverable without a laptop.

## Quick Checks
- Worker health: `https://osiris.orkestr.run/health`
- Frontend health: `https://osiris-ten-jade.vercel.app`
- ntfy topic: OSIRIS

## Incident Playbooks

### SEV1-Critical: Payment system down
1. Check worker health endpoint
2. If down: restart worker container
3. If worker up but RPC down: check ntfy for auto-fix status
4. If auto-fix failed: manual fallback in known-fixes.json

### SEV2-Major: Worker unhealthy
1. Check self-health log
2. Check ntfy alerts for last 1 hour
3. If fix loop: engage `NO_AUTO_FIX`, investigate, then remove when safe

### SEV3-Minor: Dashboard slow
1. Check Vercel status
2. Check Neon DB CU-hours usage
3. Approve queued fix when convenient via `/approve/:id`

### Emergency: All access lost
1. If school/IT restriction: ask admin to restart worker container
2. Otherwise wait for access restoration
3. Critical fixes auto-approve; system remains operational

## Emergency Controls
- `NO_AUTO_FIX`: stop all auto-fixes
- `/emergency-stop`: HTTP endpoint to engage kill switch
- Approval endpoint: `/approve/:id`

## Recovery
- Worker: `docker restart osiris-worker`
- Database: Neon console restore/branch reset
- Frontend: Vercel redeploy from GitHub

## Contacts
- ntfy: OSIRIS
- GitHub repo: hyjj2rmp45-arch/osiris
