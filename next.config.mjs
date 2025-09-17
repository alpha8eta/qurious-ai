/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow all hosts for Replit environment
  allowedDevOrigins: ['11d7bd13-1e53-46b4-ab35-38102638992a-00-2j33je90nc3tu.kirk.replit.dev'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          }
        ]
      }
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/vi/**'
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/a/**' // Google user content often follows this pattern
      },
      {
        protocol: 'https',
        hostname: 'imgs.search.brave.com',
        port: '',
        pathname: '/**' // Brave search cached images
      }
    ]
  },
  webpack: (config, { isServer }) => {
    // Handle ESM packages that cause issues
    config.module.rules.push({
      test: /\.m?js$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false
      }
    })

    // Add fallback for problematic modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false
      }
    }

    return config
  }
}

export default nextConfig
