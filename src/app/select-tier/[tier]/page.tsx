// Server component — receives route params and passes tier to PaymentClient
import { Suspense } from 'react';
import PaymentClient from './PaymentClient';

export default function PaymentPage({ params }: { params: { tier: string } }) {
  const tier = params?.tier === 'lifetime' ? 'lifetime' : 'monthly';
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-obsidian flex items-center justify-center">
          <div className="text-gold font-mono">Loading payment page...</div>
        </div>
      }
    >
      <PaymentClient tier={tier} />
    </Suspense>
  );
}
