import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KEREN - MTs Almaarif 01 Singosari',
    short_name: 'KEREN',
    description: 'Sistem Informasi Administrasi & Portal Siswa MTs Almaarif 01 Singosari',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
  };
}
