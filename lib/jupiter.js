const JUPITER_QUOTE_URL = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_URL = 'https://quote-api.jup.ag/v6/swap';

/**
 * Simple fetch wrapper with timeout & retry for Jupiter API calls
 */
async function safeFetch(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 200 * Math.pow(2, i)));
    }
  }
}

// Minimal public API ----------------------------------------------------
export async function getQuote(params) {
  const url = new URL('https://quote-api.jup.ag/v6/quote');
  params && Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v.toString()));
  return await safeFetch(url.toString());
}

export async function getSwapTransaction(payload) {
  const res = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Swap failed: ${await res.text()}`);
  return await res.json();
}