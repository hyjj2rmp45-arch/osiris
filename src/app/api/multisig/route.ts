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

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const ctx = extractRequestContext(request);
  try {
    const velocity = await checkVelocity(String(userId), 'api');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const signerId = String(userId);

    const proposalsQuery = db.select().from(multisigProposals);
    const proposals = status
      ? await proposalsQuery.where(eq(multisigProposals.status, status)).orderBy(desc(multisigProposals.createdAt))
      : await proposalsQuery.orderBy(desc(multisigProposals.createdAt));

    const mapped = proposals.map((p) => {
      const signatures = Array.isArray(p.signatures)
        ? (p.signatures as Array<{ signerId: string; signature: string; timestamp: number }>)
        : [];
      return {
        id: p.id,
        proposalType: p.proposalType,
        title: p.title,
        status: p.status,
        signaturesCollected: signatures.length,
        threshold: p.threshold,
        expiresAt: p.expiresAt,
        hasSigned: signatures.some((s) => s && s.signerId === signerId),
      };
    });

    return NextResponse.json({ proposals: mapped });
  } catch (error: any) {
    logger.error('GET /api/multisig error:', error);
    const message = error?.message || 'Unknown error';
    await postNtfy('OSIRIS Error', `Multisig error: ${message}`, 'error,multisig', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const ctx = extractRequestContext(request);
  try {
    const velocity = await checkVelocity(String(userId), 'api');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const body = await request.json();
    const proposerId = String(userId);
    const expiresAt = new Date(body.expiresAt || Date.now() + 24 * 60 * 60 * 1000);

    const insertResult = await db.insert(multisigProposals).values({
      proposalType: body.proposalType || 'halt_recovery',
      title: body.title,
      description: body.description || null,
      payload: body.payload || {},
      threshold: 2,
      totalSigners: 3,
      signatures: [],
      proposerId,
      expiresAt,
    }).returning({ id: multisigProposals.id, status: multisigProposals.status, threshold: multisigProposals.threshold });

    const proposal = insertResult[0];
    if (!proposal) {
      return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
    }

    return NextResponse.json({
      id: proposal.id,
      status: proposal.status,
      signaturesNeeded: proposal.threshold,
    });
  } catch (error: any) {
    logger.error('POST /api/multisig error:', error);
    const message = error?.message || 'Unknown error';
    await postNtfy('OSIRIS Error', `Multisig error: ${message}`, 'error,multisig', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
