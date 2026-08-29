import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { db } from '@/lib/db';
import { multisigProposals } from '@/lib/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { checkVelocity } from '@/lib/velocity';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const ctx = extractRequestContext(request);
  try {
    const velocity = await checkVelocity(String(userId), 'api');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const { id } = await params;
    const proposalId = Number(id);
    const [proposal] = await db.select().from(multisigProposals).where(eq(multisigProposals.id, proposalId));

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const signatures = Array.isArray(proposal.signatures) ? proposal.signatures : [];
    return NextResponse.json({
      id: proposal.id,
      proposalType: proposal.proposalType,
      title: proposal.title,
      status: proposal.status,
      signaturesCollected: signatures.length,
      threshold: proposal.threshold,
      expiresAt: proposal.expiresAt,
      hasSigned: false,
    });
  } catch (error: any) {
    logger.error('GET /api/multisig/[id] error:', error);
    const message = error?.message || 'Internal Server Error';
    await postNtfy('OSIRIS Error', `Multisig error: ${message}`, 'error,multisig', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const ctx = extractRequestContext(request);
  try {
    const velocity = await checkVelocity(String(userId), 'api');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const { id } = await params;
    const proposalId = Number(id);
    const body = await request.json();
    const action = request.nextUrl.searchParams.get('action');
    const signerId = String(userId);

    const [proposal] = await db.select().from(multisigProposals).where(eq(multisigProposals.id, proposalId));

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (action === 'sign') {
      if (proposal.status !== 'pending') {
        return NextResponse.json({ error: `Proposal is not pending (status: ${proposal.status})` }, { status: 400 });
      }

      if (new Date() > proposal.expiresAt) {
        await db.update(multisigProposals).set({ status: 'expired' }).where(eq(multisigProposals.id, proposalId));
        return NextResponse.json({ error: 'Proposal has expired' }, { status: 400 });
      }

      const signatures = Array.isArray(proposal.signatures) ? [...proposal.signatures] : [];
      if (signatures.some((s: any) => s && s.signerId === signerId)) {
        return NextResponse.json({ error: 'Signer has already signed this proposal' }, { status: 400 });
      }

      signatures.push({
        signerId,
        signature: body.signature || `sig_${Date.now()}`,
        timestamp: Date.now(),
      });

      const newStatus = signatures.length >= proposal.threshold ? 'approved' : 'pending';
      await db.update(multisigProposals).set({ signatures, status: newStatus }).where(eq(multisigProposals.id, proposalId));

      return NextResponse.json({
        success: true,
        signaturesCollected: signatures.length,
        threshold: proposal.threshold,
        status: newStatus,
      });
    }

    if (action === 'execute') {
      if (proposal.status !== 'approved') {
        return NextResponse.json({ error: `Proposal must be approved before execution (status: ${proposal.status})` }, { status: 400 });
      }

      await db.update(multisigProposals).set({ status: 'executed' }).where(eq(multisigProposals.id, proposalId));

      return NextResponse.json({
        success: true,
        proposalType: proposal.proposalType,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=sign or ?action=execute' }, { status: 400 });
  } catch (error: any) {
    logger.error('POST /api/multisig/[id] error:', error);
    const message = error?.message || 'Internal Server Error';
    await postNtfy('OSIRIS Error', `Multisig error: ${message}`, 'error,multisig', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}