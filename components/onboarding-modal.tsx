'use client';

import { useEffect, useState, useCallback } from 'react';
import { BRAND } from '@/config/brand.config';

interface OnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  autoShow?: boolean;
}

export function OnboardingModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  autoShow = true,
}: OnboardingModalProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(BRAND.storageKeys.onboardingDismissed, 'true');
      localStorage.setItem('tremor-onboarding-seen', 'true');
    }
    setHasSeenOnboarding(true);
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setCurrentStep(0); // Reset for next time
  }, [controlledOnClose]);

  useEffect(() => {
    const seen =
      typeof window !== 'undefined' &&
      (Boolean(localStorage.getItem(BRAND.storageKeys.onboardingDismissed)) ||
        Boolean(localStorage.getItem('tremor-onboarding-seen')));
    setHasSeenOnboarding(seen);
    if (!autoShow) return;
    if (!seen) {
      const timer = setTimeout(() => setInternalIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [autoShow]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const steps = [
    {
      title: '01. MARKET TREMORS',
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <svg className="h-20 w-20" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 12 L5 12 L7 6 L9 18 L11 3 L13 21 L15 3 L17 18 L19 6 L21 12 L22 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-400"
              />
            </svg>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Smart money moves before news breaks. When insiders trade or big
            events unfold, prediction markets shift violently. We detect these
            tremors across 500+ markets in real-time.
          </p>
          <div className="space-y-2">
            <div className="rounded-md border border-line bg-paper p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-coral" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
                  Trump 2024: Markets called it at 95% while polls showed 50/50
                </span>
              </div>
            </div>
            <div className="rounded-md border border-line bg-paper p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-sun" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
                  Biden dropout: Odds shifted 3 hours before announcement
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '02. INTENSITY SCORING',
      content: (
        <div className="space-y-4">
          <div className="space-y-2 rounded-md border border-line bg-paper p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold text-coral">
                EXTREME
              </span>
              <div className="flex h-1.5 w-32 gap-px">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex-1 bg-coral" />
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold text-muted">
                7.5+
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold text-sun">
                HIGH
              </span>
              <div className="flex h-1.5 w-32 gap-px">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 ${i < 7 ? 'bg-sun' : 'bg-line'}`}
                  />
                ))}
                {[...Array(3)].map((_, i) => (
                  <div key={i + 7} className="flex-1 bg-line" />
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold text-muted">
                5-7.5
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold text-sky">
                MODERATE
              </span>
              <div className="flex h-1.5 w-32 gap-px">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex-1 bg-sky" />
                ))}
                {[...Array(5)].map((_, i) => (
                  <div key={i + 5} className="flex-1 bg-line" />
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold text-muted">
                2.5-5
              </span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Our logarithmic algorithm detects market earthquakes. Big moves get
            exponentially higher scores, and crossing 50% probability adds extra
            weight.
          </p>
          <div className="grid grid-cols-2 gap-3 font-mono text-xs text-muted">
            <div className="space-y-1">
              <div className="font-semibold text-ink">Price Movement</div>
              <div>5pp → 5.0 score</div>
              <div>10pp → 7.5 score</div>
              <div>20pp → 10.0 score</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-ink">Validation</div>
              <div>$10K+ volume required</div>
              <div>Crossing 50% = 1.5x</div>
              <div>Multi-market moves</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '03. TIME WINDOWS',
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="rounded-md border border-line bg-paper p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink">24 HOUR</div>
                  <div className="text-xs text-muted">Daily trends</div>
                </div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                  MACRO VIEW
                </div>
              </div>
            </div>
            <div className="rounded-md border border-sky-deep bg-paper p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink">1 HOUR</div>
                  <div className="text-xs text-muted">Active shifts</div>
                </div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-deep">
                  RECOMMENDED
                </div>
              </div>
            </div>
            <div className="rounded-md border border-line bg-paper p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink">5 MIN</div>
                  <div className="text-xs text-muted">Flash moves</div>
                </div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                  MICRO VIEW
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Choose your perspective: 24-hour for the full picture, 1-hour for
            active shifts, or 5-min for breaking developments. We default to
            24-hour for maximum insight.
          </p>
        </div>
      ),
    },
    {
      title: '04. INTELLIGENCE',
      content: (
        <div className="space-y-4">
          <div className="rounded-md border border-line bg-paper p-3">
            <div className="mb-2 flex items-center gap-2">
              <svg
                className="h-4 w-4 text-sky-deep"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 24L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M9 12L11 14L15 10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-sky-deep">
                SOCIAL INTELLIGENCE
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              For high-intensity movements (5.0+), we automatically analyze
              real-time social signals from X to understand what traders are
              anticipating.
            </p>
          </div>
          <div className="rounded-md border border-line bg-paper p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-muted" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
                TREMOR REPORT
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Auto-generated every 30 minutes. Summarizes the most significant
              market movements across all categories.
            </p>
          </div>
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transform p-4"
      >
        <div className="rounded-lg border border-line bg-surface shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line p-6">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-ink" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 12 L5 12 L7 6 L9 18 L11 3 L13 21 L15 3 L17 18 L19 6 L21 12 L22 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <h2
                  id="onboarding-modal-title"
                  className="text-base font-semibold text-ink"
                >
                  {currentStep === 0 && !hasSeenOnboarding
                    ? 'WELCOME TO TREMOR'
                    : 'HOW TREMOR WORKS'}
                </h2>
                <p className="font-mono text-xs font-medium uppercase tracking-wider text-muted">
                  WHERE MONEY TALKS FIRST
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close modal"
              className="text-muted transition-colors hover:text-ink"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="border-b border-line px-6 py-3">
            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i <= currentStep ? 'bg-sky-deep' : 'bg-line'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 font-mono text-xs font-medium uppercase tracking-wider text-muted">
              STEP {currentStep + 1} OF {steps.length}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-ink">
              {steps[currentStep].title}
            </h3>
            {steps[currentStep].content}
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-line p-6">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 rounded-md border border-line bg-paper px-4 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider text-muted transition-all hover:border-ink/20 hover:text-ink"
              >
                BACK
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1 rounded-md bg-ink px-4 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider text-surface transition-all hover:bg-ink/90"
              >
                NEXT
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="flex-1 rounded-md bg-sky-deep px-4 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider text-surface transition-all hover:bg-sky-deep/90"
              >
                START MONITORING
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
