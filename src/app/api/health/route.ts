import { NextRequest, NextResponse } from 'next/server';
import { getAllHealthChecks } from '@/lib/health';
import { heartbeat } from '@/lib/heartbeat';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const checks = await getAllHealthChecks();
    const healthy = checks.every((check) => check.healthy);

    if (!healthy) {
      return NextResponse.json(
        {
          status: 'degraded',
          checks,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      checks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    switch (action) {
      case 'heartbeat.emit':
        heartbeat.beat(body.service as string, Boolean(body.healthy), body.metadata);
        break;
      default:
        return NextResponse.json(
          { error: 'unknown_action', action },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
