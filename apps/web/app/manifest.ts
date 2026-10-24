import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Recess Studio — WhatsApp Social Arcade',
    short_name: 'Recess',
    description: 'Mobile-first social gaming network inside WhatsApp',
    start_url: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'minimal-ui', 'standalone'],
    background_color: '#05070B',
    theme_color: '#1F2C34',
    icons: [
      {
        src: '/assets/shared/icons/recess-coin.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
