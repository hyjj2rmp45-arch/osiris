'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const title = 'OSIRIS Global Error';
    const tags = 'error,global';
    const body = `Client global error: ${error.message}\ndigest: ${error.digest ?? 'none'}`;

    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      navigator.sendBeacon('https://ntfy.sh/OSIRIS', body);
    } else {
      fetch('https://ntfy.sh/OSIRIS', { method: 'POST', headers: { Title: title, Priority: '4', Tags: tags }, body }).catch(() => {});
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: 24 }}>
          <h1>Something went wrong</h1>
          <pre>{error.message}</pre>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
