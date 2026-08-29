import { NextRequest, NextResponse } from 'next/server';

export interface RequestContext {
  requestId: string;
  route: string;
  method: string;
  userId: string | undefined;
  walletId: string | undefined;
  ip: string | undefined;
}

export function extractRequestContext(input: NextRequest | Request): RequestContext {
  const requestLike = input as any;
  const rawUrl =
    typeof requestLike.nextUrl === 'object'
      ? requestLike.nextUrl.toString()
      : requestLike.url || requestLike.href || 'http://localhost';
  const url = new URL(rawUrl);
  const requestId = input.headers.get('x-request-id') || generateUuid();

  return {
    requestId,
    route: url.pathname,
    method: (input as any).method || 'GET',
    userId: url.searchParams.get('userId') || undefined,
    walletId: url.searchParams.get('walletId') || undefined,
    ip: input.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        input.headers.get('cf-connecting-ip') ||
        undefined,
  };
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createCorrelationId(): string {
  return generateUuid();
}

export function formatContext(ctx: RequestContext): string {
  return `[${ctx.requestId}] ${ctx.route} ${ctx.method} userId=${ctx.userId || 'anon'} wallet=${ctx.walletId || 'none'} ip=${ctx.ip || 'unknown'}`;
}
