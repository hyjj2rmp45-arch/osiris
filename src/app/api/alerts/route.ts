import { NextRequest, NextResponse } from 'next/server';
import { postNtfy } from '@/lib/ntfy';
import { extractRequestContext } from '@/lib/request-context';
import { db } from '@/lib/db';
import { notificationEvents } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { assertSignedIn } from '@/lib/route-auth';
import { alertQuerySchema, alertPatchSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = extractRequestContext(request);
  try {
    const unauthorized = assertSignedIn(request);
    if (unauthorized) return unauthorized;
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {
      limit: url.searchParams.get('limit') || '50',
    };
    if (url.searchParams.get('severity')) {
      queryParams.severity = url.searchParams.get('severity')!;
    }
    if (url.searchParams.get('maxAge')) {
      queryParams.maxAge = url.searchParams.get('maxAge')!;
    }
    const query = alertQuerySchema.parse(queryParams);

    let dbQuery = db.select().from(notificationEvents).orderBy(desc(notificationEvents.createdAt)).limit(query.limit);
    if (query.severity) {
      dbQuery = dbQuery.where(eq(notificationEvents.severity, query.severity)) as any;
    }
    const alerts = await dbQuery;
    let filtered = alerts;
    if (query.maxAge) {
      const cutoff = Date.now() - query.maxAge;
      filtered = alerts.filter((a: any) => new Date(a.createdAt).getTime() >= cutoff);
    }
    return NextResponse.json({ alerts: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await postNtfy('OSIRIS Error', `Alerts error: ${message}`, 'error,alerts', ctx);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = extractRequestContext(request);
  try {
    const unauthorized = assertSignedIn(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    const validated = alertPatchSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request', details: validated.error.issues }, { status: 400 });
    }
    const { id, status } = validated.data;
    await db.update(notificationEvents).set({ status }).where(eq(notificationEvents.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
