export interface BrandConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  domain: string;
  appUrl: string;
  author: string;
  legalEntity: string;
  supportEmail: string;
  social: {
    twitter?: string;
    github?: string;
  };
  storageKeys: {
    userPreferences: string;
    onboardingDismissed: string;
  };
  metrics: {
    scoreName: string;
    unitName: string;
    unitNamePlural: string;
  };
}

export const BRAND: BrandConfig = {
  name: 'Tremor',
  shortName: 'Tremor',
  tagline: 'Real-time prediction market seismograph',
  description:
    'Monitor real-time probability shocks, extreme market movements, and volume spikes on regulated prediction markets.',
  domain: 'https://tremor.live',
  appUrl: 'https://tremor.live',
  author: 'TREMOR.LIVE Contributors',
  legalEntity: 'TREMOR.LIVE',
  supportEmail: 'contact@tremor.live',
  social: {
    github: 'https://github.com/sculptdotfun/tremor',
  },
  storageKeys: {
    userPreferences: 'tremor_user_preferences_v1',
    onboardingDismissed: 'tremor_onboarding_dismissed_v1',
  },
  metrics: {
    scoreName: 'Seismo score',
    unitName: 'tremor',
    unitNamePlural: 'tremors',
  },
};
