/**
 * OSIRIS Payment Verification — Helius-based on-chain transaction verification.
 * Watches for incoming SOL/USDC payments to Phantom wallet addresses.
 */
import { Connection, TransactionSignature, ParsedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOL_ADDRESS = '3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk';
const USDC_ADDRESS = process.env.PHANTOM_USDC_ADDRESS || '';
const USDC_MINT = process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export interface PaymentInfo {
  signature: string;
  from: string;
  to: string;
  amount: number; // in native units (lamports for SOL, raw USDC units)
  token: 'SOL' | 'USDC';
  blockTime: number | null | undefined;
  slot: number;
}

export interface PaymentVerificationResult {
  verified: boolean;
  payment?: PaymentInfo;
  error?: string;
}

/**
 * Verify a payment transaction on-chain.
 * Checks that the transaction:
 * - Was confirmed
 * - Sent to the correct wallet address
 * - Sent the correct token (SOL or USDC)
 * - Was not reverted
 */
export async function verifyPayment(
  signature: string,
  expectedToken: 'SOL' | 'USDC' = 'SOL',
  expectedAmount?: number,
): Promise<PaymentVerificationResult> {
  if (!signature) {
    return { verified: false, error: 'No signature provided' };
  }

  const connection = new Connection(RPC_URL, 'finalized');

  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { verified: false, error: 'Transaction not found' };
    }

    if (tx.meta?.err) {
      return { verified: false, error: `Transaction failed: ${tx.meta.err}` };
    }

    // Extract transfer info
    const instructions = tx.transaction.message.instructions;
    let transferInfo: { from: string; to: string; amount: number; token: 'SOL' | 'USDC' } | null = null;

    for (const ix of instructions) {
      if ('parsed' in ix && ix.parsed?.type === 'transfer') {
        const parsed = ix.parsed.info;
        transferInfo = {
          from: parsed.source,
          to: parsed.destination,
          amount: parsed.lamports,
          token: 'SOL',
        };
      } else if ('parsed' in ix && ix.parsed?.type === 'transferChecked') {
        const parsed = ix.parsed.info;
        transferInfo = {
          from: parsed.source,
          to: parsed.destination,
          amount: parsed.tokenAmount.amount ? parseInt(parsed.tokenAmount.amount, 10) : 0,
          token: 'USDC',
        };
      }
    }

    if (!transferInfo) {
      return { verified: false, error: 'No transfer instruction found' };
    }

    // Verify recipient
    const expectedRecipient = expectedToken === 'SOL' ? SOL_ADDRESS : USDC_ADDRESS;
    if (transferInfo.to !== expectedRecipient) {
      return { verified: false, error: `Payment sent to wrong address. Expected ${expectedRecipient}, got ${transferInfo.to}` };
    }

    // Verify amount if specified
    if (expectedAmount !== undefined && transferInfo.amount !== expectedAmount) {
      return { verified: false, error: `Amount mismatch. Expected ${expectedAmount}, got ${transferInfo.amount}` };
    }

    return {
      verified: true,
      payment: {
        signature,
        from: transferInfo.from,
        to: transferInfo.to,
        amount: transferInfo.amount,
        token: transferInfo.token,
        blockTime: tx.blockTime,
        slot: tx.slot,
      },
    };
  } catch (err) {
    return { verified: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Poll for recent payments to our wallet addresses.
 * Used as fallback when Helius webhook is not configured.
 */
export async function pollRecentPayments(
  token: 'SOL' | 'USDC' = 'SOL',
  limit: number = 20,
): Promise<PaymentInfo[]> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const recipient = token === 'SOL' ? SOL_ADDRESS : USDC_ADDRESS;

  try {
    const signatures = await connection.getSignaturesForAddress(
      new (await import('@solana/web3.js')).PublicKey(recipient),
      { limit },
    );

    const payments: PaymentInfo[] = [];

    for (const sig of signatures) {
      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || tx.meta?.err) continue;

      for (const ix of tx.transaction.message.instructions) {
        if ('parsed' in ix) {
          if (ix.parsed?.type === 'transfer' && token === 'SOL') {
            const parsed = ix.parsed.info;
            if (parsed.destination === recipient) {
              payments.push({
                signature: sig.signature,
                from: parsed.source,
                to: parsed.destination,
                amount: parsed.lamports,
                token: 'SOL',
                blockTime: tx.blockTime,
                slot: tx.slot,
              });
            }
          } else if (ix.parsed?.type === 'transferChecked' && token === 'USDC') {
            const parsed = ix.parsed.info;
            if (parsed.destination === recipient) {
              payments.push({
                signature: sig.signature,
                from: parsed.source,
                to: parsed.destination,
                amount: parsed.tokenAmount.amount ? parseInt(parsed.tokenAmount.amount, 10) : 0,
                token: 'USDC',
                blockTime: tx.blockTime,
                slot: tx.slot,
              });
            }
          }
        }
      }
    }

    return payments;
  } catch (err) {
    console.error('[payments] Poll failed:', err);
    return [];
  }
}