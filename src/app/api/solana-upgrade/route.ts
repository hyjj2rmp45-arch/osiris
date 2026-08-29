import { NextRequest, NextResponse } from 'next/server';
import { solanaUpgradeHandler } from '@/lib/solana-upgrade';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { solanaUpgradeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await solanaUpgradeHandler.checkUpgradeStatus();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const validated = solanaUpgradeSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request', details: validated.error.issues }, { status: 400 });
    }

    const result = validated.data.action === 'initiate'
      ? await solanaUpgradeHandler.initiateUpgrade()
      : await solanaUpgradeHandler.validate();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}