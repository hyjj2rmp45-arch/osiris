'use client';

import { useState } from 'react';

interface Token {
  mint: string;
  symbol: string;
  name: string;
  price: number;
  logoURI?: string;
}

const MOCK_TOKENS: Token[] = [
  { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', price: 185.50 },
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTt1g', symbol: 'USDC', name: 'USD Coin', price: 1.00 },
  { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether', price: 1.00 },
  { mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7zfq9SoMFoY', symbol: 'mSOL', name: 'Marinade Staked SOL', price: 215.30 },
  { mint: 'stSOLKZmGcFvXGxdxZqBR1YnN9oKmLXUUXMvTb1YYqU', symbol: 'stSOL', name: 'Lido Staked SOL', price: 220.15 },
  { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFxSYbKgedEx6gCG', symbol: 'JUP', name: 'Jupiter', price: 1.25 },
  { mint: 'BONKzx9RQQfA2Xc2hg6yJ5e8F9zH6XG1nQ8yT2R5p', symbol: 'BONK', name: 'Bonk', price: 0.000025 },
];

export const TokenSelector = ({ 
  onSelect, 
  placeholder = 'Search tokens...',
  excludeMints = [] 
}: { 
  onSelect: (token: Token) => void;
  placeholder?: string;
  excludeMints?: string[];
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredTokens = MOCK_TOKENS.filter(
    token => 
      !excludeMints.includes(token.mint) &&
      (token.symbol.toLowerCase().includes(query.toLowerCase()) ||
       token.name.toLowerCase().includes(query.toLowerCase()) ||
       token.mint.includes(query))
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-border rounded-md text-left bg-surface hover:bg-surface-elevated"
      >
        {placeholder}
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-surface-elevated border border-border rounded-md max-h-60 overflow-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-2 border-b border-border"
            autoFocus
          />
          <ul className="py-1">
            {filteredTokens.map((token) => (
              <li
                key={token.mint}
                onClick={() => {
                  onSelect(token);
                  setIsOpen(false);
                  setQuery('');
                }}
                className="px-3 py-2 hover:bg-primary/10 cursor-pointer flex items-center space-x-2"
              >
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                  {token.symbol[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{token.symbol}</p>
                  <p className="text-xs text-muted-foreground">${token.price.toFixed(4)}</p>
                </div>
              </li>
            ))}
            {filteredTokens.length === 0 && (
              <li className="px-3 py-2 text-center text-muted-foreground text-sm">
                No tokens found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};