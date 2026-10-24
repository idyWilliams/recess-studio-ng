import { headers } from 'next/headers';

/**
 * Resolves the dynamic site origin from incoming request headers (Cloudflare tunnels,
 * reverse proxies, Vercel preview URLs, local network IPs).
 *
 * When accessed through a tunnel (e.g. `*.trycloudflare.com`), crawlers like WhatsApp
 * (`facebookexternalhit/1.1`) require full, reachable, absolute URLs in OpenGraph tags.
 * Hardcoding `localhost:3000` or a static production URL causes previews to break on tunnels.
 */
export async function getDynamicSiteUrl(): Promise<string> {
  try {
    const headerList = await headers();
    const forwardedHost =
      headerList.get('x-forwarded-host') || headerList.get('host');

    if (forwardedHost) {
      const forwardedProto =
        headerList.get('x-forwarded-proto') ||
        (forwardedHost.includes('localhost') || forwardedHost.includes('127.0.0.1')
          ? 'http'
          : 'https');
      return `${forwardedProto}://${forwardedHost}`;
    }
  } catch {
    // headers() throws if called outside a request context (e.g. static build or vitest)
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'https://recess.studio';
}
