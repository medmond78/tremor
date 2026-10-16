'use client';

interface SidebarProps {
  selectedWindow: '5m' | '60m' | '1440m';
  onChangeWindow: (w: '5m' | '60m' | '1440m') => void;
  selectedIntensity: 'all' | 'extreme' | 'high' | 'moderate' | 'low';
  onChangeIntensity: (
    intensity: 'all' | 'extreme' | 'high' | 'moderate' | 'low'
  ) => void;
  selectedVolume?: 'all' | 'whale' | 'high' | 'medium' | 'low';
  onChangeVolume?: (
    volume: 'all' | 'whale' | 'high' | 'medium' | 'low'
  ) => void;
  hideSettling?: boolean;
  onToggleSettling?: () => void;
  settlingCount?: number;
  usOnly?: boolean;
  onToggleUsOnly?: () => void;
  restrictedCount?: number;
}

export function Sidebar({
  selectedWindow,
  onChangeWindow,
  selectedIntensity,
  onChangeIntensity,
  selectedVolume = 'all',
  onChangeVolume,
  hideSettling = true,
  onToggleSettling,
  settlingCount,
  usOnly = true,
  onToggleUsOnly,
  restrictedCount,
}: SidebarProps) {
  const intensityFilters = [
    {
      id: 'all' as const,
      label: 'All',
      hint: 'Every tremor',
      range: '0–10',
      swatch: '#1c2430',
    },
    {
      id: 'extreme' as const,
      label: 'Extreme',
      hint: 'Market earthquake',
      range: '7.5+',
      swatch: '#f0674f',
    },
    {
      id: 'high' as const,
      label: 'High',
      hint: 'Major movement',
      range: '5–7.5',
      swatch: '#f5b82e',
    },
    {
      id: 'moderate' as const,
      label: 'Moderate',
      hint: 'Notable shift',
      range: '2.5–5',
      swatch: '#4a9bf0',
    },
    {
      id: 'low' as const,
      label: 'Low',
      hint: 'Background noise',
      range: '<2.5',
      swatch: '#e4e1d8',
    },
  ];

  const volumeFilters = [
    { id: 'all' as const, label: 'All', range: 'any' },
    { id: 'whale' as const, label: 'Whale', range: '>$500K' },
    { id: 'high' as const, label: 'High', range: '$100–500K' },
    { id: 'medium' as const, label: 'Medium', range: '$25–100K' },
    { id: 'low' as const, label: 'Low', range: '<$25K' },
  ];

  const windows = [
    { id: '5m' as const, label: '5 min' },
    { id: '60m' as const, label: '1 hour' },
    { id: '1440m' as const, label: '24 hour' },
  ];

  const windowHints: Record<string, string> = {
    '5m': 'Flash moves as they happen.',
    '60m': 'Active shifts. A good default while markets are busy.',
    '1440m': 'The full picture for the day.',
  };

  const settlingHint =
    settlingCount !== undefined
      ? `${settlingCount} pinned near 0 or 100%`
      : 'Filters tremors pinned near 0 or 100%';

  return (
    <aside
      aria-label="Filters"
      className="flex w-full flex-col gap-6 md:gap-8 lg:w-[280px] lg:flex-none xl:w-[320px]"
    >
      {/* Intensity Section */}
      <section className="flex flex-col gap-2">
        <h2 className="mb-1 font-mono text-xs font-medium uppercase leading-4 text-muted">
          Intensity
        </h2>
        <div className="flex flex-col gap-2">
          {intensityFilters.map((opt) => {
            const isSelected = selectedIntensity === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeIntensity(opt.id)}
                aria-pressed={isSelected}
                className={`flex min-h-[52px] items-center gap-3 rounded-md bg-surface px-4 py-2 text-left transition-colors ${
                  isSelected
                    ? 'border-2 border-sky-deep shadow-sm'
                    : 'border-2 border-surface hover:border-line'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-7 w-7 flex-none rounded-[6px]"
                  style={{ background: opt.swatch }}
                />
                <span className="flex flex-1 flex-col">
                  <span className="text-base font-semibold leading-5 text-ink">
                    {opt.label}
                  </span>
                  <span className="text-[13px] leading-[18px] text-muted">
                    {opt.hint}
                  </span>
                </span>
                <span className="font-mono text-xs font-medium leading-4 text-muted">
                  {opt.range}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Market Volume Section */}
      <section className="flex flex-col gap-2">
        <h2 className="mb-1 font-mono text-xs font-medium uppercase leading-4 text-muted">
          Market volume
        </h2>
        <div className="flex flex-wrap gap-2">
          {volumeFilters.map((opt) => {
            const isSelected = selectedVolume === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeVolume?.(opt.id)}
                aria-pressed={isSelected}
                className={`flex min-h-[44px] flex-col items-start rounded-md px-3 py-1.5 text-left transition-colors ${
                  isSelected
                    ? 'border-2 border-sky-deep bg-surface shadow-sm'
                    : 'border-2 border-line bg-transparent hover:bg-surface'
                }`}
              >
                <span className="text-[13px] font-semibold leading-[18px] text-ink">
                  {opt.label}
                </span>
                <span className="font-mono text-xs font-medium leading-4 text-muted">
                  {opt.range}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Time Window Section */}
      <section className="flex flex-col gap-2">
        <h2 className="mb-1 font-mono text-xs font-medium uppercase leading-4 text-muted">
          Time window
        </h2>
        <div
          role="group"
          aria-label="Time window"
          className="grid grid-cols-3 gap-1 rounded-md bg-line p-1"
        >
          {windows.map((opt) => {
            const isSelected = selectedWindow === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeWindow(opt.id)}
                aria-pressed={isSelected}
                className={`min-h-[44px] rounded-[9px] font-mono text-sm font-medium leading-5 transition-colors ${
                  isSelected
                    ? 'bg-surface text-ink shadow-sm'
                    : 'bg-transparent text-ink hover:text-ink/80'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="m-0 text-[13px] leading-[18px] text-muted">
          {windowHints[selectedWindow]}
        </p>
      </section>

      {/* Hide Settling Markets Toggle */}
      {onToggleSettling && (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onToggleSettling}
            aria-pressed={hideSettling}
            className="flex min-h-[52px] items-center gap-3 rounded-md border-2 border-surface bg-surface px-4 py-2 text-left shadow-sm transition-colors hover:border-line"
          >
            <span
              aria-hidden="true"
              className={`flex h-6 w-10 flex-none items-center rounded-full p-[3px] transition-colors ${
                hideSettling
                  ? 'justify-end bg-sky-deep'
                  : 'justify-start bg-line'
              }`}
            >
              <span className="h-[18px] w-[18px] rounded-full bg-surface shadow" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-base font-semibold leading-5 text-ink">
                Hide settling markets
              </span>
              <span className="text-[13px] leading-[18px] text-muted">
                {settlingHint}
              </span>
            </span>
          </button>
        </section>
      )}

      {/* US Accessible Only Toggle */}
      {onToggleUsOnly && (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onToggleUsOnly}
            aria-pressed={usOnly}
            className="flex min-h-[52px] items-center gap-3 rounded-md border-2 border-surface bg-surface px-4 py-2 text-left shadow-sm transition-colors hover:border-line"
          >
            <span
              aria-hidden="true"
              className={`flex h-6 w-10 flex-none items-center rounded-full p-[3px] transition-colors ${
                usOnly ? 'justify-end bg-sky-deep' : 'justify-start bg-line'
              }`}
            >
              <span className="h-[18px] w-[18px] rounded-full bg-surface shadow" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-base font-semibold leading-5 text-ink">
                US accessible only
              </span>
              <span className="text-[13px] leading-[18px] text-muted">
                {usOnly
                  ? `Hiding non-US restricted bets${restrictedCount !== undefined ? ` (${restrictedCount} hidden)` : ''}`
                  : `Showing all markets${restrictedCount !== undefined ? ` (${restrictedCount} non-US)` : ''}`}
              </span>
            </span>
          </button>
        </section>
      )}

      {/* Attribution */}
      <p className="m-0 text-[13px] leading-[18px] text-muted">
        Market data from{' '}
        <a
          href="https://polymarket.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-deep transition-colors hover:text-ink"
        >
          Polymarket
        </a>
        . AI analysis via{' '}
        <a
          href="https://ai.google.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-deep transition-colors hover:text-ink"
        >
          Gemini
        </a>{' '}
        &amp;{' '}
        <a
          href="https://www.anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-deep transition-colors hover:text-ink"
        >
          Claude
        </a>
        .
      </p>
    </aside>
  );
}
