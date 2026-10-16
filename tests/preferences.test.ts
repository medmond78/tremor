import { describe, it, expect, beforeEach } from 'vitest';
import { isLikelyUsUser } from '../hooks/use-user-preferences';

describe('useUserPreferences and region detection', () => {
  const originalDateTimeFormat = Intl.DateTimeFormat;

  beforeEach(() => {
    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  it('detects US timezone correctly', () => {
    // Mock US timezone
    Intl.DateTimeFormat = function () {
      return {
        resolvedOptions: () => ({ timeZone: 'America/New_York' }),
      } as any;
    } as any;

    expect(isLikelyUsUser()).toBe(true);
  });

  it('detects another US timezone correctly (e.g. Pacific/Honolulu, America/Chicago)', () => {
    Intl.DateTimeFormat = function () {
      return {
        resolvedOptions: () => ({ timeZone: 'America/Chicago' }),
      } as any;
    } as any;
    expect(isLikelyUsUser()).toBe(true);

    Intl.DateTimeFormat = function () {
      return {
        resolvedOptions: () => ({ timeZone: 'Pacific/Honolulu' }),
      } as any;
    } as any;
    expect(isLikelyUsUser()).toBe(true);
  });

  it('returns false for non-US timezones', () => {
    Intl.DateTimeFormat = function () {
      return {
        resolvedOptions: () => ({ timeZone: 'Europe/London' }),
      } as any;
    } as any;

    expect(isLikelyUsUser()).toBe(false);

    Intl.DateTimeFormat = function () {
      return {
        resolvedOptions: () => ({ timeZone: 'Asia/Tokyo' }),
      } as any;
    } as any;

    expect(isLikelyUsUser()).toBe(false);
  });
});
