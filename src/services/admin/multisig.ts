/**
 * Admin Multi-Signature Controls — OSIRIS Phase 5.9
 *
 * Database-based multi-sig for critical admin operations:
 * - HALT/resume
 * - Fee changes
 * - Tier changes
 * - Treasury withdrawal
 * - Destructive migrations
 * - Signer policy changes
 */

import { db } from '@/lib/db';
import { multisigProposals } from '@/lib/schema';
import { eq, and, sql, desc, gt } from 'drizzle-orm';
import { createCorrelationId } from '@/lib/request-context';
import { logSecurityEvent } from '@/lib/security-logger';

export type ProposalType =
  | 'halt_resume'
  | 'fee_change'
  | 'tier_change'
  | 'treasury_withdrawal'
  | 'destructive_migration'
  | 'signer_policy'
  | 'killswitch_recovery';

export type ProposalStatus = 'pending' | 'approved' | 'executed' | 'rejected' | 'expired';

export interface AdminProposal {
  id: number;
  type: ProposalType;
  title: string;
  description: string;
  requiredSignatures: number;
  currentSignatures: number;
  status: ProposalStatus;
  createdBy: string;
  executedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignatureInput {
  proposalId: number;
  adminId: string;
  signature: string;
}

function toProposalRow(p: typeof multisigProposals.$inferSelect): AdminProposal {
  return {
    id: p.id,
    type: p.proposalType as ProposalType,
    title: p.title,
    description: p.description ?? '',
    requiredSignatures: p.threshold,
    currentSignatures: p.signatures?.length ?? 0,
    status: p.status as ProposalStatus,
    createdBy: p.proposerId,
    ...(p.executedAt ? { executedAt: p.executedAt } : {}),
    expiresAt: p.expiresAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export class AdminMultiSigService {
  /**
   * Create a new admin proposal.
   */
  async createProposal(input: {
    type: ProposalType;
    title: string;
    description: string;
    createdBy: string;
    requiredSignatures?: number;
    ttlMs?: number;
  }): Promise<AdminProposal> {
    const ttlMs = input.ttlMs ?? 24 * 60 * 60 * 1000; // 24 hours default
    const expiresAt = new Date(Date.now() + ttlMs);

    const threshold = input.requiredSignatures ?? 2;
    const [proposal] = await db
      .insert(multisigProposals)
      .values({
        proposalType: input.type,
        title: input.title,
        description: input.description,
        payload: { reason: input.description },
        status: 'pending',
        threshold,
        totalSigners: threshold + 1,
        signatures: [],
        proposerId: input.createdBy,
        expiresAt,
      })
      .returning();

    if (!proposal) {
      throw new Error('Failed to create admin proposal');
    }

    const correlationId = createCorrelationId();
    await logSecurityEvent({
      event: 'admin.proposal.created',
      level: 'critical',
      correlationId,
      metadata: {
        proposalId: proposal.id,
        type: input.type,
        createdBy: input.createdBy,
        requiredSignatures: proposal.threshold,
      },
    });

    return toProposalRow(proposal);
  }

  /**
   * Sign a proposal.
   */
  async signProposal(input: SignatureInput): Promise<{ success: boolean; message: string }> {
    const proposal = await db
      .select()
      .from(multisigProposals)
      .where(eq(multisigProposals.id, input.proposalId))
      .limit(1);

    if (!proposal[0]) {
      return { success: false, message: 'Proposal not found' };
    }

    const p = proposal[0];

    if (p.status !== 'pending') {
      return { success: false, message: `Proposal is ${p.status}` };
    }

    if (p.expiresAt < new Date()) {
      await db.update(multisigProposals).set({ status: 'expired' }).where(eq(multisigProposals.id, p.id));
      return { success: false, message: 'Proposal expired' };
    }

    // Record signature
    const currentSignatures = Array.isArray(p.signatures) ? p.signatures : [];
    await db
      .update(multisigProposals)
      .set({
        signatures: [...currentSignatures, { signerId: input.adminId, signature: input.signature, timestamp: Date.now() }],
        updatedAt: new Date(),
      })
      .where(eq(multisigProposals.id, input.proposalId));

    const signaturesCollected = currentSignatures.length + 1;
    if (signaturesCollected >= p.threshold) {
      await db
        .update(multisigProposals)
        .set({ status: 'approved', updatedAt: new Date() })
        .where(eq(multisigProposals.id, input.proposalId));

      return { success: true, message: 'Proposal approved and ready for execution' };
    }

    return { success: true, message: `Signature recorded. ${p.threshold - signaturesCollected} more needed` };
  }

  /**
   * Execute an approved proposal.
   */
  async executeProposal(proposalId: number): Promise<{ success: boolean; message: string }> {
    const proposal = await db
      .select()
      .from(multisigProposals)
      .where(eq(multisigProposals.id, proposalId))
      .limit(1);

    if (!proposal[0]) {
      return { success: false, message: 'Proposal not found' };
    }

    const p = proposal[0];

    if (p.status !== 'approved') {
      return { success: false, message: `Proposal is ${p.status}, cannot execute` };
    }

    await db
      .update(multisigProposals)
      .set({ status: 'executed', executedAt: new Date(), updatedAt: new Date() })
      .where(eq(multisigProposals.id, proposalId));

    return { success: true, message: 'Proposal executed successfully' };
  }

  /**
   * Get all pending proposals.
   */
  async getPendingProposals(): Promise<AdminProposal[]> {
    const proposals = await db
      .select()
      .from(multisigProposals)
      .where(and(eq(multisigProposals.status, 'pending'), gt(multisigProposals.expiresAt, new Date())))
      .orderBy(desc(multisigProposals.createdAt));

    return proposals.map(toProposalRow);
  }
}

export const adminMultiSigService = new AdminMultiSigService();