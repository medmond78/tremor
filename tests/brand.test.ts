import { describe, it, expect } from 'vitest';
import { BRAND } from '../config/brand.config';

describe('Brand Configuration', () => {
  it('should have non-empty name and tagline', () => {
    expect(BRAND.name).toBeTruthy();
    expect(BRAND.shortName).toBeTruthy();
    expect(BRAND.tagline).toBeTruthy();
    expect(BRAND.description).toBeTruthy();
  });

  it('should have valid domain and URL structures', () => {
    expect(BRAND.domain).toMatch(/^https?:\/\//);
    expect(BRAND.appUrl).toMatch(/^https?:\/\//);
    expect(BRAND.supportEmail).toContain('@');
  });

  it('should specify unique storage keys', () => {
    expect(BRAND.storageKeys.userPreferences).toBeTruthy();
    expect(BRAND.storageKeys.onboardingDismissed).toBeTruthy();
    expect(BRAND.storageKeys.userPreferences).not.toBe(
      BRAND.storageKeys.onboardingDismissed
    );
  });

  it('should define metric labels', () => {
    expect(BRAND.metrics.scoreName).toBeTruthy();
    expect(BRAND.metrics.unitName).toBeTruthy();
    expect(BRAND.metrics.unitNamePlural).toBeTruthy();
  });
});
