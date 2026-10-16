'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Tremor Global Application Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center font-mono text-zinc-100 antialiased">
        <div className="w-full max-w-md rounded-lg border border-red-500/20 bg-zinc-900/60 p-6 backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="mb-2 text-lg font-semibold tracking-wide text-zinc-100">
            Critical Telemetry Error
          </h2>

          <p className="mb-6 text-sm text-zinc-400">
            A critical error occurred while initializing the application.
          </p>

          <button
            onClick={() => reset()}
            className="rounded border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-700"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
