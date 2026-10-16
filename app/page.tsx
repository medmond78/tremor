'use client';

import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { TremorCard } from '@/components/tremor-card';
import { MarketSummary } from '@/components/market-summary';
import { TremorDetailPanel } from '@/components/tremor-detail-panel';
import { useTremorData } from '@/hooks/use-tremor-data';
import { MarketMovement } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';

export default function Home() {
  const [windowSel, setWindowSel] = useState<'5m' | '60m' | '1440m'>('1440m'); // Default to 24h as in spec
  const [intensityFilter, setIntensityFilter] = useState<
    'all' | 'extreme' | 'high' | 'moderate' | 'low'
  >('all');
  const [volumeFilter, setVolumeFilter] = useState<
    'all' | 'whale' | 'high' | 'medium' | 'low'
  >('all');
  const [hideSettling, setHideSettling] = useState(true);
  const [selectedMovement, setSelectedMovement] =
    useState<MarketMovement | null>(null);
  const [isChangingWindow, setIsChangingWindow] = useState(false);

  const { movements, loading } = useTremorData(windowSel);

  // Handle ESC key to close panel
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMovement(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Handle window change with brief loading transition
  const handleWindowChange = (newWindow: '5m' | '60m' | '1440m') => {
    setIsChangingWindow(true);
    setWindowSel(newWindow);
    setTimeout(() => setIsChangingWindow(false), 250);
  };

  const windowLabelMap: Record<'5m' | '60m' | '1440m', string> = {
    '5m': 'Last 5 min',
    '60m': 'Last hour',
    '1440m': 'Last 24 hours',
  };

  const windowLabel = windowLabelMap[windowSel];

  // Count how many movements in current window are settling
  const settlingCount = useMemo(() => {
    return movements.filter((m) => {
      const val = m.currentValue ?? 0;
      return val <= 1 || val >= 99;
    }).length;
  }, [movements]);

  // Filter movements based on intensity, volume, and settling toggle
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const currVal = m.currentValue ?? 0;
      const isSettling = currVal <= 1 || currVal >= 99;

      // Settling filter: hide if toggle is ON
      if (hideSettling && isSettling) {
        return false;
      }

      // Intensity filter
      if (intensityFilter !== 'all') {
        const score = m.seismoScore ?? 0;
        if (intensityFilter === 'extreme' && score < 7.5) return false;
        if (intensityFilter === 'high' && (score < 5 || score >= 7.5))
          return false;
        if (intensityFilter === 'moderate' && (score < 2.5 || score >= 5))
          return false;
        if (intensityFilter === 'low' && score >= 2.5) return false;
      }

      // Volume filter
      if (volumeFilter !== 'all') {
        const volume = m.totalVolume || m.volume || 0;
        if (volumeFilter === 'whale' && volume < 500000) return false;
        if (volumeFilter === 'high' && (volume < 100000 || volume >= 500000))
          return false;
        if (volumeFilter === 'medium' && (volume < 25000 || volume >= 100000))
          return false;
        if (volumeFilter === 'low' && volume >= 25000) return false;
      }

      return true;
    });
  }, [movements, hideSettling, intensityFilter, volumeFilter]);

  const n = filteredMovements.length;
  const countLabel = `${n} ${n === 1 ? 'tremor' : 'tremors'} · ${windowLabel.toLowerCase()}`;

  const emptyText =
    hideSettling && settlingCount > 0 && filteredMovements.length === 0
      ? `Every top move in the ${windowLabel.toLowerCase()} is a market settling at 0 or 100%. Turn off "Hide settling markets" to see them.`
      : 'Nothing matches these filters. Try a wider window or lower intensity.';

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <Header windowLabel={windowLabel} />

      <div className="mx-auto flex max-w-[1376px] flex-col gap-8 p-4 sm:p-6 md:p-8 lg:flex-row">
        {/* Sidebar - Stacks above the feed on narrow screens, left rail on desktop */}
        <Sidebar
          selectedWindow={windowSel}
          onChangeWindow={handleWindowChange}
          selectedIntensity={intensityFilter}
          onChangeIntensity={setIntensityFilter}
          selectedVolume={volumeFilter}
          onChangeVolume={setVolumeFilter}
          hideSettling={hideSettling}
          onToggleSettling={() => setHideSettling((prev) => !prev)}
          settlingCount={settlingCount}
        />

        {/* Main Feed */}
        <main className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Tremor Report */}
          <MarketSummary />

          {/* Heading with tremor count and sort */}
          <div className="flex flex-wrap items-baseline justify-between gap-4 px-1 pt-4">
            <h1 className="m-0 text-2xl font-semibold leading-8 text-ink md:text-[28px] md:leading-[34px]">
              {countLabel}
            </h1>
            <span className="font-mono text-xs font-medium uppercase leading-4 text-muted">
              Sorted by intensity
            </span>
          </div>

          {/* Feed Content */}
          {loading && !isChangingWindow ? (
            <div className="flex flex-col items-center justify-center rounded-lg bg-surface p-12 text-center shadow-sm">
              <div className="mb-3 flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-deep/60"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="font-mono text-xs font-medium uppercase text-muted">
                Loading live tremors...
              </p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="flex flex-col gap-1 rounded-lg bg-surface p-8 shadow-sm">
              <div className="text-xl font-semibold leading-[26px] text-ink">
                All quiet
              </div>
              <div className="text-muted">{emptyText}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredMovements.map((move) => (
                <TremorCard
                  key={move.id}
                  movement={move}
                  isSelected={selectedMovement?.id === move.id}
                  onClick={() => {
                    setSelectedMovement((prev) =>
                      prev?.id === move.id ? null : move
                    );
                  }}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Tremor Detail Panel */}
      <TremorDetailPanel
        movement={selectedMovement}
        onClose={() => setSelectedMovement(null)}
      />
    </div>
  );
}
