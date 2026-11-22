import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, LoaderCircle, Sparkles, Trash2 } from 'lucide-react';
import { disableDemoMode, enableDemoMode, fetchDemoStatus, DEMO_STATUS_KEY } from '../api/demo';
import { Icon } from './Icon';

export function DemoModeToggle() {
  const queryClient = useQueryClient();
  const [confirmingTeardown, setConfirmingTeardown] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: DEMO_STATUS_KEY,
    queryFn: ({ signal }) => fetchDemoStatus(signal),
    refetchInterval: 10000,
  });

  const enableMutation = useMutation({
    mutationFn: () => enableDemoMode(),
    onSuccess: () => {
      // Refresh all queries so leads, customers, installations, tickets, director dashboards update instantly
      queryClient.invalidateQueries();
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => disableDemoMode(),
    onSuccess: () => {
      setConfirmingTeardown(false);
      queryClient.invalidateQueries();
    },
  });

  const isPending = enableMutation.isPending || disableMutation.isPending;
  const isEnabled = status?.isEnabled ?? false;

  const handleToggle = () => {
    if (isPending) return;
    if (isEnabled) {
      setConfirmingTeardown(true);
    } else {
      enableMutation.mutate();
    }
  };

  const executeTeardown = () => {
    disableMutation.mutate();
  };

  if (isLoading && !status) {
    return (
      <div className="demo-toggle-wrap skeleton-pulse" title="Checking demo mode...">
        <div style={{ width: '120px', height: '28px', borderRadius: '999px', background: 'var(--surface)' }} />
      </div>
    );
  }

  return (
    <div className="demo-toggle-container">
      {confirmingTeardown ? (
        <div className="demo-confirm-bar">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--negative)' }}>
            Remove all 400 demo records?
          </span>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            style={{ height: '1.65rem', padding: '0 0.55rem', fontSize: '0.7rem' }}
            disabled={disableMutation.isPending}
            onClick={executeTeardown}
          >
            {disableMutation.isPending ? <Icon icon={LoaderCircle} className="spin" /> : <Icon icon={Trash2} />}
            Yes, Wipe Demo
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ height: '1.65rem', padding: '0 0.5rem', fontSize: '0.7rem' }}
            disabled={disableMutation.isPending}
            onClick={() => setConfirmingTeardown(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`demo-toggle-btn ${isEnabled ? 'is-active' : 'is-inactive'}`}
          title={
            isEnabled
              ? 'Demo Mode Active: 400 interconnected solar projects loaded. Click to tear down and wipe demo records.'
              : 'Click to populate database with 400 complete, interconnected projects in real-time.'
          }
        >
          {isPending ? (
            <>
              <Icon icon={LoaderCircle} className="spin" style={{ width: '0.9rem', height: '0.9rem' }} />
              <span className="demo-toggle-text">
                {enableMutation.isPending ? 'Populating 400 Projects...' : 'Wiping Demo Data...'}
              </span>
            </>
          ) : isEnabled ? (
            <>
              <span className="demo-pulse-dot" />
              <Icon icon={Sparkles} style={{ width: '0.9rem', height: '0.9rem', color: '#eab308' }} />
              <span className="demo-toggle-text">
                <b>Demo Mode ON</b>
                <small>400 Projects</small>
              </span>
              <span className="demo-pill-badge">Active</span>
            </>
          ) : (
            <>
              <Icon icon={Database} style={{ width: '0.9rem', height: '0.9rem', color: 'var(--muted)' }} />
              <span className="demo-toggle-text">
                Demo Data
                <small>Off</small>
              </span>
              <span className="demo-switch-thumb" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
