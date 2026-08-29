import { formatContext } from './request-context';

type AlertBucket = {
  count: number;
  firstSeen: number;
  messages: string[];
  timer: NodeJS.Timeout | null;
};

const buckets = new Map<string, AlertBucket>();
const WINDOW_MS = 60_000;
const MAX_INDIVIDUAL = 3;
const BATCH_DELAY_MS = 30_000;

function pruneBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.firstSeen > WINDOW_MS * 2) {
      if (bucket.timer) clearTimeout(bucket.timer);
      buckets.delete(key);
    }
  }
}

export async function postNtfy(title: string, message: string, tags = 'error,app', context?: import('./request-context').RequestContext): Promise<void> {
  try {
    const key = `${title}\u0000${tags}\u0000${context?.route || 'global'}`;
    const now = Date.now();
    const body = context ? `${message}\n${formatContext(context)}` : message;

    pruneBuckets(now);

    const bucket = buckets.get(key);

    if (!bucket) {
      await fetch('https://ntfy.sh/OSIRIS', {
        method: 'POST',
        headers: { Title: title, Priority: '4', Tags: tags },
        body,
      });
      buckets.set(key, {
        count: 1,
        firstSeen: now,
        messages: [body],
        timer: null,
      });
      return;
    }

    bucket.count += 1;
    if (bucket.messages.length < 20) {
      bucket.messages.push(body);
    }

    if (bucket.count <= MAX_INDIVIDUAL) {
      await fetch('https://ntfy.sh/OSIRIS', {
        method: 'POST',
        headers: { Title: title, Priority: '4', Tags: tags },
        body,
      });
      return;
    }

    if (!bucket.timer) {
      bucket.timer = setTimeout(async () => {
        const b = buckets.get(key);
        if (!b) return;

        const summary = [
          `${b.count} occurrences`,
          'Recent:',
          ...b.messages.slice(-3),
        ].join('\n');

        try {
          await fetch('https://ntfy.sh/OSIRIS', {
            method: 'POST',
            headers: {
              Title: `${title} (burst)`,
              Priority: '3',
              Tags: `${tags},burst`,
            },
            body: summary,
          });
        } catch {
          // ignore notify failure
        }

        buckets.delete(key);
      }, BATCH_DELAY_MS);
    }
  } catch {
    // ntfy is best-effort; never break the app because notification delivery failed
  }
}
