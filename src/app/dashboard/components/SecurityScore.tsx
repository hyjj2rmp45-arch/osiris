'use client';

import { useState } from 'react';

interface SecurityCheck {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  weight: number;
  category: 'auth' | 'wallet' | 'trading' | 'system';
}

const mockSecurityChecks: SecurityCheck[] = [
  {
    id: '2fa-enabled',
    title: 'Two-Factor Authentication',
    description: 'TOTP or WebAuthn enabled for account access',
    passed: true,
    weight: 25,
    category: 'auth',
  },
  {
    id: 'passkey-registered',
    title: 'Passkey Registered',
    description: 'Hardware security key registered for re-auth',
    passed: false,
    weight: 20,
    category: 'auth',
  },
  {
    id: 'session-timeout',
    title: 'Session Timeout Enabled',
    description: 'Auto-suspend inactive sessions after 30 minutes',
    passed: true,
    weight: 10,
    category: 'trading',
  },
  {
    id: 'circuit-breaker',
    title: 'Circuit Breaker Active',
    description: 'Automatic pause on excessive errors or losses',
    passed: true,
    weight: 10,
    category: 'trading',
  },
  {
    id: 'api-rate-limit',
    title: 'API Rate Limiting',
    description: 'Rate limits enforced on all endpoints',
    passed: true,
    weight: 10,
    category: 'system',
  },
  {
    id: 'csp-enabled',
    title: 'Content Security Policy',
    description: 'Strict CSP with nonce-based scripts',
    passed: true,
    weight: 10,
    category: 'system',
  },
];

export const SecurityScore = () => {
  const [checks] = useState<SecurityCheck[]>(mockSecurityChecks);
  
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const passedWeight = checks
    .filter(c => c.passed)
    .reduce((sum, check) => sum + check.weight, 0);
  const score = Math.round((passedWeight / totalWeight) * 100);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const categoryLabels = {
    auth: 'Authentication',
    wallet: 'Wallet Security',
    trading: 'Trading Safety',
    system: 'System Security',
  };

  const groupedChecks = checks.reduce((acc, check) => {
    const category = check.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(check);
    return acc;
  }, {} as Record<string, SecurityCheck[]>);

  return (
    <div className="space-y-6">
      <div className="p-6 bg-surface-elevated border border-border rounded-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Security Score</h2>
          <div className="text-right">
            <p className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}/100</p>
            <p className="text-sm text-muted-foreground">
              {passedWeight} / {totalWeight} points
            </p>
          </div>
        </div>
        
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div 
            className={`h-full ${getScoreColor(score).replace('text-', 'bg-')}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedChecks).map(([category, categoryChecks]) => (
          <div key={category} className="p-4 bg-surface-elevated border border-border rounded-sm">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </h3>
            <div className="space-y-2">
              {categoryChecks.map((check) => (
                <div key={check.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      check.passed ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      <svg 
                        className={`w-3 h-3 ${check.passed ? 'text-green-500' : 'text-red-500'}`}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        {check.passed ? (
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        ) : (
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                        )}
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{check.title}</p>
                      <p className="text-xs text-muted-foreground">{check.description}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${check.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {check.passed ? '✓' : '✗'} {check.weight}pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};