'use client';

import { MarketMovement } from '@/lib/types';
import { memo } from 'react';
import { ProbabilitySparkline } from './probability-sparkline';

interface TerminalViewProps {
  movements: MarketMovement[];
  selectedMovement: MarketMovement | null;
  onSelectMovement: (movement: MarketMovement) => void;
}

export const TerminalView = memo(function TerminalView({
  movements,
  selectedMovement,
  onSelectMovement,
}: TerminalViewProps) {
  const formatMoney = (u: number) => {
    if (u >= 1000000) return `$${(u / 1000000).toFixed(1)}M`;
    if (u >= 1000) return `$${Math.round(u / 1000)}K`;
    return `$${Math.round(u)}`;
  };

  const getScoreMeta = (score: number) => {
    if (score >= 7.5) {
      return { level: 'EXTREME', color: '#f0674f', bg: 'bg-[#f0674f]' };
    }
    if (score >= 5.0) {
      return { level: 'HIGH', color: '#f5b82e', bg: 'bg-[#f5b82e]' };
    }
    if (score >= 2.5) {
      return { level: 'MODERATE', color: '#4a9bf0', bg: 'bg-[#4a9bf0]' };
    }
    return { level: 'LOW', color: '#e4e1d8', bg: 'bg-line/70' };
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line/60 bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/80 font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
              <th scope="col" className="px-3.5 py-3 text-center sm:px-4">
                Score
              </th>
              <th scope="col" className="px-3.5 py-3 sm:px-4">
                Market / Event
              </th>
              <th scope="col" className="px-3.5 py-3 text-right sm:px-4">
                Prob
              </th>
              <th scope="col" className="px-3.5 py-3 text-right sm:px-4">
                Delta
              </th>
              <th
                scope="col"
                className="hidden px-3.5 py-3 text-right sm:px-4 md:table-cell"
              >
                24h Vol
              </th>
              <th
                scope="col"
                className="hidden px-3.5 py-3 text-center sm:px-4 lg:table-cell"
              >
                Venue
              </th>
              <th scope="col" className="px-3.5 py-3 text-right sm:px-4">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {movements.map((move) => {
              const numScore = move.seismoScore ?? 0;
              const { level, bg } = getScoreMeta(numScore);
              const from = move.previousValue ?? 0;
              const to = move.currentValue ?? 0;
              const delta = Math.round(to - from);
              const isPositive = delta >= 0;
              const deltaLabel =
                (isPositive ? '+ ' : '- ') + Math.abs(delta) + ' pp';
              const topQuestion =
                move.marketMovements?.[0]?.question || move.title;
              const eventTitle = move.title === topQuestion ? '' : move.title;
              const volume = move.totalVolume || move.volume || 0;
              const isSelected = selectedMovement?.id === move.id;
              const venue = move.source || 'Kalshi';

              return (
                <tr
                  key={move.id}
                  onClick={() => onSelectMovement(move)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMovement(move);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  className={`group cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-sky-deep ${
                    isSelected
                      ? 'bg-sky-deep/10 font-medium'
                      : 'hover:bg-paper/70'
                  }`}
                >
                  {/* Seismo Score Pill */}
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-center sm:px-4">
                    <div
                      className={`shadow-2xs inline-flex flex-col items-center justify-center rounded px-2 py-1 text-ink ${bg}`}
                    >
                      <span className="font-mono text-xs font-bold leading-none">
                        {numScore.toFixed(1)}
                      </span>
                      <span className="font-mono text-[9px] font-medium leading-none tracking-tight opacity-90">
                        {level}
                      </span>
                    </div>
                  </td>

                  {/* Market & Event Title */}
                  <td className="max-w-[280px] px-3.5 py-2.5 sm:max-w-md sm:px-4">
                    <div className="flex flex-col gap-0.5">
                      {eventTitle && (
                        <span className="line-clamp-1 font-mono text-[11px] text-muted">
                          {eventTitle}
                        </span>
                      )}
                      <span className="line-clamp-1 font-sans text-xs font-semibold text-ink sm:text-[13px]">
                        {topQuestion}
                      </span>
                    </div>
                  </td>

                  {/* Probability */}
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-right sm:px-4">
                    <div className="flex items-center justify-end gap-2.5">
                      <ProbabilitySparkline
                        from={from}
                        to={to}
                        width={52}
                        height={18}
                        showEndpoints={false}
                      />
                      <span className="font-mono text-xs font-bold text-ink sm:text-[13px]">
                        {Math.round(to)}%
                      </span>
                    </div>
                  </td>

                  {/* Delta (pp) */}
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-right sm:px-4">
                    <span
                      className={`font-mono text-xs font-semibold sm:text-[13px] ${
                        isPositive ? 'text-leaf' : 'text-coral'
                      }`}
                    >
                      {deltaLabel}
                    </span>
                  </td>

                  {/* 24h Volume */}
                  <td className="hidden whitespace-nowrap px-3.5 py-2.5 text-right font-mono text-xs text-muted sm:px-4 md:table-cell">
                    {formatMoney(volume)}
                  </td>

                  {/* Venue Badge */}
                  <td className="hidden whitespace-nowrap px-3.5 py-2.5 text-center sm:px-4 lg:table-cell">
                    <span className="inline-flex items-center gap-1 rounded bg-line/50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-ink">
                      {venue}
                      {!move.restricted && (
                        <span
                          title="CFTC-regulated & US tradeable"
                          className="h-1.5 w-1.5 rounded-full bg-leaf"
                        />
                      )}
                    </span>
                  </td>

                  {/* Outbound Trade Link */}
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-right sm:px-4">
                    {move.url ? (
                      <a
                        href={move.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded bg-sky-deep/10 px-2.5 py-1 text-xs font-medium text-sky-deep transition-colors hover:bg-sky-deep hover:text-white"
                      >
                        Trade <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
