import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://learnos-alb-822082048.ap-south-1.elb.amazonaws.com";

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const { path } = params;
  const backendPath = "/" + path.join("/");
  const search = req.nextUrl.search;
  const url = `${BACKEND_URL}${backendPath}${search}`;

  const headers: Record<string, string> = {};
  const authorization = req.headers.get("authorization");
  if (authorization) headers["authorization"] = authorization;
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let backendRes: Response;
  try {
    backendRes = await fetch(url, {
      method: req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      // Required for Node.js fetch to support streaming response on POST requests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(hasBody ? { duplex: "half" } as any : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Proxy fetch failed", detail: message, url },
      { status: 502 }
    );
  }

  const resHeaders = new Headers();
  const ct = backendRes.headers.get("content-type");
  if (ct) resHeaders.set("content-type", ct);
  // Pass through SSE/streaming headers
  const cacheControl = backendRes.headers.get("cache-control");
  if (cacheControl) resHeaders.set("cache-control", cacheControl);
  const xAccel = backendRes.headers.get("x-accel-buffering");
  if (xAccel) resHeaders.set("x-accel-buffering", xAccel);
  const transferEncoding = backendRes.headers.get("transfer-encoding");
  if (transferEncoding) resHeaders.set("transfer-encoding", transferEncoding);

  return new NextResponse(backendRes.body, {
    status: backendRes.status,
    headers: resHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
