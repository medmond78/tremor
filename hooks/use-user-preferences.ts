'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type TimeWindow = '5m' | '60m' | '1440m';
export type IntensityFilter = 'all' | 'extreme' | 'high' | 'moderate' | 'low';
export type VolumeFilter = 'all' | 'whale' | 'high' | 'medium' | 'low';

export interface UserPreferences {
  windowSel: TimeWindow;
  intensityFilter: IntensityFilter;
  volumeFilter: VolumeFilter;
  hideSettling: boolean;
  usOnly: boolean;
}

import { BRAND } from '@/config/brand.config';

const STORAGE_KEY = BRAND.storageKeys.userPreferences;

export function isLikelyUsUser(): boolean {
  if (typeof Intl === 'undefined') return false;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return false;
    const usPrefixes = [
      'America/New_York',
      'America/Detroit',
      'America/Kentucky',
      'America/Indiana',
      'America/Chicago',
      'America/North_Dakota',
      'America/Menominee',
      'America/Denver',
      'America/Boise',
      'America/Phoenix',
      'America/Los_Angeles',
      'America/Anchorage',
      'America/Juneau',
      'America/Sitka',
      'America/Metlakatla',
      'America/Yakutat',
      'America/Nome',
      'America/Adak',
      'Pacific/Honolulu',
    ];
    return usPrefixes.some((prefix) => tz.startsWith(prefix));
  } catch {
    return false;
  }
}

function getInitialState(): UserPreferences {
  return {
    windowSel: '1440m',
    intensityFilter: 'all',
    volumeFilter: 'all',
    hideSettling: true,
    usOnly: true,
  };
}

export function useUserPreferences() {
  const [preferences, setPreferences] =
    useState<UserPreferences>(getInitialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const isInitialMount = useRef(true);

  // Hydrate preferences on client mount
  useEffect(() => {
    try {
      const storedRaw = localStorage.getItem(STORAGE_KEY);
      const stored = storedRaw
        ? (JSON.parse(storedRaw) as Partial<UserPreferences>)
        : null;

      const params = new URLSearchParams(window.location.search);
      const urlWindow = params.get('window') as TimeWindow | null;
      const urlIntensity = params.get('intensity') as IntensityFilter | null;
      const urlVolume = params.get('volume') as VolumeFilter | null;
      const urlHideSettling = params.get('hideSettling');
      const urlUsOnly = params.get('usOnly') ?? params.get('us');

      // Determine initial US mode:
      // 1. Explicit URL parameter (?usOnly=1 or ?usOnly=true)
      // 2. Explicitly saved user choice in localStorage
      // 3. Smart geographic fallback based on browser timezone
      let resolvedUsOnly = false;
      if (urlUsOnly !== null) {
        resolvedUsOnly = urlUsOnly === 'true' || urlUsOnly === '1';
      } else if (stored && typeof stored.usOnly === 'boolean') {
        resolvedUsOnly = stored.usOnly;
      } else {
        resolvedUsOnly = isLikelyUsUser();
      }

      const validWindows: TimeWindow[] = ['5m', '60m', '1440m'];
      const validIntensities: IntensityFilter[] = [
        'all',
        'extreme',
        'high',
        'moderate',
        'low',
      ];
      const validVolumes: VolumeFilter[] = [
        'all',
        'whale',
        'high',
        'medium',
        'low',
      ];

      const resolvedWindow: TimeWindow =
        urlWindow && validWindows.includes(urlWindow)
          ? urlWindow
          : stored?.windowSel && validWindows.includes(stored.windowSel)
            ? stored.windowSel
            : '1440m';

      const resolvedIntensity: IntensityFilter =
        urlIntensity && validIntensities.includes(urlIntensity)
          ? urlIntensity
          : stored?.intensityFilter &&
              validIntensities.includes(stored.intensityFilter)
            ? stored.intensityFilter
            : 'all';

      const resolvedVolume: VolumeFilter =
        urlVolume && validVolumes.includes(urlVolume)
          ? urlVolume
          : stored?.volumeFilter && validVolumes.includes(stored.volumeFilter)
            ? stored.volumeFilter
            : 'all';

      const resolvedHideSettling: boolean =
        urlHideSettling !== null
          ? urlHideSettling === 'true' || urlHideSettling === '1'
          : typeof stored?.hideSettling === 'boolean'
            ? stored.hideSettling
            : true;

      setPreferences({
        windowSel: resolvedWindow,
        intensityFilter: resolvedIntensity,
        volumeFilter: resolvedVolume,
        hideSettling: resolvedHideSettling,
        usOnly: resolvedUsOnly,
      });
    } catch (e) {
      console.warn('Failed to hydrate user preferences', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist to localStorage whenever preferences change (safe in React 19 and Next.js 15)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isHydrated) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore localStorage errors
    }
  }, [preferences, isHydrated]);

  const setWindowSel = useCallback((windowSel: TimeWindow) => {
    setPreferences((prev) => ({ ...prev, windowSel }));
  }, []);

  const setIntensityFilter = useCallback((intensityFilter: IntensityFilter) => {
    setPreferences((prev) => ({ ...prev, intensityFilter }));
  }, []);

  const setVolumeFilter = useCallback((volumeFilter: VolumeFilter) => {
    setPreferences((prev) => ({ ...prev, volumeFilter }));
  }, []);

  const setHideSettling = useCallback(
    (valOrUpdater: boolean | ((prev: boolean) => boolean)) => {
      setPreferences((prev) => ({
        ...prev,
        hideSettling:
          typeof valOrUpdater === 'function'
            ? valOrUpdater(prev.hideSettling)
            : valOrUpdater,
      }));
    },
    []
  );

  const setUsOnly = useCallback(
    (valOrUpdater: boolean | ((prev: boolean) => boolean)) => {
      setPreferences((prev) => ({
        ...prev,
        usOnly:
          typeof valOrUpdater === 'function'
            ? valOrUpdater(prev.usOnly)
            : valOrUpdater,
      }));
    },
    []
  );

  return {
    preferences,
    isHydrated,
    setWindowSel,
    setIntensityFilter,
    setVolumeFilter,
    setHideSettling,
    setUsOnly,
  };
}
