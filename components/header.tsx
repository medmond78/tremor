'use client';

import { useState, memo } from 'react';
import { OnboardingModal } from './onboarding-modal';
import { BRAND } from '@/config/brand.config';

interface HeaderProps {
  windowLabel?: string;
}

export const Header = memo(function Header({
  windowLabel = 'Last 24 hours',
}: HeaderProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-paper px-4 py-4 md:px-8 md:py-5">
        <div className="flex flex-wrap items-baseline gap-3 md:gap-4">
          <span className="text-xl font-semibold tracking-[-0.01em] text-ink md:text-[28px] md:leading-[34px]">
            {BRAND.name}
          </span>
          <span className="font-mono text-xs font-medium uppercase leading-4 text-muted">
            {BRAND.tagline}
          </span>
        </div>

        <nav
          aria-label="Site"
          className="flex flex-wrap items-center gap-1 sm:gap-2"
        >
          <div className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 font-mono text-xs font-medium uppercase leading-4 text-ink shadow-sm">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-leaf"
            />
            <span>Live · {windowLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="inline-flex min-h-[44px] items-center rounded-md px-3 text-[13px] font-semibold text-sky-deep transition-colors hover:text-ink md:px-4"
          >
            How it works
          </button>

          {BRAND.social.github && (
            <a
              href={BRAND.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-md px-2.5 text-[13px] text-sky-deep transition-colors hover:text-ink md:px-3"
            >
              GitHub
            </a>
          )}

          {BRAND.social.twitter && (
            <a
              href={`https://x.com/${BRAND.social.twitter.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-md px-2.5 text-[13px] text-sky-deep transition-colors hover:text-ink md:px-3"
            >
              X
            </a>
          )}
        </nav>
      </header>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        autoShow={true}
      />
    </>
  );
});
