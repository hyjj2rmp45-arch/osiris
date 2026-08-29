'use client';

import { useState, useEffect } from 'react';

interface Proposal {
  id: number;
  proposalType: string;
  title: string;
  status: string;
  signaturesCollected: number;
  threshold: number;
  expiresAt: Date;
  hasSigned: boolean;
}

interface HistoryItem {
  id: number;
  proposalType: string;
  title: string;
  status: string;
  executedAt: string;
  createdAt: string;
}

export default function MultisigDashboard() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newProposal, setNewProposal] = useState({
    proposalType: 'halt_recovery',
    title: '',
    description: '',
    payload: {},
    proposerId: 'admin-1',
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  const signerId = 'admin-1';

  useEffect(() => {
    loadProposals();
    loadHistory();
  }, []);

  async function loadProposals() {
    try {
      setLoading(true);
      const res = await fetch('/api/multisig', {
        headers: { 'x-user-id': signerId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load proposals');
      setProposals(data.proposals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      const res = await fetch('/api/multisig/history');
      const data = await res.json();
      if (res.ok) setHistory(data.history || []);
    } catch {
      // keep history empty on fetch failure
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSign(proposalId: number) {
    try {
      const res = await fetch(`/api/multisig/${proposalId}?action=sign`, {
        method: 'POST',
        headers: {
          'x-user-id': signerId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signature: `sig_${Date.now()}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signing failed');
      await loadProposals();
      alert(`Signed! ${data.signaturesCollected}/${data.threshold} signatures collected`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed');
    }
  }

  async function handleExecute(proposalId: number) {
    try {
      const res = await fetch(`/api/multisig/${proposalId}?action=execute`, {
        method: 'POST',
        headers: { 'x-user-id': signerId },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      await loadProposals();
      await loadHistory();
      alert('Proposal executed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/multisig', {
        method: 'POST',
        headers: {
          'x-user-id': signerId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProposal),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create proposal');
      setShowCreate(false);
      setNewProposal({
        proposalType: 'halt_recovery',
        title: '',
        description: '',
        payload: {},
        proposerId: 'admin-1',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      await loadProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    executed: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Admin Multi-Sig Controls</h2>
          <p className="text-sm text-muted-foreground">
            2-of-3 threshold · {signerId}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'New Proposal'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-sm text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 bg-surface-elevated border border-border rounded-sm space-y-4">
          <h3 className="font-medium">Create New Proposal</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={newProposal.proposalType}
              onChange={e => setNewProposal({ ...newProposal, proposalType: e.target.value })}
              className="w-full p-2 border border-border rounded-sm bg-background"
            >
              <option value="halt_recovery">Halt Recovery</option>
              <option value="fee_change">Fee Change</option>
              <option value="tier_change">Tier Change</option>
              <option value="migration">Migration</option>
              <option value="signer_policy">Signer Policy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={newProposal.title}
              onChange={e => setNewProposal({ ...newProposal, title: e.target.value })}
              className="w-full p-2 border border-border rounded-sm bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={newProposal.description}
              onChange={e => setNewProposal({ ...newProposal, description: e.target.value })}
              className="w-full p-2 border border-border rounded-sm bg-background"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
          >
            Create Proposal
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading proposals...</div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No proposals yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => (
            <div key={p.id} className="p-4 bg-surface-elevated border border-border rounded-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground">#{p.id}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[p.status] || 'bg-gray-100'}`}>
                      {p.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.proposalType}</span>
                  </div>
                  <h3 className="font-medium mt-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.signaturesCollected}/{p.threshold} signatures · Expires {new Date(p.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {p.status === 'pending' && !p.hasSigned && (
                    <button
                      onClick={() => handleSign(p.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Sign
                    </button>
                  )}
                  {p.status === 'approved' && (
                    <button
                      onClick={() => handleExecute(p.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Execute
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <HistorySection history={history} historyLoading={historyLoading} />
    </div>
  );
}

function HistorySection({ history, historyLoading }: { history: HistoryItem[]; historyLoading: boolean }) {
  if (historyLoading) return <p className="text-sm text-muted-foreground">Loading history...</p>;
  if (!history.length) return <p className="text-sm text-muted-foreground">No executed proposals yet.</p>;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Execution History</h3>
      <div className="space-y-2">
        {history.map((item) => (
          <div key={item.id} className="p-3 bg-surface border border-border rounded-sm flex items-center justify-between">
            <div>
              <div className="font-medium">#{item.id} {item.title}</div>
              <div className="text-xs text-muted-foreground">{item.proposalType} · executed {item.executedAt ? new Date(item.executedAt).toLocaleString() : 'unknown'}</div>
            </div>
            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
