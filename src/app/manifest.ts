import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sistem Informasi Administrasi Digital KEREN',
    short_name: 'KEREN',
    description: 'Aplikasi Administrasi Digital MTs Almaarif 01 Singosari',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#237227',
    icons: [
      {
        src: '/keren.png',
        sizes: 'any',
        type: 'image/png',
      }
    ],
  };
}
