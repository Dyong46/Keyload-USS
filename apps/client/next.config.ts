import type { NextConfig } from "next"

// Server-side configuration: the browser only calls its own /api prefix.
const backend = new URL(process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000")
if (
  !["http:", "https:"].includes(backend.protocol) ||
  backend.username ||
  backend.password ||
  backend.search ||
  backend.hash
) {
  throw new Error(
    "BACKEND_API_URL must be an HTTP(S) URL without credentials, query, or fragment."
  )
}
const backendApiUrl = backend.toString().replace(/\/+$/, "")

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
