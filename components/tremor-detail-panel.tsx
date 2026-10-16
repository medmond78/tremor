'use client';

import { MarketMovement } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface TremorDetailPanelProps {
  movement: MarketMovement | null;
  onClose: () => void;
}

export function TremorDetailPanel({
  movement,
  onClose,
}: TremorDetailPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    explanation: string;
    sources?: string[];
  } | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestAnalysis = useAction((api.aiAnalysis as any).requestAnalysis);

  useEffect(() => {
    if (movement) {
      setIsVisible(true);
      setShowAll(false); // Reset expansion state when opening new panel
      setAiAnalysis(null); // Reset AI analysis

      // Auto-fetch AI analysis for high-intensity movements
      if (movement.seismoScore && movement.seismoScore >= 5) {
        setIsLoadingAI(true);
        // Prepare the data in the format expected by requestAnalysis
        requestAnalysis({
          movementId: movement.id || '',
          eventId: movement.eventId || movement.id || '',
          title: movement.title || '',
          category: movement.category,
          currentValue: movement.currentValue || 0,
          previousValue: movement.previousValue || 0,
          seismoScore: movement.seismoScore || 0,
          marketQuestion: movement.marketMovements?.[0]?.question,
        })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((response: any) => {
            if (response.success) {
              // Extract the explanation and sources from the response
              if (response.analysis) {
                setAiAnalysis({
                  explanation:
                    response.analysis.explanation || response.analysis,
                  sources: response.analysis.sources || [],
                });
              }
            }
          })
          .catch(() => {
            // Silently handle AI analysis errors - non-critical feature
          })
          .finally(() => {
            setIsLoadingAI(false);
          });
      }
    } else {
      setIsVisible(false);
      setAiAnalysis(null);
    }
  }, [movement, requestAnalysis]);

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `$${(vol / 1000).toFixed(0)}K`;
    return `$${vol.toFixed(0)}`;
  };

  if (!movement) return null;

  return (
    <>
      {/* Centered Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
          isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />

        {/* Modal Content */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-panel-title"
          className={`relative w-full max-w-3xl transform transition-all duration-300 ${
            isVisible ? 'scale-100' : 'scale-95'
          }`}
        >
          <div className="flex max-h-[85vh] flex-col rounded-lg border border-line bg-surface shadow-xl">
            {/* Header */}
            <div className="border-b border-line px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {/* Title and close button */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <h2
                        id="detail-panel-title"
                        className="text-lg font-semibold leading-tight text-ink md:text-xl"
                      >
                        {movement?.title}
                      </h2>

                      {/* Only show market details if multiple markets or if different from title */}
                      {movement?.marketMovements &&
                        movement.marketMovements[0] &&
                        (movement.marketMovements.length > 1 ? (
                          <>
                            <div className="mb-1 mt-3 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
                              LEADING MARKET ({movement.marketMovements.length}{' '}
                              MARKETS TOTAL)
                            </div>
                            <p className="text-sm font-medium leading-snug text-ink">
                              {movement.marketMovements[0].question}
                            </p>
                          </>
                        ) : (
                          movement.marketMovements[0].question !==
                            movement.title && (
                            <p className="mt-2 text-sm text-muted">
                              {movement.marketMovements[0].question}
                            </p>
                          )
                        ))}
                    </div>
                    <button
                      className="-mt-1 text-2xl font-light text-muted transition-colors hover:text-ink"
                      onClick={onClose}
                      aria-label="Close details panel"
                    >
                      ×
                    </button>
                  </div>

                  {/* Quick stats */}
                  <div className="mt-3 flex items-center gap-4 font-mono text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-muted">Intensity:</span>
                      <span
                        className={`font-bold ${
                          movement?.seismoScore && movement.seismoScore >= 7.5
                            ? 'text-coral'
                            : movement?.seismoScore && movement.seismoScore >= 5
                              ? 'text-sun'
                              : movement?.seismoScore &&
                                  movement.seismoScore >= 2.5
                                ? 'text-sky'
                                : 'text-ink'
                        }`}
                      >
                        {movement?.seismoScore?.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted">Volume:</span>
                      <span className="text-ink">
                        {formatVolume(
                          movement?.totalVolume || movement?.volume || 0
                        ) || '—'}
                      </span>
                    </div>
                    {movement?.category && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted">Category:</span>
                        <span className="text-ink">{movement.category}</span>
                      </div>
                    )}
                    {movement?.restricted ? (
                      <span className="rounded-sm border border-line bg-paper px-2 py-0.5 font-mono text-xs font-medium text-muted">
                        Global only
                      </span>
                    ) : (
                      <span className="bg-sky-tint rounded-sm border border-sky-deep/20 px-2 py-0.5 font-mono text-xs font-medium text-sky-deep">
                        US Accessible
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* AI Analysis for high-intensity movements */}
              {movement.seismoScore && movement.seismoScore >= 5 && (
                <div className="mb-6">
                  <div className="mb-4 flex items-center gap-2 border-b border-line pb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="5"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-sky-deep"
                      />
                      <path
                        d="M12 1v6m0 6v6m11-7h-6m-6 0H1"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="text-sky-deep"
                      />
                    </svg>
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-sky-deep">
                      Real-Time Social Intelligence
                    </span>
                  </div>
                  {isLoadingAI ? (
                    <div className="flex items-center gap-3 rounded border border-tremor-pulse/20 bg-tremor-pulse/5 p-4">
                      <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="h-2 w-2 animate-pulse rounded-full bg-tremor-pulse/60"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-xs text-muted">
                        Analyzing social signals...
                      </span>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-3">
                      <div className="rounded-md border border-sky-deep/20 bg-paper p-4">
                        <p className="text-sm leading-relaxed text-ink">
                          {aiAnalysis.explanation}
                        </p>
                      </div>
                      {aiAnalysis.sources && aiAnalysis.sources.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                            Sources from X
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {aiAnalysis.sources.map((source, idx) => {
                              const match = source.match(/x\.com\/([^\/]+)/);
                              const username = match
                                ? `@${match[1]}`
                                : `Post ${idx + 1}`;

                              return (
                                <a
                                  key={idx}
                                  href={source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-sm border border-line bg-paper px-2 py-1 font-mono text-[10px] text-muted transition-all hover:border-sky-deep hover:text-sky-deep"
                                >
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                  </svg>
                                  <span>{username}</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Individual Market Movements */}
              {movement.marketMovements &&
              movement.marketMovements.length > 0 ? (
                <div>
                  <div className="mb-4 flex items-center justify-between border-b border-line pb-2 font-mono text-xs">
                    <span className="font-semibold uppercase tracking-wider text-muted">
                      Market Breakdown
                    </span>
                    <span className="text-muted">
                      {movement.marketMovements.length}{' '}
                      {movement.marketMovements.length === 1
                        ? 'market'
                        : 'markets'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      const significantMarkets =
                        movement.marketMovements.filter(
                          (m) => Math.abs(m.change) >= 1.0
                        );
                      const lowMovementMarkets =
                        movement.marketMovements.filter(
                          (m) => Math.abs(m.change) < 1.0
                        );
                      const displayMarkets = showAll
                        ? movement.marketMovements
                        : significantMarkets.length > 0
                          ? significantMarkets
                          : movement.marketMovements;

                      return (
                        <>
                          {displayMarkets.map((market) => {
                            const changeAbs = Math.abs(market.change);
                            const isSignificant = changeAbs >= 5;

                            return (
                              <div
                                key={market.conditionId}
                                className={`rounded-md border p-3 transition-all ${
                                  isSignificant
                                    ? 'border-sky-deep/30 bg-paper'
                                    : 'border-line bg-surface'
                                }`}
                              >
                                {/* Market question */}
                                <h4 className="mb-4 text-sm font-medium leading-relaxed text-ink">
                                  {market.question}
                                </h4>

                                {/* Price movement bar */}
                                <div className="mb-2 flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex h-6 items-center rounded-sm bg-line/50">
                                      {/* Previous price marker */}
                                      <div
                                        className="relative h-full border-r-2 border-muted"
                                        style={{
                                          width: `${market.prevPrice * 100}%`,
                                        }}
                                      >
                                        <span className="absolute -top-5 right-0 font-mono text-[10px] text-muted">
                                          {Math.round(market.prevPrice * 100)}%
                                        </span>
                                      </div>
                                      {/* Current price fill */}
                                      <div
                                        className={`h-full transition-all ${
                                          market.change > 0
                                            ? 'bg-leaf/30'
                                            : market.change < 0
                                              ? 'bg-coral/30'
                                              : 'bg-muted/30'
                                        }`}
                                        style={{
                                          width: `${Math.abs(market.currPrice - market.prevPrice) * 100}%`,
                                        }}
                                      />
                                      {/* Current price marker */}
                                      <div className="relative h-full">
                                        <div
                                          className={`absolute top-0 h-full w-0.5 ${
                                            isSignificant
                                              ? 'bg-ink'
                                              : 'bg-muted'
                                          }`}
                                        />
                                        <span className="absolute -bottom-5 left-0 font-mono text-[10px] font-bold text-ink">
                                          {Math.round(market.currPrice * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Change indicator */}
                                  {changeAbs >= 0.1 && (
                                    <div
                                      className={`flex items-baseline gap-1 font-mono ${
                                        market.change > 0
                                          ? 'text-leaf'
                                          : 'text-coral'
                                      }`}
                                    >
                                      <span className="text-xs">
                                        {market.change > 0 ? '↑' : '↓'}
                                      </span>
                                      <span
                                        className={`font-bold ${
                                          isSignificant
                                            ? 'text-lg'
                                            : 'text-base'
                                        }`}
                                      >
                                        {changeAbs.toFixed(1)}%
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Volume if available */}
                                {market.volume > 0 && (
                                  <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-muted">
                                    <span className="uppercase">Volume:</span>
                                    <span className="text-ink">
                                      {formatVolume(market.volume)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {lowMovementMarkets.length > 0 && (
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex-1 border-t border-line"></div>
                              <button
                                onClick={() => setShowAll(!showAll)}
                                className="px-3 py-1 font-mono text-xs text-muted transition-colors hover:text-ink"
                              >
                                {showAll ? 'Hide' : 'Show'}{' '}
                                {lowMovementMarkets.length} minor movements
                              </button>
                              <div className="flex-1 border-t border-line"></div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Clean footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper px-6 py-3">
              <div className="font-mono text-xs text-muted md:text-sm">
                {movement.marketMovements && movement.marketMovements.length > 1
                  ? `${movement.marketMovements.length} markets affected`
                  : 'Press ESC to close'}
              </div>
              <div>
                {movement.url && movement.url !== '#' && (
                  <a
                    href={movement.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-sm bg-sky-deep px-3.5 py-1.5 text-xs font-semibold text-surface transition-colors hover:bg-ink"
                  >
                    <span>
                      {movement.restricted
                        ? 'View on Polymarket'
                        : 'Open market'}
                    </span>
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
