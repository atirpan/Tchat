/** @type {import('next').NextConfig} */

/**
 * Content Security Policy skeleton.
 *
 * Phase 0: defined and emitted but still permissive for local dev. Phase 3
 * will tighten `script-src` (remove 'unsafe-inline' via nonce), add a strict
 * `connect-src` allowlist, and move this into middleware so it can vary per
 * route. No external CDNs, analytics, or trackers will ever be added here.
 *
 * MASTER_SYSTEM references: 2.3, 2.7, 5.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'", // tightened in Phase 3 via nonce
  "script-src 'self'",                 // no third-party scripts, ever
  "connect-src 'self'",
  "object-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // No-store by default. Phase 3 may selectively relax for truly public static assets.
  { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value:
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  // No cookie-based tracking. See MASTER_SYSTEM 2.3, 2.4. Future auth-like
  // state must avoid cookies or, if unavoidable, be SameSite=Strict, HttpOnly,
  // Secure, and have a hard TTL. This header documents intent; enforcement
  // lives at the code level (ESLint bans document.cookie).
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [
    '@anonym-messenger/config',
    '@anonym-messenger/types',
    '@anonym-messenger/utils',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
