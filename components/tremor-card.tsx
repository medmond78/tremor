'use client';

import { MarketMovement } from '@/lib/types';
import { memo } from 'react';

interface TremorCardProps {
  movement: MarketMovement;
  isSelected?: boolean;
  onClick?: () => void;
}

export const TremorCard = memo(function TremorCard({
  movement,
  isSelected = false,
  onClick,
}: TremorCardProps) {
  const from = movement.previousValue ?? 0;
  const to = movement.currentValue ?? 0;
  const delta = Math.round(to - from);
  const deltaLabel = (delta >= 0 ? '↑ ' : '↓ ') + Math.abs(delta) + ' pp';

  const isSettling = to <= 1 || to >= 99;
  const crossed50 = from < 50 !== to < 50;
  const isRestricted = Boolean(movement.restricted);

  const numScore = movement.seismoScore ?? 0;
  const score = numScore.toFixed(1);
  let level = 'Low';
  let scoreColor = '#e4e1d8'; // line
  if (numScore >= 7.5) {
    level = 'Extreme';
    scoreColor = '#f0674f'; // coral
  } else if (numScore >= 5.0) {
    level = 'High';
    scoreColor = '#f5b82e'; // sun
  } else if (numScore >= 2.5) {
    level = 'Moderate';
    scoreColor = '#4a9bf0'; // sky
  }

  const topQuestion = movement.marketMovements?.[0]?.question || movement.title;
  const eventTitle =
    movement.title === topQuestion ? 'Single market' : movement.title;
  const question = topQuestion;

  const formatMoney = (u: number) => {
    if (u >= 1000000) return `$${(u / 1000000).toFixed(1)}M`;
    if (u >= 1000) return `$${Math.round(u / 1000)}K`;
    return `$${Math.round(u)}`;
  };

  const marketsCount = movement.marketMovements?.length || 1;
  const volume = movement.totalVolume || movement.volume || 0;
  const meta = `${formatMoney(volume)} 24h vol${marketsCount > 1 ? ` · ${marketsCount} markets moved` : ''}`;

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={`group relative flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm transition-all sm:flex-row sm:items-start sm:gap-4 ${
        isSelected
          ? 'border-2 border-sky-deep shadow-md'
          : 'border border-line/50 hover:border-line hover:shadow-md'
      }`}
    >
      {/* Mobile Top Header (Score + Titles) */}
      <div className="flex items-center gap-3 sm:hidden">
        <div
          className="flex w-14 flex-none flex-col items-center rounded-md py-1.5 text-ink shadow-sm"
          style={{ backgroundColor: scoreColor }}
        >
          <span className="text-xl font-semibold leading-[26px]">{score}</span>
          <span className="font-mono text-[10px] font-medium uppercase leading-[14px]">
            {level}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="rounded-sm bg-line/60 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-ink">
              {movement.source || 'Polymarket'}
            </span>
            <span className="truncate">{eventTitle}</span>
          </div>
          <h3 className="line-clamp-2 text-base font-semibold leading-[22px] text-ink">
            {question}
          </h3>
        </div>
      </div>

      {/* Desktop Score Tile (Left column) */}
      <div
        className="hidden w-[84px] flex-none flex-col items-center gap-0.5 rounded-md py-3 text-ink shadow-sm sm:flex"
        style={{ backgroundColor: scoreColor }}
      >
        <span className="text-[28px] font-semibold leading-[34px]">
          {score}
        </span>
        <span className="font-mono text-xs font-medium uppercase leading-4">
          {level}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Desktop Event Title + Question */}
        <div className="hidden flex-col gap-1 sm:flex">
          <div className="flex flex-wrap items-center gap-2 text-[13px] leading-[18px] text-muted">
            <span className="rounded-sm bg-line/60 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase text-ink">
              {movement.source || 'Polymarket'}
            </span>
            <span>{eventTitle}</span>
          </div>
          <h3 className="m-0 text-xl font-semibold leading-[26px] text-ink">
            {question}
          </h3>
        </div>

        {/* Probability shift & badges row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          <span className="font-mono text-sm font-medium leading-5 text-ink">
            {from}% → {to}%
          </span>

          <span className="rounded-sm border border-line bg-paper px-2 py-0.5 font-mono text-xs font-medium text-ink">
            {deltaLabel}
          </span>

          {isSettling && (
            <span className="rounded-sm bg-line px-2 py-0.5 font-mono text-xs font-medium text-ink">
              Settling
            </span>
          )}

          {crossed50 && (
            <span className="rounded-sm border border-sky-deep bg-paper px-2 py-0.5 font-mono text-xs font-medium text-sky-deep">
              Crossed 50%
            </span>
          )}

          {isRestricted ? (
            <span className="rounded-sm border border-line bg-paper px-2 py-0.5 font-mono text-xs font-medium text-muted">
              Global only
            </span>
          ) : (
            <span className="rounded-sm border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-medium text-emerald-800">
              US tradeable
            </span>
          )}

          <span className="ml-auto hidden font-mono text-xs font-medium text-muted sm:inline">
            {meta}
          </span>
          <span className="ml-auto font-mono text-xs font-medium text-muted sm:hidden">
            {formatMoney(volume)}
            {marketsCount > 1 ? ` · ${marketsCount} mkts` : ''}
          </span>
        </div>
      </div>

      {/* Open market link */}
      {movement.url && movement.url !== '#' && (
        <a
          href={movement.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={
            movement.source === 'Kalshi'
              ? `Trade ${movement.title} on Kalshi`
              : isRestricted
                ? `View ${movement.title} on Polymarket`
                : `Trade ${movement.title} on Polymarket`
          }
          className="inline-flex min-h-[44px] flex-none items-center justify-end px-2 text-[13px] font-semibold text-sky-deep no-underline transition-colors hover:text-ink sm:self-center"
        >
          {movement.source === 'Kalshi'
            ? 'Trade on Kalshi ↗'
            : isRestricted
              ? 'View on Polymarket'
              : 'Open market'}
        </a>
      )}
    </article>
  );
});
