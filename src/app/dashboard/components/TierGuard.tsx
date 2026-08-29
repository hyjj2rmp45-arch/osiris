'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TierGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    try {
      const selected = localStorage.getItem('osiris_selected_tier');
      if (!selected) {
        router.replace('/select-tier');
      }
    } catch {
      router.replace('/select-tier');
    }
  }, [router]);

  return <>{children}</>;
}
