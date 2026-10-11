import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        recess: {
          purple: {
            DEFAULT: '#6C38FF',
            hover: '#5824EE',
            light: '#F0EBFF',
            subtle: 'rgba(108, 56, 255, 0.08)',
          },
          blue: {
            DEFAULT: '#1B76FF',
            hover: '#005DE6',
            light: '#EBF3FF',
          },
          navy: {
            DEFAULT: '#0D111C',
            card: '#161D2F',
            border: '#252F47',
            light: '#1E273E',
          },
          cream: {
            DEFAULT: '#FAF9F5',
            card: '#FFFFFF',
            muted: '#F2EFE9',
            border: '#E7E3DA',
          },
          green: {
            DEFAULT: '#10B981',
            light: '#ECFDF5',
            dot: '#059669',
          },
          gold: {
            DEFAULT: '#F59E0B',
            light: '#FEF3C7',
            dark: '#B45309',
          },
          text: {
            primary: '#111827',
            secondary: '#4B5563',
            muted: '#9CA3AF',
            light: '#F9FAFB',
          },
          error: {
            DEFAULT: '#EF4444',
            light: '#FEF2F2',
          },
        },
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(17, 24, 39, 0.05), 0 1px 3px -1px rgba(17, 24, 39, 0.04)',
        'card-hover':
          '0 8px 24px -4px rgba(17, 24, 39, 0.08), 0 4px 8px -2px rgba(17, 24, 39, 0.04)',
        'glow-purple': '0 4px 16px 0 rgba(108, 56, 255, 0.35)',
        'glow-gold': '0 4px 16px 0 rgba(245, 158, 11, 0.35)',
        'glow-green': '0 4px 14px 0 rgba(16, 185, 129, 0.30)',
      },
      borderRadius: {
        'recess-card': '1.25rem',
        'recess-control': '0.875rem',
      },
    },
  },
  plugins: [],
};

export default config;
