import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendAdminAlert, configureAdminAlerts, getAdminAlertConfig, AdminAlerts } from '@/lib/admin-alerts';

describe('admin-alerts ntfy channel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    configureAdminAlerts({
      channels: { telegram: false, sse: false, sms: false, ntfy: false },
      ntfyTopic: undefined,
    });
  });

  it('sends ntfy alert when channel is enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    configureAdminAlerts({ channels: { telegram: false, sse: false, sms: false, ntfy: true }, ntfyTopic: 'OSIRIS' });

    await sendAdminAlert({
      requestId: 'req_test',
      title: 'Test',
      message: 'ntfy test',
      severity: 'high',
      source: 'test',
      timestamp: '2025-01-01T00:00:00.000Z',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ntfy.sh/OSIRIS',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Title: 'Test',
          Priority: '4',
          Tags: 'test',
        }),
      })
    );
  });

  it('does not send ntfy alert when channel is disabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    configureAdminAlerts({ channels: { telegram: false, sse: false, sms: false, ntfy: false } });

    await sendAdminAlert({
      requestId: 'req_test',
      title: 'Test',
      message: 'no ntfy',
      severity: 'low',
      source: 'test',
      timestamp: '2025-01-01T00:00:00.000Z',
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
