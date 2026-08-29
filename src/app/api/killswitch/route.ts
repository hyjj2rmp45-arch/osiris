import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { killSwitchService } from '@/services/safety/killswitch';
import { KillSwitchTrigger } from '@/lib/killswitch';
import { logger } from '@/lib/logger';
import { getAuthenticatedUser } from '@/lib/route-auth';
import { killswitchEngageSchema, killswitchRecoverySchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const status = killSwitchService.getState();
    return NextResponse.json({ state: status });
  } catch (error) {
    logger.error('[KillSwitch API] Error getting status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `KillSwitch error: ${message}`, 'error,killswitch', ctx);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const body = await request.json();
    const validated = killswitchEngageSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request', details: validated.error.issues }, { status: 400 });
    }
    const { trigger, source, details, confirmation } = validated.data;

    if (trigger === KillSwitchTrigger.ADMIN_PANIC || trigger === KillSwitchTrigger.TELEGRAM_HALT) {
      if (confirmation !== 'ENGAGE KILL SWITCH') {
        return NextResponse.json(
          { error: 'Confirmation required: "ENGAGE KILL SWITCH"' },
          { status: 400 }
        );
      }
    }

    const triggerSource = (source === 'admin' || source === 'tester' ? 'admin' : 'manual') as 'automatic' | 'manual' | 'admin';
    const reason = typeof details === 'string' ? details : (details as any)?.reason ?? source;
    await killSwitchService.halt(triggerSource, source, reason);

    return NextResponse.json({ success: true, engaged: true });
  } catch (error) {
    logger.error('[KillSwitch API] Error engaging:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `KillSwitch error: ${message}`, 'error,killswitch', ctx);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (auth instanceof NextResponse) return auth;
  const ctx = extractRequestContext(request);
  try {
    const body = await request.json();
    const validated = killswitchRecoverySchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request', details: validated.error.issues }, { status: 400 });
    }

    const { action, adminId, confirmation } = validated.data;

    if (action === 'propose') {
      const result = await killSwitchService.startRecovery(adminId);
      return NextResponse.json(result);
    }

    if (action === 'confirm') {
      if (confirmation !== 'I CONFIRM HALT RECOVERY') {
        return NextResponse.json(
          { error: 'Confirmation required: "I CONFIRM HALT RECOVERY"' },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, recovered: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('[KillSwitch API] Error with recovery:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `KillSwitch error: ${message}`, 'error,killswitch', ctx);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
