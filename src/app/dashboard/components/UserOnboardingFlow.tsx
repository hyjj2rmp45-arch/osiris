'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function UserOnboardingFlow() {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);

  const steps = [
    'Welcome',
    'Connect Wallet',
    'Set Trading Preferences',
    'Security Setup',
    'Complete',
  ];

  const nextStep = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      setCompleted(true);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (completed) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Onboarding Complete!</h2>
        <p className="text-muted-foreground mb-6">
          Your account is ready. You can start trading or configure your settings.
        </p>
        <button
          onClick={() => setStep(1)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark"
        >
          <span>Start Trading</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-xl font-semibold text-primary mb-6">
        {'Step ' + step + ': ' + steps[step - 1]}
      </h2>

      <div className="space-y-4">
        {/* Progress Indicator */}
        <div className="flex justify-between text-sm text-muted-foreground mb-4">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`
                flex-1
                ${i < step - 1
                  ? 'text-primary font-medium'
                  : i === step - 1
                  ? 'text-primary'
                  : 'text-muted-foreground'}
              `}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 1 && (
          <div>
            <p className="text-muted-foreground">
              Welcome to OSIRIS! We're glad you're here.
            </p>
            <button onClick={nextStep} className="btn-primary">
              Get Started
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-muted-foreground">
              Connect your Solana wallet to enable trading functionality.
            </p>
            <button onClick={nextStep} className="btn-primary">
              Connect Wallet
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-muted-foreground">
              Configure your trading preferences including risk limits and strategies.
            </p>
            <button onClick={nextStep} className="btn-primary">
              Set Preferences
            </button>
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="text-muted-foreground">
              Set up security features including 2FA, circuit breakers, and alerts.
            </p>
            <button onClick={nextStep} className="btn-primary">
              Security Setup
            </button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        {step > 1 && (
          <button
            onClick={prevStep}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm hover:bg-surface-hover"
          >
            Previous
          </button>
        )}
        {step < 5 && (
          <button
            onClick={nextStep}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark"
          >
            Next
          </button>
        )}
        {step === 5 && (
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark"
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}