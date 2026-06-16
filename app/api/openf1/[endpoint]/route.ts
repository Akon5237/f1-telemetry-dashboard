import { NextRequest, NextResponse } from "next/server";

const OPENF1_BASE_URL = "https://api.openf1.org/v1";
const ALLOWED_ENDPOINTS = new Set(["meetings", "sessions", "drivers", "laps", "car_data"]);

type RouteContext = {
  params: {
    endpoint: string;
  };
};

export const runtime = "edge";

export async function GET(request: NextRequest, { params }: RouteContext) {
  const endpoint = params.endpoint;

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return NextResponse.json({ error: "Unsupported OpenF1 endpoint." }, { status: 400 });
  }

  const upstreamUrl = new URL(`${OPENF1_BASE_URL}/${endpoint}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `OpenF1 request failed: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
      }
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach OpenF1." }, { status: 502 });
  }
}
