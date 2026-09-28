import { saveGpxFile } from "@/lib/server/gpx-storage";

export type StravaToken = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id: number;
    firstname?: string;
    lastname?: string;
    username?: string;
  };
};

export type StravaActivity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  type: string;
  total_elevation_gain?: number;
};

const STRAVA_AUTH_COOKIE = "rwzd_strava_auth";
const STRAVA_OAUTH_STATE_COOKIE = "rwzd_strava_oauth_state";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_OAUTH_BASE = "https://www.strava.com/oauth";
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Brak zmiennej srodowiskowej: ${name}`);
  }
  return value;
}

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [rawKey, ...rest] = chunk.trim().split("=");
    if (!rawKey) {
      return acc;
    }
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function toBase64Json(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf-8").toString("base64url");
}

function fromBase64Json<T>(value: string): T | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf-8");
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

function cookieOptions(maxAgeSeconds: number): string {
  const secure = isSecureCookie() ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function getStravaConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return {
    isConfigured: Boolean(clientId && clientSecret && appUrl),
    clientId,
    clientSecret,
    appUrl,
  };
}

export function getCallbackUrl(): string {
  const appUrl = requiredEnv("NEXT_PUBLIC_APP_URL");
  return `${appUrl.replace(/\/$/, "")}/api/admin/strava/callback`;
}

export function buildStravaAuthUrl(state: string): string {
  const clientId = requiredEnv("STRAVA_CLIENT_ID");
  const redirectUri = getCallbackUrl();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "force",
    scope: "read,activity:read_all",
    state,
  });

  return `${STRAVA_OAUTH_BASE}/authorize?${params.toString()}`;
}

export function makeOAuthState(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function setOauthStateCookieHeaders(state: string): string {
  return `${STRAVA_OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; ${cookieOptions(600)}`;
}

export function clearOauthStateCookieHeader(): string {
  return `${STRAVA_OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecureCookie() ? "; Secure" : ""}`;
}

export function readOauthStateFromCookie(cookieHeader: string | null): string | null {
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[STRAVA_OAUTH_STATE_COOKIE] ?? null;
}

export function setStravaAuthCookieHeader(token: StravaToken): string {
  return `${STRAVA_AUTH_COOKIE}=${encodeURIComponent(toBase64Json(token))}; ${cookieOptions(60 * 60 * 24 * 30)}`;
}

export function clearStravaAuthCookieHeader(): string {
  return `${STRAVA_AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecureCookie() ? "; Secure" : ""}`;
}

export function readStravaTokenFromCookie(cookieHeader: string | null): StravaToken | null {
  const cookies = parseCookieHeader(cookieHeader);
  const encoded = cookies[STRAVA_AUTH_COOKIE];
  if (!encoded) {
    return null;
  }
  return fromBase64Json<StravaToken>(encoded);
}

export async function exchangeCodeForToken(code: string): Promise<StravaToken> {
  const clientId = requiredEnv("STRAVA_CLIENT_ID");
  const clientSecret = requiredEnv("STRAVA_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });

  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Strava token exchange failed: ${details}`);
  }

  return (await response.json()) as StravaToken;
}

export async function refreshToken(token: StravaToken): Promise<StravaToken> {
  const clientId = requiredEnv("STRAVA_CLIENT_ID");
  const clientSecret = requiredEnv("STRAVA_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });

  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Strava refresh failed: ${details}`);
  }

  return (await response.json()) as StravaToken;
}

export async function getValidToken(token: StravaToken): Promise<{
  token: StravaToken;
  refreshed: boolean;
}> {
  const refreshThreshold = 60;
  if (token.expires_at - refreshThreshold > Math.floor(Date.now() / 1000)) {
    return { token, refreshed: false };
  }

  const refreshedToken = await refreshToken(token);
  return { token: refreshedToken, refreshed: true };
}

export async function fetchAthlete(token: string) {
  const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Nie udało się pobrać profilu Strava.");
  }

  return response.json() as Promise<{
    id: number;
    firstname?: string;
    lastname?: string;
    username?: string;
  }>;
}

export async function fetchActivities(token: string, perPage = 20): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: "1",
    per_page: String(Math.min(50, Math.max(1, perPage))),
  });

  const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Nie udało się pobrać aktywności Strava.");
  }

  return (await response.json()) as StravaActivity[];
}

type StravaStreamsResponse = {
  latlng?: { data?: [number, number][] };
  altitude?: { data?: number[] };
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(from: [number, number], to: [number, number]): number {
  const earthRadius = 6371000;
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);
  const deltaLat = toRadians(to[0] - from[0]);
  const deltaLon = toRadians(to[1] - from[1]);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

export function calculateTrackMetrics(latlngPoints: [number, number][], altitudeData?: number[]) {
  let distanceMeters = 0;
  for (let index = 1; index < latlngPoints.length; index += 1) {
    distanceMeters += haversineMeters(latlngPoints[index - 1], latlngPoints[index]);
  }

  let elevationGainMeters = 0;
  if (altitudeData && altitudeData.length > 1) {
    for (let index = 1; index < altitudeData.length; index += 1) {
      const delta = altitudeData[index] - altitudeData[index - 1];
      if (delta > 0) {
        elevationGainMeters += delta;
      }
    }
  }

  return {
    distanceKm: Number((distanceMeters / 1000).toFixed(1)),
    elevationGainM: Math.round(elevationGainMeters),
  };
}

export async function fetchActivityStreams(token: string, activityId: number): Promise<StravaStreamsResponse> {
  const params = new URLSearchParams({
    keys: "latlng,altitude",
    key_by_type: "true",
  });

  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}/streams?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Nie udało się pobrać streamu trasy ze Strava.");
  }

  return (await response.json()) as StravaStreamsResponse;
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function saveActivityAsGpx(args: {
  activityId: number;
  activityName: string;
  latlngPoints: [number, number][];
  altitudeData?: number[];
}): Promise<{ fileName: string; url: string }> {
  const safeName = toSlug(args.activityName) || `strava-${args.activityId}`;
  const fileName = `${Date.now()}-${safeName}.gpx`;

  const trackPoints = args.latlngPoints
    .map((point, index) => {
      const [lat, lon] = point;
      const altitude = args.altitudeData?.[index];
      const ele = typeof altitude === "number" ? `<ele>${altitude.toFixed(2)}</ele>` : "";
      return `      <trkpt lat="${lat}" lon="${lon}">${ele}</trkpt>`;
    })
    .join("\n");

  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Family Ride Strava Import" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${xmlEscape(args.activityName)}</name>
  </metadata>
  <trk>
    <name>${xmlEscape(args.activityName)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>
`;

  const saved = await saveGpxFile({
    fileName,
    content: gpxContent,
    contentType: "application/gpx+xml",
  });

  return {
    fileName: saved.name,
    url: saved.url,
  };
}
