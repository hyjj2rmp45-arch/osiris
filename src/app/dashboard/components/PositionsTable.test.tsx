import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { PositionsTable } from './PositionsTable';

describe('PositionsTable', () => {
  it('should render table header', () => {
    render(<PositionsTable />);
    expect(screen.getByText('Token')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Entry Price')).toBeInTheDocument();
    expect(screen.getByText('Current Price')).toBeInTheDocument();
    expect(screen.getByText('Unrealized PNL')).toBeInTheDocument();
    expect(screen.getByText('Realized PNL')).toBeInTheDocument();
  });

  it('should render table rows with mock data', () => {
    render(<PositionsTable />);
    // Use getAllByText since multiple elements contain these symbols
    const usdcElements = screen.getAllByText('USDC');
    const usdtElements = screen.getAllByText('USDT');
    const solElements = screen.getAllByText('SOL');
    expect(usdcElements.length).toBeGreaterThan(0);
    expect(usdtElements.length).toBeGreaterThan(0);
    expect(solElements.length).toBeGreaterThan(0);
  });

  it('should format PNL correctly', () => {
    render(<PositionsTable />);
    // Check for specific PNL values
    expect(screen.getByText('$2.00')).toBeInTheDocument();
    expect(screen.getByText('$-0.50')).toBeInTheDocument();
    expect(screen.getByText('$30.25')).toBeInTheDocument();
    // Check for realized PNL values
    expect(screen.getByText('$15.50')).toBeInTheDocument();
    expect(screen.getByText('$8.20')).toBeInTheDocument();
    expect(screen.getByText('$42.00')).toBeInTheDocument();
  });
});