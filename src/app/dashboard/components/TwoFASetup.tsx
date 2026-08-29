'use client';

import { useState } from 'react';

export const TwoFASetup = () => {
  const [step, setStep] = useState<'method' | 'totp-setup' | 'webauthn-setup' | 'verify'>('method');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [webauthnSupported, setWebauthnSupported] = useState(false);

  const handleTotpSetup = async () => {
    try {
      // In real app, call API to generate TOTP secret
      const response = await fetch('/api/auth/2fa/totp/generate', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      setTotpSecret(data.secret);
      setStep('totp-setup');
    } catch (error) {
      console.error('Failed to generate TOTP secret:', error);
    }
  };

  const handleWebauthnSetup = async () => {
    try {
      // In real app, initiate WebAuthn registration
      const response = await fetch('/api/auth/2fa/webauthn/start', {
        method: 'POST',
        credentials: 'include',
      });
      const options = await response.json();
      
      // Use WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
          user: {
            ...options.user,
            id: Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0)),
          },
        },
      });
      
      // Complete registration
      await fetch('/api/auth/2fa/webauthn/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      });
      
      alert('WebAuthn passkey registered successfully!');
    } catch (error) {
      console.error('WebAuthn registration failed:', error);
      alert('Failed to register passkey. Please try again.');
    }
  };

  const handleVerify = async () => {
    try {
      // In real app, verify TOTP code
      const response = await fetch('/api/auth/2fa/totp/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode }),
      });
      
      if (response.ok) {
        alert('2FA enabled successfully!');
        setStep('method');
        setTotpCode('');
      } else {
        alert('Invalid code. Please try again.');
      }
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
    }
  };

  return (
    <div className="p-6 bg-surface-elevated border border-border rounded-sm">
      <h2 className="text-lg font-semibold mb-6">Two-Factor Authentication</h2>
      
      {step === 'method' && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Add an extra layer of security to your account. Choose your preferred method:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleTotpSetup}
              className="p-6 border border-border rounded-sm hover:border-primary/50 transition-colors text-left"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm0 2.18l6.9 2.35v6.52c-3.82.96-7 4.18-7 8.57v1.68c-4.54-.62-8-4.57-8-9.57V3.53L12 3.18zM12 21.18c-2.16 0-4.07-.78-5.44-2.1L12 12.68l1.56-.52c2.64-.88 4.4-3.15 4.4-5.82V3.53L12 5.34l-6.9 2.35v6.52c0 2.88 1.9 5.47 4.54 6.32z"/>
                </svg>
              </div>
              <h3 className="font-medium mb-1">Authenticator App</h3>
              <p className="text-sm text-muted-foreground">Use Google Authenticator, Authy, or similar</p>
            </button>
            
            <button
              onClick={handleWebauthnSetup}
              className="p-6 border border-border rounded-sm hover:border-primary/50 transition-colors text-left"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
              </div>
              <h3 className="font-medium mb-1">Security Key</h3>
              <p className="text-sm text-muted-foreground">Use YubiKey, TouchID, FaceID, or Windows Hello</p>
            </button>
          </div>
        </div>
      )}
      
      {step === 'totp-setup' && (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-sm">
            <h3 className="font-medium text-yellow-400 mb-2">Step 1: Scan QR Code</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Open your authenticator app and scan this QR code:
            </p>
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-surface border border-border rounded-sm flex items-center justify-center">
                <span className="text-xs text-muted-foreground font-mono">QR CODE HERE</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-sm">
            <h3 className="font-medium text-blue-400 mb-2">Step 2: Enter Code</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the 6-digit code from your authenticator app:
            </p>
            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              maxLength={6}
              placeholder="000000"
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-center text-2xl tracking-widest font-mono"
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleVerify}
              className="flex-1 px-4 py-2 bg-primary text-surface rounded-md hover:bg-primary-dark"
            >
              Verify & Enable
            </button>
            <button
              onClick={() => setStep('method')}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};