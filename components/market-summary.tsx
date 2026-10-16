'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function MarketSummary() {
  const summary = useQuery(api.marketSummary.getSummary);

  return (
    <section
      aria-label="Tremor report"
      className="flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-sm md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs font-medium uppercase leading-4 text-ink">
          Tremor report
        </span>
        <span className="font-mono text-xs font-medium uppercase leading-4 text-muted">
          {summary?.minutesAgo !== undefined
            ? `${summary.minutesAgo < 1 ? 'Just now' : `${summary.minutesAgo}m ago`} · Every 30 min`
            : 'Every 30 min'}
        </span>
      </div>

      {summary ? (
        <>
          <p className="m-0 text-sm leading-6 text-ink md:text-lg md:leading-7">
            {summary.summary}
          </p>
          {(summary.totalMovements > 0 || summary.extremeMovements > 0) && (
            <div className="mt-1 flex items-center gap-3 font-mono text-xs font-medium text-muted">
              <span>{summary.totalMovements} active movements</span>
              {summary.extremeMovements > 0 && (
                <>
                  <span>·</span>
                  <span className="text-coral">
                    {summary.extremeMovements} extreme
                  </span>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="m-0 text-sm leading-6 text-muted md:text-lg md:leading-7">
          No report yet. It will appear here once the first one is generated.
        </p>
      )}
    </section>
  );
}
