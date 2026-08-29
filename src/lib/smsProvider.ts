// src/lib/smsProvider.ts
/**
 * Simple wrapper around self-hosted Textbelt instance.
 * Runs locally, uses carrier email gateways (AT&T @txt.att.net, etc.).
 * No API key required. Unlimited SMS.
 */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  const url = 'http://127.0.0.1:9090/text'; // self-hosted Textbelt instance (port 9090)

  const params = new URLSearchParams({
    phone, // e.g. "+141****7407" or "4145187407"
    message,
    // No `key` needed for self-hosted unlimited tier
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const json = await response.json();
    // Self-hosted Textbelt returns { success: true, ... }
    return json.success === true;
  } catch (err) {
    console.error('[SMS Provider] Failed to send SMS', err);
    return false;
  }
}