import { NextRequest, NextResponse } from 'next/server';

/**
 * Catch-all proxy for Gozipp API v1 routes.
 * Proxies requests from same-origin (https://www.gozipp.app/api/v1/*)
 * to Railway NestJS backend (https://gozipp-api-staging-production.up.railway.app/api/v1/*).
 *
 * Benefits:
 *  - 100% same-origin: completely eliminates CORS errors and "Failed to fetch" on mobile.
 *  - Automatically forwards cookies (access_token, refresh_token) server-to-server.
 *  - Automatically forwards Set-Cookie headers back to client.
 */
const NEST_BASE =
  process.env.NEST_API_URL ||
  process.env.GOZIPP_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://gozipp-api-staging-production.up.railway.app';

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams?.path || [];
  const targetPath = pathSegments.join('/');
  const search = request.nextUrl.search || '';
  const targetUrl = `${NEST_BASE.replace(/\/$/, '')}/api/v1/${targetPath}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Do not forward host or connection headers
    if (lower !== 'host' && lower !== 'connection') {
      headers.set(key, value);
    }
  });

  const method = request.method;
  let body: ArrayBuffer | undefined = undefined;
  if (!['GET', 'HEAD'].includes(method)) {
    try {
      body = await request.arrayBuffer();
    } catch {
      body = undefined;
    }
  }

  try {
    const nestRes = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: 'manual',
    });

    const resHeaders = new Headers();
    nestRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === 'set-cookie') {
        resHeaders.append('Set-Cookie', value);
      } else {
        resHeaders.set(key, value);
      }
    });

    const setCookies = (nestRes.headers as any).getSetCookie?.();
    if (setCookies?.length) {
      resHeaders.delete('set-cookie');
      for (const c of setCookies) {
        resHeaders.append('Set-Cookie', c);
      }
    }

    const data = await nestRes.arrayBuffer();
    return new NextResponse(data, {
      status: nestRes.status,
      statusText: nestRes.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`[API Proxy] Error forwarding to ${targetUrl}:`, err?.message || err);
    return NextResponse.json(
      { success: false, message: 'เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองใหม่อีกครั้ง' },
      { status: 502 },
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
export const OPTIONS = handleProxy;
