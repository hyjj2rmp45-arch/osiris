'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTier } from '@/contexts/TierContext';

interface PriceInfo {
  amount: number;
  label: string;
  description: string;
}

// Phantom wallet type declaration
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: { toString(): string; toBase58(): string };
      connect(): Promise<void>;
      signAndSendTransaction(tx: unknown): Promise<{ signature: string }>;
    };
  }
}

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const DESTINATION_ADDRESS = process.env.PHANTOM_SOL_ADDRESS || '3FfRM3fzySeMmKsWNND4vgajS6eKzWtnb5qDbFfbhxUk';

const priceInfo: Record<'monthly' | 'lifetime', PriceInfo> = {
  monthly: {
    amount: 0.3,
    label: '0.3',
    description: '/month after first week trial',
  },
  lifetime: {
    amount: 1.0,
    label: '1.0',
    description: 'one-time payment, lifetime access',
  },
};

export default function PaymentClient({ tier }: { tier: 'monthly' | 'lifetime' }) {
  const router = useRouter();
  const { setTier } = useTier();

  const [isProcessing, setIsProcessing] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isTelegramReady, setIsTelegramReady] = useState(false);
  const [autoRenew, setAutoRenew] = useState(tier === 'monthly'); // Default ON for monthly
  const solAmount = priceInfo[tier].label;

  useEffect(() => {
    const phantom = window.solana;
    if (phantom?.isPhantom && phantom.publicKey) {
      setWalletConnected(true);
    }

    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
      authenticateTelegram();
    } else {
      setIsTelegramReady(true);
    }
  }, []);

  const authenticateTelegram = async () => {
    try {
      const initData = (window as any).Telegram.WebApp.initData;
      if (!initData) {
        setIsTelegramReady(true);
        return;
      }

      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Telegram authentication failed');
      }

      setIsTelegramReady(true);
    } catch (err) {
      console.error('Telegram auth failed:', err);
      setIsTelegramReady(true);
    }
  };

  const handleConnectWallet = async () => {
    try {
      const phantom = window.solana;
      if (!phantom?.isPhantom) {
        setError('Phantom wallet not found. Please install Phantom wallet.');
        return;
      }
      await phantom.connect();
      if (phantom.publicKey) {
        setWalletConnected(true);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const handlePay = async () => {
    if (!walletConnected) {
      await handleConnectWallet();
      if (!walletConnected) return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const phantom = window.solana;
      if (!phantom?.publicKey) {
        setError('Wallet not connected properly');
        return;
      }

      const solanaWeb3 = await import('@solana/web3.js');
      const { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = solanaWeb3;

      const connection = new solanaWeb3.Connection(SOLANA_RPC);
      const fromPubkey = new PublicKey(phantom.publicKey.toBase58());
      const toPubkey = new PublicKey(DESTINATION_ADDRESS);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: Math.round(parseFloat(solAmount) * LAMPORTS_PER_SOL),
        })
      );

      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const { signature } = await phantom.signAndSendTransaction(transaction);
      setTxSignature(signature);

      await verifyPayment(signature, autoRenew);
      await grantAccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (signature: string, shouldAutoRenew: boolean) => {
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signature,
        tier,
        amount: solAmount,
        recipientAddress: DESTINATION_ADDRESS,
        autoRenew: shouldAutoRenew,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Payment verification failed');
    }
    return response.json();
  };

  const grantAccess = async () => {
    await setTier(tier);
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-obsidian pt-12 pb-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="font-mono text-2xl sm:text-3xl font-bold text-[color:var(--text-primary)]">
            Complete Your Purchase
          </h1>
          <p className="mt-2 font-mono text-sm text-[color:var(--text-secondary)]">
            Pay with Phantom wallet to unlock OSIRIS
          </p>
        </div>

        <div className="max-w-[560px] mx-auto">
          <div className="border border-obsidian-border bg-obsidian-surface p-6 mb-6">
            <h2 className="font-mono text-xl font-bold text-gold mb-2">
              {tier === 'monthly' ? 'Monthly Plan' : 'Lifetime Plan'}
            </h2>
            <p className="font-mono text-sm text-[color:var(--text-secondary)]">
              {priceInfo[tier].description}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-obsidian-border bg-obsidian-elevated p-4">
              <p className="font-mono text-xs uppercase tracking-wider text-[color:var(--text-muted)] mb-1">
                Recipient address
              </p>
              <code className="font-mono text-sm break-all text-[color:var(--text-primary)]">
                {DESTINATION_ADDRESS}
              </code>
            </div>

            <div className="border border-obsidian-border bg-obsidian-elevated p-4 text-center">
              <p className="font-mono text-xs uppercase tracking-wider text-[color:var(--text-muted)] mb-2">
                Amount to pay
              </p>
              <div className="flex items-center justify-center gap-1">
                <span className="font-mono text-2xl font-bold text-gold">{solAmount}</span>
                <span className="text-sm text-[color:var(--text-primary)]">SOL</span>
              </div>
            </div>

            {tier === 'monthly' && (
              <div className="border border-obsidian-border bg-obsidian-surface p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="mt-0.5 w-4 h-4 bg-obsidian-surface border border-obsidian-border rounded focus:ring-gold flex-shrink-0"
                  />
                  <span className="font-mono text-xs text-[color:var(--text-secondary)]">
                    <span className="text-gold font-bold">Auto-renew monthly</span> — Subscription continues automatically each month until canceled.{' '}
                    <span className="text-[color:var(--text-muted)]">
                      (Currently: {autoRenew ? 'ON ✓' : 'OFF'})
                    </span>
                  </span>
                </label>
              </div>
            )}

            {!walletConnected ? (
              <button
                onClick={handleConnectWallet}
                className="w-full py-3 px-4 font-mono text-sm font-bold text-white bg-[#7647ff] rounded transition-all hover:bg-[#5a32cc]"
              >
                Connect Phantom Wallet
              </button>
            ) : (
              <button
                onClick={handlePay}
                disabled={isProcessing || !!txSignature}
                className="w-full py-3 px-4 font-mono text-sm font-bold text-obsidian bg-gold rounded transition-all hover:bg-gold-bright disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing
                  ? 'Processing...'
                  : txSignature
                  ? 'Payment Sent! ✓'
                  : `Pay ${solAmount} SOL`}
              </button>
            )}

            {isProcessing && (
              <div className="text-center">
                <p className="font-mono text-xs text-[color:var(--text-muted)] animate-pulse">
                  Waiting for wallet confirmation...
                </p>
              </div>
            )}

            {txSignature && (
              <div className="text-center">
                <p className="font-mono text-xs text-success mb-2">Payment submitted!</p>
                <p className="font-mono text-[10px] text-[color:var(--text-muted)] break-all">
                  {txSignature}
                </p>
              </div>
            )}

            {error && (
              <div className="text-center p-3 bg-error/20 border border-error rounded">
                <p className="font-mono text-sm text-error">{error}</p>
              </div>
            )}
          </div>

          <div className="text-center pt-4">
            <Link
              href="/select-tier"
              className="font-mono text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
            >
              &larr; Back to tier selection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}