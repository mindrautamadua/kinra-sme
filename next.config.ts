import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { '*': ['./sumber-data/**'] },
}

export default nextConfig
