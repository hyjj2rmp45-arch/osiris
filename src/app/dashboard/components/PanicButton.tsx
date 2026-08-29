'use client';

import { useState } from 'react';
import { ConfirmationModal } from './ConfirmationModal';

export const PanicButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handlePanic = async () => {
    setIsConfirming(true);
    try {
      // In real app, call the panic API endpoint
      const response = await fetch('/api/trading/panic', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        alert('Panic button triggered! All sessions have been revoked.');
      } else {
        alert('Failed to trigger panic button. Please try again.');
      }
    } catch (error) {
      console.error('Panic button error:', error);
      alert('Failed to trigger panic button. Please try again.');
    } finally {
      setIsConfirming(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-6 py-4 bg-red-500 text-white font-bold text-lg rounded-sm hover:bg-red-600 active:bg-red-700 transition-colors duration-200"
        aria-label="Emergency panic button - revokes all active sessions immediately"
      >
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
          </svg>
          <span>PANIC BUTTON</span>
        </div>
      </button>
      
      <p className="text-center text-xs text-muted-foreground">
        Immediately revokes ALL active sessions
      </p>

      <ConfirmationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handlePanic}
        title="⚠️ CONFIRM PANIC BUTTON"
        message="This will IMMEDIATELY revoke ALL active trading sessions. This action CANNOT be undone. Are you absolutely sure?"
        confirmText="YES, TRIGGER PANIC"
        cancelText="Cancel"
        variant="danger"
        isLoading={isConfirming}
      />
    </div>
  );
};