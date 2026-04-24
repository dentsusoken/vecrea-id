import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/users/import',
        destination: '/import',
        permanent: false,
      },
      { source: '/staging', destination: '/import/staging', permanent: false },
      { source: '/data-init', destination: '/admin/data-init', permanent: false },
    ];
  },
};

export default nextConfig;
