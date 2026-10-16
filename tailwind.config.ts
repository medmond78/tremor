import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'var(--font-mono)',
          '"JetBrains Mono"',
          'ui-monospace',
          'monospace',
        ],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px',
      },
      colors: {
        paper: '#fbfaf6',
        surface: '#ffffff',
        line: '#e4e1d8',
        ink: '#1c2430',
        sky: {
          DEFAULT: '#4a9bf0',
          deep: '#1b5fbf',
        },
        sun: '#f5b82e',
        coral: '#f0674f',
        leaf: '#3fb37f',
        background: '#fbfaf6',
        foreground: '#1c2430',
        border: '#e4e1d8',
        card: '#ffffff',
        muted: {
          DEFAULT: '#5d6673',
          foreground: '#5d6673',
        },
        accent: {
          green: '#3fb37f',
          red: '#f0674f',
          yellow: '#f5b82e',
          blue: '#4a9bf0',
        },
        tremor: {
          extreme: '#f0674f',
          high: '#f5b82e',
          moderate: '#4a9bf0',
          low: '#e4e1d8',
          pulse: '#3fb37f',
        },
        trend: {
          up: '#3fb37f',
          down: '#f0674f',
        },
      },
    },
  },
  plugins: [forms, typography],
};

export default config;
