import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        id: 1,
        proposalType: 'halt_resume',
        title: 'Test Proposal',
        description: 'Test description',
        status: 'pending',
        threshold: 2,
        signatures: [],
        payload: { reason: 'Test description' },
        totalSigners: 3,
        proposerId: 'admin-1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        executedAt: undefined,
      }]),
    }),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@/lib/request-context', () => ({
  createCorrelationId: vi.fn().mockReturnValue('test-correlation-id'),
}));

vi.mock('@/lib/security-logger', () => ({
  logSecurityEvent: vi.fn(),
}));

import { AdminMultiSigService } from '@/services/admin/multisig';

describe('AdminMultiSigService', () => {
  it('should create a proposal', async () => {
    const service = new AdminMultiSigService();
    const result = await service.createProposal({
      type: 'halt_resume',
      title: 'Test Proposal',
      description: 'Test description',
      createdBy: 'admin-1',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.type).toBe('halt_resume');
    expect(result.title).toBe('Test Proposal');
    expect(result.description).toBe('Test description');
    expect(result.status).toBe('pending');
    expect(result.requiredSignatures).toBe(2);
    expect(result.currentSignatures).toBe(0);
  });
});