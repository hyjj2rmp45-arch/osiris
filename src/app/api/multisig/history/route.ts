import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { multisigProposals } from '@/lib/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { checkVelocity } from '@/lib/velocity';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const ctx = { request };
  try {
    const velocity = await checkVelocity(String(userId), 'api');
    if (!velocity.allowed) {
      return NextResponse.json({ error: 'velocity_limit_exceeded', ...velocity }, { status: 429 });
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || '20');
    const history = await db.select({
      id: multisigProposals.id,
      proposalType: multisigProposals.proposalType,
      title: multisigProposals.title,
      status: multisigProposals.status,
      executedAt: multisigProposals.executedAt,
      createdAt: multisigProposals.createdAt,
    })
      .from(multisigProposals)
      .where(eq(multisigProposals.status, 'executed'))
      .orderBy(desc(multisigProposals.executedAt ?? sql`NULL`))
      .limit(limit);

    return NextResponse.json({ history });
  } catch (error: any) {
    logger.error('GET /api/multisig/history error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
