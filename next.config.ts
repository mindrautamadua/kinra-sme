import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { '*': ['./sumber-data/**'] },
  outputFileTracingIncludes: { '/komitmen/kebijakan-energi': ['./aset-privat/**'] },
}

export default nextConfig
