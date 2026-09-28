import { NextResponse, type NextRequest } from "next/server";

function unauthorizedForPage(): NextResponse {
  return new NextResponse("Autoryzacja wymagana", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Family Ride Admin", charset="UTF-8"',
    },
  });
}

function unauthorizedForApi(): NextResponse {
  return NextResponse.json(
    {
      error: "Brak autoryzacji admina.",
    },
    { status: 401 }
  );
}

function parseBasicAuth(authHeader: string | null): { username: string; password: string } | null {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return null;
  }

  const encoded = authHeader.slice(6).trim();
  if (!encoded) {
    return null;
  }

  try {
    const decoded = atob(encoded);
    const separator = decoded.indexOf(":");
    if (separator < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const expectedUsername = process.env.ADMIN_BASIC_USER?.trim();
  const expectedPassword = process.env.ADMIN_BASIC_PASSWORD?.trim();

  // If credentials are not configured, skip protection to avoid accidental lockout.
  if (!expectedUsername || !expectedPassword) {
    return NextResponse.next();
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  const isAuthorized =
    credentials !== null &&
    credentials.username === expectedUsername &&
    credentials.password === expectedPassword;

  if (isAuthorized) {
    return NextResponse.next();
  }

  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  return isApiRequest ? unauthorizedForApi() : unauthorizedForPage();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
